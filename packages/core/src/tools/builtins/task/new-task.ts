/**
 * NEW_TASK 工具 - 创建新任务
 *
 * 基于 Cline 的 new_task 实现
 * 允许 AI 在当前对话中创建一个新任务,并预加载上下文
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 webview 显示对话框
 * - Git Tutor AI: Web 应用,通过回调函数与前端通信
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from '../../types.js';

// ============================================================================
// 类型定义
// ============================================================================

export interface NewTaskParams {
  /** 上下文内容 */
  context: string;
}

export interface NewTaskResult {
  /** 用户反馈 (如果用户选择不创建新任务) */
  feedback?: string;
  /** 是否创建了新任务 */
  taskCreated: boolean;
  /** 消息 */
  message: string;
}

// ============================================================================
// 工具处理器
// ============================================================================

class NewTaskToolHandler implements ToolHandler {
  /**
   * 用户确认回调
   * 格式: (context: string) => Promise<{ created: boolean; feedback?: string }>
   */
  private onConfirm?: (context: string) => Promise<{
    created: boolean;
    feedback?: string;
  }>;

  /**
   * 设置确认回调
   */
  setConfirmCallback(
    callback: (context: string) => Promise<{
      created: boolean;
      feedback?: string;
    }>
  ): void {
    this.onConfirm = callback;
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { context: taskContext } = params as NewTaskParams;

      // 验证必需参数
      if (!taskContext) {
        return {
          success: false,
          error: '缺少必需参数: context',
        };
      }

      // 如果有确认回调,调用它
      if (this.onConfirm) {
        const result = await this.onConfirm(taskContext);

        if (result.created) {
          return {
            success: true,
            data: {
              taskCreated: true,
              message: '用户已创建新任务',
              feedback: result.feedback, // 包含反馈（即使创建了任务）
            } as NewTaskResult,
          };
        } else {
          return {
            success: true,
            data: {
              taskCreated: false,
              feedback: result.feedback,
              message: '用户提供了反馈,而不是创建新任务',
            } as NewTaskResult,
          };
        }
      }

      // 如果没有确认回调,默认为直接创建
      return {
        success: true,
        data: {
          taskCreated: true,
          message: '已创建新任务',
        } as NewTaskResult,
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

export const newTaskTool: ToolDefinition = {
  name: 'new_task',
  displayName: '新建任务',
  description:
    '请求创建一个新任务,并预加载当前对话的上下文。使用此工具时,你需要创建对话的详细摘要,重点关注用户的明确请求、你之前的操作,以及新任务所需的最相关信息。这个摘要应该详细地捕捉技术细节、代码模式和架构决策。用户将看到你生成的上下文预览,可以选择创建新任务或继续当前对话。' +
    '\n\n**上下文应包含**:' +
    '\n1. **当前工作**: 详细描述创建新任务之前正在进行的工作。特别注意最近的消息/对话。' +
    '\n2. **关键技术概念**: 列出所有重要的技术概念、技术、编码约定和讨论过的框架,这些可能与新任务相关。' +
    '\n3. **相关文件和代码**: 如果适用,列举为任务延续而检查、修改或创建的特定文件和代码部分。特别注意最近的消息和更改。' +
    '\n4. **问题解决**: 记录迄今为止解决的问题以及任何正在进行的故障排除工作。' +
    '\n5. **待处理任务和下一步**: 列出你被明确要求处理的所有待处理任务,以及所有未完成工作的下一步计划。如果适用,包含代码片段以增加清晰度。对于任何下一步,包含最近对话中的直接引用,准确显示你正在处理的任务以及中断的位置。这应该是逐字的,以确保任务之间的上下文没有信息丢失。这一点很重要。',
  category: 'task',
  parameters: [
    {
      name: 'context',
      type: 'string',
      required: true,
      description:
        '要预加载到新任务的上下文。如果适用,应包含:' +
        '\n1. 当前工作: 详细描述正在进行的工作' +
        '\n2. 关键技术概念: 列出所有重要的技术概念和技术' +
        '\n3. 相关文件和代码: 列举检查、修改或创建的文件' +
        '\n4. 问题解决: 记录解决的问题和故障排除工作' +
        '\n5. 待处理任务和下一步: 列出待处理任务和下一步计划',
    },
  ],
  permissions: [], // new_task 不需要特殊权限
  enabled: true,
  handler: new NewTaskToolHandler(),
};

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建带有自定义回调的 new_task 工具
 */
export function createNewTaskTool(
  onConfirm: (context: string) => Promise<{
    created: boolean;
    feedback?: string;
  }>
): ToolDefinition {
  const handler = new NewTaskToolHandler();
  handler.setConfirmCallback(onConfirm);

  return {
    ...newTaskTool,
    handler,
  };
}

// 默认导出
export default newTaskTool;
