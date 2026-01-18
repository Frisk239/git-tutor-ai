// Google Gemini 处理器
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAIHandler } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../providers.js";

export class GeminiHandler extends BaseAIHandler {
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
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
      throw new Error("Gemini client is not initialized");
    }

    const model = this.client.getGenerativeModel({
      model: options.model,
    });

    // 转换消息格式 (Gemini 使用不同的格式)
    const chatHistory = messages
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      role: "assistant",
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async *chatStream(
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error("Gemini client is not initialized");
    }

    const model = this.client.getGenerativeModel({
      model: options.model,
    });

    const chatHistory = messages
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const result = await chat.sendMessageStream(lastMessage.content);
    const stream = result.stream;

    for await (const chunk of stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  }
}
