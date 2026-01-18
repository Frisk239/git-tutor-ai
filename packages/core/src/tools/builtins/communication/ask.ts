/**
 * ASK 工具 - 用户交互工具
 *
 * 基于 Cline 的 ask_followup_question 实现
 * 用于在任务执行过程中向用户询问问题以获取必要信息
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 gRPC 与 webview 通信,支持复杂的 ask 类型
 * - Git Tutor AI: Web 应用,通过回调函数与前端通信,简化版本
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';

// ============================================================================
// 类型定义
// ============================================================================

export interface AskParams {
  /** 向用户提出的问题 */
  question: string;
  /** 可选的选项列表(2-5个) */
  options?: string[];
}

export interface AskResult {
  /** 用户的响应 */
  response: string;
  /** 用户选择的选项(如果有) */
  selectedOption?: string;
  /** 是否选择了提供的选项之一 */
  wasOptionSelected: boolean;
  /** 附加的文件内容(如果有) */
  fileContents?: string;
  /** 响应时间戳 */
  timestamp: string;
}

// ============================================================================
// 工具处理器
// ============================================================================

class AskToolHandler {
  /**
   * 用户交互回调
   * 格式: (question: string, options?: string[]) => Promise<{
   *   response: string;
   *   selectedOption?: string;
   *   fileContents?: string;
   * }>
   */
  private onAsk?: (
    question: string,
    options?: string[]
  ) => Promise<{
    response: string;
    selectedOption?: string;
    fileContents?: string;
  }>;

  /**
   * 设置用户交互回调
   */
  setAskCallback(
    callback: (
      question: string,
      options?: string[]
    ) => Promise<{
      response: string;
      selectedOption?: string;
      fileContents?: string;
    }>
  ): void {
    this.onAsk = callback;
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { question, options: optionsRaw } = params as AskParams;

      // 验证必需参数存在
      if (question === undefined || question === null) {
        return {
          success: false,
          error: '缺少必需参数: question',
        };
      }

      // 验证参数类型和内容
      if (typeof question !== 'string' || question.trim().length === 0) {
        return {
          success: false,
          error: 'question 参数不能为空',
        };
      }

      // 验证选项参数
      let options: string[] | undefined;
      if (optionsRaw) {
        if (!Array.isArray(optionsRaw)) {
          return {
            success: false,
            error: 'options 参数必须是数组',
          };
        }

        if (optionsRaw.length < 2 || optionsRaw.length > 5) {
          return {
            success: false,
            error: 'options 参数必须包含 2-5 个选项',
          };
        }

        // 验证每个选项都是非空字符串
        for (const option of optionsRaw) {
          if (typeof option !== 'string' || option.trim().length === 0) {
            return {
              success: false,
              error: '每个选项都必须是非空字符串',
            };
          }
        }

        options = optionsRaw.map((opt) => opt.trim());
      }

      // 如果有回调,调用它
      if (this.onAsk) {
        const result = await this.onAsk(question, options);

        // 检查用户是否选择了提供的选项之一
        let wasOptionSelected = false;
        let selectedOption: string | undefined;

        if (options && options.length > 0) {
          const normalizedResponse = result.response.trim();
          const matchedOption = options.find(
            (opt) => opt.toLowerCase() === normalizedResponse.toLowerCase()
          );

          if (matchedOption) {
            wasOptionSelected = true;
            selectedOption = matchedOption;
          }
        }

        return {
          success: true,
          data: {
            response: result.response,
            selectedOption,
            wasOptionSelected,
            fileContents: result.fileContents,
            timestamp: new Date().toISOString(),
          } as AskResult,
        };
      }

      // 如果没有回调,返回错误(ask 工具必须有用户交互)
      return {
        success: false,
        error: '未设置用户交互回调,ask 工具无法执行',
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

export const askTool: ToolDefinition = {
  name: 'ask',
  displayName: '询问用户',
  description:
    '询问用户:向用户提出问题以获取必要的信息或确认。使用此工具可以在任务执行过程中与用户交互,收集反馈或澄清需求。' +
    '\n\n**使用场景**:' +
    '\n- 需求不明确时,请求用户澄清' +
    '\n- 需要用户确认重要操作' +
    '\n- 收集完成特定任务所需的信息' +
    '\n- 提供多个选项让用户选择' +
    '\n\n**参数说明**:' +
    '\n- `question` (必需): 要向用户提出的问题,应该清晰、简洁、具体' +
    '\n- `options` (可选): 2-5 个预定义选项的数组。如果提供,用户可以从中选择,也可以输入自定义响应' +
    '\n\n**注意事项**:' +
    '\n- 问题应该具体明确,避免模糊不清' +
    '\n- 如果提供选项,每个选项应该是简短的关键词或短语' +
    '\n- 工具会等待用户响应后才会继续' +
    '\n- 用户可以选择提供的选项之一,也可以输入自定义响应',
  category: 'communication',
  parameters: [
    {
      name: 'question',
      type: 'string',
      required: true,
      description:
        '要向用户提出的问题。应该清晰、简洁、具体,避免模糊不清的表述。' +
        "示例: '您希望使用哪个 Git 分支?' 或 '请提供项目根目录的路径'",
    },
    {
      name: 'options',
      type: 'array',
      required: false,
      description:
        '可选的预定义选项列表(2-5个)。如果提供,用户可以从中选择,也可以输入自定义响应。' +
        "示例: ['main', 'develop', 'feature'] 或 ['是', '否', '取消']",
    },
  ],
  permissions: [], // ask 工具不需要特殊权限
  enabled: true,
  handler: new AskToolHandler(),
};

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建带有自定义回调的 ask 工具
 */
export function createAskTool(
  onAsk: (
    question: string,
    options?: string[]
  ) => Promise<{
    response: string;
    selectedOption?: string;
    fileContents?: string;
  }>
): ToolDefinition {
  const handler = new AskToolHandler();
  handler.setAskCallback(onAsk);

  return {
    ...askTool,
    handler,
  };
}

// 默认导出
export default askTool;
