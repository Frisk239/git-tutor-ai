// Anthropic Claude 处理器
import Anthropic from "@anthropic-ai/sdk";
import { BaseAIHandler } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../providers.js";

export class AnthropicHandler extends BaseAIHandler {
  private client: Anthropic | null = null;

  constructor() {
    super();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({
        apiKey,
        baseURL: process.env.ANTHROPIC_BASE_URL,
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
      throw new Error("Anthropic client is not initialized");
    }

    // 转换消息格式
    const systemPrompt = options.systemPrompt || "";
    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens || 8192,
      temperature: options.temperature ?? 0,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    return {
      content: response.content[0]?.type === "text" ? response.content[0].text : "",
      role: "assistant",
      toolCalls: response.stop_reason === "tool_use" ? response.content : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        // Anthropic 缓存 Token 统计(参考 Cline)
        cacheReadTokens: (response.usage as any).cache_read_input_tokens,
        cacheWriteTokens: (response.usage as any).cache_creation_input_tokens,
      },
    };
  }

  override async *chatStream(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error("Anthropic client is not initialized");
    }

    const systemPrompt = options.systemPrompt || "";
    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens || 8192,
      temperature: options.temperature ?? 0,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}
