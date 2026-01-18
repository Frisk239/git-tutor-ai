/**
 * MessageManager - 消息历史管理器
 *
 * 基于 Cline 的 MessageStateHandler 实现
 * 负责管理 API 对话历史和 UI 消息历史
 */

import { Mutex } from 'async-mutex';
import type { MessageContent, AssistantContent, UserContent, APIMessage } from '../types.js';

// ============================================================================
// 消息历史项接口
// ============================================================================

/**
 * UI 消息接口（用于前端显示）
 */
export interface UIMessage {
  /** 时间戳 */
  timestamp: number;
  /** 消息类型 */
  type: 'ask' | 'say' | 'tool';
  /** 消息内容 */
  content?: MessageContent[];
  /** 对话历史索引 */
  conversationHistoryIndex?: number;
  /** 对话历史删除范围 */
  conversationHistoryDeletedRange?: [number, number];
  /** 工具名称（如果是工具消息） */
  toolName?: string;
  /** 工具输入 */
  toolInput?: any;
  /** 工具输出 */
  toolOutput?: any;
}

/**
 * 消息统计信息
 */
export interface MessageStats {
  /** 总消息数 */
  totalMessages: number;
  /** 用户消息数 */
  userMessages: number;
  /** 助手消息数 */
  assistantMessages: number;
  /** 工具调用数 */
  toolCalls: number;
  /** 当前 token 估算 */
  estimatedTokens: number;
}

// ============================================================================
// MessageManager 类
// ============================================================================

export class MessageManager {
  // ========================================================================
  // 私有属性
  // ========================================================================

  /** 互斥锁，防止并发消息更新 */
  private readonly mutex = new Mutex();

  /** API 对话历史 */
  private apiConversationHistory: APIMessage[] = [];

  /** UI 消息历史 */
  private uiMessages: UIMessage[] = [];

  /** 对话历史删除范围 */
  private conversationHistoryDeletedRange?: [number, number];

  /** 最大消息数量（用于防止内存溢出） */
  private readonly MAX_MESSAGES = 10000;

  // ========================================================================
  // 构造函数
  // ========================================================================

  constructor() {
    // 初始化时可以加载历史消息（如果有持久化需求）
  }

  // ========================================================================
  // API 对话历史管理
  // ========================================================================

  /**
   * 获取 API 对话历史
   */
  getApiConversationHistory(): APIMessage[] {
    return [...this.apiConversationHistory];
  }

