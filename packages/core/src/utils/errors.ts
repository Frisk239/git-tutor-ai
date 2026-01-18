// 统一错误处理系统
// 参考 Cline 的错误处理机制,提供完整的错误分类、恢复和日志记录

import { Logger } from "../logging/logger.js";

/**
 * 错误类别枚举
 */
export enum ErrorCategory {
  API = "api", // AI API 调用错误
  FILESYSTEM = "filesystem", // 文件系统操作错误
  GIT = "git", // Git 操作错误
  GITHUB = "github", // GitHub API 错误
  NETWORK = "network", // 网络连接错误
  VALIDATION = "validation", // 参数验证错误
  PERMISSION = "permission", // 权限错误
  UNKNOWN = "unknown", // 未知错误
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = "low", // 低:可恢复,不影响核心功能
  MEDIUM = "medium", // 中:部分功能受影响
  HIGH = "high", // 高:核心功能受影响
  CRITICAL = "critical", // 严重:系统无法运行
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public code: string,
    public retryable: boolean = false,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 从原始错误创建 AppError
   */
  static fromError(error: any, category?: ErrorCategory): AppError {
    // 如果已经是 AppError,直接返回
    if (error instanceof AppError) {
      return error;
    }

    // 提取错误信息
    const message = error.message || "Unknown error";
    const code = error.code || "UNKNOWN_ERROR";
    const statusCode = error.status || error.statusCode;

    // 根据错误类型推断类别
    const inferredCategory = category || AppError.inferCategory(error);

    // 判断是否可重试
    const retryable = AppError.isRetryable(error);

    // 判断严重级别
    const severity = AppError.inferSeverity(error);

    return new AppError(
      message,
      inferredCategory,
      code,
      retryable,
      severity,
      error,
      { statusCode }
    );
  }

