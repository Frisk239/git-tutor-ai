/**
 * MessageManager 单元测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MessageManager } from "../message/MessageManager.js";
import type { APIMessage, MessageContent, UIMessage } from "../types.js";

describe("MessageManager", () => {
  let messageManager: MessageManager;

  beforeEach(() => {
    messageManager = new MessageManager();
  });

  describe("初始化", () => {
    it("应该创建初始状态", () => {
      const apiHistory = messageManager.getApiConversationHistory();
      const uiMessages = messageManager.getUIMessages();

      expect(apiHistory).toEqual([]);
      expect(uiMessages).toEqual([]);
    });

    it("应该有正确的摘要", () => {
      const summary = messageManager.getSummary();

      expect(summary.apiMessagesCount).toBe(0);
      expect(summary.uiMessagesCount).toBe(0);
      expect(summary.deletedRange).toBe("none");
      expect(summary.estimatedTokens).toBe(0);
    });
  });

  describe("API 对话历史管理", () => {
    it("应该添加 API 消息", async () => {
      const message: APIMessage = {
        role: "user",
        content: "Hello",
      };

      await messageManager.addApiMessage(message);

      const history = messageManager.getApiConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(message);
    });

    it("应该设置完整的 API 历史", async () => {
      const messages: APIMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      await messageManager.setApiConversationHistory(messages);

      const history = messageManager.getApiConversationHistory();
      expect(history).toHaveLength(2);
      expect(history).toEqual(messages);
    });

    it("应该获取截断后的 API 消息（无删除范围）", async () => {
      const messages: APIMessage[] = [
        { role: "user", content: "First" },
        { role: "assistant", content: "Response 1" },
        { role: "user", content: "Second" },
        { role: "assistant", content: "Response 2" },
      ];

      await messageManager.setApiConversationHistory(messages);

      const truncated = await messageManager.getTruncatedApiMessages();
      expect(truncated).toHaveLength(4);
    });

    it("应该获取截断后的 API 消息（有删除范围）", async () => {
      const messages: APIMessage[] = [
        { role: "user", content: "Msg 0" },
        { role: "assistant", content: "Msg 1" },
        { role: "user", content: "Msg 2" }, // 将被删除
        { role: "assistant", content: "Msg 3" }, // 将被删除
        { role: "user", content: "Msg 4" },
        { role: "assistant", content: "Msg 5" },
      ];

      await messageManager.setApiConversationHistory(messages);
      await messageManager.setConversationHistoryDeletedRange([2, 3]);

      const truncated = await messageManager.getTruncatedApiMessages();
      expect(truncated).toHaveLength(4);
      expect(truncated[0].content).toBe("Msg 0");
      expect(truncated[1].content).toBe("Msg 1");
      expect(truncated[2].content).toBe("Msg 4");
      expect(truncated[3].content).toBe("Msg 5");
    });

    it("应该限制最大消息数量", async () => {
      const maxMessages = 10000;
      const messages: APIMessage[] = Array.from({ length: maxMessages + 100 }, (_, i) => ({
        role: "user",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      const history = messageManager.getApiConversationHistory();
      expect(history.length).toBeLessThanOrEqual(maxMessages);
    });
  });

  describe("UI 消息管理", () => {
    it("应该添加 UI 消息", async () => {
      const message: UIMessage = {
        type: "say",
        content: [{ type: "text", text: "Hello" }],
      };

      await messageManager.addUIMessage(message);

      const messages = messageManager.getUIMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("say");
      expect(messages[0].timestamp).toBeDefined();
    });

    it("应该自动添加时间戳", async () => {
      const beforeTime = Date.now();

      await messageManager.addUIMessage({
        type: "say",
        content: [{ type: "text", text: "Test" }],
      });

      const messages = messageManager.getUIMessages();
      expect(messages[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    it("应该自动添加对话历史索引", async () => {
      await messageManager.addApiMessage({ role: "user", content: "API msg 1" });
      await messageManager.addApiMessage({ role: "assistant", content: "API msg 2" });

      await messageManager.addUIMessage({
        type: "say",
        content: [{ type: "text", text: "UI msg" }],
      });

      const messages = messageManager.getUIMessages();
      expect(messages[0].conversationHistoryIndex).toBe(2);
    });

    it("应该更新 UI 消息", async () => {
      await messageManager.addUIMessage({
        type: "say",
        content: [{ type: "text", text: "Original" }],
      });

      await messageManager.updateUIMessage(0, {
        content: [{ type: "text", text: "Updated" }],
      });

      const messages = messageManager.getUIMessages();
      expect(messages[0].content?.[0].text).toBe("Updated");
    });

    it("应该删除 UI 消息", async () => {
      await messageManager.addUIMessage({ type: "say", content: [{ type: "text", text: "1" }] });
      await messageManager.addUIMessage({ type: "say", content: [{ type: "text", text: "2" }] });

      await messageManager.deleteUIMessage(0);

      const messages = messageManager.getUIMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content?.[0].text).toBe("2");
    });

    it("应该替换整个 UI 消息列表", async () => {
      const newMessages: UIMessage[] = [
        { type: "say", content: [{ type: "text", text: "A" }] },
        { type: "say", content: [{ type: "text", text: "B" }] },
      ];

      await messageManager.overwriteUIMessages(newMessages);

      const messages = messageManager.getUIMessages();
      expect(messages).toHaveLength(2);
      expect(messages).toEqual(newMessages);
    });

    it("应该支持工具消息", async () => {
      const toolMessage: UIMessage = {
        type: "tool",
        toolName: "test_tool",
        toolInput: { param: "value" },
        toolOutput: { result: "success" },
      };

      await messageManager.addUIMessage(toolMessage);

      const messages = messageManager.getUIMessages();
      expect(messages[0].toolName).toBe("test_tool");
    });
  });

  describe("消息压缩和删除范围", () => {
    it("应该设置删除范围", async () => {
      await messageManager.setConversationHistoryDeletedRange([2, 5]);

      const range = messageManager.getConversationHistoryDeletedRange();
      expect(range).toEqual([2, 5]);
    });

    it("应该清除删除范围", async () => {
      await messageManager.setConversationHistoryDeletedRange([2, 5]);
      await messageManager.setConversationHistoryDeletedRange(undefined);

      const range = messageManager.getConversationHistoryDeletedRange();
      expect(range).toBeUndefined();
    });

    it("应该计算 half 策略的截断范围", async () => {
      const messages: APIMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      const range = messageManager.calculateNextTruncationRange("half");
      expect(range).toEqual([2, 10]); // 保留前2个和后10个
    });

    it("应该计算 quarter 策略的截断范围", async () => {
      const messages: APIMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      const range = messageManager.calculateNextTruncationRange("quarter");
      expect(range).toEqual([2, 15]); // 保留前2个和后5个
    });

    it("应该计算 none 策略的截断范围", async () => {
      const messages: APIMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      const range = messageManager.calculateNextTruncationRange("none");
      expect(range).toEqual([2, 8]); // 只保留前2个和后2个
    });

    it("应该计算 lastTwo 策略的截断范围", async () => {
      const messages: APIMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      const range = messageManager.calculateNextTruncationRange("lastTwo");
      expect(range).toEqual([2, 5]); // 保留前2个和最后4个（2对）
    });

    it("应该在已有删除范围基础上计算新范围", async () => {
      const messages: APIMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);
      await messageManager.setConversationHistoryDeletedRange([2, 8]);

      const range = messageManager.calculateNextTruncationRange("half");
      expect(range).toEqual([9, 10]); // 从上一次删除结束位置开始
    });
  });

  describe("消息统计", () => {
    it("应该返回正确的统计信息（空）", () => {
      const stats = messageManager.getMessageStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.userMessages).toBe(0);
      expect(stats.assistantMessages).toBe(0);
      expect(stats.toolCalls).toBe(0);
      expect(stats.estimatedTokens).toBe(0);
    });

    it("应该统计用户和助手消息", async () => {
      await messageManager.addApiMessage({ role: "user", content: "Hello" });
      await messageManager.addApiMessage({ role: "assistant", content: "Hi" });
      await messageManager.addApiMessage({ role: "user", content: "How are you?" });

      const stats = messageManager.getMessageStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
    });

    it("应该统计工具调用", async () => {
      const content: MessageContent[] = [
        { type: "text", text: "I'll use a tool" },
        { type: "tool_use", toolUse: { id: "1", name: "test_tool", input: {} } },
        { type: "tool_use", toolUse: { id: "2", name: "another_tool", input: {} } },
      ];

      await messageManager.addApiMessage({
        role: "assistant",
        content,
      });

      const stats = messageManager.getMessageStats();
      expect(stats.toolCalls).toBe(2);
    });

    it("应该估算 token 数量", async () => {
      const longText = "A".repeat(1000); // 1000 字符
      await messageManager.addApiMessage({ role: "user", content: longText });

      const stats = messageManager.getMessageStats();
      expect(stats.estimatedTokens).toBeGreaterThan(200); // 约 250 tokens
      expect(stats.estimatedTokens).toBeLessThan(300);
    });
  });

  describe("清空操作", () => {
    it("应该清空所有消息", async () => {
      await messageManager.addApiMessage({ role: "user", content: "Test" });
      await messageManager.addUIMessage({ type: "say", content: [{ type: "text", text: "Hi" }] });
      await messageManager.setConversationHistoryDeletedRange([2, 5]);

      await messageManager.clearAll();

      expect(messageManager.getApiConversationHistory()).toEqual([]);
      expect(messageManager.getUIMessages()).toEqual([]);
      expect(messageManager.getConversationHistoryDeletedRange()).toBeUndefined();
    });
  });

  describe("线程安全", () => {
    it("应该处理并发消息添加", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        messageManager.addApiMessage({
          role: "user",
          content: `Message ${i}`,
        })
      );

      await Promise.all(promises);

      const history = messageManager.getApiConversationHistory();
      expect(history).toHaveLength(100);
    });

    it("应该处理并发 UI 消息操作", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        messageManager.addUIMessage({
          type: "say",
          content: [{ type: "text", text: `Message ${i}` }],
        })
      );

      await Promise.all(promises);

      const messages = messageManager.getUIMessages();
      expect(messages).toHaveLength(50);
    });
  });

  describe("删除范围和截断的集成", () => {
    it("应该正确应用删除范围", async () => {
      // 创建 10 条消息
      const messages: APIMessage[] = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      await messageManager.setApiConversationHistory(messages);

      // 删除中间 4 条（索引 2-5）
      await messageManager.setConversationHistoryDeletedRange([2, 5]);

      const truncated = await messageManager.getTruncatedApiMessages();

      // 应该保留前 2 条和后 4 条
      expect(truncated).toHaveLength(6);
      expect(truncated[0].content).toBe("Message 0");
      expect(truncated[1].content).toBe("Message 1");
      expect(truncated[2].content).toBe("Message 6");
      expect(truncated[5].content).toBe("Message 9");
    });
  });
});
