// AI 处理器基类
import type { AIRequestOptions, AIResponse } from "../providers.js";

/**
 * 所有 AI 提供商处理器的基类
 */
export abstract class BaseAIHandler {
  abstract isEnabled(): boolean;
  abstract chat(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): Promise<AIResponse>;

  async *chatStream(
    _options: AIRequestOptions,
    _messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string, void, unknown> {
    throw new Error("Streaming not implemented for this provider");
  }
}
