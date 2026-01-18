// AI 管理器 - 统一管理所有 AI 提供商
import { AIProvider } from "@git-tutor/shared";
import type { AIRequestOptions, AIResponse } from "./providers.js";
import { AnthropicHandler } from "./handlers/anthropic.js";
import { OpenAIHandler } from "./handlers/openai.js";
import { GeminiHandler } from "./handlers/gemini.js";
import { OpenRouterHandler } from "./handlers/openrouter.js";
import { OllamaHandler } from "./handlers/ollama.js";
import { OpenAICompatibleHandler } from "./handlers/openai-compatible.js";
import { retryAsync, RetryPresets } from "../utils/retry.js";
import { Logger } from "../logging/logger.js";

/**
 * AI 错误类型枚举(参考 Cline)
 */
export enum AIErrorType {
  Auth = "auth",
  Network = "network",
  RateLimit = "rateLimit",
  Balance = "balance",
  Validation = "validation",
  Provider = "provider",
  Unknown = "unknown",
}

/**
 * AI 错误类
 */
export class AIError extends Error {
  constructor(
    message: string,
    public type: AIErrorType,
    public statusCode?: number,
    public code?: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = "AIError";
  }

  /**
   * 从原始错误创建 AIError
   */
  static fromError(error: any): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const message = error.message || "Unknown error";
    const statusCode = error.status || error.statusCode;
    const code = error.code;
    const errorType = AIError.classifyError(error);
    const retryable = AIError.isRetryable(errorType, statusCode);

    return new AIError(message, errorType, statusCode, code, retryable, error);
  }

  /**
   * 智能分类错误
   */
  private static classifyError(error: any): AIErrorType {
    const message = (error.message || "").toLowerCase();
    const statusCode = error.status || error.statusCode;
    const code = error.code;

    // 1. 余额错误
    if (
      code === "insufficient_credits" ||
      code === "balance_insufficient" ||
      message.includes("insufficient credits") ||
      message.includes("balance") ||
      message.includes("quota exceeded")
    ) {
      return AIErrorType.Balance;
    }

    // 2. 认证错误
    const isAuthStatus = statusCode !== undefined && statusCode >= 401 && statusCode < 429;
    if (
      code === "ERR_BAD_REQUEST" ||
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes("invalid token") ||
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      isAuthStatus
    ) {
      return AIErrorType.Auth;
    }

    // 3. 速率限制
    const RATE_LIMIT_PATTERNS = [
      /status code 429/i,
      /rate limit/i,
      /too many requests/i,
      /quota exceeded/i,
      /resource exhausted/i,
      /rate_limit_exceeded/i,
    ];

    if (RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message))) {
      return AIErrorType.RateLimit;
    }

    // 4. 网络错误
    if (
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "ECONNRESET" ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return AIErrorType.Network;
    }

    // 5. 验证错误
    if (
      statusCode === 400 ||
      code === "validation_error" ||
      message.includes("invalid") ||
      message.includes("validation")
    ) {
      return AIErrorType.Validation;
    }

    return AIErrorType.Provider;
  }

  /**
   * 判断错误是否可重试
   */
  private static isRetryable(type: AIErrorType, statusCode?: number): boolean {
    if (type === AIErrorType.RateLimit || type === AIErrorType.Network) {
      return true;
    }
    if (statusCode && statusCode >= 500) {
      return true;
    }
    if (statusCode === 429) {
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      code: this.code,
      retryable: this.retryable,
    };
  }
}

/**
 * 扩展的 AI 响应,包含详细的 Token 统计
 */
export interface EnhancedAIResponse extends AIResponse {
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
}

/**
 * Token 使用统计
 */
export interface TokenStats {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
}

/**
 * AI 管理器
 * 提供统一的接口调用不同的 AI 提供商
 * 增强功能:错误处理、重试机制、Token 统计
 */
export class AIManager {
  private handlers: Map<AIProvider, any> = new Map();
  private logger: Logger;
  private tokenStats: Map<AIProvider, TokenStats> = new Map();

  constructor() {
    this.logger = new Logger("AIManager");

    // 初始化所有处理器
    this.handlers.set(AIProvider.ANTHROPIC, new AnthropicHandler());
    this.handlers.set(AIProvider.OPENAI, new OpenAIHandler(false));
    this.handlers.set(AIProvider.OPENAI_NATIVE, new OpenAIHandler(true));
    this.handlers.set(AIProvider.GEMINI, new GeminiHandler());
    this.handlers.set(AIProvider.VERTEX, new GeminiHandler());
    this.handlers.set(AIProvider.OPENROUTER, new OpenRouterHandler());
    this.handlers.set(AIProvider.OPENAI_COMPATIBLE, new OpenAICompatibleHandler());
    this.handlers.set(AIProvider.OLLAMA, new OllamaHandler());

    // 初始化 Token 统计
    for (const provider of this.handlers.keys()) {
      this.tokenStats.set(provider, {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCacheReadTokens: 0,
        totalCacheWriteTokens: 0,
      });
    }
  }

