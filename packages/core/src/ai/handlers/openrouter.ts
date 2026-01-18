// OpenRouter 处理器 (聚合平台)
import OpenAI from 'openai';
import { BaseAIHandler } from './base.js';
import type { AIRequestOptions, AIResponse } from '../providers.js';

export class OpenRouterHandler extends BaseAIHandler {
  private client: OpenAI | null = null;

  constructor() {
    super();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_APP_TITLE || 'Git Tutor AI',
        },
      });
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async chat(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenRouter client is not initialized');
    }

    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: messages as Array<{ role: string; content: string }>,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      role: 'assistant',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('OpenRouter client is not initialized');
    }

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: messages as Array<{ role: string; content: string }>,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
