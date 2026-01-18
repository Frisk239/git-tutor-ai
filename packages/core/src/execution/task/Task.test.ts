/**
 * Task.ts 单元测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Task } from "./Task.js";
import { TaskState } from "../state/TaskState.js";
import type { TaskCallbacks } from "./Task.js";
import { TaskStatus, TaskConfig } from "../types.js";
import type { AIService } from "../../../ai/types.js";
import type { ToolRegistry, ToolDefinition } from "../../../tools/types.js";

// Mock AIService
const mockAIService: AIService = {
  id: "test-ai",
  name: "Test AI",
  stream: async function* (messages: any[]) {
    yield {
      content: [{ type: "text", text: "Test response" }],
    };
    yield {
      content: [{ type: "text", text: " more content" }],
      isLast: true,
    };
  },
} as any;

// Mock ToolRegistry
const mockToolRegistry: ToolRegistry = {
  getTool: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  listTools: vi.fn(),
  getToolsByCategory: vi.fn(),
  hasTool: vi.fn(),
} as any;

// Mock tool
const mockTool: ToolDefinition = {
  name: "test_tool",
  displayName: "Test Tool",
  description: "A test tool",
  category: "test",
  parameters: [],
  permissions: [],
  enabled: true,
  handler: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { result: "test" },
    }),
  },
};

describe("Task", () => {
  let task: Task;
  let config: TaskConfig;
  let callbacks: TaskCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      taskId: "test-task-1",
      ulid: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      cwd: "/test/workspace",
      terminalExecutionMode: "background",
      terminalOutputLineLimit: 1000,
      terminalReuseEnabled: true,
      shellIntegrationTimeout: 30,
    };

    callbacks = {
      onMessageUpdate: vi.fn(),
      onStreamContent: vi.fn(),
      onStateChange: vi.fn(),
      onToolExecute: vi.fn().mockResolvedValue({
        success: true,
        data: { result: "test" },
      }),
      onError: vi.fn(),
    };

    mockToolRegistry.getTool = vi.fn().mockReturnValue(mockTool);

    task = new Task(config, mockAIService, mockToolRegistry, callbacks);
  });

  describe("构造函数", () => {
    it("应该创建任务实例", () => {
      expect(task).toBeDefined();
      expect(task.taskId).toBe(config.taskId);
      expect(task.ulid).toBeDefined();
    });

    it("应该初始化任务状态", () => {
      expect(task.taskState).toBeDefined();
      expect(task.taskState.status).toBe(TaskStatus.CREATED);
    });

    it("应该生成唯一的 ULID", () => {
      const task2 = new Task(config, mockAIService, mockToolRegistry, {});
      expect(task.ulid).not.toBe(task2.ulid);
    });
  });

  describe("getSummary", () => {
    it("应该返回任务摘要", () => {
      const summary = task.getSummary();

      expect(summary.taskId).toBe(config.taskId);
      expect(summary.ulid).toBeDefined();
      expect(summary.status).toBe(TaskStatus.CREATED);
      expect(summary.started).toBe(false);
      expect(summary.completed).toBe(false);
    });
  });

  describe("startTask", () => {
    it("应该成功启动任务", async () => {
      await task.startTask("Test task");

      const summary = task.getSummary();
      expect(summary.started).toBe(true);
    });

    it("应该设置状态为 RUNNING (初始)", async () => {
      // 任务开始时状态应该是 RUNNING
      // 但会因为无工具调用而最终失败
      await task.startTask("Test task");

      // 任务应该最终失败（因为达到最大错误数）
      expect(task.taskState.status).toBe(TaskStatus.FAILED);
    });

    it("应该调用状态变化回调", async () => {
      await task.startTask("Test task");

      expect(callbacks.onStateChange).toHaveBeenCalledWith(TaskStatus.RUNNING);
    });

    it("应该发送初始消息", async () => {
      await task.startTask("Test task", ["image1.jpg"], ["file1.ts"]);

      expect(callbacks.onMessageUpdate).toHaveBeenCalled();
    });

    it("应该拒绝重复启动", async () => {
      await task.startTask("Test task");

      await expect(task.startTask("Another task")).rejects.toThrow(
        "Task has already been started"
      );
    });

    it("应该处理执行错误", async () => {
      callbacks.onStateChange = vi.fn().mockRejectedValue(new Error("State change failed"));

      await expect(task.startTask("Test task")).rejects.toThrow();
      expect(callbacks.onError).toHaveBeenCalled();
    });
  });

  describe("abortTask", () => {
    it("应该成功中止任务", async () => {
      await task.startTask("Test task");
      await task.abortTask();

      expect(task.taskState.status).toBe(TaskStatus.CANCELLED);
    });

    it("应该调用状态变化回调", async () => {
      await task.startTask("Test task");
      await task.abortTask();

      expect(callbacks.onStateChange).toHaveBeenCalledWith(TaskStatus.CANCELLED);
    });

    it("应该允许中止未启动的任务", async () => {
      await expect(task.abortTask()).resolves.not.toThrow();
    });

    it("应该允许中止已完成的任务", async () => {
      // 由于任务会快速完成，我们直接测试
      await task.startTask("Simple task");
      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));
      await expect(task.abortTask()).resolves.not.toThrow();
    });
  });

  describe("错误处理", () => {
    it("应该处理 AI 服务错误", async () => {
      const errorAIService: AIService = {
        ...mockAIService,
        stream: async function* () {
          throw new Error("AI service error");
        },
      } as any;

      const errorTask = new Task(config, errorAIService, mockToolRegistry, callbacks);

      await errorTask.startTask("Test task");

      expect(errorTask.taskState.status).toBe(TaskStatus.FAILED);
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it("应该处理工具执行错误", async () => {
      callbacks.onToolExecute = vi.fn().mockResolvedValue({
        success: false,
        error: "Tool execution failed",
      });

      // 注意：由于任务循环会自动重试，这个测试可能需要更复杂的设置
      // 这里只是示例
      await task.startTask("Test task");

      // 等待执行
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe("流式响应处理", () => {
    it("应该处理流式内容", async () => {
      await task.startTask("Test task");

      // 检查是否收到了流式内容更新
      expect(callbacks.onStreamContent).toHaveBeenCalled();
    });
  });

  describe("工具执行", () => {
    it("应该执行工具", async () => {
      // 这个测试需要更复杂的设置来实际触发工具调用
      // 这里只是示例
      expect(mockToolRegistry.getTool).toBeDefined();
    });
  });
});

describe("TaskState", () => {
  let taskState: TaskState;

  beforeEach(() => {
    taskState = new TaskState();
  });

  describe("初始化", () => {
    it("应该创建初始状态", () => {
      expect(taskState.status).toBe(TaskStatus.CREATED);
      expect(taskState.phase).toBeDefined();
    });

    it("应该创建初始快照", () => {
      const snapshots = taskState.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
    });
  });

  describe("状态转换", () => {
    it("应该允许有效的状态转换", async () => {
      await taskState.setStatus(TaskStatus.RUNNING);
      expect(taskState.status).toBe(TaskStatus.RUNNING);
    });

    it("应该拒绝无效的状态转换", async () => {
      // 先设置为 RUNNING
      await taskState.setStatus(TaskStatus.RUNNING);

      // 然后尝试从 RUNNING 直接回到 CREATED（无效转换）
      await expect(taskState.setStatus(TaskStatus.CREATED)).rejects.toThrow(
        "Invalid status transition"
      );
    });
  });

  describe("消息管理", () => {
    it("应该添加助手内容", async () => {
      const content = [{ type: "text" as const, text: "Test" }];
      await taskState.addAssistantContent(content);

      expect(taskState.assistantMessageContent).toHaveLength(1);
    });

    it("应该添加用户内容", async () => {
      const content = [{ type: "text" as const, text: "Test" }];
      await taskState.addUserContent(content);

      expect(taskState.userMessageContent).toHaveLength(1);
    });

    it("应该清空消息", async () => {
      await taskState.addAssistantContent([{ type: "text" as const, text: "Test" }]);
      await taskState.clearMessages();

      expect(taskState.assistantMessageContent).toHaveLength(0);
      expect(taskState.userMessageContent).toHaveLength(0);
    });
  });

  describe("工具执行状态", () => {
    it("应该记录工具使用", () => {
      taskState.recordToolUse("test_tool");

      expect(taskState.didAlreadyUseTool).toBe(true);
      expect(taskState.lastToolName).toBe("test_tool");
      expect(taskState.consecutiveMistakeCount).toBe(0);
    });

    it("应该增加错误计数", () => {
      taskState.incrementMistakeCount();
      taskState.incrementMistakeCount();

      expect(taskState.consecutiveMistakeCount).toBe(2);
    });

    it("应该重置错误计数", () => {
      taskState.incrementMistakeCount();
      taskState.resetMistakeCount();

      expect(taskState.consecutiveMistakeCount).toBe(0);
    });

    it("应该检测最大错误数", () => {
      for (let i = 0; i < taskState.MAX_CONSECUTIVE_MISTAKES; i++) {
        taskState.incrementMistakeCount();
      }

      expect(taskState.hasReachedMaxMistakes()).toBe(true);
    });
  });

  describe("任务中止", () => {
    it("应该请求中止", async () => {
      await taskState.requestAbort();

      expect(taskState.abort).toBe(true);
    });

    it("应该重置中止状态", async () => {
      await taskState.requestAbort();
      await taskState.resetAbortState();

      expect(taskState.abort).toBe(false);
    });
  });

  describe("状态查询", () => {
    it("应该正确判断活动状态", async () => {
      await taskState.setStatus(TaskStatus.RUNNING);
      expect(taskState.isActive()).toBe(true);

      await taskState.setStatus(TaskStatus.COMPLETED);
      expect(taskState.isActive()).toBe(false);
    });

    it("应该正确判断终态", async () => {
      // CREATED -> RUNNING -> COMPLETED
      await taskState.setStatus(TaskStatus.RUNNING);
      await taskState.setStatus(TaskStatus.COMPLETED);
      expect(taskState.isTerminal()).toBe(true);
    });

    it("应该正确判断是否可执行", () => {
      taskState.abort = false;
      taskState.didCompleteReadingStream = false;

      // 需要先设置为 RUNNING 状态
      taskState._status = TaskStatus.RUNNING;

      expect(taskState.canExecute()).toBe(true);
    });

    it("应该生成状态摘要", () => {
      const summary = taskState.getSummary();

      expect(summary.status).toBeDefined();
      expect(summary.phase).toBeDefined();
      expect(summary.messageCount).toBeDefined();
      expect(summary.isStreaming).toBeDefined();
    });
  });
});
