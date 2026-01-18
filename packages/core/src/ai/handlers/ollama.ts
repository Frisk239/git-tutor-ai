// Ollama 处理器 (本地模型)
import OpenAI from "openai";
import { BaseAIHandler } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../providers.js";

export class OllamaHandler extends BaseAIHandler {
  private client: OpenAI | null = null;

  constructor() {
    super();
    const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    // Ollama 兼容 OpenAI API
    this.client = new OpenAI({
      baseURL: `${baseURL}/v1`,
      apiKey: "ollama", // Ollama 不需要真实的 API key
    });
  }

  isEnabled(): boolean {
    // Ollama 假设总是启用（如果用户配置了）
    return this.client !== null;
  }

  async chat(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error("Ollama client is not initialized");
    }

    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: messages as Array<{ role: string; content: string }>,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || "",
      role: "assistant",
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
      throw new Error("Ollama client is not initialized");
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
