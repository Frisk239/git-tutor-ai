/**
 * ASK 工具 - 向用户提问工具
 *
 * 设计说明:
 * - Cline (VSCode插件): 通过 gRPC 直接与 Webview 通信
 * - Git Tutor AI (Web应用): 通过回调函数与前端通信，返回 promise 等待用户响应
 *
 * 核心差异:
 * 1. 通信机制: gRPC (Cline) vs 回调+Promise (Git Tutor AI)
 * 2. 用户交互: VSCode Webview vs Web UI
 * 3. 状态管理: 内置 TaskState vs 外部会话管理
 */

import { ToolDefinition, ToolHandler, ToolContext } from "../../types.js";

/**
 * ASK 工具参数
 */
export interface AskParams {
  /** 问题文本（必填） */
  question: string;
  /** 选项数组（可选），2-5个选项供用户选择 */
  options?: string[];
  /** 是否必需用户响应（默认 true） */
  required?: boolean;
  /** 超时时间（毫秒），默认不超时 */
  timeout?: number;
}

/**
 * ASK 工具返回结果
 */
export interface AskResult {
  /** 用户响应文本 */
  response: string;
  /** 用户选择的选项（如果有） */
  selectedOption?: string;
  /** 用户是否提供了响应 */
  hasResponse: boolean;
  /** 响应时间（毫秒） */
  responseTime: number;
}

/**
 * 用户交互回调接口
 *
 * 实现此接口以连接到你的 Web 前端
 */
export interface UserInteractionCallbacks {
  /**
   * 向用户提问并等待响应
   * @param question 问题文本
   * @param options 选项数组（可选）
   * @returns Promise<string> 用户响应
   */
  askUser: (question: string, options?: string[]) => Promise<string>;

  /**
   * 显示通知（可选）
   * @param title 通知标题
   * @param message 通知消息
   */
  showNotification?: (title: string, message: string) => void;
}

/**
 * 创建默认的用户交互处理器
 *
 * 注意: 在实际应用中，你需要提供真实的回调函数
 * 这里提供一个 mock 实现，用于演示和测试
 */
export function createDefaultInteractionCallbacks(): UserInteractionCallbacks {
  return {
    askUser: async (question: string, options?: string[]): Promise<string> => {
      // 在非交互式环境下的默认行为
      if (process.env.CI || process.env.NODE_ENV === "test") {
        if (options && options.length > 0) {
          // 测试环境返回第一个选项
          return options[0] ?? "";
        }
        // 测试环境返回默认响应
        return "[测试响应]";
      }

      // 非交互式环境（CLI、批处理等）
      console.log(`\n❓ 问题: ${question}`);
      if (options && options.length > 0) {
        console.log("选项:");
        options.forEach((opt, idx) => console.log(`  ${idx + 1}. ${opt}`));
        console.log("\n在非交互式环境下，默认选择第一个选项。");
        return options[0] ?? "";
      }

      console.log("在非交互式环境下，无法获取用户输入。");
      throw new Error("无法在非交互式环境下向用户提问");
    },

    showNotification: (title: string, message: string) => {
      console.log(`📢 [${title}] ${message}`);
    },
  };
}

/**
 * ASK 工具处理器
 */
class AskToolHandler implements ToolHandler {
  private callbacks: UserInteractionCallbacks;

  constructor(callbacks?: UserInteractionCallbacks) {
    this.callbacks = callbacks || createDefaultInteractionCallbacks();
  }

  async execute(
    _context: ToolContext,
    params: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string } | { success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();

    try {
      // 1. 参数验证
      const { question, options, required = true, timeout } = params;

      if (!question || question.trim().length === 0) {
        return {
          success: false,
          error: "问题文本不能为空",
        };
      }

      // 2. 验证选项
      if (options) {
        if (!Array.isArray(options)) {
          return {
            success: false,
            error: "选项必须是数组",
          };
        }

        if (options.length < 2 || options.length > 5) {
          return {
            success: false,
            error: "选项数量必须在 2-5 个之间",
          };
        }

        // 检查选项是否都是字符串
        for (const option of options) {
          if (typeof option !== "string") {
            return {
              success: false,
              error: "每个选项都必须是字符串",
            };
          }
        }
      }

      // 3. 显示通知（如果配置了）
      if (this.callbacks.showNotification) {
        this.callbacks.showNotification(
          "Git Tutor AI 需要您的输入",
          question.substring(0, 100) + (question.length > 100 ? "..." : "")
        );
      }

      // 4. 等待用户响应
      let response: string;
      try {
        // 创建超时 Promise
        const userResponsePromise = this.callbacks.askUser(question, options);

        if (timeout) {
          response = await Promise.race([
            userResponsePromise,
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error("用户响应超时")), timeout)
            ),
          ]);
        } else {
          response = await userResponsePromise;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // 如果是必需的提问，返回错误
        if (required) {
          return {
            success: false,
            error: `无法获取用户响应: ${errorMessage}`,
          };
        }

        // 非必需提问，返回空响应
        return {
          success: true,
          data: {
            response: "",
            hasResponse: false,
            responseTime: Date.now() - startTime,
          },
        };
      }

      // 5. 处理用户响应
      const selectedOption = options?.find((opt: string) => opt === response);
      const responseTime = Date.now() - startTime;

      // 6. 返回结果
      return {
        success: true,
        data: {
          response,
          selectedOption: selectedOption ?? "",
          hasResponse: response.trim().length > 0,
          responseTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * ASK 工具定义
 */
export const askTool: ToolDefinition = {
  name: "ask",
  displayName: "向用户提问",
  description:
    "向用户提问以收集完成任务所需的额外信息。当遇到歧义、需要澄清或需要更多细节才能有效进行时，应使用此工具。它通过启用与用户的直接通信来实现交互式问题解决。" +
    "\n\n使用场景:" +
    "\n- 需要澄清模糊的需求" +
    "\n- 需要在多个实现方案中做出选择" +
    "\n- 需要确认某些关键决策" +
    "\n- 需要用户提供缺失的信息",
  category: "interaction" as any,
  parameters: [
    {
      name: "question",
      type: "string",
      required: true,
      description: "要问用户的问题。应该是一个清晰、具体的问题，针对您需要的信息。",
    },
    {
      name: "options",
      type: "array",
      required: false,
      description:
        "供用户选择的选项数组（2-5个）。每个选项应该是一个描述可能答案的字符串。虽然不是总是需要提供选项，但在很多情况下这很有帮助，可以节省用户手动输入的时间。",
    },
    {
      name: "required",
      type: "boolean",
      required: false,
      description: "是否必需用户响应（默认 true）。如果为 false，用户可以跳过问题。",
    },
    {
      name: "timeout",
      type: "number",
      required: false,
      description: "超时时间（毫秒）。如果指定，用户在此时间内未响应将返回超时错误。",
    },
  ],
  permissions: [],
  enabled: true,
  handler: new AskToolHandler(),
} as any;

/**
 * 创建自定义的 ASK 工具实例
 *
 * @param callbacks 用户交互回调函数
 * @returns ASK 工具定义
 */
export function createAskTool(callbacks: UserInteractionCallbacks): ToolDefinition {
  return {
    ...askTool,
    handler: new AskToolHandler(callbacks),
  };
}

// 默认导出
export default askTool;
