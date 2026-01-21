/**
 * AI Agent 核心实现
 *
 * 参考 Cline 的 Claude Use Chat Store 和 TaskProcessor
 * 实现一个能够使用工具、管理对话上下文的 AI Agent
 */

import { AIProvider, type AIProvider as AIProviderType } from '@git-tutor/shared';
import type { AIRequestOptions, AIResponse } from '../ai/providers.js';
import { aiManager } from '../ai/manager.js';
import { toolRegistry } from '../tools/registry.js';
import { toolExecutor } from '../tools/executor.js';
import type { ToolContext, ToolResult } from '../tools/types.js';
import { Logger } from '../logging/logger.js';

/**
 * 消息角色
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

/**
 * 消息内容类型
 */
export type MessageContent =
  | string
  | Array<{
      type: 'text' | 'image';
      text?: string;
      source?: { type: string; media_type: string; data: string };
    }>;

/**
 * 消息接口
 */
export interface Message {
  role: MessageRole;
  content: MessageContent;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/**
 * 工具调用
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** AI 提供商 */
  provider: AIProviderType;
  /** 模型名称 */
  model: string;
  /** 最大轮次 */
  maxTurns?: number;
  /** 工作目录 */
  workingDirectory?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 用户 ID */
  userId?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 额外的工具定义 */
  extraTools?: string[];
}

/**
 * Agent 执行结果
 */
export interface AgentResult {
  /** 最终消息 */
  message: Message;
  /** 使用的工具调用 */
  toolCalls: ToolCall[];
  /** 是否达到最大轮次 */
  maxTurnsReached: boolean;
  /** 执行的轮次数 */
  turns: number;
}

/**
 * 工具调用结果
 */
interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: ToolResult;
}

/**
 * AI Agent 核心类
 */
export class AIAgent {
  private config: AgentConfig;
  private messages: Message[] = [];
  private toolCalls: ToolCall[] = [];
  private logger = new Logger('AIAgent');

  constructor(config: AgentConfig) {
    this.config = config;

    // 初始化系统消息
    if (config.systemPrompt) {
      this.messages.push({
        role: MessageRole.System,
        content: config.systemPrompt,
      });
    }
  }

  /**
   * 添加用户消息
   */
  addUserMessage(content: string | MessageContent): void {
    this.messages.push({
      role: MessageRole.User,
      content,
    });
  }

  /**
   * 添加工具结果消息
   */
  addToolResult(toolCallId: string, toolName: string, result: ToolResult): void {
    const content = JSON.stringify(result);

    this.messages.push({
      role: MessageRole.Tool,
      content,
      toolCallId,
    });

    this.logger.debug(`添加工具结果: ${toolName} => ${result.success ? '成功' : '失败'}`);
  }

  /**
   * 生成工具提示词
   */
  private generateToolsPrompt(): string {
    const allTools = toolRegistry.getAll();

    let prompt = '\n# 可用工具\n\n';

    for (const tool of allTools) {
      // 跳过禁用的工具
      if (!tool.enabled) continue;

      // 只包含启用的类别
      const extraTools = this.config.extraTools || [];
      if (extraTools.length > 0 && !extraTools.includes(tool.name)) {
        continue;
      }

      prompt += `### ${tool.name}\n`;
      prompt += `${tool.displayName}\n`;
      prompt += `${tool.description}\n\n`;

      if (tool.parameters.length > 0) {
        prompt += '**参数:**\n';
        for (const param of tool.parameters) {
          const required = param.required ? '（必需）' : '（可选）';
          prompt += `- \`${param.name}\` (${param.type})${required}: ${param.description}\n`;
        }
        prompt += '\n';
      }
    }

    return prompt;
  }

  /**
   * 构建 AI 请求选项
   */
  private buildRequestOptions(): {
    options: AIRequestOptions;
    messages: Array<{ role: string; content: string }>;
  } {
    // 将消息转换为 AI 格式
    const messages = this.messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    return {
      options: {
        model: this.config.model,
        temperature: 0.7,
        maxTokens: 8192,
      },
      messages,
    };
  }

