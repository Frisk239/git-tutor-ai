/**
 * FOCUS_CHAIN 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  focusChainTool,
  type TaskProgressItem,
  FocusChainManager,
} from "./focus-chain.js";

// Mock context
const mockContext = {
  conversationId: "test-conversation",
  projectPath: "/test/project",
  services: {},
};

describe("focus_chain 工具", () => {
  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
  });

  describe("工具定义", () => {
    it("应该定义正确的工具名称", () => {
      expect(focusChainTool.name).toBe("focus_chain");
    });

    it("应该定义正确的显示名称", () => {
      expect(focusChainTool.displayName).toBe("聚焦链");
    });

    it("应该定义正确的类别", () => {
      expect(focusChainTool.category).toBe("task");
    });

    it("应该包含清晰的描述", () => {
      expect(focusChainTool.description).toBeDefined();
      expect(focusChainTool.description).toContain("任务进度");
    });

    it("描述应该包含使用场景", () => {
      const description = focusChainTool.description;
      expect(description).toContain("任务分解");
      expect(description).toContain("进度可视化");
      expect(description).toContain("Markdown 格式");
    });
  });

  describe("参数验证", () => {
    it("应该定义必需的参数", () => {
      const params = focusChainTool.parameters;

      expect(params.length).toBeGreaterThan(0);

      const actionParam = params.find((p) => p.name === "action");
      expect(actionParam).toBeDefined();
      expect(actionParam?.required).toBe(true);
    });

    it("应该支持所有操作类型", () => {
      const actionParam = focusChainTool.parameters.find((p) => p.name === "action");
      expect(actionParam?.enum).toEqual([
        "create",
        "update",
        "add",
        "get",
        "delete",
        "list",
        "from_markdown",
      ]);
    });
  });

  describe("工具执行 - create 操作", () => {
    it("应该成功创建聚焦链", async () => {
      const items: TaskProgressItem[] = [
        { title: "步骤1", completed: false },
        { title: "步骤2", completed: false },
      ];

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBeDefined();
      expect(result.data?.action).toBe("created");
      expect(result.data?.items).toEqual(items);
      expect(result.data?.progress).toBe(0);
    });

    it("应该自动生成任务ID", async () => {
      const items = [{ title: "任务1", completed: false }];

      const result1 = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      const result2 = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result1.data?.taskId).toBeDefined();
      expect(result2.data?.taskId).toBeDefined();
      expect(result1.data?.taskId).not.toBe(result2.data?.taskId);
    });

    it("应该支持自定义任务ID", async () => {
      const items = [{ title: "任务1", completed: false }];
      const customTaskId = "custom-task-123";

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        taskId: customTaskId,
        items,
      });

      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe(customTaskId);
    });

    it("应该计算正确的进度百分比", async () => {
      const items = [
        { title: "任务1", completed: true },
        { title: "任务2", completed: false },
        { title: "任务3", completed: true },
      ];

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.data?.progress).toBe(67); // 2/3 ≈ 66.7% -> 67%
    });

    it("应该生成 Markdown 格式", async () => {
      const items = [
        { title: "未完成任务", completed: false },
        { title: "已完成任务", completed: true },
      ];

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.data?.markdown).toContain("- [ ] 未完成任务");
      expect(result.data?.markdown).toContain("- [x] 已完成任务");
    });

    it("应该拒绝空的任务项数组", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不能为空");
    });

    it("应该拒绝无效的任务项", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "", completed: false }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("工具执行 - update 操作", () => {
    it("应该成功更新任务状态", async () => {
      // 先创建
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [
          { title: "任务1", completed: false },
          { title: "任务2", completed: false },
        ],
      });

      const taskId = createResult.data?.taskId;

      // 更新第一个任务为已完成
      const updateResult = await focusChainTool.handler(mockContext, {
        action: "update",
        taskId,
        index: 0,
        completed: true,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.action).toBe("updated");
      expect(updateResult.data?.items[0].completed).toBe(true);
      expect(updateResult.data?.progress).toBe(50);
    });

    it("应该拒绝不存在的任务ID", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "update",
        taskId: "non-existent-task",
        index: 0,
        completed: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    it("应该拒绝无效的索引", async () => {
      // 先创建
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: false }],
      });

      const taskId = createResult.data?.taskId;

      // 尝试更新不存在的索引
      const result = await focusChainTool.handler(mockContext, {
        action: "update",
        taskId,
        index: 999,
        completed: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("索引");
    });
  });

  describe("工具执行 - add 操作", () => {
    it("应该成功添加新任务项", async () => {
      // 先创建
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: true }],
      });

      const taskId = createResult.data?.taskId;

      // 添加新任务
      const addResult = await focusChainTool.handler(mockContext, {
        action: "add",
        taskId,
        item: { title: "任务2", completed: false },
      });

      expect(addResult.success).toBe(true);
      expect(addResult.data?.action).toBe("added");
      expect(addResult.data?.items).toHaveLength(2);
      expect(addResult.data?.items[1].title).toBe("任务2");
    });

    it("应该支持添加带额外信息的任务", async () => {
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: true }],
      });

      const taskId = createResult.data?.taskId;

      const addResult = await focusChainTool.handler(mockContext, {
        action: "add",
        taskId,
        item: { title: "任务2", completed: false, info: "待处理" },
      });

      expect(addResult.success).toBe(true);
      expect(addResult.data?.items[1].info).toBe("待处理");
    });
  });

  describe("工具执行 - get 操作", () => {
    it("应该成功获取聚焦链", async () => {
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: false }],
      });

      const taskId = createResult.data?.taskId;

      const getResult = await focusChainTool.handler(mockContext, {
        action: "get",
        taskId,
      });

      expect(getResult.success).toBe(true);
      expect(getResult.data?.taskId).toBe(taskId);
      expect(getResult.data?.items).toBeDefined();
    });

    it("应该拒绝获取不存在的任务", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "get",
        taskId: "non-existent-task",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("工具执行 - delete 操作", () => {
    it("应该成功删除聚焦链", async () => {
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: false }],
      });

      const taskId = createResult.data?.taskId;

      const deleteResult = await focusChainTool.handler(mockContext, {
        action: "delete",
        taskId,
      });

      expect(deleteResult.success).toBe(true);

      // 验证已删除
      const getResult = await focusChainTool.handler(mockContext, {
        action: "get",
        taskId,
      });

      expect(getResult.success).toBe(false);
    });

    it("应该拒绝删除不存在的任务", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "delete",
        taskId: "non-existent-task",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("工具执行 - list 操作", () => {
    it("应该列出当前对话的所有聚焦链", async () => {
      // 使用唯一的 conversationId 来隔离测试
      const uniqueContext = {
        ...mockContext,
        conversationId: "list-test-conversation",
      };

      await focusChainTool.handler(uniqueContext, {
        action: "create",
        items: [{ title: "任务1", completed: false }],
      });

      await focusChainTool.handler(uniqueContext, {
        action: "create",
        items: [{ title: "任务2", completed: false }],
      });

      const listResult = await focusChainTool.handler(uniqueContext, {
        action: "list",
      });

      expect(listResult.success).toBe(true);
      expect(listResult.data?.chains).toHaveLength(2);
      expect(listResult.data?.count).toBe(2);
    });
  });

  describe("工具执行 - from_markdown 操作", () => {
    it("应该从 Markdown 创建聚焦链", async () => {
      const markdown = `- [ ] 未完成任务
- [x] 已完成任务
- [ ] 带信息的任务 (重要)`;

      const result = await focusChainTool.handler(mockContext, {
        action: "from_markdown",
        markdown,
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(3);
      expect(result.data?.items[0].completed).toBe(false);
      expect(result.data?.items[1].completed).toBe(true);
      expect(result.data?.items[2].info).toBe("重要");
    });

    it("应该处理嵌套任务", async () => {
      const markdown = `- [ ] 父任务
  - [ ] 子任务1
  - [x] 子任务2`;

      const result = await focusChainTool.handler(mockContext, {
        action: "from_markdown",
        markdown,
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].subtasks).toHaveLength(2);
    });

    it("应该拒绝无效的 Markdown", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "from_markdown",
        markdown: "这不是有效的清单格式",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("解析");
    });
  });

  describe("FocusChainManager", () => {
    let manager: FocusChainManager;

    beforeEach(() => {
      manager = new FocusChainManager();
      vi.clearAllMocks();
    });

    it("应该正确计算嵌套任务的进度", () => {
      const items = [
        {
          title: "父任务1",
          completed: false,
          subtasks: [
            { title: "子任务1", completed: true },
            { title: "子任务2", completed: false },
          ],
        },
        { title: "父任务2", completed: true },
      ];

      const result = manager.create({ items }, "test-conv");
      // 只计算叶子节点: 子任务1(完成), 子任务2(未完成), 父任务2(完成)
      // 总共3个叶子节点, 2个完成
      expect(result.progress).toBe(67); // 2/3 ≈ 66.7% -> 67%
    });

    it("应该正确转换嵌套任务为 Markdown", () => {
      const items = [
        {
          title: "父任务",
          completed: false,
          subtasks: [
            { title: "子任务1", completed: true },
            { title: "子任务2", completed: false },
          ],
        },
      ];

      const result = manager.create({ items }, "test-conv");
      expect(result.markdown).toContain("- [ ] 父任务");
      expect(result.markdown).toContain("  - [x] 子任务1");
      expect(result.markdown).toContain("  - [ ] 子任务2");
    });
  });

  describe("响应数据结构", () => {
    it("应该包含所有必需字段", async () => {
      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [{ title: "任务1", completed: false }],
      });

      expect(result.data?.taskId).toBeDefined();
      expect(result.data?.action).toBeDefined();
      expect(result.data?.items).toBeDefined();
      expect(result.data?.markdown).toBeDefined();
      expect(result.data?.progress).toBeDefined();
      expect(typeof result.data?.progress).toBe("number");
    });
  });

  describe("权限检查", () => {
    it("应该不需要特殊权限", () => {
      expect(focusChainTool.permissions).toHaveLength(0);
    });
  });

  describe("工具状态", () => {
    it("工具默认应该是启用状态", () => {
      expect(focusChainTool.enabled).toBe(true);
    });
  });

  describe("边界情况", () => {
    it("应该处理包含额外信息的任务", async () => {
      const items = [
        { title: "任务1", completed: true, info: "已完成" },
      ];

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.info).toBe("已完成");
    });

    it("应该处理空标题的任务", async () => {
      const items = [
        { title: "   ", completed: false },
      ];

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.success).toBe(false);
    });

    it("应该处理大量任务项", async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        title: `任务${i + 1}`,
        completed: i % 2 === 0,
      }));

      const result = await focusChainTool.handler(mockContext, {
        action: "create",
        items,
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(100);
      expect(result.data?.progress).toBe(50);
    });
  });

  describe("完整场景", () => {
    it("应该支持完整的任务生命周期", async () => {
      // 1. 创建任务
      const createResult = await focusChainTool.handler(mockContext, {
        action: "create",
        items: [
          { title: "设计", completed: false },
          { title: "开发", completed: false },
          { title: "测试", completed: false },
        ],
      });

      expect(createResult.success).toBe(true);
      const taskId = createResult.data?.taskId;

      // 2. 更新第一个任务为完成
      const updateResult = await focusChainTool.handler(mockContext, {
        action: "update",
        taskId,
        index: 0,
        completed: true,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.progress).toBe(33);

      // 3. 添加新任务
      const addResult = await focusChainTool.handler(mockContext, {
        action: "add",
        taskId,
        item: { title: "部署", completed: false },
      });

      expect(addResult.success).toBe(true);
      expect(addResult.data?.items).toHaveLength(4);

      // 4. 获取任务
      const getResult = await focusChainTool.handler(mockContext, {
        action: "get",
        taskId,
      });

      expect(getResult.success).toBe(true);
      expect(getResult.data?.markdown).toBeDefined();

      // 5. 删除任务
      const deleteResult = await focusChainTool.handler(mockContext, {
        action: "delete",
        taskId,
      });

      expect(deleteResult.success).toBe(true);
    });
  });
});
