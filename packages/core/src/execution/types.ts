/**
 * 任务执行引擎类型定义
 *
 * 基于 Cline 的任务执行架构
 */

import type { Message } from "../../ai/types.js";

// ============================================================================
// 任务标识类型
// ============================================================================

/**
 * 任务 ID (字符串格式)
 */
export type TaskId = string;

/**
 * ULID (Universally Unique Lexicographically Sortable Identifier)
 * 用于时间排序的唯一标识符
 */
export type ULID = string;

// ============================================================================
// 任务生命周期
// ============================================================================

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 任务已创建但未开始 */
  CREATED = "created",
  /** 任务正在执行 */
  RUNNING = "running",
  /** 任务已暂停 */
  PAUSED = "paused",
  /** 任务已完成 */
  COMPLETED = "completed",
  /** 任务已失败 */
  FAILED = "failed",
  /** 任务已取消 */
  CANCELLED = "cancelled",
}

/**
 * 任务阶段
 */
export enum TaskPhase {
  /** 初始化阶段 */
  INITIALIZING = "initializing",
  /** 执行阶段 */
  EXECUTING = "executing",
  /** 流式响应阶段 */
  STREAMING = "streaming",
  /** 工具执行阶段 */
  TOOL_EXECUTING = "tool_executing",
  /** 清理阶段 */
  CLEANUP = "cleanup",
}

// ============================================================================
// 消息类型
// ============================================================================

/**
 * 用户消息内容
 */
export interface UserContent {
  type: "text" | "image" | "file";
  text?: string;
  image?: string;
  file?: {
    path: string;
    content?: string;
  };
}

/**
 * 助手消息内容
 */
export interface AssistantContent {
  type: "text" | "tool_use";
  text?: string;
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, any>;
  };
}

/**
 * 完整的消息内容
 */
export type MessageContent = UserContent | AssistantContent;

// ============================================================================
// API 消息类型
// ============================================================================

/**
 * API 消息（用于发送给 AI 服务）
 */
export interface APIMessage {
  /** 消息角色 */
  role: "user" | "assistant" | "system";
  /** 消息内容 */
  content: string | MessageContent[];
}

// ============================================================================
// 流式响应类型
// ============================================================================

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 内容块 */
  content: MessageContent[];
  /** 是否为部分内容 */
  partial?: boolean;
  /** 是否为最后一个块 */
  isLast?: boolean;
  /** 工具使用增量 */
  toolUseDelta?: ToolUseDelta;
}

/**
 * 工具使用增量块
 */
export interface ToolUseDelta {
  type: "tool_use";
  id?: string;
  name?: string;
  input?: string;
}

// ============================================================================
// 任务配置
// ============================================================================

/**
 * 任务配置参数
 */
export interface TaskConfig {
  /** 任务 ID */
  taskId: TaskId;
  /** ULID */
  ulid: ULID;
  /** 工作目录 */
  cwd: string;
  /** 终端执行模式 */
  terminalExecutionMode: "background" | "integrated";
  /** 终端输出行数限制 */
  terminalOutputLineLimit: number;
  /** 是否启用终端重用 */
  terminalReuseEnabled: boolean;
  /** 默认终端配置文件 */
  defaultTerminalProfile?: string;
  /** Shell 集成超时 */
  shellIntegrationTimeout: number;
}

// ============================================================================
// 任务元数据
// ============================================================================

/**
 * 任务历史项
 */
export interface TaskHistoryItem {
  /** 任务 ID */
  taskId: TaskId;
  /** ULID */
  ulid: ULID;
  /** 任务描述 */
  task?: string;
  /** 时间戳 */
  timestamp: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 消息数量 */
  messageCount: number;
  /** 是否收藏 */
  isFavorited?: boolean;
  /** 使用的 token 数量 */
  tokensUsed?: number;
}

// ============================================================================
// 回调函数类型
// ============================================================================

/**
 * 任务状态更新回调
 */
export type TaskStateCallback = (state: TaskStatus) => Promise<void>;

/**
 * 消息更新回调
 */
export type MessageUpdateCallback = (message: Message) => Promise<void>;

/**
 * 流式内容回调
 */
export type StreamContentCallback = (content: MessageContent[], partial?: boolean) => Promise<void>;

/**
 * 工具执行回调
 */
export type ToolExecutionCallback = (
  toolName: string,
  toolInput: Record<string, any>
) => Promise<any>;

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 任务错误
 */
export class TaskError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "TaskError";
  }
}

/**
 * 任务取消错误
 */
export class TaskCancelledError extends TaskError {
  constructor(message = "Task was cancelled") {
    super(message, "TASK_CANCELLED");
    this.name = "TaskCancelledError";
  }
}

/**
 * 任务超时错误
 */
export class TaskTimeoutError extends TaskError {
  constructor(message = "Task timed out") {
    super(message, "TASK_TIMEOUT");
    this.name = "TaskTimeoutError";
  }
}

// ============================================================================
// 工具执行相关
// ============================================================================

/**
 * 工具执行请求
 */
export interface ToolExecutionRequest {
  /** 工具名称 */
  name: string;
  /** 工具输入参数 */
  input: Record<string, any>;
  /** 工具 ID */
  id: string;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 是否需要用户输入 */
  requiresUserInput?: boolean;
}

// ============================================================================
// 上下文管理类型
// ============================================================================

/**
 * 上下文压缩策略
 */
export enum ContextCompressionStrategy {
  /** 不压缩 */
  NONE = "none",
  /** 保留最后两个消息 */
  LAST_TWO = "last_two",
  /** 保留一半 */
  HALF = "half",
  /** 保留四分之一 */
  QUARTER = "quarter",
}

/**
 * 上下文管理配置
 */
export interface ContextConfig {
  /** 最大 token 数量 */
  maxTokens: number;
  /** 压缩策略 */
  compressionStrategy: ContextCompressionStrategy;
  /** 是否启用自动压缩 */
  autoCompress: boolean;
  /** 压缩阈值 (百分比) */
  compressionThreshold: number;
}
