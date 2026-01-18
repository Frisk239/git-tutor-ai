/**
 * TaskState - 任务状态管理器
 *
 * 基于 Cline 的 TaskState 实现
 * 使用互斥锁机制确保状态更新的线程安全
 */

import { Mutex } from "async-mutex";
import {
  MessageContent,
  AssistantContent,
  UserContent,
  TaskStatus,
  TaskPhase,
} from "../types.js";

// ============================================================================
// 状态接口
// ============================================================================

/**
 * 任务快照状态
 */
interface TaskSnapshot {
  status: TaskStatus;
  phase: TaskPhase;
  messageIndex: number;
  timestamp: string;
}

// ============================================================================
// TaskState 类
// ============================================================================

export class TaskState {
  // ========================================================================
  // 私有属性
  // ========================================================================

  /** 互斥锁，防止并发状态更新 */
  private readonly mutex = new Mutex();

  /** 当前任务状态 */
  private _status: TaskStatus = TaskStatus.CREATED;

  /** 当前任务阶段 */
  private _phase: TaskPhase = TaskPhase.INITIALIZING;

  // ========================================================================
  // 流式响应状态
  // ========================================================================

  /** 是否正在流式处理 */
  public isStreaming = false;

  /** 是否等待第一个数据块 */
  public isWaitingForFirstChunk = false;

  /** 是否完成流读取 */
  public didCompleteReadingStream = false;

  /** 当前流式内容索引 */
  public currentStreamingContentIndex = 0;

  // ========================================================================
  // 消息内容
  // ========================================================================

  /** 助手消息内容 */
  public assistantMessageContent: AssistantContent[] = [];

  /** 用户消息内容 */
  public userMessageContent: UserContent[] = [];

  // ========================================================================
  // 工具执行状态
  // ========================================================================

  /** 是否拒绝了工具 */
  public didRejectTool = false;

  /** 是否已经使用了工具 */
  public didAlreadyUseTool = false;

  /** 上一个工具名称 */
  public lastToolName: string = "";

  /** 连续错误计数 */
  public consecutiveMistakeCount = 0;

  /** 最大连续错误数 */
  public readonly MAX_CONSECUTIVE_MISTAKES = 5;

  // ========================================================================
  // 任务控制
  // ========================================================================

  /** 是否中止任务 */
  public abort: boolean = false;

  /** 是否完成中止流 */
  public didFinishAbortingStream = false;

  /** 是否放弃任务 */
  public abandoned = false;

  // ========================================================================
  // 上下文压缩状态
  // ========================================================================

  /** 是否正在总结 */
  public currentlySummarizing: boolean = false;

  /** 上次自动压缩触发索引 */
  public lastAutoCompactTriggerIndex?: number;

  // ========================================================================
  // 消息历史管理
  // ========================================================================

  /** API 消息历史 */
  private apiConversationHistory: any[] = [];

  /** 已删除的消息范围 */
  public conversationHistoryDeletedRange?: [number, number];

  // ========================================================================
  // 重试机制
  // ========================================================================

  /** 是否已自动重试失败的 API 请求 */
  public didAutomaticallyRetryFailedApiRequest = false;

  // ========================================================================
  // 快照历史
  // ========================================================================

  /** 任务快照历史 */
  private snapshots: TaskSnapshot[] = [];

  /** 最大快照数量 */
  private readonly MAX_SNAPSHOTS = 100;

  // ========================================================================
  // 构造函数
  // ========================================================================

  constructor() {
    // 创建初始快照
    this.createSnapshot();
  }

  // ========================================================================
  // 状态访问器
  // ========================================================================

  /**
   * 获取当前任务状态
   */
  get status(): TaskStatus {
    return this._status;
  }

  /**
   * 获取当前任务阶段
   */
  get phase(): TaskPhase {
    return this._phase;
  }

  // ========================================================================
  // 状态转换方法（线程安全）
  // ========================================================================

  /**
   * 设置任务状态
   */
  async setStatus(status: TaskStatus): Promise<void> {
    return this.mutex.runExclusive(async () => {
      const oldStatus = this._status;
      this._status = status;

      // 创建快照
      this.createSnapshot();

      // 验证状态转换
      this.validateStatusTransition(oldStatus, status);
    });
  }

