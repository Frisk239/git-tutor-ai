/**
 * SAY 工具 - 信息展示工具
 *
 * 基于 Cline 的 say 工具实现
 * 用于向用户展示信息、进度更新或重要通知
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 gRPC 与 webview 通信,支持多种消息类型
 * - Git Tutor AI: Web 应用,通过回调函数与前端通信,简化版本
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';

// ============================================================================
// 类型定义
// ============================================================================

export interface SayParams {
  /** 要展示给用户的信息 */
  message: string;
  /** 消息类型(可选) */
  type?: 'info' | 'success' | 'warning' | 'error' | 'progress';
}

export interface SayResult {
  /** 是否成功展示 */
  displayed: boolean;
  /** 消息 */
  message: string;
  /** 展示时间戳 */
  timestamp: string;
}

// ============================================================================
// 工具处理器
// ============================================================================

class SayToolHandler {
  /**
   * 信息展示回调
   * 格式: (message: string, type?: string) => Promise<boolean>
   */
  private onSay?: (message: string, type?: string) => Promise<boolean>;

  /**
   * 设置信息展示回调
   */
  setSayCallback(callback: (message: string, type?: string) => Promise<boolean>): void {
    this.onSay = callback;
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { message, type } = params as SayParams;

      // 验证必需参数存在
      if (message === undefined || message === null) {
        return {
          success: false,
          error: '缺少必需参数: message',
        };
      }

      // 验证参数类型和内容
      if (typeof message !== 'string' || message.trim().length === 0) {
        return {
          success: false,
          error: 'message 参数不能为空',
        };
      }

      // 验证 type 参数
      if (type !== undefined) {
        const validTypes = ['info', 'success', 'warning', 'error', 'progress'];
        if (!validTypes.includes(type)) {
          return {
            success: false,
            error: `type 参数必须是以下值之一: ${validTypes.join(', ')}`,
          };
        }
      }

      // 如果有回调,调用它
      if (this.onSay) {
        const displayed = await this.onSay(message, type);

        return {
          success: true,
          data: {
            displayed,
            message,
            timestamp: new Date().toISOString(),
          } as SayResult,
        };
      }

      // 如果没有回调,默认为成功(信息已记录)
      return {
        success: true,
        data: {
          displayed: false,
          message,
          timestamp: new Date().toISOString(),
        } as SayResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================================
// 工具定义
// ============================================================================

export const sayTool: ToolDefinition = {
  name: 'say',
  displayName: '展示信息',
  description:
    '向用户展示信息、进度更新或重要通知。使用此工具可以在任务执行过程中向用户传达重要信息。' +
    '\n\n**使用场景**:' +
    '\n- 展示任务进度更新' +
    '\n- 提供操作反馈' +
    '\n- 显示重要通知' +
    '\n- 告知用户下一步操作' +
    '\n\n**参数说明**:' +
    '\n- `message` (必需): 要展示给用户的信息' +
    '\n- `type` (可选): 消息类型,用于不同的视觉呈现' +
    '\n  - `info`: 一般信息(默认)' +
    '\n  - `success`: 成功消息' +
    '\n  - `warning`: 警告消息' +
    '\n  - `error`: 错误消息' +
    '\n  - `progress`: 进度更新' +
    '\n\n**注意事项**:' +
    '\n- 信息应该简洁明了,避免冗长' +
    '\n- 使用适当的 type 来增强用户体验' +
    '\n- 进度更新应该使用 `progress` 类型' +
    '\n- 错误信息应该使用 `error` 类型',
  category: 'communication',
  parameters: [
    {
      name: 'message',
      type: 'string',
      required: true,
      description: '要展示给用户的信息。应该简洁明了,避免冗长。',
    },
    {
      name: 'type',
      type: 'string',
      required: false,
      description:
        "消息类型,用于不同的视觉呈现。可选值: 'info'(默认), 'success', 'warning', 'error', 'progress'",
    },
  ],
  permissions: [], // say 工具不需要特殊权限
  enabled: true,
  handler: new SayToolHandler(),
};

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建带有自定义回调的 say 工具
 */
export function createSayTool(
  onSay: (message: string, type?: string) => Promise<boolean>
): ToolDefinition {
  const handler = new SayToolHandler();
  handler.setSayCallback(onSay);

  return {
    ...sayTool,
    handler,
  };
}

// 默认导出
export default sayTool;