  /**
   * 发送聊天完成请求(带重试和错误处理)
   */
  async chat(
    provider: AIProvider,
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    const handler = this.handlers.get(provider);

    if (!handler) {
      throw new AIError(
        `Unsupported AI provider: ${provider}`,
        AIErrorType.Provider,
        undefined,
        "UNSUPPORTED_PROVIDER",
        false
      );
    }

    try {
      this.logger.debug("Starting chat request", {
        provider,
        model: options.model,
        messageCount: messages.length,
      });

      // 使用重试机制调用 API
      const response = await retryAsync(
        async () => await handler.chat(options, messages),
        {
          maxRetries: 3,
          ...RetryPresets.network,
          onRetry: (error, attempt) => {
            const aiError = AIError.fromError(error);
            this.logger.warn("Chat request failed, retrying", {
              provider,
              attempt,
              errorType: aiError.type,
              retryable: aiError.retryable,
            });
          },
        }
      );

      // 记录 Token 统计
      if (response.usage) {
        this.recordTokenUsage(provider, response.usage);
      }

      return response;
    } catch (error) {
      const aiError = AIError.fromError(error);

      this.logger.error("Chat request failed", {
        provider,
        errorType: aiError.type,
        retryable: aiError.retryable,
        statusCode: aiError.statusCode,
      });

      throw aiError;
    }
  }

  /**
   * 流式聊天完成(带错误处理)
   */
  async *chatStream(
    provider: AIProvider,
    options: AIRequestOptions,
    messages: Array<{ role: string; content: string }>
  ): AsyncGenerator<string, void, unknown> {
    const handler = this.handlers.get(provider);

    if (!handler) {
      throw new AIError(
        `Unsupported AI provider: ${provider}`,
        AIErrorType.Provider,
        undefined,
        "UNSUPPORTED_PROVIDER",
        false
      );
    }

    if (!handler.chatStream) {
      throw new AIError(
        `Provider ${provider} does not support streaming`,
        AIErrorType.Provider,
        undefined,
        "STREAMING_NOT_SUPPORTED",
        false
      );
    }

    try {
      this.logger.debug("Starting stream chat request", {
        provider,
        model: options.model,
        messageCount: messages.length,
      });

      yield* handler.chatStream(options, messages);
    } catch (error) {
      const aiError = AIError.fromError(error);

      this.logger.error("Stream chat request failed", {
        provider,
        errorType: aiError.type,
        retryable: aiError.retryable,
        statusCode: aiError.statusCode,
      });

      throw aiError;
    }
  }

  /**
   * 记录 Token 使用统计
   */
  private recordTokenUsage(
    provider: AIProvider,
    usage: {
      promptTokens: number;
      completionTokens: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
    }
  ): void {
    const stats = this.tokenStats.get(provider);
    if (!stats) return;

    stats.totalRequests++;
    stats.totalPromptTokens += usage.promptTokens;
    stats.totalCompletionTokens += usage.completionTokens;
    stats.totalCacheReadTokens += usage.cacheReadTokens || 0;
    stats.totalCacheWriteTokens += usage.cacheWriteTokens || 0;
  }

  /**
   * 获取 Token 使用统计
   */
  getTokenStats(provider?: AIProvider): TokenStats | Map<AIProvider, TokenStats> {
    if (provider) {
      const stats = this.tokenStats.get(provider);
      return stats || {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCacheReadTokens: 0,
        totalCacheWriteTokens: 0,
      };
    }

    return this.tokenStats;
  }

  /**
   * 重置 Token 统计
   */
  resetTokenStats(provider?: AIProvider): void {
    if (provider) {
      const stats = this.tokenStats.get(provider);
      if (stats) {
        stats.totalRequests = 0;
        stats.totalPromptTokens = 0;
        stats.totalCompletionTokens = 0;
        stats.totalCacheReadTokens = 0;
        stats.totalCacheWriteTokens = 0;
      }
    } else {
      for (const stats of this.tokenStats.values()) {
        stats.totalRequests = 0;
        stats.totalPromptTokens = 0;
        stats.totalCompletionTokens = 0;
        stats.totalCacheReadTokens = 0;
        stats.totalCacheWriteTokens = 0;
      }
    }
  }

  /**
   * 健康检查 - 检查提供商是否可用
   */
  async healthCheck(provider: AIProvider): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const handler = this.handlers.get(provider);

    if (!handler || !handler.isEnabled()) {
      return {
        healthy: false,
        error: `Provider ${provider} is not enabled`,
      };
    }

    const startTime = Date.now();

    try {
      // 发送一个简单的测试请求
      await this.chat(provider, { model: "test" }, [{ role: "user", content: "test" }]);

      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      const aiError = AIError.fromError(error);

      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: aiError.message,
      };
    }
  }

  /**
   * 检查提供商是否可用
   */
  isProviderEnabled(provider: AIProvider): boolean {
    const handler = this.handlers.get(provider);
    return handler ? handler.isEnabled() : false;
  }

  /**
   * 获取可用的提供商列表
   */
  getEnabledProviders(): AIProvider[] {
    return Array.from(this.handlers.entries())
      .filter(([_, handler]) => handler.isEnabled())
      .map(([provider]) => provider);
  }
}

// 导出单例实例
export const aiManager = new AIManager();
