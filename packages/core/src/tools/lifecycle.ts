// 工具生命周期管理和错误恢复
// 参考 Cline 的工具生命周期实现

import { Logger } from '../logging/logger.js';
import { ToolValidator } from './validation.js';
import { getErrorHandler } from '../utils/errors.js';
import type { ToolDefinition, ToolContext, ToolResult } from './types.js';

/**
 * 工具生命周期事件
 */
export enum ToolLifecycleEvent {
  BEFORE_EXECUTE = 'before_execute',
  AFTER_EXECUTE = 'after_execute',
  ON_ERROR = 'on_error',
  ON_SUCCESS = 'on_success',
  BEFORE_RETRY = 'before_retry',
}

/**
 * 工具生命周期钩子
 */
export interface ToolLifecycleHook {
  (context: ToolContext, tool: ToolDefinition, params: any): Promise<void>;
}

/**
 * 工具生命周期管理器
 */
export class ToolLifecycleManager {
  private logger: Logger;
  private hooks: Map<ToolLifecycleEvent, Set<ToolLifecycleHook>> = new Map();
  private errorHandler = getErrorHandler();

  constructor() {
    this.logger = new Logger('ToolLifecycleManager');
    this.initializeHooks();
  }

  /**
   * 初始化钩子
   */
  private initializeHooks(): void {
    const events = Object.values(ToolLifecycleEvent);
    for (const event of events) {
      this.hooks.set(event as ToolLifecycleEvent, new Set());
    }
  }

  /**
   * 注册钩子
   */
  registerHook(event: ToolLifecycleEvent, hook: ToolLifecycleHook): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      hooks.add(hook);
      this.logger.debug(`Registered hook for ${event}`);
    }
  }

  /**
   * 注销钩子
   */
  unregisterHook(event: ToolLifecycleEvent, hook: ToolLifecycleHook): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      hooks.delete(hook);
      this.logger.debug(`Unregistered hook for ${event}`);
    }
  }

  /**
   * 执行钩子
   */
  private async executeHooks(
    event: ToolLifecycleEvent,
    context: ToolContext,
    tool: ToolDefinition,
    params: any
  ): Promise<void> {
    const hooks = this.hooks.get(event);
    if (!hooks || hooks.size === 0) {
      return;
    }

    this.logger.debug(`Executing ${hooks.size} hooks for ${event}`);

    for (const hook of hooks) {
      try {
        await hook(context, tool, params);
      } catch (error) {
        this.logger.error(`Hook failed for ${event}`, { error });
      }
    }
  }

  /**
   * 执行工具(带生命周期管理)
   */
  async executeWithLifecycle(
    tool: ToolDefinition,
    params: any,
    context: ToolContext,
    maxRetries: number = 3
  ): Promise<ToolResult> {
    let lastError: Error | undefined;
    let attempt = 0;

    // 执行前钩子
    await this.executeHooks(ToolLifecycleEvent.BEFORE_EXECUTE, context, tool, params);

    try {
      // 尝试执行(带重试)
      while (attempt <= maxRetries) {
        try {
          if (attempt > 0) {
            // 重试前钩子
            await this.executeHooks(ToolLifecycleEvent.BEFORE_RETRY, context, tool, params);
          }

          // 执行工具
          const result = await tool.handler(context, params);

          // 成功钩子
          await this.executeHooks(ToolLifecycleEvent.ON_SUCCESS, context, tool, params);

          // 执行后钩子
          await this.executeHooks(ToolLifecycleEvent.AFTER_EXECUTE, context, tool, params);

          return result;
        } catch (error) {
          lastError = error as Error;
          attempt++;

          // 尝试错误恢复
          const recovered = await this.attemptErrorRecovery(
            error as Error,
            tool,
            context,
            params,
            attempt,
            maxRetries
          );

          if (recovered) {
            return recovered;
          }

          // 如果达到最大重试次数,抛出错误
          if (attempt > maxRetries) {
            throw error;
          }

          this.logger.warn(`Tool execution failed, retrying (${attempt}/${maxRetries})`, {
            toolName: tool.name,
            error: (error as Error).message,
          });
        }
      }

      // 理论上不会到达这里
      throw lastError || new Error('Tool execution failed');
    } catch (error) {
      // 错误钩子
      await this.executeHooks(ToolLifecycleEvent.ON_ERROR, context, tool, params);

      // 使用统一错误处理器处理错误
      this.errorHandler.handle(error as Error, `tool:${tool.name}`);

      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          attempts: attempt,
          toolName: tool.name,
        },
      };
    }
  }

  /**
   * 尝试错误恢复
   */
  private async attemptErrorRecovery(
    error: Error,
    tool: ToolDefinition,
    context: ToolContext,
    params: any,
    attempt: number,
    maxRetries: number
  ): Promise<ToolResult | null> {
    // 1. 检查错误是否可恢复
    const appError =
      this.errorHandler instanceof any ? (this.errorHandler as any).fromError?.(error) : null;

    if (!appError || !appError.retryable) {
      return null;
    }

    this.logger.info('Attempting error recovery', {
      toolName: tool.name,
      attempt,
      maxRetries,
    });

    // 2. 特定工具的恢复策略
    const recovered = await this.toolSpecificRecovery(error, tool, context, params);
    if (recovered) {
      return recovered;
    }

    // 3. 使用通用错误恢复
    try {
      return await this.errorHandler.attemptRecovery(error, async () => {
        return await tool.handler(context, params);
      });
    } catch (recoveryError) {
      this.logger.warn('Recovery attempt failed', {
        originalError: error.message,
        recoveryError: (recoveryError as Error).message,
      });
      return null;
    }
  }

  /**
   * 工具特定的错误恢复
   */
  private async toolSpecificRecovery(
    error: Error,
    tool: ToolDefinition,
    context: ToolContext,
    params: any
  ): Promise<ToolResult | null> {
    // 文件系统工具 - 检查路径是否被 .clineignore 阻止
    if (tool.category === 'filesystem' && error.message.includes('Access denied')) {
      this.logger.info('File access denied by .clineignore', {
        path: params.path,
      });
      return {
        success: false,
        error: `Access to path ${params.path} is blocked by .clineignore settings`,
      };
    }

    // Git 工具 - 检查是否在 Git 仓库中
    if (tool.category === 'git' && error.message.includes('not a git repository')) {
      this.logger.info('Not in a git repository', {
        toolName: tool.name,
      });
      return {
        success: false,
        error: 'Not in a git repository. Please initialize git first.',
      };
    }

    // GitHub 工具 - 检查认证
    if (tool.category === 'github' && error.message.includes('authentication')) {
      this.logger.info('GitHub authentication failed', {
        toolName: tool.name,
      });
      return {
        success: false,
        error: 'GitHub authentication failed. Please check your token.',
      };
    }

    // 浏览器工具 - 清理资源
    if (tool.category === 'browser') {
      this.logger.info('Browser tool error, cleaning up resources');
      // TODO: 清理浏览器资源
    }

    // 没有特定的恢复策略
    return null;
  }

  /**
   * 清理资源
   */
  async cleanup(tool: ToolDefinition, context: ToolContext): Promise<void> {
    this.logger.debug('Cleaning up resources for tool', {
      toolName: tool.name,
    });

    // TODO: 实现资源清理逻辑
    // - 关闭文件句柄
    // - 清理临时文件
    // - 释放内存
    // - 关闭网络连接
  }
}

