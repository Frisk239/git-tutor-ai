/**
 * 上下文管理器
 * 管理任务执行过程中的上下文信息
 */

import type { ContextUpdate, MessageContext } from "./types.js";

/**
 * 上下文管理器类
 */
export class ContextManager {
  private contextHistory: Map<number, ContextUpdate[]> = new Map();

  /**
   * 添加上下文更新
   */
  addContextUpdate(
    messageIndex: number,
    update: ContextUpdate,
  ): void {
    if (!this.contextHistory.has(messageIndex)) {
      this.contextHistory.set(messageIndex, []);
    }

    this.contextHistory.get(messageIndex)?.push(update);
  }

  /**
   * 获取消息的上下文更新
   */
  getContextUpdates(messageIndex: number): ContextUpdate[] {
    return this.contextHistory.get(messageIndex) || [];
  }

  /**
   * 清除所有上下文历史
   */
  clear(): void {
    this.contextHistory.clear();
  }

  /**
   * 获取上下文历史大小
   */
  size(): number {
    return this.contextHistory.size;
  }
}