  /**
   * 设置 API 对话历史（替换整个历史）
   */
  async setApiConversationHistory(history: APIMessage[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      // 应用消息数量限制
      this.apiConversationHistory = history.slice(-this.MAX_MESSAGES);
    });
  }

  /**
   * 添加 API 消息到历史
   */
  async addApiMessage(message: APIMessage): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.apiConversationHistory.push(message);

      // 限制消息数量
      if (this.apiConversationHistory.length > this.MAX_MESSAGES) {
        this.apiConversationHistory = this.apiConversationHistory.slice(-this.MAX_MESSAGES);
      }
    });
  }

  /**
   * 获取应用删除范围后的 API 消息
   */
  async getTruncatedApiMessages(): Promise<APIMessage[]> {
    return this.mutex.runExclusive(async () => {
      if (!this.conversationHistoryDeletedRange) {
        return [...this.apiConversationHistory];
      }

      const [start, end] = this.conversationHistoryDeletedRange;

      // 始终保留第一组用户-助手消息对（索引 0 和 1）
      const alwaysKeepFirstTwo = 2;

      // 返回：前两个 + 删除范围之后的消息
      return [
        ...this.apiConversationHistory.slice(0, alwaysKeepFirstTwo),
        ...this.apiConversationHistory.slice(end + 1),
      ];
    });
  }

  // ========================================================================
  // UI 消息管理
  // ========================================================================

  /**
   * 获取 UI 消息历史
   */
  getUIMessages(): UIMessage[] {
    return [...this.uiMessages];
  }

  /**
   * 添加 UI 消息
   */
  async addUIMessage(message: UIMessage): Promise<void> {
    return this.mutex.runExclusive(async () => {
      // 自动添加时间戳
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      // 添加对话历史索引
      if (message.conversationHistoryIndex === undefined) {
        message.conversationHistoryIndex = this.apiConversationHistory.length;
      }

      this.uiMessages.push(message);

      // 限制消息数量
      if (this.uiMessages.length > this.MAX_MESSAGES) {
        this.uiMessages = this.uiMessages.slice(-this.MAX_MESSAGES);
      }
    });
  }

  /**
   * 更新 UI 消息
   */
  async updateUIMessage(index: number, updates: Partial<UIMessage>): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (index >= 0 && index < this.uiMessages.length) {
        this.uiMessages[index] = {
          ...this.uiMessages[index],
          ...updates,
        };
      }
    });
  }

  /**
   * 删除 UI 消息
   */
  async deleteUIMessage(index: number): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (index >= 0 && index < this.uiMessages.length) {
        this.uiMessages.splice(index, 1);
      }
    });
  }

  /**
   * 替换整个 UI 消息列表
   */
  async overwriteUIMessages(messages: UIMessage[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      // 应用消息数量限制
      this.uiMessages = messages.slice(-this.MAX_MESSAGES);
    });
  }

  // ========================================================================
  // 消息压缩和删除范围管理
  // ========================================================================

  /**
   * 获取对话历史删除范围
   */
  getConversationHistoryDeletedRange(): [number, number] | undefined {
    return this.conversationHistoryDeletedRange;
  }

  /**
   * 设置对话历史删除范围
   */
  async setConversationHistoryDeletedRange(range: [number, number] | undefined): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.conversationHistoryDeletedRange = range;
    });
  }

  /**
   * 计算下一个截断范围
   * 基于 Cline 的 ContextManager.getNextTruncationRange 实现
   */
  calculateNextTruncationRange(
    keepStrategy: 'none' | 'lastTwo' | 'half' | 'quarter' = 'half'
  ): [number, number] {
    const currentDeletedRange = this.conversationHistoryDeletedRange;
    const apiMessages = this.apiConversationHistory;

    // 始终保留第一组用户-助手消息对
    const rangeStartIndex = 2;
    const startOfRest = currentDeletedRange ? currentDeletedRange[1] + 1 : rangeStartIndex;

    const totalMessages = apiMessages.length;
    let endOfKeptMessages: number;

    switch (keepStrategy) {
      case 'none':
        // 只保留第一对和最后一对
        endOfKeptMessages = totalMessages - 2;
        break;
      case 'lastTwo':
        // 保留最后两对
        endOfKeptMessages = totalMessages - 5;
        break;
      case 'half':
        // 保留一半
        endOfKeptMessages = Math.floor(totalMessages / 2);
        break;
      case 'quarter':
        // 保留四分之三
        endOfKeptMessages = Math.floor((totalMessages * 3) / 4);
        break;
      default:
        endOfKeptMessages = Math.floor(totalMessages / 2);
    }

    // 确保至少保留第一对
    const rangeEndIndex = Math.max(rangeStartIndex, endOfKeptMessages);

    return [startOfRest, rangeEndIndex];
  }

  // ========================================================================
  // 消息统计和分析
  // ========================================================================

  /**
   * 获取消息统计信息
   */
  getMessageStats(): MessageStats {
    const stats: MessageStats = {
      totalMessages: this.apiConversationHistory.length,
      userMessages: 0,
      assistantMessages: 0,
      toolCalls: 0,
      estimatedTokens: 0,
    };

    for (const message of this.apiConversationHistory) {
      if (message.role === 'user') {
        stats.userMessages++;
      } else if (message.role === 'assistant') {
        stats.assistantMessages++;

        // 统计工具调用
        if (Array.isArray(message.content)) {
          for (const item of message.content) {
            if (item.type === 'tool_use') {
              stats.toolCalls++;
            }
          }
        }
      }
    }

    // 简单的 token 估算（假设每个 token 约 4 个字符）
    const totalChars = JSON.stringify(this.apiConversationHistory).length;
    stats.estimatedTokens = Math.floor(totalChars / 4);

    return stats;
  }

  /**
   * 清空所有消息历史
   */
  async clearAll(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      this.apiConversationHistory = [];
      this.uiMessages = [];
      this.conversationHistoryDeletedRange = undefined;
    });
  }

  /**
   * 获取消息摘要（用于日志和调试）
   */
  getSummary(): {
    apiMessagesCount: number;
    uiMessagesCount: number;
    deletedRange: string;
    estimatedTokens: number;
  } {
    const stats = this.getMessageStats();

    return {
      apiMessagesCount: this.apiConversationHistory.length,
      uiMessagesCount: this.uiMessages.length,
      deletedRange: this.conversationHistoryDeletedRange
        ? `[${this.conversationHistoryDeletedRange[0]}, ${this.conversationHistoryDeletedRange[1]}]`
        : 'none',
      estimatedTokens: stats.estimatedTokens,
    };
  }
}