/**
 * 增强的工具执行器(带生命周期管理)
 */
export class EnhancedToolExecutor {
  private logger: Logger;
  private lifecycleManager: ToolLifecycleManager;
  private validator: ToolValidator;

  constructor() {
    this.logger = new Logger('EnhancedToolExecutor');
    this.lifecycleManager = new ToolLifecycleManager();
    this.validator = new ToolValidator();
    this.setupDefaultHooks();
  }

  /**
   * 设置默认钩子
   */
  private setupDefaultHooks(): void {
    // 执行前钩子 - 验证参数
    this.lifecycleManager.registerHook(
      ToolLifecycleEvent.BEFORE_EXECUTE,
      async (context, tool, params) => {
        this.logger.debug('Validating tool parameters', {
          toolName: tool.name,
        });
        // 参数验证
      }
    );

    // 执行后钩子 - 记录统计
    this.lifecycleManager.registerHook(
      ToolLifecycleEvent.AFTER_EXECUTE,
      async (context, tool, params) => {
        this.logger.debug('Tool execution completed', {
          toolName: tool.name,
        });
        // TODO: 记录统计信息
      }
    );

    // 错误钩子 - 增加错误计数
    this.lifecycleManager.registerHook(
      ToolLifecycleEvent.ON_ERROR,
      async (context, tool, params) => {
        this.logger.warn('Tool execution failed', {
          toolName: tool.name,
        });
        // TODO: 增加错误计数
      }
    );
  }

  /**
   * 执行工具(带完整的生命周期管理)
   */
  async execute(tool: ToolDefinition, params: any, context: ToolContext): Promise<ToolResult> {
    this.logger.info('Executing tool', {
      toolName: tool.name,
      category: tool.category,
    });

    // 1. 验证工具可用性
    const availability = await this.validator.validateAvailability(tool, context);
    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || 'Tool not available',
      };
    }

    // 2. 验证参数
    const validation = this.validator.validateParameters(tool, params);
    if (!validation.valid) {
      this.logger.error('Parameter validation failed', {
        toolName: tool.name,
        errors: validation.errors,
      });

      return {
        success: false,
        error: `Invalid parameters: ${validation.errors.join(', ')}`,
      };
    }

    // 记录警告
    if (validation.warnings && validation.warnings.length > 0) {
      this.logger.warn('Parameter validation warnings', {
        toolName: tool.name,
        warnings: validation.warnings,
      });
    }

    // 3. 使用生命周期管理器执行工具
    return this.lifecycleManager.executeWithLifecycle(tool, params, context);
  }

  /**
   * 获取生命周期管理器
   */
  getLifecycleManager(): ToolLifecycleManager {
    return this.lifecycleManager;
  }
}

/**
 * 全局实例
 */
export const toolLifecycleManager = new ToolLifecycleManager();
export const enhancedToolExecutor = new EnhancedToolExecutor();