  /**
   * 执行工具调用
   */
  private async executeToolCall(toolCall: ToolCall): Promise<ToolCallResult> {
    const { id, function: fn } = toolCall;
    const toolName = fn.name;
    const args = JSON.parse(fn.arguments);

    this.logger.info(`执行工具: ${toolName}`, args);

    // 构建 ToolContext
    const context: ToolContext = {
      conversationId: this.config.sessionId || 'default',
      projectPath: this.config.workingDirectory || process.cwd(),
      services: {}, // 工具执行时可以注入需要的服务
    };

    // 执行工具
    const result = await toolExecutor.execute(toolName, context, args);

    return {
      toolCallId: id,
      toolName,
      result,
    };
  }

  /**
   * 流式运行 Agent（支持工具调用）
   */
  async *stream(
    userMessage: string,
    history: Array<{ role: string; content: string }> = []
  ): AsyncGenerator<
    | { type: 'delta'; content: string }
    | { type: 'tool_call'; tool: string; args: any }
    | { type: 'tool_result'; tool: string; result: any }
  > {
    // 清空当前消息（保留系统消息）
    this.messages = this.messages.filter((m) => m.role === MessageRole.System);

    // 加载历史消息
    for (const msg of history) {
      this.messages.push({
        role: msg.role as any,
        content: msg.content,
      });
    }

    // 添加用户消息
    this.addUserMessage(userMessage);

    // 添加工具提示词到系统消息
    if (this.config.systemPrompt) {
      const toolsPrompt = this.generateToolsPrompt();
      const updatedSystemPrompt = this.config.systemPrompt + toolsPrompt;

      // 更新第一条系统消息
      if (this.messages[0]?.role === MessageRole.System) {
        this.messages[0]!.content = updatedSystemPrompt;
      }
    }

    const maxTurns = this.config.maxTurns || 10;
    let turns = 0;

    this.logger.info(`开始流式运行 Agent，最大轮次: ${maxTurns}`);

    while (turns < maxTurns) {
      turns++;
      this.logger.info(`第 ${turns} 轮`);

      // 调用 AI（流式）
      const { options, messages } = this.buildRequestOptions();

      try {
        let fullContent = '';
        for await (const chunk of aiManager.chatStream(this.config.provider, options, messages)) {
          fullContent += chunk;
          yield { type: 'delta', content: chunk };
        }

        // 将完整响应添加到消息历史
        this.messages.push({
          role: MessageRole.Assistant,
          content: fullContent,
        });

        // 检查响应中是否包含工具调用（简化版本：正则匹配）
        const toolCallPattern = /<tool_call>\s*{\s*"tool":\s*"([^"]+)"\s*,\s*"args":\s*({[^}]+})\s*}\s*<\/tool_call>/g;
        const toolCalls: Array<{ id: string; tool: string; args: any }> = [];

        let match;
        while ((match = toolCallPattern.exec(fullContent)) !== null) {
          const tool = match[1]; // 这个可能为 undefined，但正则保证不会
          const args = JSON.parse(match[2] || '{}'); // 这个可能为 undefined，提供默认值
          const id = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          if (tool) {
            toolCalls.push({ id, tool, args });
          }
        }

        if (toolCalls.length > 0) {
          // 执行工具调用
          for (const toolCall of toolCalls) {
            yield { type: 'tool_call', tool: toolCall.tool, args: toolCall.args };

            // 执行工具
            const result = await toolExecutor.execute(
              toolCall.tool,
              toolCall.args,
              {
                workspacePath: this.config.workingDirectory || process.cwd(),
                conversationId: this.config.sessionId,
                userId: this.config.userId,
                services: {}, // ToolContext 要求的必需字段
              }
            );

            yield { type: 'tool_result', tool: toolCall.tool, result };

            // 添加工具结果到历史
            this.addToolResult(toolCall.id, toolCall.tool, result);
          }
        } else {
          // 没有工具调用，结束对话
          this.logger.info('没有工具调用，结束对话');
          break;
        }
      } catch (error) {
        this.logger.error(`AI 调用失败: ${error}`);
        const errorMsg = `错误: ${error instanceof Error ? error.message : String(error)}`;
        yield { type: 'delta', content: errorMsg };
        break;
      }
    }

