/**
 * Task - 任务执行器
 *
 * 基于 Cline 的 Task 实现
 * 负责任务的完整生命周期管理，包括初始化、执行、流式响应处理和清理
 */

import { ulid } from "ulid";
import { v4 as uuidv4 } from "uuid";
import type { AIService } from "../../ai/types.js";
import type { ToolRegistry } from "../../tools.js";
import { TaskState } from "../state/TaskState.js";
import { StreamHandler } from "../stream/StreamHandler.js";
import {
  TaskStatus,
  TaskPhase,
} from "../types.js";
import type {
  TaskId,
  TaskConfig,
  MessageContent,
  UserContent,
  AssistantContent,
  ToolExecutionRequest,
  ToolExecutionResult,
  StreamChunk,
  TaskHistoryItem,
  TaskCancelledError,
} from "../types.js";

// ============================================================================
// 回调函数接口
// ============================================================================

/**
 * 任务回调函数
 */
export interface TaskCallbacks {
  /** 消息更新回调 */
  onMessageUpdate?: (message: MessageContent[]) => Promise<void>;
  /** 流式内容回调 */
  onStreamContent?: (content: MessageContent[], partial?: boolean) => Promise<void>;
  /** 工具执行回调 */
  onToolExecute?: (tool: ToolExecutionRequest) => Promise<ToolExecutionResult>;
  /** 状态更新回调 */
  onStateChange?: (status: TaskStatus) => Promise<void>;
  /** 错误回调 */
  onError?: (error: Error) => Promise<void>;
}

// ============================================================================
// Task 类
// ============================================================================

export class Task {
  // ========================================================================
  // 公共只读属性
  // ========================================================================

  /** 任务 ID */
  readonly taskId: TaskId;

  /** ULID (字符串形式) */
  readonly ulid: string;

  /** 任务配置 */
  readonly config: TaskConfig;

  // ========================================================================
  // 核心组件
  // ========================================================================

  /** 任务状态管理器 */
  public readonly taskState: TaskState;

  /** 流式响应处理器 */
  private readonly streamHandler: StreamHandler;

  // ========================================================================
  // 依赖服务
  // ========================================================================

  /** AI 服务 */
  private aiService: AIService;

  /** 工具注册表 */
  private toolRegistry: ToolRegistry;

  /** 回调函数 */
  private callbacks: TaskCallbacks;

  // ========================================================================
  // 内部状态
  // ========================================================================

  /** 任务是否已启动 */
  private started = false;

  /** 任务是否已完成 */
  private completed = false;

  /** 当前消息索引 */
  private currentMessageIndex = 0;

  // ========================================================================
  // 构造函数
  // ========================================================================

  constructor(
    config: TaskConfig,
    aiService: AIService,
    toolRegistry: ToolRegistry,
    callbacks: TaskCallbacks = {}
  ) {
    // 生成任务标识符
    this.taskId = config.taskId || uuidv4();
    this.ulid = ulid();

    // 保存配置和依赖
    this.config = config;
    this.aiService = aiService;
    this.toolRegistry = toolRegistry;
    this.callbacks = callbacks;

    // 初始化核心组件
    this.taskState = new TaskState();
    this.streamHandler = new StreamHandler();
  }

  // ========================================================================
  // 任务生命周期方法
  // ========================================================================

