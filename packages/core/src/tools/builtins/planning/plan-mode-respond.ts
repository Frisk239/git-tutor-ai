/**
 * PLAN_MODE_RESPOND 工具
 *
 * 在计划模式下向用户展示信息并收集反馈
 * 参考 Cline 实现：cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts
 *
 * 功能：
 * 1. 展示计划和策略
 * 2. 支持选项按钮快速响应
 * 3. needs_more_exploration 参数允许继续探索
 * 4. 支持任务进度清单
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';
import { toolRegistry } from '../../registry.js';

/**
 * 工具参数
 */
interface PlanModeRespondParams {
  /** 响应内容（必需） */
  response: string;
  /** 用户可选的选项列表（可选） */
  options?: string[];
  /** 是否需要更多探索（可选，默认 false） */
  needs_more_exploration?: boolean;
  /** 任务进度清单（可选） */
  task_progress?: Array<{
    title: string;
    completed: boolean;
    info?: string;
  }>;
}

/**
 * 解析选项数组
 * 处理可能的各种输入格式
 */
function parseOptions(options: any): string[] | undefined {
  if (!options) {
    return undefined;
  }

  // 如果已经是数组
  if (Array.isArray(options)) {
    return options.map(String);
  }

  // 如果是字符串，尝试解析 JSON
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // 解析失败，返回 undefined
    }
  }

  return undefined;
}

/**
 * PLAN_MODE_RESPOND 工具定义
 */
const planModeRespondTool: ToolDefinition = {
  name: 'plan_mode_respond',
  displayName: '计划模式响应',
  description:
    '在计划模式下向用户展示信息并收集反馈。支持展示计划、提供选项供用户选择，或者通过 needs_more_exploration 参数表明需要更多信息后再继续。注意：此工具仅在计划模式下可用。',
  category: 'planning',
  parameters: [
    {
      name: 'response',
      type: 'string',
      description: '要发送给用户的响应内容。应该包含清晰的信息，如计划说明、策略描述等。',
      required: true,
    },
    {
      name: 'options',
      type: 'array',
      description:
        "为用户提供的可选项按钮列表。用户可以点击这些选项快速响应，而不需要手动输入文本。例如：['批准计划', '修改计划', '添加更多细节']",
      required: false,
      items: {
        type: 'string',
      },
    },
    {
      name: 'needs_more_exploration',
      type: 'boolean',
      description:
        '设置为 true 时表示你意识到需要更多信息（如读取文件、执行命令等）才能给出完整的计划。设置此参数后，工具会立即返回而不阻塞，允许你继续调用其他工具收集信息。',
      required: false,
      default: false,
    },
    {
      name: 'task_progress',
      type: 'array',
      description: '任务进度清单。展示具体的任务步骤和完成状态。',
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
  permissions: [], // 计划响应工具不需要特殊权限
  enabled: true,

  handler: async (_context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      const { response, options, needs_more_exploration, task_progress } =
        params as PlanModeRespondParams;

      // 1. 参数验证
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return {
          success: false,
          error: "参数 'response' 必须是非空字符串",
        };
      }

      // 2. 解析选项
      const parsedOptions = parseOptions(options);

      // 3. 验证选项格式
      if (parsedOptions) {
        if (!Array.isArray(parsedOptions)) {
          return {
            success: false,
            error: "参数 'options' 必须是数组",
          };
        }

        if (parsedOptions.length === 0) {
          return {
            success: false,
            error: "参数 'options' 不能为空数组",
          };
        }

        if (parsedOptions.some((opt) => typeof opt !== 'string' || opt.trim().length === 0)) {
          return {
            success: false,
            error: "参数 'options' 中的所有选项必须是非空字符串",
          };
        }
      }

      // 4. 处理 needs_more_exploration
      if (needs_more_exploration === true) {
        return {
          success: true,
          data: {
            needs_more_exploration: true,
            message:
              '[You have indicated that you need more exploration. Proceed with calling tools to continue the planning process.]',
          },
        };
      }

      // 5. 验证任务进度格式（如果提供）
      if (task_progress && Array.isArray(task_progress)) {
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
      }

      // 6. 准备响应数据
      const responseData: any = {
        success: true,
        response: response.trim(),
        mode: 'plan',
      };

      // 7. 添加选项（如果有）
      if (parsedOptions && parsedOptions.length > 0) {
        responseData.options = parsedOptions;
      }

      // 8. 添加任务进度（如果有且非空）
      if (task_progress && Array.isArray(task_progress) && task_progress.length > 0) {
        responseData.task_progress = task_progress;
      }

      // 9. 添加时间戳
      responseData.timestamp = new Date().toISOString();

      // 10. 返回成功结果
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
 * 注册 PLAN_MODE_RESPOND 工具
 */
export function registerPlanModeRespondTool(): void {
  toolRegistry.register(planModeRespondTool);
}

// 导出工具
export { planModeRespondTool };
export type { PlanModeRespondParams };