  /**
   * 设置任务阶段
   */
  async setPhase(phase: TaskPhase): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this._phase = phase;
      this.createSnapshot();
    });
  }

  /**
   * 同时设置状态和阶段
   */
  async setState(status: TaskStatus, phase: TaskPhase): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this._status = status;
      this._phase = phase;
      this.createSnapshot();
    });
  }

  // ========================================================================
  // 消息管理方法
  // ========================================================================

  /**
   * 添加助手消息内容
   */
  async addAssistantContent(content: AssistantContent[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.assistantMessageContent.push(...content);
    });
  }

  /**
   * 添加用户消息内容
   */
  async addUserContent(content: UserContent[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.userMessageContent.push(...content);
    });
  }

  /**
   * 清空消息内容
   */
  async clearMessages(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.assistantMessageContent = [];
      this.userMessageContent = [];
      this.apiConversationHistory = [];
      this.conversationHistoryDeletedRange = undefined;
    });
  }

  /**
   * 获取 API 对话历史
   */
  getApiConversationHistory(): any[] {
    return this.apiConversationHistory;
  }

  /**
   * 设置 API 对话历史
   */
  async setApiConversationHistory(history: any[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.apiConversationHistory = history;
    });
  }

  // ========================================================================
  // 工具执行状态管理
  // ========================================================================

  /**
   * 记录工具使用
   */
  recordToolUse(toolName: string): void {
    this.didAlreadyUseTool = true;
    this.lastToolName = toolName;
    this.consecutiveMistakeCount = 0; // 重置错误计数
  }

  /**
   * 记录工具拒绝
   */
  recordToolRejection(): void {
    this.didRejectTool = true;
  }

  /**
   * 增加错误计数
   */
  incrementMistakeCount(): void {
    this.consecutiveMistakeCount++;
  }

  /**
   * 重置错误计数
   */
  resetMistakeCount(): void {
    this.consecutiveMistakeCount = 0;
  }

  /**
   * 检查是否达到最大错误数
   */
  hasReachedMaxMistakes(): boolean {
    return this.consecutiveMistakeCount >= this.MAX_CONSECUTIVE_MISTAKES;
  }

  // ========================================================================
  // 任务中止控制
  // ========================================================================

  /**
   * 请求中止任务
   */
  async requestAbort(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.abort = true;

      // 如果正在流式处理，等待完成
      if (this.isStreaming) {
        this.didFinishAbortingStream = false;
      }
    });
  }

  /**
   * 标记流中止完成
   */
  markStreamAbortCompleted(): void {
    this.didFinishAbortingStream = true;
  }

  /**
   * 重置中止状态
   */
  async resetAbortState(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.abort = false;
      this.didFinishAbortingStream = false;
    });
  }

  // ========================================================================
  // 快照管理
  // ========================================================================

  /**
   * 创建状态快照
   */
  private createSnapshot(): void {
    const snapshot: TaskSnapshot = {
      status: this._status,
      phase: this._phase,
      messageIndex: this.assistantMessageContent.length + this.userMessageContent.length,
      timestamp: new Date().toISOString(),
    };

    this.snapshots.push(snapshot);

    // 限制快照数量
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  /**
   * 获取状态快照历史
   */
  getSnapshots(): TaskSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取最新快照
   */
  getLatestSnapshot(): TaskSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  // ========================================================================
  // 状态验证
  // ========================================================================

  /**
   * 验证状态转换是否合法
   */
  private validateStatusTransition(oldStatus: TaskStatus, newStatus: TaskStatus): void {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.CREATED]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
      [TaskStatus.RUNNING]: [
        TaskStatus.PAUSED,
        TaskStatus.COMPLETED,
        TaskStatus.FAILED,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.PAUSED]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [], // 终态
      [TaskStatus.FAILED]: [], // 终态
      [TaskStatus.CANCELLED]: [], // 终态
    };

    const allowed = validTransitions[oldStatus];
    if (allowed && !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${oldStatus} -> ${newStatus}. Allowed transitions: ${allowed.join(", ")}`
      );
    }
  }

  // ========================================================================
  // 状态查询方法
  // ========================================================================

  /**
   * 检查任务是否处于活动状态
   */
  isActive(): boolean {
    return (
      this._status === TaskStatus.RUNNING ||
      this._status === TaskStatus.PAUSED
    );
  }

  /**
   * 检查任务是否处于终态
   */
  isTerminal(): boolean {
    return (
      this._status === TaskStatus.COMPLETED ||
      this._status === TaskStatus.FAILED ||
      this._status === TaskStatus.CANCELLED
    );
  }

  /**
   * 检查是否可以执行新操作
   */
  canExecute(): boolean {
    return (
      this._status === TaskStatus.RUNNING &&
      !this.abort &&
      !this.didCompleteReadingStream
    );
  }

  /**
   * 获取状态摘要
   */
  getSummary(): {
    status: TaskStatus;
    phase: TaskPhase;
    messageCount: number;
    isStreaming: boolean;
    abort: boolean;
    consecutiveMistakes: number;
  } {
    return {
      status: this._status,
      phase: this._phase,
      messageCount:
        this.assistantMessageContent.length + this.userMessageContent.length,
      isStreaming: this.isStreaming,
      abort: this.abort,
      consecutiveMistakes: this.consecutiveMistakeCount,
    };
  }
}