  /**
   * 推断错误类别
   */
  private static inferCategory(error: any): ErrorCategory {
    const message = (error.message || "").toLowerCase();
    const code = error.code;
    const statusCode = error.status || error.statusCode;

    // 网络错误
    if (
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "ECONNRESET" ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return ErrorCategory.NETWORK;
    }

    // API 错误 (4xx, 5xx)
    if (statusCode && statusCode >= 400) {
      if (statusCode < 500) {
        // 4xx - 客户端错误
        if (statusCode === 401 || statusCode === 403) {
          return ErrorCategory.PERMISSION;
        }
        return ErrorCategory.VALIDATION;
      } else {
        // 5xx - 服务器错误
        return ErrorCategory.API;
      }
    }

    // Git 错误
    if (message.includes("git") || code?.startsWith("GIT_")) {
      return ErrorCategory.GIT;
    }

    // GitHub 错误
    if (message.includes("github") || code?.startsWith("GITHUB_")) {
      return ErrorCategory.GITHUB;
    }

    // 文件系统错误
    if (
      code === "ENOENT" ||
      code === "EACCES" ||
      code === "EPERM" ||
      message.includes("file") ||
      message.includes("directory")
    ) {
      return ErrorCategory.FILESYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * 判断错误是否可重试
   */
  private static isRetryable(error: any): boolean {
    const code = error.code;
    const statusCode = error.status || error.statusCode;
    const message = (error.message || "").toLowerCase();

    // 网络错误可重试
    if (
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "ECONNRESET"
    ) {
      return true;
    }

    // 5xx 服务器错误可重试
    if (statusCode && statusCode >= 500) {
      return true;
    }

    // 429 速率限制可重试
    if (statusCode === 429 || message.includes("rate limit")) {
      return true;
    }

    return false;
  }

  /**
   * 推断错误严重级别
   */
  private static inferSeverity(error: any): ErrorSeverity {
    const code = error.code;
    const statusCode = error.status || error.statusCode;

    // 认证错误 - 高严重性
    if (statusCode === 401 || statusCode === 403) {
      return ErrorSeverity.HIGH;
    }

    // 5xx 服务器错误 - 中等严重性
    if (statusCode && statusCode >= 500) {
      return ErrorSeverity.MEDIUM;
    }

    // 文件不存在 - 低严重性
    if (code === "ENOENT") {
      return ErrorSeverity.LOW;
    }

    // 权限错误 - 中高严重性
    if (code === "EACCES" || code === "EPERM") {
      return ErrorSeverity.HIGH;
    }

    // 默认中等严重性
    return ErrorSeverity.MEDIUM;
  }

  /**
   * 转换为 JSON
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      code: this.code,
      retryable: this.retryable,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * 转换为用户友好的消息
   */
  toUserMessage(): string {
    const categoryMessages = {
      [ErrorCategory.API]: "API 调用失败",
      [ErrorCategory.FILESYSTEM]: "文件操作失败",
      [ErrorCategory.GIT]: "Git 操作失败",
      [ErrorCategory.GITHUB]: "GitHub 操作失败",
      [ErrorCategory.NETWORK]: "网络连接失败",
      [ErrorCategory.VALIDATION]: "参数验证失败",
      [ErrorCategory.PERMISSION]: "权限不足",
      [ErrorCategory.UNKNOWN]: "发生未知错误",
    };

    const categoryMsg = categoryMessages[this.category] || "发生错误";
    const hint = this.retryable ? " (系统会自动重试)" : "";

    return `${categoryMsg}: ${this.message}${hint}`;
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  private logger: Logger;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, { error: AppError; timestamp: number }> =
    new Map();

  constructor(name: string = "ErrorHandler") {
    this.logger = new Logger(name);
  }

  /**
   * 处理错误
   */
  handle(error: Error, context?: string): void {
    const appError = AppError.fromError(error);

    // 记录错误
    this.logError(appError, context);

    // 更新错误统计
    this.updateErrorStats(appError);

    // 可选:上报错误到监控系统
    // this.reportError(appError, context);

    // 如果是不可恢复的错误,考虑终止进程
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.logger.error("Critical error encountered", {
        error: appError.toJSON(),
      });
      // process.exit(1); // 可选:根据需求决定是否终止
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError, context?: string): void {
    const logData = {
      context,
      category: error.category,
      code: error.code,
      retryable: error.retryable,
      severity: error.severity,
      errorContext: error.context,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        this.logger.error(error.message, error, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(error.message, logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(error.message, logData);
        break;
    }
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(error: AppError): void {
    const key = `${error.category}:${error.code}`;

    // 增加计数
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // 记录最近的错误
    this.lastErrors.set(key, {
      error,
      timestamp: Date.now(),
    });

    // 只保留最近 100 个错误
    if (this.lastErrors.size > 100) {
      const firstKey = this.lastErrors.keys().next().value;
      this.lastErrors.delete(firstKey);
    }
  }

  /**
   * 获取错误统计
   */
  getStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsByCode: Record<string, number>;
    recentErrors: Array<{ key: string; error: AppError; timestamp: number }>;
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.API]: 0,
      [ErrorCategory.FILESYSTEM]: 0,
      [ErrorCategory.GIT]: 0,
      [ErrorCategory.GITHUB]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.PERMISSION]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };

    const errorsByCode: Record<string, number> = {};

    let totalErrors = 0;

    for (const [key, count] of this.errorCounts.entries()) {
      const [category] = key.split(":");
      errorsByCategory[category as ErrorCategory] =
        (errorsByCategory[category as ErrorCategory] || 0) + count;
      errorsByCode[key] = count;
      totalErrors += count;
    }

    const recentErrors = Array.from(this.lastErrors.entries()).map(
      ([key, { error, timestamp }]) => ({ key, error, timestamp })
    );

    return {
      totalErrors,
      errorsByCategory,
      errorsByCode,
      recentErrors,
    };
  }

  /**
   * 重置错误统计
   */
  resetStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * 尝试错误恢复
   */
  async attemptRecovery<T>(
    error: Error,
    recoveryFn: () => Promise<T>
  ): Promise<T> {
    const appError = AppError.fromError(error);

    if (!appError.retryable) {
      throw error; // 不可重试,直接抛出
    }

    this.logger.info("Attempting error recovery", {
      category: appError.category,
      code: appError.code,
    });

    try {
      return await recoveryFn();
    } catch (recoveryError) {
      this.logger.error("Recovery failed", {
        originalError: appError.toJSON(),
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      });
      throw recoveryError;
    }
  }

  /**
   * 创建错误恢复装饰器
   */
  createRecoveryWrapper<T extends (...args: any[]) => any>(
    fn: T,
    maxAttempts: number = 3
  ): T {
    return (async (...args: any[]) => {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error as Error;
          const appError = AppError.fromError(error);

          if (!appError.retryable || attempt === maxAttempts) {
            throw error;
          }

          this.logger.warn("Attempt failed, retrying", {
            attempt,
            maxAttempts,
            category: appError.category,
            code: appError.code,
          });

          // 指数退避
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    }) as T;
  }
}

/**
 * 全局错误处理器实例
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * 获取全局错误处理器
 */
export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * 设置全局未捕获异常处理器
 */
export function setupGlobalErrorHandlers(): void {
  const errorHandler = getErrorHandler();

  // 未捕获的异常
  process.on("uncaughtException", (error) => {
    errorHandler.handle(error, "uncaughtException");
  });

  // 未处理的 Promise 拒绝
  process.on("unhandledRejection", (reason, promise) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason));
    errorHandler.handle(error, "unhandledRejection");
  });
}

/**
 * 便捷函数:处理错误
 */
export function handleError(error: Error, context?: string): void {
  getErrorHandler().handle(error, context);
}

/**
 * 便捷函数:尝试恢复
 */
export async function attemptRecovery<T>(
  error: Error,
  recoveryFn: () => Promise<T>
): Promise<T> {
  return getErrorHandler().attemptRecovery(error, recoveryFn);
}
