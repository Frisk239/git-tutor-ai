/**
 * CONDENSE 工具 - 对话历史压缩
 *
 * 基于 Cline 的 condense 实现
 * 当对话变得过长时,生成压缩的对话摘要以管理上下文窗口
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 ContextManager 管理复杂的多策略截断
 * - Git Tutor AI: Web 应用,通过回调函数与前端通信,简化版本
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';

// ============================================================================
// 类型定义
// ============================================================================

export interface CondenseParams {
  /** 压缩后的上下文内容 */
  context: string;
}

export interface CondenseResult {
  /** 压缩是否被接受 */
  accepted: boolean;
  /** 用户反馈(如果拒绝) */
  feedback?: string;
  /** 消息 */
  message: string;
  /** 压缩时间戳 */
  timestamp: string;
}

// ============================================================================
// 工具处理器
// ============================================================================

class CondenseToolHandler {
  /**
   * 用户确认回调
   * 格式: (context: string) => Promise<{ accepted: boolean; feedback?: string }>
   */
  private onConfirm?: (context: string) => Promise<{
    accepted: boolean;
    feedback?: string;
  }>;

  /**
   * 设置确认回调
   */
  setConfirmCallback(
    callback: (context: string) => Promise<{
      accepted: boolean;
      feedback?: string;
    }>
  ): void {
    this.onConfirm = callback;
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { context: condensedContext } = params as CondenseParams;

      // 验证必需参数存在
      if (condensedContext === undefined || condensedContext === null) {
        return {
          success: false,
          error: '缺少必需参数: context',
        };
      }

      // 验证 context 内容不为空
      if (typeof condensedContext !== 'string' || condensedContext.trim().length === 0) {
        return {
          success: false,
          error: 'context 参数不能为空',
        };
      }

      // 如果有确认回调,调用它
      if (this.onConfirm) {
        const result = await this.onConfirm(condensedContext);

        if (result.accepted) {
          return {
            success: true,
            data: {
              accepted: true,
              message: '用户已接受压缩的对话摘要',
              timestamp: new Date().toISOString(),
            } as CondenseResult,
          };
        } else {
          return {
            success: true,
            data: {
              accepted: false,
              feedback: result.feedback,
              message: '用户提供了反馈,而不是接受压缩摘要',
              timestamp: new Date().toISOString(),
            } as CondenseResult,
          };
        }
      }

      // 如果没有确认回调,默认为接受
      return {
        success: true,
        data: {
          accepted: true,
          message: '已接受压缩的对话摘要',
          timestamp: new Date().toISOString(),
        } as CondenseResult,
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

export const condenseTool: ToolDefinition = {
  name: 'condense',
  displayName: '压缩对话',
  description:
    '当对话变得过长时,压缩对话历史以管理上下文窗口。使用此工具时,你需要创建一个详细的对话摘要,捕捉关键信息以便继续任务。' +
    '\n\n**压缩内容应包含**:' +
    '\n1. **前序对话概要**: 高层次的对话概述,包括用户的主要目标和意图' +
    '\n2. **当前工作**: 详细描述最近正在进行的工作,特别注意最后几轮对话' +
    '\n3. **关键技术概念**: 列出所有重要的技术概念、技术、编码约定和讨论过的框架' +
    '\n4. **相关文件和代码**: 如果适用,列举为任务延续而检查、修改或创建的特定文件和代码部分' +
    '\n5. **问题解决**: 记录迄今为止解决的问题以及任何正在进行的故障排除工作' +
    '\n6. **待处理任务和下一步**: 列出所有待处理任务和下一步计划。如果适用,包含代码片段以增加清晰度' +
    '\n\n**使用时机**:' +
    '\n- 对话历史接近 AI 模型的上下文窗口限制时' +
    '\n- 需要保持对话连续性但减少 token 消耗时' +
    '\n- 长时间开发会话中的内存管理' +
    '\n\n**注意**: 压缩后应确保能够继续之前的任务,不丢失重要信息。',
  category: 'task',
  parameters: [
    {
      name: 'context',
      type: 'string',
      required: true,
      description:
        '压缩后的对话上下文。应包含:' +
        '\n1. 前序对话概要: 高层次的对话概述' +
        '\n2. 当前工作: 详细描述最近的工作' +
        '\n3. 关键技术概念: 重要的技术和框架' +
        '\n4. 相关文件和代码: 检查、修改或创建的文件' +
        '\n5. 问题解决: 解决的问题和故障排除' +
        '\n6. 待处理任务和下一步: 待处理任务和下一步计划',
    },
  ],
  permissions: [], // condense 不需要特殊权限
  enabled: true,
  handler: new CondenseToolHandler(),
};

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建带有自定义回调的 condense 工具
 */
export function createCondenseTool(
  onConfirm: (context: string) => Promise<{
    accepted: boolean;
    feedback?: string;
  }>
): ToolDefinition {
  const handler = new CondenseToolHandler();
  handler.setConfirmCallback(onConfirm);

  return {
    ...condenseTool,
    handler,
  };
}

// 默认导出
export default condenseTool;