  /**
   * 启动新任务
   */
  async startTask(
    task: string,
    images?: string[],
    files?: string[]
  ): Promise<void> {
    if (this.started) {
      throw new Error("Task has already been started");
    }

    this.started = true;

    try {
      // 1. 设置初始状态
      await this.taskState.setState(TaskStatus.RUNNING, TaskPhase.INITIALIZING);

      // 2. 通知状态变化
      await this.notifyStateChange(TaskStatus.RUNNING);

      // 3. 构建用户内容
      const userContent = this.buildUserContent(task, images, files);

      // 4. 发送初始消息
      await this.say("text", task, images, files);

      // 5. 启动任务循环
      await this.initiateTaskLoop(userContent);

      // 6. 标记完成
      await this.markCompleted();

    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  /**
   * 从历史恢复任务
   */
  async resumeTaskFromHistory(historyItem: TaskHistoryItem): Promise<void> {
    if (this.started) {
      throw new Error("Task has already been started");
    }

    this.started = true;

    try {
      // 1. 设置状态为恢复中
      await this.taskState.setState(TaskStatus.RUNNING, TaskPhase.INITIALIZING);

      // 2. 通知状态变化
      await this.notifyStateChange(TaskStatus.RUNNING);

      // 3. 这里应该加载历史消息并恢复上下文
      // TODO: 实现历史恢复逻辑

      // 4. 继续任务循环
      await this.initiateTaskLoop([]);

    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  /**
   * 中止任务
   */
  async abortTask(): Promise<void> {
    if (!this.started || this.completed) {
      return;
    }

    try {
      // 1. 请求中止
      await this.taskState.requestAbort();

      // 2. 等待流式处理中止
      if (this.taskState.isStreaming) {
        await this.waitForStreamAbort();
      }

      // 3. 设置状态为已取消
      await this.taskState.setState(TaskStatus.CANCELLED, TaskPhase.CLEANUP);

      // 4. 通知状态变化
      await this.notifyStateChange(TaskStatus.CANCELLED);

      // 5. 清理资源
      await this.cleanup();

    } catch (error) {
      console.error("Error aborting task:", error);
    }
  }

  // ========================================================================
  // 任务执行循环
  // ========================================================================

  /**
   * 启动任务循环
   */
  private async initiateTaskLoop(initialUserContent: MessageContent[]): Promise<void> {
    let nextUserContent = initialUserContent;
    let includeFileDetails = true;

    // 任务主循环
    while (!this.taskState.abort && !this.completed) {
      // 执行递归 API 请求
      const didEndLoop = await this.recursivelyMakeClineRequests(
        nextUserContent,
        includeFileDetails
      );

      // 只在第一次需要文件详情
      includeFileDetails = false;

      if (didEndLoop) {
        // 任务完成，退出循环
        break;
      } else {
        // 没有使用工具，增加错误计数
        this.taskState.incrementMistakeCount();

        // 检查是否达到最大错误数
        if (this.taskState.hasReachedMaxMistakes()) {
          throw new Error("Maximum consecutive mistakes reached (no tool use)");
        }

        // 强制继续
        nextUserContent = [{
          type: "text",
          text: "Please continue with the next step.",
        }];
      }
    }
  }

  /**
   * 递归处理 Cline 请求
   */
  private async recursivelyMakeClineRequests(
    userContent: MessageContent[],
    includeFileDetails: boolean = false
  ): Promise<boolean> {
    // 1. 检查中止标志
    if (this.taskState.abort) {
      throw new TaskCancelledError("Task was aborted");
    }

    // 2. 设置流式状态
    this.taskState.isStreaming = true;
    this.taskState.isWaitingForFirstChunk = true;

    try {
      // 3. 构建完整的消息历史
      const messages = await this.buildMessageHistory(userContent, includeFileDetails);

      // 4. 发起 API 请求
      await this.notifyApiReqStart();

      const stream = this.attemptApiRequest(messages);

      // 5. 处理流式响应
      const assistantResponse = await this.processStreamResponse(stream);

      // 6. 完成流式处理
      this.taskState.isStreaming = false;
      this.taskState.didCompleteReadingStream = true;

      // 7. 提取并执行工具调用
      const toolUses = this.extractToolUses(assistantResponse);

      if (toolUses.length > 0) {
        // 执行工具调用
        const shouldEndLoop = await this.executeTools(toolUses);
        return shouldEndLoop;
      } else {
        // 没有工具调用，继续循环
        return false;
      }

    } catch (error) {
      this.taskState.isStreaming = false;

      if ((error as TaskCancelledError).code === "TASK_CANCELLED") {
        throw error;
      }

      // 处理错误
      await this.handleError(error as Error);
      return false;
    }
  }

  // ========================================================================
  // API 请求处理
  // ========================================================================

  /**
   * 尝试发起 API 请求
   */
  private async *attemptApiRequest(messages: any[]): AsyncIterable<StreamChunk> {
    // TODO: 实现实际的 API 调用
    // 这里应该是调用 aiService.sendMessage 并处理流式响应

    // 示例实现：
    try {
      const stream = this.aiService.stream(messages);

      for await (const chunk of stream) {
        yield {
          content: chunk.content || [],
          partial: chunk.partial,
          isLast: chunk.isLast,
          toolUseDelta: chunk.toolUseDelta,
        };
      }
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // ========================================================================
  // 流式响应处理
  // ========================================================================

  /**
   * 处理流式响应
   */
  private async processStreamResponse(
    stream: AsyncIterable<StreamChunk>
  ): Promise<AssistantContent[]> {
    this.streamHandler.reset();

    for await (const chunk of stream) {
      // 1. 处理数据块
      const result = await this.streamHandler.handleChunk(chunk);

      // 2. 更新 UI
      if (result.content && result.content.length > 0) {
        await this.notifyStreamContent(result.content, chunk.partial);
      }

      // 3. 处理工具调用
      if (result.toolUses && result.toolUses.length > 0) {
        for (const toolUse of result.toolUses) {
          await this.notifyToolExecution(toolUse);
        }
      }

      // 4. 更新等待状态
      if (this.taskState.isWaitingForFirstChunk) {
        this.taskState.isWaitingForFirstChunk = false;
      }
    }

    // 返回累积的助手内容
    return this.streamHandler.getAccumulatedContent().filter(
      (c): c is AssistantContent => c.type === "tool_use" || c.type === "text"
    );
  }

  // ========================================================================
  // 工具执行
  // ========================================================================

  /**
   * 提取工具调用
   */
  private extractToolUses(response: AssistantContent[]): Array<{
    id: string;
    name: string;
    input: any;
  }> {
    return response
      .filter((c) => c.type === "tool_use" && c.toolUse)
      .map((c) => ({
        id: c.toolUse!.id,
        name: c.toolUse!.name,
        input: c.toolUse!.input,
      }));
  }

  /**
   * 执行工具调用
   */
  private async executeTools(toolUses: Array<{
    id: string;
    name: string;
    input: any;
  }>): Promise<boolean> {
    for (const toolUse of toolUses) {
      // 检查中止
      if (this.taskState.abort) {
        throw new TaskCancelledError("Task was aborted during tool execution");
      }

      // 执行工具
      const result = await this.executeTool(toolUse);

      // 处理工具结果
      await this.handleToolResult(toolUse, result);

      // 记录工具使用
      this.taskState.recordToolUse(toolUse.name);
    }

    // 返回 false 表示继续循环
    return false;
  }

  /**
   * 执行单个工具
   */
  private async executeTool(toolUse: {
    id: string;
    name: string;
    input: any;
  }): Promise<ToolExecutionResult> {
    try {
      // 设置阶段
      await this.taskState.setPhase(TaskPhase.TOOL_EXECUTING);

      // 获取工具
      const tool = this.toolRegistry.getTool(toolUse.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolUse.name}`);
      }

      // 执行工具
      if (this.callbacks.onToolExecute) {
        return await this.callbacks.onToolExecute({
          name: toolUse.name,
          input: toolUse.input,
          id: toolUse.id,
        });
      } else {
        // 默认实现：直接调用工具处理器
        return await tool.handler.execute(
          {
            conversationId: this.taskId,
            userId: "system",
            permissions: new Set(),
            metadata: {},
          },
          toolUse.input
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 处理工具执行结果
   */
  private async handleToolResult(
    toolUse: { id: string; name: string; input: any },
    result: ToolExecutionResult
  ): Promise<void> {
    // TODO: 将工具结果添加到消息历史
    // 这里应该构建工具结果消息并添加到 API 对话历史中

    if (!result.success) {
      this.taskState.incrementMistakeCount();

      if (this.taskState.hasReachedMaxMistakes()) {
        throw new Error("Maximum consecutive mistakes reached");
      }
    }
  }

  // ========================================================================
  // 消息构建
  // ========================================================================

  /**
   * 构建用户内容
   */
  private buildUserContent(
    task: string,
    images?: string[],
    files?: string[]
  ): MessageContent[] {
    const content: MessageContent[] = [];

    // 添加任务文本
    content.push({
      type: "text",
      text: `<task>\n${task}\n</task>`,
    });

    // 添加图片
    if (images && images.length > 0) {
      for (const image of images) {
        content.push({
          type: "image",
          image,
        });
      }
    }

    // 添加文件
    if (files && files.length > 0) {
      for (const file of files) {
        content.push({
          type: "file",
          file: { path: file },
        });
      }
    }

    return content;
  }

  /**
   * 构建消息历史
   */
  private async buildMessageHistory(
    userContent: MessageContent[],
    includeFileDetails: boolean
  ): Promise<any[]> {
    // TODO: 实现完整的消息历史构建
    // 这里应该：
    // 1. 获取历史消息
    // 2. 应用上下文压缩（如果需要）
    // 3. 添加文件详情（如果需要）
    // 4. 返回完整的消息数组

    const history = this.taskState.getApiConversationHistory();

    // 添加新的用户消息
    const userMessage = {
      role: "user",
      content: userContent,
    };

    return [...history, userMessage];
  }

  // ========================================================================
  // 清理和完成
  // ========================================================================

  /**
   * 标记任务完成
   */
  private async markCompleted(): Promise<void> {
    this.completed = true;
    await this.taskState.setState(TaskStatus.COMPLETED, TaskPhase.CLEANUP);
    await this.notifyStateChange(TaskStatus.COMPLETED);
    await this.cleanup();
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    // TODO: 实现资源清理
    // 1. 清理终端会话
    // 2. 清理浏览器会话
    // 3. 保存最终状态
    // 4. 通知清理完成

    this.streamHandler.reset();
  }

  // ========================================================================
  // 等待流中止
  // ========================================================================

  /**
   * 等待流式响应中止
   */
  private async waitForStreamAbort(): Promise<void> {
    const timeout = 5000; // 5 秒超时
    const startTime = Date.now();

    while (this.taskState.isStreaming && !this.taskState.didFinishAbortingStream) {
      if (Date.now() - startTime > timeout) {
        console.warn("Stream abort timeout");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // ========================================================================
  // 通知方法
  // ========================================================================

  /**
   * 发送消息
   */
  private async say(
    type: string,
    text?: string,
    images?: string[],
    files?: string[]
  ): Promise<void> {
    // TODO: 实现消息发送
    // 这里应该构建消息并发送给前端

    if (this.callbacks.onMessageUpdate) {
      const content: MessageContent[] = [];
      if (text) {
        content.push({ type: "text", text });
      }
      if (images) {
        for (const image of images) {
          content.push({ type: "image", image });
        }
      }
      if (files) {
        for (const file of files) {
          content.push({ type: "file", file: { path: file } });
        }
      }
      await this.callbacks.onMessageUpdate(content);
    }
  }

  /**
   * 通知状态变化
   */
  private async notifyStateChange(status: TaskStatus): Promise<void> {
    if (this.callbacks.onStateChange) {
      await this.callbacks.onStateChange(status);
    }
  }

  /**
   * 通知流式内容
   */
  private async notifyStreamContent(
    content: MessageContent[],
    partial?: boolean
  ): Promise<void> {
    if (this.callbacks.onStreamContent) {
      await this.callbacks.onStreamContent(content, partial);
    }
  }

  /**
   * 通知 API 请求开始
   */
  private async notifyApiReqStart(): Promise<void> {
    // TODO: 实现 API 请求开始通知
  }

  /**
   * 通知工具执行
   */
  private async notifyToolExecution(toolUse: {
    id: string;
    name: string;
    input: any;
  }): Promise<void> {
    // TODO: 实现工具执行通知
  }

  // ========================================================================
  // 错误处理
  // ========================================================================

  /**
   * 处理错误
   */
  private async handleError(error: Error): Promise<void> {
    console.error("Task error:", error);

    if (this.callbacks.onError) {
      await this.callbacks.onError(error);
    }

    // 设置失败状态
    if (!this.taskState.isTerminal()) {
      await this.taskState.setState(TaskStatus.FAILED, TaskPhase.CLEANUP);
      await this.notifyStateChange(TaskStatus.FAILED);
    }

    await this.cleanup();
  }

  // ========================================================================
  // 公共查询方法
  // ========================================================================

  /**
   * 获取任务摘要
   */
  getSummary(): {
    taskId: TaskId;
    ulid: string;
    status: TaskStatus;
    phase: any;
    started: boolean;
    completed: boolean;
  } {
    const summary = this.taskState.getSummary();
    return {
      taskId: this.taskId,
      ulid: this.ulid,
      status: summary.status,
      phase: summary.phase,
      started: this.started,
      completed: this.completed,
    };
  }
}
