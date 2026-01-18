// OpenAI Compatible 处理器 (通用兼容 API)
import OpenAI from 'openai';
import { BaseAIHandler } from './base.js';
import type { AIRequestOptions, AIResponse } from '../providers.js';

/**
 * OpenAI Compatible 通用处理器
 * 支持所有兼容 OpenAI API 格式的服务，例如：
 * - vLLM
 * - LocalAI
 * - Text Generation WebUI
 * - 智谱 GLM-4.7
 * - 自建 OpenAI API 代理
 * - 其他兼容 OpenAI 格式的服务
 */
export class OpenAICompatibleHandler extends BaseAIHandler {
  private client: OpenAI | null = null;

  constructor() {
    super();
    const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
    const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

    if (baseURL) {
      this.client = new OpenAI({
        baseURL,
        apiKey: apiKey || 'sk-xxx', // OpenAI SDK 要求必须有 apiKey，很多服务不验证
      });
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  override async chat(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error(
        'OpenAI Compatible client is not initialized. Please set OPENAI_COMPATIBLE_BASE_URL environment variable.'
      );
    }

    // 构建请求参数,过滤掉 undefined 值
    const requestBody: any = {
      model: options.model,
      messages: messages,
    };

    if (options.maxTokens !== undefined) {
      requestBody.max_tokens = options.maxTokens;
    }

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    const response = await this.client.chat.completions.create(requestBody);

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices returned from API');
    }

    const message = choice.message as any;

    // 处理 GLM-4.7 等模型的 reasoning_content 字段
    // 参考 Cline 的实现: 某些模型使用 reasoning_content 而不是 content
    let content = message.content || '';

    // 如果 content 为空但有 reasoning_content,使用 reasoning_content
    if ((!content || content.length === 0) && message.reasoning_content) {
      content = message.reasoning_content;
    }

    return {
      content,
      role: 'assistant',
      toolCalls: message.tool_calls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  override async *chatStream(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error(
        'OpenAI Compatible client is not initialized. Please set OPENAI_COMPATIBLE_BASE_URL environment variable.'
      );
    }

    // 构建请求参数,过滤掉 undefined 值
    const requestBody: any = {
      model: options.model,
      messages: messages,
      stream: true,
    };

    if (options.maxTokens !== undefined) {
      requestBody.max_tokens = options.maxTokens;
    }

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    const response = await this.client.chat.completions.create(requestBody);
    const stream = response as any;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as any;

      // 处理标准 content
      const content = delta?.content;
      if (content) {
        yield content;
      }

      // 处理 reasoning_content (GLM-4.7 等模型)
      const reasoningContent = delta?.reasoning_content;
      if (reasoningContent) {
        yield reasoningContent;
      }
    }
  }
}
