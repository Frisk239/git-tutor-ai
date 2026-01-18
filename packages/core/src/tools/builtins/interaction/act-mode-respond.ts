/**
 * ACT_MODE_RESPOND 工具 - 执行模式响应
 *
 * 设计说明:
 * - Cline: 在 ACT MODE 下向用户汇报进度,非阻塞,立即继续执行
 * - Git Tutor AI: 类似功能,用于在任务执行过程中向用户提供进度更新
 *
 * 核心特性:
 * 1. 非阻塞 - 显示消息后立即返回,不需要等待用户响应
 * 2. 进度更新 - 向用户展示当前正在做什么,接下来要做什么
 * 3. 任务列表更新 - 可选地更新任务进度清单 (focus_chain)
 *
 * 与 ask 工具的区别:
 * - ask: 阻塞式,需要等待用户响应
 * - act_mode_respond: 非阻塞式,单向信息传递
 */

import { ToolDefinition, ToolHandler, ToolContext } from "../../types.js";

// ============================================================================
// 常量定义
// ============================================================================

// ============================================================================
// 类型定义
// ============================================================================

export interface ActModeRespondParams {
  /** 要向用户展示的消息 (必需) */
  response: string;
  /** 任务进度清单 (可选) */
  task_progress?: string;
}

export interface ActModeRespondResult {
  /** 是否成功显示消息 */
  success: boolean;
  /** 显示的消息 */
  message: string;
  /** 是否更新了任务进度 */
  progressUpdated?: boolean;
}

// ============================================================================
// 进度更新回调接口
// ============================================================================

/**
 * 进度更新回调接口
 *
 * 用于连接到前端 UI,显示进度更新
 */
export interface ProgressUpdateCallbacks {
  /**
   * 显示进度更新 (非阻塞)
   * @param message 进度消息
   * @param taskProgress 任务进度清单 (可选)
   * @returns Promise<void> 立即返回,不等待用户响应
   */
  showProgress: (message: string, taskProgress?: string) => Promise<void>;

  /**
   * 更新任务清单 (可选)
   * @param taskProgress 任务进度清单 (markdown 格式)
   */
  updateTaskList?: (taskProgress: string) => Promise<void>;
}

/**
 * 创建默认的进度更新回调
 *
 * 在实际应用中,你需要提供真实的回调函数
 * 这里提供一个 mock 实现,用于演示和测试
 */
export function createDefaultProgressCallbacks(): ProgressUpdateCallbacks {
  return {
    showProgress: async (message: string, taskProgress?: string): Promise<void> => {
      // 默认实现: 打印到控制台
      console.log(`\n📋 [进度更新] ${message}`);

      if (taskProgress) {
        console.log(`\n任务进度:`);
        console.log(taskProgress);
      }
    },

    updateTaskList: async (taskProgress: string): Promise<void> => {
      console.log(`\n✅ 任务清单已更新`);
      console.log(taskProgress);
    },
  };
}

// ============================================================================
// 工具处理器
// ============================================================================

class ActModeRespondToolHandler implements ToolHandler {
  private callbacks: ProgressUpdateCallbacks;
  private lastCallTime = 0;
  private readonly MIN_INTERVAL_MS = 1000; // 最小间隔 1 秒

  constructor(callbacks?: ProgressUpdateCallbacks) {
    this.callbacks = callbacks || createDefaultProgressCallbacks();
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 1. 参数验证
      const { response, task_progress } = params as ActModeRespondParams;

      if (!response || typeof response !== "string" || response.trim().length === 0) {
        return {
          success: false,
          error: "缺少必需参数: response (必须是非空字符串)",
        };
      }

      // 2. 防止频繁调用 (与 Cline 一样的约束: 不能连续调用)
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;

      if (timeSinceLastCall < this.MIN_INTERVAL_MS) {
        return {
          success: false,
          error: `act_mode_respond 不能在短时间内连续调用。请等待至少 ${this.MIN_INTERVAL_MS}ms 后再试。`,
        };
      }

      this.lastCallTime = now;

      // 3. 显示进度更新 (非阻塞)
      await this.callbacks.showProgress(response, task_progress);

      // 4. 如果提供了任务进度,更新任务清单
      let progressUpdated = false;
      if (task_progress && this.callbacks.updateTaskList) {
        await this.callbacks.updateTaskList(task_progress);
        progressUpdated = true;
      }

      // 5. 立即返回成功 (不等待用户响应)
      return {
        success: true,
        data: {
          success: true,
          message: response,
          progressUpdated,
        } as ActModeRespondResult,
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

export const actModeRespondTool: ToolDefinition = {
  name: "act_mode_respond",
  displayName: "执行模式响应",
  description:
    "在任务执行过程中向用户提供进度更新。" +
    "\n\n**核心特性**:" +
    "\n- **非阻塞**: 显示消息后立即返回,不需要等待用户响应" +
    "\n- **进度更新**: 向用户展示当前正在做什么,接下来要做什么" +
    "\n- **任务跟踪**: 可选地更新任务进度清单" +
    "\n\n**使用场景**:" +
    "\n- 读取文件后、进行编辑前 - 解释分析结果和计划进行的更改" +
    "\n- 开始新的工作阶段时 - 说明即将进行的工作 (例如: 从后端切换到前端)" +
    "\n- 长时间操作过程中 - 提供进度更新,让用户知道正在进行的工作" +
    "\n- 方法或策略改变时 - 解释为什么选择新的方法" +
    "\n- 执行复杂或可能有风险的操作前 - 说明将要进行的操作" +
    "\n- 解释为什么选择某种方法而不是另一种" +
    "\n\n**不要用于**:" +
    "\n- 完成所有任务并准备展示最终结果时 (这种情况应该使用其他完成工具)" +
    "\n- 需要用户输入或决策时 (应该使用 ask 工具)" +
    "\n\n**重要约束**:" +
    "\n- **不能连续调用**: 两次调用之间至少间隔 1 秒" +
    "\n- **必须是真正的进度更新**: 不应滥用此工具发送无关信息" +
    "\n\n**参数**:" +
    "\n- response: 要向用户展示的消息 (必需,应该简洁明了)" +
    "\n- task_progress: 任务进度清单 (可选,markdown 格式的清单)",
  category: "interaction" as any,
  parameters: [
    {
      name: "response",
      type: "string",
      required: true,
      description:
        "要向用户展示的消息。应该解释你即将做什么、当前进度或你的推理。消息应该简洁明了,语气友好,让用户了解情况而不会压倒他们。",
    },
    {
      name: "task_progress",
      type: "string",
      required: false,
      description:
        "任务进度清单,显示此工具使用完成后的最新状态。应该是 markdown 格式的清单,例如:\n- [x] 已完成任务1\n- [ ] 进行中任务2\n- [ ] 待办任务3",
    },
  ],
  permissions: [],
  enabled: true,
  handler: new ActModeRespondToolHandler(),
} as any;

/**
 * 创建自定义的 ACT_MODE_RESPOND 工具实例
 *
 * @param callbacks 进度更新回调函数
 * @returns ACT_MODE_RESPOND 工具定义
 */
export function createActModeRespondTool(callbacks: ProgressUpdateCallbacks): ToolDefinition {
  return {
    ...actModeRespondTool,
    handler: new ActModeRespondToolHandler(callbacks),
  };
}

// 默认导出
export default actModeRespondTool;
