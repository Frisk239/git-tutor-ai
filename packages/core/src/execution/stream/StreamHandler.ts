/**
 * StreamHandler - 流式响应处理器
 *
 * 基于 Cline 的 StreamResponseHandler 实现
 * 处理来自 AI API 的流式数据，支持实时更新和工具调用检测
 */

import type { MessageContent, StreamChunk, ToolUseDelta } from "../types.js";

// ============================================================================
// 工具调用相关类型
// ============================================================================

/**
 * 待处理的工具使用
 */
interface PendingToolUse {
  /** 工具 ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 累积的输入参数 */
  input: string;
  /** 是否完成 */
  complete: boolean;
}

// ============================================================================
// StreamHandler 类
// ============================================================================

export class StreamHandler {
  // ========================================================================
  // 私有属性
  // ========================================================================

  /** 待处理的工具调用映射 */
  private pendingToolUses = new Map<string, PendingToolUse>();

  /** 当前累积的内容 */
  private accumulatedContent: MessageContent[] = [];

  /** 是否已完成 */
  private isComplete = false;

  /** 当前请求 ID */
  private requestId?: string;

  // ========================================================================
  // 公共方法
  // ========================================================================

  /**
   * 处理流式数据块
   */
  async handleChunk(chunk: StreamChunk): Promise<{
    content: MessageContent[];
    toolUses?: Array<{ id: string; name: string; input: any }>;
  }> {
    // 1. 处理内容累积
    this.accumulatedContent.push(...chunk.content);

    // 2. 处理工具调用增量
    if (chunk.toolUseDelta) {
      this.processToolUseDelta(chunk.toolUseDelta);
    }

    // 3. 检查是否完成
    if (chunk.isLast) {
      this.isComplete = true;
    }

    // 4. 返回新增内容和完整的工具调用
    const newToolUses = this.getCompletedToolUses();

    return {
      content: chunk.content,
      toolUses: newToolUses.length > 0 ? newToolUses : undefined,
    };
  }

  /**
   * 获取所有累积的内容
   */
  getAccumulatedContent(): MessageContent[] {
    return [...this.accumulatedContent];
  }

  /**
   * 获取所有待处理的工具调用（包括未完成的）
   */
  getAllPendingToolUses(): PendingToolUse[] {
    return Array.from(this.pendingToolUses.values());
  }

  /**
   * 获取已完成的工具调用
   */
  getCompletedToolUses(): Array<{ id: string; name: string; input: any }> {
    const completed: Array<{ id: string; name: string; input: any }> = [];

    for (const [id, pending] of this.pendingToolUses) {
      if (pending.complete) {
        try {
          // 解析 JSON 输入
          const input = JSON.parse(pending.input);
          completed.push({
            id,
            name: pending.name,
            input,
          });

          // 移除已完成的工具调用
          this.pendingToolUses.delete(id);
        } catch (error) {
          console.error(`Failed to parse tool input for ${pending.name}:`, error);
        }
      }
    }

    return completed;
  }

  /**
   * 检查是否所有工具调用都已完成
   */
  allToolUsesComplete(): boolean {
    if (this.pendingToolUses.size === 0) {
      return true;
    }

    for (const pending of this.pendingToolUses.values()) {
      if (!pending.complete) {
        return false;
      }
    }

    return true;
  }

  /**
   * 重置处理器
   */
  reset(): void {
    this.pendingToolUses.clear();
    this.accumulatedContent = [];
    this.isComplete = false;
    this.requestId = undefined;
  }