    if (turns >= maxTurns) {
      this.logger.warn('达到最大轮次');
    }
  }

  /**
   * 运行 Agent
   */
  async run(userMessage: string): Promise<AgentResult> {
    // 添加用户消息
    this.addUserMessage(userMessage);

    // 添加工具提示词到系统消息
    if (this.config.systemPrompt) {
      const toolsPrompt = this.generateToolsPrompt();
      const updatedSystemPrompt = this.config.systemPrompt + toolsPrompt;

      // 更新第一条系统消息
      if (this.messages[0]?.role === MessageRole.System) {
        this.messages[0]!.content = updatedSystemPrompt;
      }
    }

    const maxTurns = this.config.maxTurns || 10;
    let turns = 0;
    let maxTurnsReached = false;

    this.logger.info(`开始运行 Agent，最大轮次: ${maxTurns}`);

    while (turns < maxTurns) {
      turns++;
      this.logger.info(`第 ${turns} 轮`);

      // 调用 AI
      const { options, messages } = this.buildRequestOptions();

      let response: AIResponse;
      try {
        response = await aiManager.chat(this.config.provider, options, messages);
      } catch (error) {
        this.logger.error(`AI 调用失败: ${error}`);

        // 返回错误消息
        return {
          message: {
            role: MessageRole.Assistant,
            content: `错误: ${error instanceof Error ? error.message : String(error)}`,
          },
          toolCalls: this.toolCalls,
          maxTurnsReached: false,
          turns,
        };
      }

      // 提取助手的回复
      const assistantMessage = this.extractAssistantMessage(response);
      this.messages.push(assistantMessage);

      // 检查是否有工具调用
      if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
        this.logger.info('没有工具调用，结束对话');
        break;
      }

      // 执行所有工具调用
      const toolResults = await Promise.all(
        assistantMessage.toolCalls.map((tc) => this.executeToolCall(tc))
      );

      // 添加工具结果到消息历史
      for (const toolResult of toolResults) {
        this.addToolResult(toolResult.toolCallId, toolResult.toolName, toolResult.result);
      }

      // 记录工具调用
      this.toolCalls.push(...assistantMessage.toolCalls);

      // 检查是否有工具失败
      const failedTools = toolResults.filter((tr) => !tr.result.success);
      if (failedTools.length > 0) {
        this.logger.warn(`${failedTools.length} 个工具调用失败`);
      }
    }

    if (turns >= maxTurns) {
      maxTurnsReached = true;
      this.logger.warn('达到最大轮次');
    }

    // 获取最后一条助手消息
    const lastMessage = this.messages[this.messages.length - 1];

    return {
      message: lastMessage || {
        role: MessageRole.Assistant,
        content: '没有生成回复',
      },
      toolCalls: this.toolCalls,
      maxTurnsReached,
      turns,
    };
  }

  /**
   * 从 AI 响应中提取助手消息
   */
  private extractAssistantMessage(response: AIResponse): Message {
    // 这里需要根据实际的 AI 响应格式来提取
    // 暂时返回一个基本的消息结构
    const message: Message = {
      role: MessageRole.Assistant,
      content: response.content || '',
    };

    // TODO: 从响应中提取工具调用
    // 这需要 AI 管理器返回原始响应或工具调用信息

    return message;
  }

  /**
   * 获取对话历史
   */
  getHistory(): Message[] {
    return [...this.messages];
  }

  /**
   * 清除对话历史(保留系统消息)
   */
  clearHistory(): void {
    this.messages = this.messages.filter((m) => m.role === MessageRole.System);
    this.toolCalls = [];
  }

  /**
   * 重置 Agent
   */
  reset(): void {
    this.messages = [];
    this.toolCalls = [];

    if (this.config.systemPrompt) {
      this.messages.push({
        role: MessageRole.System,
        content: this.config.systemPrompt,
      });
    }
  }
}
