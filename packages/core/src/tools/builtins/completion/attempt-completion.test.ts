/**
 * ATTEMPT_COMPLETION 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { attemptCompletionTool, type AttemptCompletionParams } from "./attempt-completion.js";

// Mock context
const mockContext = {
  conversationId: "test-conversation",
  projectPath: "/test/project",
  services: {},
  toolExecutor: {
    execute: vi.fn(),
  },
};

describe("attempt_completion 工具", () => {
  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
  });

  describe("工具定义", () => {
    it("应该定义正确的工具名称", () => {
      expect(attemptCompletionTool.name).toBe("attempt_completion");
    });

    it("应该定义正确的显示名称", () => {
      expect(attemptCompletionTool.displayName).toBe("完成任务");
    });

    it("应该定义正确的类别", () => {
      expect(attemptCompletionTool.category).toBe("completion");
    });

    it("应该包含清晰的描述", () => {
      expect(attemptCompletionTool.description).toBeDefined();
      expect(attemptCompletionTool.description).toContain("完成");
    });
  });

  describe("参数验证", () => {
    it("应该定义必需的参数", () => {
      const params = attemptCompletionTool.parameters;

      expect(params).toHaveLength(3);

      const resultParam = params.find((p) => p.name === "result");
      expect(resultParam).toBeDefined();
      expect(resultParam?.required).toBe(true);

      const commandParam = params.find((p) => p.name === "command");
      expect(commandParam).toBeDefined();
      expect(commandParam?.required).toBe(false);

      const progressParam = params.find((p) => p.name === "task_progress");
      expect(progressParam).toBeDefined();
      expect(progressParam?.required).toBe(false);
    });
  });

  describe("工具执行", () => {
    it("应该成功处理基本的完成请求", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务已成功完成",
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe("任务已成功完成");
      expect(result.data?.completed).toBe(true);
      expect(result.data?.completedAt).toBeDefined();
    });

    it("应该处理包含命令的完成请求", async () => {
      // Mock execute_command 工具
      mockContext.toolExecutor?.execute.mockResolvedValueOnce({
        success: true,
        data: {
          output: "命令执行成功",
        },
      });

      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        command: "npm test",
      });

      expect(result.success).toBe(true);
      expect(result.data?.command?.executed).toBe("npm test");
      expect(result.data?.command?.output).toBeDefined();
      expect(mockContext.toolExecutor?.execute).toHaveBeenCalledTimes(1);
    });

    it("应该处理包含任务进度的完成请求", async () => {
      const taskProgress = [
        { title: "步骤1", completed: true },
        { title: "步骤2", completed: true, info: "已完成" },
      ];

      const result = await attemptCompletionTool.handler(mockContext, {
        result: "所有步骤已完成",
        task_progress: taskProgress,
      });

      expect(result.success).toBe(true);
      expect(result.data?.task_progress).toEqual(taskProgress);
    });

    it("应该拒绝缺少 result 参数的请求", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("result");
    });

    it("应该拒绝空字符串的 result 参数", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("result");
    });

    it("应该拒绝 echo 命令", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        command: "echo 'Hello'",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("echo");
    });

    it("应该拒绝 cat 命令", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        command: "cat file.txt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cat");
    });

    it("应该拒绝无效的任务进度格式", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        task_progress: [
          { title: "步骤1", completed: true },
          { title: "步骤2" }, // 缺少 completed 字段
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("task_progress");
    });

    it("应该处理命令执行失败的情况", async () => {
      // Mock execute_command 工具失败
      mockContext.toolExecutor?.execute.mockResolvedValueOnce({
        success: false,
        error: "命令未找到",
      });

      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        command: "invalid-command",
      });

      expect(result.success).toBe(true); // 任务仍然标记为完成
      expect(result.data?.command?.error).toBeDefined();
      expect(result.data?.command?.note).toContain("命令执行失败");
    });
  });

  describe("命令验证", () => {
    it("应该接受有效的演示命令", async () => {
      const validCommands = [
        "npm test",
        "npm start",
        "python main.py",
        "make build",
        "cargo run",
        "yarn test",
      ];

      for (const cmd of validCommands) {
        const result = await attemptCompletionTool.handler(mockContext, {
          result: "测试",
          command: cmd,
        });

        // 不应该因为命令验证失败
        if (!result.success) {
          expect(result.error).not.toContain("echo");
          expect(result.error).not.toContain("cat");
        }
      }
    });

    it("应该正确处理命令大小写", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "测试",
        command: "ECHO test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("echo");
    });
  });

  describe("响应数据结构", () => {
    it("应该包含时间戳", async () => {
      const beforeTime = new Date().toISOString();

      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      expect(result.data?.completedAt).toBeDefined();
      expect(result.data?.completedAt >= beforeTime).toBe(true);
      expect(result.data?.completedAt <= afterTime).toBe(true);
    });

    it("应该包含完成状态标记", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
      });

      expect(result.data?.completed).toBe(true);
    });

    it("应该正确 trim 结果字符串", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "  任务完成  ",
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe("任务完成");
    });
  });

  describe("权限检查", () => {
    it("应该不需要特殊权限", () => {
      expect(attemptCompletionTool.permissions).toHaveLength(0);
    });
  });

  describe("工具状态", () => {
    it("工具默认应该是启用状态", () => {
      expect(attemptCompletionTool.enabled).toBe(true);
    });
  });

  describe("边界情况", () => {
    it("应该处理空的任务进度数组", async () => {
      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        task_progress: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.task_progress).toEqual([]);
    });

    it("应该处理包含额外信息的任务进度项", async () => {
      const taskProgress = [
        {
          title: "步骤1",
          completed: true,
          info: "额外信息",
        },
      ];

      const result = await attemptCompletionTool.handler(mockContext, {
        result: "任务完成",
        task_progress: taskProgress,
      });

      expect(result.success).toBe(true);
      expect(result.data?.task_progress[0]?.info).toBe("额外信息");
    });

    it("应该处理非常长的结果描述", async () => {
      const longResult = "A".repeat(10000);

      const result = await attemptCompletionTool.handler(mockContext, {
        result: longResult,
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(longResult);
    });
  });
});
