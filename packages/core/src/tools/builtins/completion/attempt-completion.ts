/**
 * ATTEMPT_COMPLETION 工具
 *
 * 用于完成任务并展示结果给用户
 * 参考 Cline 实现：cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts
 *
 * 功能：
 * 1. 展示任务完成结果
 * 2. 可选地执行命令演示结果
 * 3. 支持用户反馈继续对话
 * 4. 更新任务进度清单
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';
import { ToolPermission } from '@git-tutor/shared';
import { toolRegistry } from '../../registry.js';

/**
 * 任务进度项
 */
interface TaskProgressItem {
  /** 任务标题 */
  title: string;
  /** 是否已完成 */
  completed: boolean;
  /** 额外信息（可选） */
  info?: string;
}

/**
 * 工具参数
 */
interface AttemptCompletionParams {
  /** 任务结果描述（必需） */
  result: string;
  /** 可执行的演示命令（可选） */
  command?: string;
  /** 任务进度清单（可选，如果之前使用过 focus_chain） */
  task_progress?: TaskProgressItem[];
}

/**
 * 执行命令并返回结果
 */
async function executeCommand(
  command: string,
  context: ToolContext
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    // 检查是否有命令执行服务
    const commandService = context.services.command;
    if (!commandService) {
      // 如果没有服务，尝试使用 execute_command 工具
      const toolResult = await context.toolExecutor?.execute('execute_command', context, {
        command,
        timeout: 30,
      });

      if (toolResult?.success) {
        return {
          success: true,
          output: toolResult.data?.output || toolResult.data?.stdout,
        };
      }

      return {
        success: false,
        error: toolResult?.error || '命令执行失败',
      };
    }

    // 使用服务执行命令
    const result = await commandService.execute(command, {
      cwd: context.projectPath,
      timeout: 30000,
    });

    return {
      success: result.success,
      output: result.data?.output,
      error: result.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '命令执行异常',
    };
  }
}

/**
 * 验证命令是否为演示命令（而非简单的文本打印）
 */
function isValidDemoCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();

  // 禁止使用 echo/cat 等简单打印命令
  const forbiddenPatterns = [/^echo\s+/, /^cat\s+/, /^printf\s+/, /^print\s+/];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}

/**
 * ATTEMPT_COMPLETION 工具定义
 */
const attemptCompletionTool: ToolDefinition = {
  name: 'attempt_completion',
  displayName: '完成任务',
  description:
    '在任务成功完成后使用此工具向用户展示结果。可以包含可选的命令来演示结果，以及任务进度清单。注意：只有在确认所有工具使用成功后才能调用此工具。',
  category: 'completion',
  parameters: [
    {
      name: 'result',
      type: 'string',
      description: '任务的最终结果描述。应该清晰、具体地说明完成了什么，以及如何验证结果是否成功。',
      required: true,
    },
    {
      name: 'command',
      type: 'string',
      description:
        "用于演示结果的可执行 CLI 命令（可选）。例如：'npm test', 'python main.py', 'npm start'。注意：不能使用 echo/cat 等简单的文本打印命令。",
      required: false,
    },
    {
      name: 'task_progress',
      type: 'array',
      description:
        '任务进度清单（可选）。如果在之前的工具调用中使用了 task_progress，则在此处必须提供最终状态。',
      required: false,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '任务标题' },
          completed: { type: 'boolean', description: '是否已完成' },
          info: { type: 'string', description: '额外信息' },
        },
      },
    },
  ],
  permissions: [], // 完成工具不需要特殊权限
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      const { result, command, task_progress } = params as AttemptCompletionParams;

      // 1. 参数验证
      if (!result || typeof result !== 'string' || result.trim().length === 0) {
        return {
          success: false,
          error: "参数 'result' 必须是非空字符串",
        };
      }

      // 2. 验证命令（如果提供）
      if (command) {
        if (typeof command !== 'string' || command.trim().length === 0) {
          return {
            success: false,
            error: "参数 'command' 必须是非空字符串",
          };
        }

        if (!isValidDemoCommand(command)) {
          return {
            success: false,
            error:
              "参数 'command' 不能使用 echo/cat 等简单的文本打印命令。请提供一个可执行的演示命令。",
          };
        }
      }

      // 3. 准备响应数据
      const responseData: any = {
        success: true,
        result: result.trim(),
        completed: true,
      };

      // 4. 添加任务进度（如果提供）
      if (task_progress && Array.isArray(task_progress)) {
        // 验证任务进度格式
        const validProgress = task_progress.every(
          (item) =>
            typeof item === 'object' &&
            typeof item.title === 'string' &&
            typeof item.completed === 'boolean'
        );

        if (!validProgress) {
          return {
            success: false,
            error:
              "参数 'task_progress' 格式无效。每个项目必须包含 title (string) 和 completed (boolean) 字段。",
          };
        }

        responseData.task_progress = task_progress;
      }

      // 5. 执行命令（如果提供）
      if (command) {
        const commandResult = await executeCommand(command.trim(), context);

        if (commandResult.success) {
          responseData.command = {
            executed: command.trim(),
            output: commandResult.output,
          };
        } else {
          // 命令执行失败不应该阻止任务完成
          responseData.command = {
            executed: command.trim(),
            error: commandResult.error,
            note: '命令执行失败，但任务已标记为完成',
          };
        }
      }

      // 6. 添加时间戳
      responseData.completedAt = new Date().toISOString();

      // 7. 返回成功结果
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * 注册 ATTEMPT_COMPLETION 工具
 */
export function registerAttemptCompletionTool(): void {
  toolRegistry.register(attemptCompletionTool);
}

// 导出工具
export { attemptCompletionTool };
export type { AttemptCompletionParams, TaskProgressItem };
