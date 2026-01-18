/**
 * SUMMARIZE_TASK 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  summarizeTaskTool,
  createSummarizeTaskTool,
  SummarizeTaskResult,
  FileContent,
} from "./summarize-task.js";
import type { ToolContext } from "../../types.js";

describe("summarize_task 工具", () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      conversationId: "test-conversation",
      userId: "test-user",
      permissions: new Set(),
      metadata: {},
    };
  });

  describe("工具定义", () => {
    it("应该有正确的工具元数据", () => {
      expect(summarizeTaskTool.name).toBe("summarize_task");
      expect(summarizeTaskTool.displayName).toBe("任务总结");
      expect(summarizeTaskTool.category).toBe("task");
      expect(summarizeTaskTool.enabled).toBe(true);
    });

    it("应该有必要的参数定义", () => {
      expect(summarizeTaskTool.parameters).toHaveLength(1);
      expect(summarizeTaskTool.parameters[0].name).toBe("context");
      expect(summarizeTaskTool.parameters[0].type).toBe("string");
      expect(summarizeTaskTool.parameters[0].required).toBe(true);
    });

    it("应该有详细的描述", () => {
      expect(summarizeTaskTool.description).toContain("任务总结");
      expect(summarizeTaskTool.description).toContain("上下文窗口");
      expect(summarizeTaskTool.description).toContain("主要请求和意图");
      expect(summarizeTaskTool.description).toContain("Required Files");
    });
  });

  describe("工具执行 - 基本验证", () => {
    it("应该在缺少 context 参数时返回错误", async () => {
      const result = await summarizeTaskTool.handler.execute(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe("缺少必需参数: context");
    });

    it("应该在 context 为空字符串时返回错误", async () => {
      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("context 参数不能为空");
    });

    it("应该在 context 只有空格时返回错误", async () => {
      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("context 参数不能为空");
    });

    it("应该在 context 类型错误时返回错误", async () => {
      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("context 参数不能为空");
    });
  });

  describe("工具执行 - 无 Required Files", () => {
    it("应该在没有 Required Files 时返回摘要", async () => {
      const taskContext = `# 任务摘要

## 1. 主要请求和意图
用户要求实现 Git 教学工具的核心功能。

## 2. 关键技术概念
- TypeScript
- Vitest
- 工具系统架构

## 3. 当前工作
正在实现 summarize_task 工具。

## 4. 下一步
继续实现 ask 和 say 工具。`;

      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.summary).toBe(taskContext);
      expect(data.filesRead).toBe(0);
      expect(data.fileContents).toHaveLength(0);
      expect(data.totalChars).toBe(0);
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("工具执行 - 有文件读取回调", () => {
    it("应该读取 Required Files 中的文件", async () => {
      const mockFileReader = vi
        .fn()
        .mockResolvedValueOnce({ content: "export function test() {}" })
        .mockResolvedValueOnce({ content: "interface User {}" });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 当前工作
实现工具系统。

## 9. Required Files:
  - src/utils/test.ts
  - src/types/user.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.filesRead).toBe(2);
      expect(data.fileContents).toHaveLength(2);
      expect(data.fileContents[0].path).toBe("src/utils/test.ts");
      expect(data.fileContents[0].content).toBe("export function test() {}");
      expect(data.fileContents[1].path).toBe("src/types/user.ts");
      expect(data.fileContents[1].content).toBe("interface User {}");
      expect(data.totalChars).toBeGreaterThan(0);
      expect(data.summary).toContain("<file_content path=\"src/utils/test.ts\">");
      expect(mockFileReader).toHaveBeenCalledWith("src/utils/test.ts");
      expect(mockFileReader).toHaveBeenCalledWith("src/types/user.ts");
    });

    it("应该处理文件读取失败的情况", async () => {
      const mockFileReader = vi
        .fn()
        .mockResolvedValueOnce({ content: "export function test() {}" })
        .mockResolvedValueOnce({ content: "", error: "文件不存在" })
        .mockResolvedValueOnce({ content: "interface User {}" });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/utils/test.ts
  - src/missing/file.ts
  - src/types/user.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.filesRead).toBe(2); // 跳过失败的文件
      expect(data.fileContents).toHaveLength(2);
      expect(data.fileContents[0].path).toBe("src/utils/test.ts");
      expect(data.fileContents[1].path).toBe("src/types/user.ts");
    });

    it("应该限制读取的文件数量", async () => {
      const mockFileReader = vi.fn().mockResolvedValue({
        content: "file content",
      });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      // 创建 15 个文件路径(超过 MAX_FILES_LOADED=8)
      const filePaths = Array.from({ length: 15 }, (_, i) => `src/file${i}.ts`);
      const filesSection = filePaths.map((path) => `  - ${path}`).join("\n");

      const taskContext = `# 任务摘要

## 9. Required Files:
${filesSection}`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.filesRead).toBe(8); // MAX_FILES_LOADED
      // 只会尝试读取 8 个,因为达到 limit 后就停止了
      expect(mockFileReader).toHaveBeenCalledTimes(8);
    });

    it("应该限制总字符数", async () => {
      const largeContent = "x".repeat(60_000); // 60KB

      const mockFileReader = vi
        .fn()
        .mockResolvedValueOnce({ content: largeContent })
        .mockResolvedValueOnce({ content: largeContent });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/file1.ts
  - src/file2.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.totalChars).toBeLessThanOrEqual(100_000); // MAX_CHARS
      expect(data.filesRead).toBe(1); // 第二个文件会超出限制,未读取
    });

    it("应该截断超出限制的文件内容", async () => {
      const content1 = "x".repeat(120_000); // 超过 100KB 限制

      const mockFileReader = vi.fn().mockResolvedValueOnce({ content: content1 });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/file1.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.filesRead).toBe(1);
      expect(data.totalChars).toBeLessThanOrEqual(100_000);
      expect(data.fileContents[0].content).toContain("... (内容被截断)");
      // 总字符数应该是 100,000 (内容 + 后缀)
      expect(data.fileContents[0].chars).toBe(100_000);
    });
  });

  describe("工具执行 - 复杂场景", () => {
    it("应该处理包含代码片段的上下文", async () => {
      const taskContext = `# 任务摘要

## 当前工作

\`\`\`typescript
interface TaskProgressItem {
  title: string;
  completed: boolean;
  subtasks?: TaskProgressItem[];
}
\`\`\`

## 下一步
实现 ask 和 say 工具。`;

      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.summary).toContain("TaskProgressItem");
    });

    it("应该处理包含特殊字符的文件路径", async () => {
      const mockFileReader = vi.fn().mockResolvedValue({
        content: "content",
      });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/utils/test-utils.ts
  - src/components/Button.tsx
  - src/lib/api-client.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      expect(mockFileReader).toHaveBeenCalledWith("src/utils/test-utils.ts");
      expect(mockFileReader).toHaveBeenCalledWith("src/components/Button.tsx");
      expect(mockFileReader).toHaveBeenCalledWith("src/lib/api-client.ts");
    });

    it("应该处理 Optional Required Files", async () => {
      const mockFileReader = vi.fn().mockResolvedValue({
        content: "content",
      });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Optional Required Files:
  - src/file1.ts
  - src/file2.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      expect(mockFileReader).toHaveBeenCalledTimes(2);
    });
  });

  describe("文件内容格式化", () => {
    it("应该正确格式化文件内容", async () => {
      const mockFileReader = vi.fn().mockResolvedValue({
        content: "export const test = true;",
      });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/test.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.summary).toContain("## 文件内容");
      expect(data.summary).toContain('<file_content path="src/test.ts">');
      expect(data.summary).toContain("export const test = true;");
      expect(data.summary).toContain("</file_content>");
    });

    it("应该格式化多个文件内容", async () => {
      const mockFileReader = vi
        .fn()
        .mockResolvedValueOnce({ content: "content1" })
        .mockResolvedValueOnce({ content: "content2" });

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/file1.ts
  - src/file2.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.summary).toContain('<file_content path="src/file1.ts">');
      expect(data.summary).toContain("content1");
      expect(data.summary).toContain('</file_content>');
      expect(data.summary).toContain('<file_content path="src/file2.ts">');
      expect(data.summary).toContain("content2");
    });
  });

  describe("时间戳验证", () => {
    it("应该生成有效的 ISO 8601 时间戳", async () => {
      const beforeTime = new Date().toISOString();

      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: "测试上下文",
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.timestamp).toBeDefined();

      const timestamp = new Date(data.timestamp);
      const before = new Date(beforeTime);
      const after = new Date(afterTime);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe("错误处理", () => {
    it("应该处理回调函数抛出的异常", async () => {
      const mockFileReader = vi.fn().mockRejectedValue(new Error("文件系统错误"));

      const toolWithCallback = createSummarizeTaskTool(mockFileReader);

      const taskContext = `# 任务摘要

## 9. Required Files:
  - src/file1.ts`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: taskContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("文件系统错误");
    });

    it("应该处理未设置文件读取回调的情况", async () => {
      const result = await summarizeTaskTool.handler.execute(mockContext, {
        context: `# 任务摘要

## 9. Required Files:
  - src/file1.ts`,
      });

      // 没有文件读取回调,应该跳过文件读取
      expect(result.success).toBe(true);
      const data = result.data as SummarizeTaskResult;
      expect(data.filesRead).toBe(0);
    });
  });

  describe("createSummarizeTaskTool 便捷函数", () => {
    it("应该创建带有自定义回调的工具", () => {
      const mockCallback = vi.fn();
      const customTool = createSummarizeTaskTool(mockCallback);

      expect(customTool.name).toBe("summarize_task");
      expect(customTool.handler).toBeDefined();
      expect(customTool.handler).not.toBe(summarizeTaskTool.handler);
    });
  });
});
