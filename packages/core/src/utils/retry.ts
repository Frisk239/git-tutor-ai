// 重试机制实现
// 基于 Cline 的错误处理和重试策略

/**
 * 重试选项
 */
export interface RetryOptions {
  /** 最大重试次数 (默认 3) */
  maxRetries?: number;
  /** 基础延迟时间(毫秒) (默认 1000ms) */
  baseDelay?: number;
  /** 最大延迟时间(毫秒) (默认 10000ms) */
  maxDelay?: number;
  /** 可重试的错误类型列表 (默认: 网络错误和 5xx 错误) */
  retryableErrors?: string[];
  /** 重试回调函数 */
  onRetry?: (attempt: number, error: Error) => void;
  /** 是否使用指数退避 (默认 true) */
  exponentialBackoff?: boolean;
}

/**
 * 内部使用的完整选项类型
 */
interface RequiredRetryOptions extends Required<RetryOptions> {
  onRetry: (attempt: number, error: Error) => void;
}

/**
 * 默认重试选项
 */
const defaultOptions: RequiredRetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  retryableErrors: [
    'ECONNREFUSED', // 连接被拒绝
    'ETIMEDOUT', // 连接超时
    'ECONNRESET', // 连接重置
    'ENOTFOUND', // DNS 解析失败
    'EAI_AGAIN', // DNS 临时失败
    '5xx', // 服务器错误
    'ECONNABORTED', // 连接中止
    'EPIPE', // 管道破裂
  ],
  onRetry: () => {},
  exponentialBackoff: true,
};

/**
 * 方法装饰器: 为异步方法添加重试能力
 *
 * @example
 * ```typescript
 * class MyService {
 *   @withRetry({ maxRetries: 3 })
 *   async fetchData() {
 *     // 这个方法会自动重试
 *   }
 * }
 * ```
 */
export function withRetry<T extends (...args: any[]) => any>(
  options: RetryOptions = {}
): MethodDecorator {
  const opts: RequiredRetryOptions = {
    ...defaultOptions,
    ...options,
    onRetry: options.onRetry || ((_, __) => {}),
  };

  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
        try {
          // 首次尝试或重试
          return await originalMethod.apply(this, args);
        } catch (error: any) {
          lastError = error;

          // 检查是否应该重试
          if (!shouldRetry(error, opts.retryableErrors)) {
            // 不可重试的错误,直接抛出
            throw error;
          }

          // 如果这是最后一次尝试,不要再延迟
          if (attempt === opts.maxRetries - 1) {
            break;
          }

          // 计算延迟时间
          const delay = calculateDelay(attempt, opts);

          // 调用重试回调
          opts.onRetry(attempt + 1, error);

          // 等待后重试
          await sleep(delay);
        }
      }

      // 所有重试都失败,抛出最后一个错误
      throw lastError;
    };

    return descriptor;
  };
}

/**
 * 函数包装器: 为任意异步函数添加重试能力
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetryFn(
 *   async () => fetch('https://api.example.com'),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export function withRetryFn<T>(fn: () => Promise<T>, options: RetryOptions = {}): () => Promise<T> {
  const opts: RequiredRetryOptions = {
    ...defaultOptions,
    ...options,
    onRetry: options.onRetry || ((_, __) => {}),
  };

  return async (): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (!shouldRetry(error, opts.retryableErrors)) {
          throw error;
        }

        if (attempt === opts.maxRetries - 1) {
          break;
        }

        const delay = calculateDelay(attempt, opts);
        opts.onRetry(attempt + 1, error);
        await sleep(delay);
      }
    }

    throw lastError;
  };
}

/**
 * 异步重试执行函数
 *
 * @example
 * ```typescript
 * try {
 *   const result = await retryAsync(
 *     async () => await apiClient.getData(),
 *     { maxRetries: 5, baseDelay: 2000 }
 *   );
 * } catch (error) {
 *   console.error('All retries failed:', error);
 * }
 * ```
 */
export async function retryAsync<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const wrappedFn = withRetryFn(fn, options);
  return wrappedFn();
}