  /**
   * 检查是否完成
   */
  hasCompleted(): boolean {
    return this.isComplete;
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 处理工具调用增量
   */
  private processToolUseDelta(delta: ToolUseDelta): void {
    // 只有 type 为 tool_use 且有 id 的才处理
    if (delta.type !== "tool_use" || !delta.id) {
      return;
    }

    let pending = this.pendingToolUses.get(delta.id);

    // 如果不存在，创建新的待处理工具调用
    if (!pending) {
      if (!delta.name) {
        console.warn("Tool use delta missing name for id:", delta.id);
        return;
      }

      pending = this.createPendingToolUse(delta.id, delta.name);
      this.pendingToolUses.set(delta.id, pending);
    }

    // 更新输入参数（累积）
    if (delta.input) {
      pending.input += delta.input;
    }

    // 如果 delta 没有提供更多输入，标记为完成
    // 注意：这是简化逻辑，实际实现可能需要更复杂的完成检测
    if (!delta.input && pending.name) {
      pending.complete = true;
    }
  }

  /**
   * 创建待处理的工具调用
   */
  private createPendingToolUse(id: string, name: string): PendingToolUse {
    return {
      id,
      name,
      input: "",
      complete: false,
    };
  }

  // ========================================================================
  // 请求 ID 管理
  // ========================================================================

  /**
   * 设置当前请求 ID
   */
  setRequestId(id: string): void {
    this.requestId = id;
  }

  /**
   * 获取当前请求 ID
   */
  getRequestId(): string | undefined {
    return this.requestId;
  }
}

// ============================================================================
// 工具使用处理器
// ============================================================================

/**
 * ToolUseHandler - 专门处理工具调用的处理器
 */
export class ToolUseHandler {
  private pendingToolUses = new Map<string, PendingToolUse>();

  /**
   * 处理工具使用增量
   */
  processToolUseDelta(delta: ToolUseDelta): void {
    if (delta.type !== "tool_use" || !delta.id) {
      return;
    }

    let pending = this.pendingToolUses.get(delta.id);

    if (!pending) {
      if (!delta.name) {
        console.warn("Tool use delta missing name for id:", delta.id);
        return;
      }

      pending = {
        id: delta.id,
        name: delta.name,
        input: "",
        complete: false,
      };
      this.pendingToolUses.set(delta.id, pending);
    }

    // 累积输入
    if (delta.input) {
      pending.input += delta.input;
    }
  }

  /**
   * 标记工具使用为完成
   */
  markToolUseComplete(id: string): void {
    const pending = this.pendingToolUses.get(id);
    if (pending) {
      pending.complete = true;
    }
  }

  /**
   * 获取所有待处理的工具使用
   */
  getPendingToolUses(): PendingToolUse[] {
    return Array.from(this.pendingToolUses.values());
  }

  /**
   * 获取已完成的工具使用
   */
  getCompletedToolUses(): Array<{ id: string; name: string; input: any }> {
    const completed: Array<{ id: string; name: string; input: any }> = [];

    for (const [id, pending] of this.pendingToolUses) {
      if (pending.complete) {
        try {
          const input = JSON.parse(pending.input);
          completed.push({ id, name: pending.name, input });
          this.pendingToolUses.delete(id);
        } catch (error) {
          console.error(`Failed to parse tool input:`, error);
        }
      }
    }

    return completed;
  }

  /**
   * 清空所有待处理的工具使用
   */
  clear(): void {
    this.pendingToolUses.clear();
  }
}

// ============================================================================
// 推理处理器（用于支持思考模式）
// ============================================================================

/**
 * ReasoningHandler - 处理 AI 推理内容
 */
export class ReasoningHandler {
  private reasoningContent = "";

  /**
   * 处理推理增量
   */
  processReasoningDelta(delta: { type: "thinking"; content?: string }): void {
    if (delta.type === "thinking" && delta.content) {
      this.reasoningContent += delta.content;
    }
  }

  /**
   * 获取推理内容
   */
  getReasoningContent(): string {
    return this.reasoningContent;
  }

  /**
   * 清空推理内容
   */
  clear(): void {
    this.reasoningContent = "";
  }

  /**
   * 检查是否有推理内容
   */
  hasReasoning(): boolean {
    return this.reasoningContent.length > 0;
  }
}
