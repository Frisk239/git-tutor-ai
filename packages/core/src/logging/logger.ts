// 结构化日志系统实现
// 基于 Cline 的日志输出,但增加了结构化和级别支持

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志级别名称
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  [key: string]: any;
}

/**
 * 日志选项
 */
export interface LoggerOptions {
  /** 日志级别 */
  level?: LogLevel;
  /** 日志格式 (json | text) */
  format?: 'json' | 'text';
  /** 是否输出到控制台 */
  console?: boolean;
  /** 是否输出到文件 */
  file?: boolean;
  /** 日志文件路径 */
  filePath?: string;
  /** 是否包含堆栈跟踪 */
  includeStack?: boolean;
}

/**
 * 默认日志选项
 */
const defaultOptions: Required<LoggerOptions> = {
  level: LogLevel.INFO,
  format: 'json',
  console: true,
  file: false,
  filePath: './logs/app.log',
  includeStack: true,
};

/**
 * 日志器类
 *
 * @example
 * ```typescript
 * const logger = new Logger("MyService", { level: LogLevel.DEBUG });
 *
 * logger.debug("调试信息", { userId: 123 });
 * logger.info("操作成功", { action: "create", result: "ok" });
 * logger.warn("警告信息", { retries: 3 });
 * logger.error("操作失败", error, { userId: 123 });
 * ```
 */
export class Logger {
  private context: string;
  private options: Required<LoggerOptions>;

  constructor(context: string, options: LoggerOptions = {}) {
    this.context = context;
    this.options = { ...defaultOptions, ...options };

    // 确保日志目录存在
    if (this.options.file && this.options.filePath) {
      const logDir = join(this.options.filePath, '..');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, error?: Error, meta?: any): void {
    const errorMeta = {
      ...meta,
      error: error?.message,
      stack: this.options.includeStack ? error?.stack : undefined,
    };
    this.log(LogLevel.ERROR, message, errorMeta);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    // 检查日志级别
    if (level < this.options.level) {
      return;
    }

    // 构建日志条目
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevelNames[level],
      context: this.context,
      message,
      ...meta,
    };

    // 格式化输出
    const output = this.format(entry);

    // 输出到控制台
    if (this.options.console) {
      this.logToConsole(level, output);
    }

    // 输出到文件
    if (this.options.file) {
      this.logToFile(output);
    }
  }