/**
 * 判断错误是否应该重试
 */
function shouldRetry(error: Error, retryableErrors: string[]): boolean {
  if (retryableErrors.length === 0) {
    return true;
  }

  const errorMessage = error.message || '';
  const errorCode = (error as any).code || '';

  return retryableErrors.some((errType) => {
    return (
      errorMessage.includes(errType) ||
      errorCode === errType ||
      errorMessage.includes(errType.toLowerCase())
    );
  });
}

/**
 * 计算延迟时间 (指数退避)
 */
function calculateDelay(attempt: number, options: RequiredRetryOptions): number {
  if (!options.exponentialBackoff) {
    return options.baseDelay;
  }

  // 指数退避: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelay * Math.pow(2, attempt);

  // 添加随机抖动 (±25%) 避免雷击效应
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // 限制最大延迟
  return Math.min(options.maxDelay, exponentialDelay + jitter);
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试统计信息
 */
export interface RetryStats {
  /** 总尝试次数 */
  totalAttempts: number;
  /** 总重试次数 */
  totalRetries: number;
  /** 成功次数 */
  successes: number;
  /** 失败次数 */
  failures: number;
  /** 平均延迟 (毫秒) */
  averageDelay: number;
  /** 总耗时 (毫秒) */
  totalDuration: number;
}

/**
 * 带统计的重试执行器
 *
 * @example
 * ```typescript
 * const executor = new RetryExecutor({ maxRetries: 3 });
 *
 * for (let i = 0; i < 100; i++) {
 *   await executor.execute(async () => {
 *     return await apiCall();
 *   });
 * }
 *
 * console.log(executor.getStats());
 * // { totalAttempts: 100, totalRetries: 15, successes: 95, failures: 5, ... }
 * ```
 */
export class RetryExecutor {
  private options: RequiredRetryOptions;
  private stats: RetryStats = {
    totalAttempts: 0,
    totalRetries: 0,
    successes: 0,
    failures: 0,
    averageDelay: 0,
    totalDuration: 0,
  };
  private delays: number[] = [];

  constructor(options: RetryOptions = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      onRetry: options.onRetry || ((_, __) => {}),
    };
  }

  /**
   * 执行函数并记录统计
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let attemptCount = 0;
    let lastError: Error;

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      attemptCount++;

      try {
        const result = await fn();

        // 记录成功
        this.stats.successes++;
        this.stats.totalRetries += attempt;
        this.stats.totalAttempts++;
        this.stats.totalDuration += Date.now() - startTime;

        return result;
      } catch (error: any) {
        lastError = error;

        if (!shouldRetry(error, this.options.retryableErrors)) {
          break;
        }

        if (attempt < this.options.maxRetries - 1) {
          const delay = calculateDelay(attempt, this.options);
          this.delays.push(delay);
          this.options.onRetry(attempt + 1, error);
          await sleep(delay);
        }
      }
    }

    // 记录失败
    this.stats.failures++;
    this.stats.totalRetries += attemptCount - 1;
    this.stats.totalAttempts++;
    this.stats.totalDuration += Date.now() - startTime;

    throw lastError;
  }

  /**
   * 获取统计信息
   */
  getStats(): RetryStats {
    return {
      ...this.stats,
      averageDelay:
        this.delays.length > 0 ? this.delays.reduce((a, b) => a + b, 0) / this.delays.length : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      totalRetries: 0,
      successes: 0,
      failures: 0,
      averageDelay: 0,
      totalDuration: 0,
    };
    this.delays = [];
  }

  /**
   * 更新选项
   */
  updateOptions(options: Partial<RetryOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }
}

/**
 * 常见错误类型预设
 */
export const RetryPresets = {
  /** 网络错误预设 */
  network: {
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNABORTED',
      'EPIPE',
    ],
  },

  /** HTTP 错误预设 */
  http: {
    retryableErrors: ['5xx', '429'], // 服务器错误 + 限流
  },

  /** 数据库错误预设 */
  database: {
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'connection closed', 'deadlock'],
  },

  /** 所有错误预设 */
  all: {
    retryableErrors: [],
  },
};
