// 工具执行器实现
import type {
  ToolContext,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
  ToolExecution,
} from "./types.js";
import { toolRegistry } from "./registry.js";
import { ToolPermission } from "@git-tutor/shared";
import { ToolValidator, ValidationResult } from "./validation.js";
import { ToolStatsManager } from "./stats.js";
import { Logger } from "../logging/logger.js";

/**
 * 工具执行器实现
 */
export class ToolExecutorImpl implements ToolExecutor {
  private executions: Map<string, ToolExecution> = new Map();
  private executionHistory: ToolExecution[] = [];
  private validator: ToolValidator;
  private statsManager: ToolStatsManager;
  private logger: Logger;

  constructor() {
    this.validator = new ToolValidator();
    this.statsManager = new ToolStatsManager();
    this.logger = new Logger("ToolExecutorImpl");
  }

  /**
   * 执行工具(增强版:集成验证和统计)
   */
  async execute(
    toolName: string,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // 1. 获取工具定义
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
      };
    }

    // 2. 检查工具是否启用
    if (!tool.enabled) {
      return {
        success: false,
        error: `Tool ${toolName} is disabled`,
      };
    }

    // 3. 检查权限
    if (!this.checkPermission(toolName, tool.permissions)) {
      return {
        success: false,
        error: `Permission denied for tool ${toolName}`,
      };
    }

    // 4. 验证参数(使用增强的验证器)
    const validationResult = this.validator.validateParameters(tool, params);
    if (!validationResult.valid) {
      this.logger.error("Parameter validation failed", {
        toolName,
        errors: validationResult.errors,
      });

      // 记录失败的执行
      this.statsManager.recordExecution(tool, {
        success: false,
        error: validationResult.errors.join(", "),
      });

      return {
        success: false,
        error: `Invalid parameters: ${validationResult.errors.join(", ")}`,
      };
    }

    // 记录警告
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      this.logger.warn("Parameter validation warnings", {
        toolName,
        warnings: validationResult.warnings,
      });
    }

    // 5. 检查工具可用性
    const availability = await this.validator.validateAvailability(tool, context);
    if (!availability.available) {
      this.logger.error("Tool not available", {
        toolName,
        reason: availability.reason,
      });

      // 记录失败的执行
      this.statsManager.recordExecution(tool, {
        success: false,
        error: availability.reason || "Tool not available",
      });

      return {
        success: false,
        error: availability.reason || "Tool not available",
      };
    }

    // 6. 创建执行记录
    const executionId = this.generateExecutionId();
    const execution: ToolExecution = {
      id: executionId,
      toolName,
      params,
      status: "running",
      startTime: new Date(),
    };
    this.executions.set(executionId, execution);

    try {
      // 7. 执行工具
      const result = await tool.handler(context, params);

      // 8. 更新执行记录
      execution.status = "completed";
      execution.result = result;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // 9. 添加到历史
      this.executionHistory.push(execution);

      // 10. 记录统计(成功)
      this.statsManager.recordExecution(tool, result, execution.duration, params);

      return result;
    } catch (error: any) {
      // 错误处理
      execution.status = "failed";
      execution.error = error;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // 记录统计(失败)
      this.statsManager.recordExecution(tool, {
        success: false,
        error: error.message,
      }, execution.duration, params);

      return {
        success: false,
        error: error.message || "Tool execution failed",
        metadata: {
          stack: error.stack,
        },
      };
    } finally {
      // 清理旧的执行记录
      this.cleanupOldExecutions();
    }
  }

  /**
   * 批量执行工具
   */
  async executeBatch(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context: ToolContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const execution of executions) {
      const result = await this.execute(
        execution.toolName,
        execution.params,
        context
      );
      results.push(result);

      // 如果失败，可以选择停止或继续
      if (!result.success) {
        // 这里我们继续执行所有工具，收集所有错误
      }
    }

    return results;
  }

  /**
   * 并行执行工具
   */
  async executeParallel(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context: ToolContext
  ): Promise<ToolResult[]> {
    const promises = executions.map((execution) =>
      this.execute(execution.toolName, execution.params, context)
    );

    return Promise.all(promises);
  }

  /**
   * 检查权限
   */
  checkPermission(
    toolName: string,
    requiredPermissions: ToolPermission[]
  ): boolean {
    // TODO: 实现权限检查逻辑
    // 目前暂时返回 true，后续可以集成用户权限系统
    return true;
  }

  /**
   * 获取执行记录
   */
  getExecution(executionId: string): ToolExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit?: number): ToolExecution[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * 清空执行历史
   */
  clearHistory(): void {
    this.executionHistory = [];
    this.executions.clear();
  }

  /**
   * 获取统计信息(增强版)
   */
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    avgDuration: number;
    toolStats: any;
  } {
    const history = this.getExecutionHistory();
    const completed = history.filter((e) => e.status === "completed");
    const failed = history.filter((e) => e.status === "failed");
    const running = history.filter((e) => e.status === "running");

    const totalDuration = completed.reduce((sum, e) => sum + (e.duration || 0), 0);
    const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;

    return {
      total: history.length,
      completed: completed.length,
      failed: failed.length,
      running: running.length,
      avgDuration: Math.round(avgDuration),
      toolStats: this.statsManager.getStats(),
    };
  }

  /**
   * 获取工具统计管理器
   */
  getStatsManager(): ToolStatsManager {
    return this.statsManager;
  }

  // ============= 私有方法 =============

  /**
   * 验证参数
   */
  private validateParameters(
    tool: ToolDefinition,
    params: Record<string, any>
  ): { valid: boolean; error?: string } {
    // 检查必需参数
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return {
          valid: false,
          error: `Missing required parameter: ${param.name}`,
        };
      }

      // 类型检查
      if (param.name in params) {
        const value = params[param.name];
        if (!this.checkType(value, param.type)) {
          return {
            valid: false,
            error: `Parameter ${param.name} must be of type ${param.type}`,
          };
        }

        // 枚举检查
        if (param.enum && !param.enum.includes(value)) {
          return {
            valid: false,
            error: `Parameter ${param.name} must be one of: ${param.enum.join(", ")}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 检查类型
   */
  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number";
      case "boolean":
        return typeof value === "boolean";
      case "array":
        return Array.isArray(value);
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理旧的执行记录
   */
  private cleanupOldExecutions(maxHistory: number = 1000): void {
    if (this.executionHistory.length > maxHistory) {
      this.executionHistory = this.executionHistory.slice(-maxHistory);
    }
  }
}

/**
 * 导出单例实例
 */
export const toolExecutor = new ToolExecutorImpl();