  /**
   * 格式化日志条目
   */
  private format(entry: LogEntry): string {
    if (this.options.format === 'json') {
      return JSON.stringify(entry);
    } else {
      // 文本格式
      const meta = Object.entries(entry)
        .filter(([key]) => !['timestamp', 'level', 'context', 'message'].includes(key))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');

      return `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}${
        meta ? ' ' + meta : ''
      }`;
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(level: LogLevel, message: string): void {
    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
          ? console.warn
          : level === LogLevel.DEBUG
            ? console.debug
            : console.log;

    consoleMethod(message);
  }

  /**
   * 输出到文件
   */
  private logToFile(message: string): void {
    try {
      const logMessage = message + '\n';
      if (existsSync(this.options.filePath)) {
        appendFileSync(this.options.filePath, logMessage, 'utf-8');
      } else {
        writeFileSync(this.options.filePath, logMessage, 'utf-8');
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * 创建子日志器 (继承配置,但使用不同的 context)
   */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, this.options);
  }

  /**
   * 更新日志级别
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.options.level;
  }
}

/**
 * 全局日志器实例
 */
export const logger = new Logger('GitTutorAI', {
  level: LogLevel.INFO,
  format: 'json',
  console: true,
  file: false,
});

/**
 * 模块日志器缓存
 */
const loggerCache = new Map<string, Logger>();

/**
 * 获取模块日志器
 *
 * @example
 * ```typescript
 * const log = getLogger("MyService");
 * log.info("Service started");
 * ```
 */
export function getLogger(context: string): Logger {
  if (!loggerCache.has(context)) {
    loggerCache.set(context, logger.child(context));
  }
  return loggerCache.get(context)!;
}

/**
 * 日志中间件 (用于 Fastify)
 */
export function loggerMiddleware(logger: Logger) {
  return async (request: any, reply: any) => {
    const start = Date.now();

    // 记录请求
    logger.info('Incoming request', {
      method: request.method,
      url: request.url,
      ip: request.ip,
    });

    // 响应后记录
    reply.addHook('onSend', async () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
      });
    });
  };
}

/**
 * 错误日志中间件
 */
export function errorLoggerMiddleware(logger: Logger) {
  return async (error: any, request: any, reply: any) => {
    logger.error('Request error', error, {
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
  };
}

/**
 * 性能日志器
 * 用于测量和记录函数执行时间
 */
export class PerformanceLogger {
  private logger: Logger;
  private context: string;

  constructor(logger: Logger, context: string) {
    this.logger = logger;
    this.context = context;
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.logger.debug(`${this.context}:${name} completed`, {
        duration,
        performance: {
          name: `${this.context}:${name}`,
          duration,
          timestamp: new Date().toISOString(),
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.logger.error(`${this.context}:${name} failed`, error as Error, {
        duration,
        performance: {
          name: `${this.context}:${name}`,
          duration,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  /**
   * 创建子性能日志器
   */
  child(context: string): PerformanceLogger {
    return new PerformanceLogger(this.logger, `${this.context}:${context}`);
  }
}

/**
 * 创建性能日志器
 */
export function createPerformanceLogger(context: string): PerformanceLogger {
  return new PerformanceLogger(logger, context);
}

/**
 * 日志统计器
 * 用于统计日志级别分布
 */
export class LogStatistics {
  private stats: Map<LogLevel, number> = new Map();

  constructor() {
    this.stats.set(LogLevel.DEBUG, 0);
    this.stats.set(LogLevel.INFO, 0);
    this.stats.set(LogLevel.WARN, 0);
    this.stats.set(LogLevel.ERROR, 0);
  }

  /**
   * 记录日志
   */
  record(level: LogLevel): void {
    const count = this.stats.get(level) || 0;
    this.stats.set(level, count + 1);
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, number> {
    return {
      debug: this.stats.get(LogLevel.DEBUG) || 0,
      info: this.stats.get(LogLevel.INFO) || 0,
      warn: this.stats.get(LogLevel.WARN) || 0,
      error: this.stats.get(LogLevel.ERROR) || 0,
      total: Array.from(this.stats.values()).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.stats.set(LogLevel.DEBUG, 0);
    this.stats.set(LogLevel.INFO, 0);
    this.stats.set(LogLevel.WARN, 0);
    this.stats.set(LogLevel.ERROR, 0);
  }
}

/**
 * 带统计的日志器
 */
export class LoggerWithStats extends Logger {
  private stats: LogStatistics;

  constructor(context: string, options: LoggerOptions = {}) {
    super(context, options);
    this.stats = new LogStatistics();
  }

  /**
   * 重写 log 方法以记录统计
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    this.stats.record(level);
    super.log(level, message, meta);
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, number> {
    return this.stats.getStats();
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.reset();
  }
}

/**
 * 日志级别解析器
 * 从字符串解析日志级别
 */
export function parseLogLevel(level: string): LogLevel {
  const upper = level.toUpperCase();
  switch (upper) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

/**
 * 日志格式化器
 * 格式化错误对象为可读字符串
 */
export function formatError(error: Error): string {
  if (!error) return '';

  const parts = [error.message];

  if (error.stack) {
    parts.push('\n' + error.stack);
  }

  if ((error as any).code) {
    parts.push(`(Code: ${(error as any).code})`);
  }

  return parts.join(' ');
}

/**
 * 批量日志器
 * 批量记录日志并一次性输出
 */
export class BatchLogger {
  private logger: Logger;
  private entries: Array<{ level: LogLevel; message: string; meta?: any }> = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 添加日志条目
   */
  add(level: LogLevel, message: string, meta?: any): void {
    this.entries.push({ level, message, meta });
  }

  /**
   * 刷新日志到输出
   */
  flush(): void {
    for (const entry of this.entries) {
      if (entry.level === LogLevel.ERROR) {
        this.logger.error(entry.message, entry.meta?.error as Error, entry.meta);
      } else {
        this.logger.log(entry.level, entry.message, entry.meta);
      }
    }
    this.entries = [];
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * 获取缓冲区大小
   */
  size(): number {
    return this.entries.length;
  }
}
