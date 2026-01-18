/**
 * CONDENSE 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { condenseTool, createCondenseTool, CondenseResult } from './condense.js';
import type { ToolContext } from '../../types.js';

describe('condense 工具', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      conversationId: 'test-conversation',
      userId: 'test-user',
      permissions: new Set(),
      metadata: {},
    };
  });

  describe('工具定义', () => {
    it('应该有正确的工具元数据', () => {
      expect(condenseTool.name).toBe('condense');
      expect(condenseTool.displayName).toBe('压缩对话');
      expect(condenseTool.category).toBe('task');
      expect(condenseTool.enabled).toBe(true);
    });

    it('应该有必要的参数定义', () => {
      expect(condenseTool.parameters).toHaveLength(1);
      expect(condenseTool.parameters[0].name).toBe('context');
      expect(condenseTool.parameters[0].type).toBe('string');
      expect(condenseTool.parameters[0].required).toBe(true);
    });

    it('应该有详细的描述', () => {
      expect(condenseTool.description).toContain('压缩对话历史');
      expect(condenseTool.description).toContain('上下文窗口');
      expect(condenseTool.description).toContain('前序对话概要');
      expect(condenseTool.description).toContain('当前工作');
    });
  });

  describe('工具执行 - 基本验证', () => {
    it('应该在缺少 context 参数时返回错误', async () => {
      const result = await condenseTool.handler.execute(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('缺少必需参数: context');
    });

    it('应该在 context 为空字符串时返回错误', async () => {
      const result = await condenseTool.handler.execute(mockContext, {
        context: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('context 参数不能为空');
    });

    it('应该在 context 只有空格时返回错误', async () => {
      const result = await condenseTool.handler.execute(mockContext, {
        context: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('context 参数不能为空');
    });

    it('应该在 context 类型错误时返回错误', async () => {
      const result = await condenseTool.handler.execute(mockContext, {
        context: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('context 参数不能为空');
    });
  });

  describe('工具执行 - 无回调情况', () => {
    it('应该在无回调时自动接受压缩', async () => {
      const condensedContext = `# 对话摘要

## 前序对话概要
用户想要实现一个 Git 教学工具。

## 当前工作
正在实现核心工具系统。

## 下一步
继续实现剩余的工具。`;

      const result = await condenseTool.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(true);
      expect(data.message).toBe('已接受压缩的对话摘要');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('工具执行 - 有回调情况', () => {
    it('应该在用户接受时返回成功', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        accepted: true,
      });

      const toolWithCallback = createCondenseTool(mockCallback);

      const condensedContext = `# 对话摘要

## 前序对话概要
用户想要实现一个 Git 教学工具。

## 当前工作
正在实现核心工具系统。`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(true);
      expect(data.message).toBe('用户已接受压缩的对话摘要');
      expect(mockCallback).toHaveBeenCalledWith(condensedContext);
    });

    it('应该在用户拒绝时返回反馈', async () => {
      const feedback = '请保留更多细节';
      const mockCallback = vi.fn().mockResolvedValue({
        accepted: false,
        feedback,
      });

      const toolWithCallback = createCondenseTool(mockCallback);

      const condensedContext = `# 对话摘要

## 前序对话概要
用户想要实现一个 Git 教学工具。`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(false);
      expect(data.feedback).toBe(feedback);
      expect(data.message).toBe('用户提供了反馈,而不是接受压缩摘要');
      expect(mockCallback).toHaveBeenCalledWith(condensedContext);
    });

    it('应该在用户拒绝但无反馈时正常处理', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        accepted: false,
      });

      const toolWithCallback = createCondenseTool(mockCallback);

      const condensedContext = `# 对话摘要

## 前序对话概要
用户想要实现一个 Git 教学工具。`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(false);
      expect(data.feedback).toBeUndefined();
    });

    it('应该处理回调异常', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('用户取消操作'));

      const toolWithCallback = createCondenseTool(mockCallback);

      const condensedContext = `# 对话摘要

## 前序对话概要
用户想要实现一个 Git 教学工具。`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户取消操作');
    });
  });

  describe('工具执行 - 复杂场景', () => {
    it('应该处理包含代码片段的上下文', async () => {
      const condensedContext = `# 对话摘要

## 当前工作
正在实现 focus_chain 工具。

\`\`\`typescript
interface TaskProgressItem {
  title: string;
  completed: boolean;
  subtasks?: TaskProgressItem[];
}
\`\`\`

## 下一步
实现 condense 工具。`;

      const result = await condenseTool.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(true);
    });

    it('应该处理包含多个章节的详细上下文', async () => {
      const condensedContext = `# 对话摘要

## 1. 前序对话概要
用户要求实现 Cline 风格的工具系统,包括 attempt_completion、plan_mode_respond、focus_chain 等工具。

## 2. 当前工作
刚刚完成 focus_chain 工具的实现,包括:
- 创建 focus-chain.ts (685 行)
- 创建 focus-chain.test.ts (550+ 行)
- 所有 36 个测试通过

## 3. 关键技术概念
- Vitest 测试框架
- TypeScript 严格模式
- 工具注册系统
- Markdown 解析

## 4. 相关文件和代码
- packages/core/src/tools/builtins/task/focus-chain.ts
- packages/core/src/tools/builtins/task/focus-chain.test.ts

## 5. 问题解决
解决了测试隔离问题,使用 conversationId 分隔状态。

## 6. 待处理任务和下一步
- 实现 condense 工具
- 实现 summarize_task 工具
- 实现 ask 和 say 工具`;

      const result = await condenseTool.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(true);
    });

    it('应该处理包含特殊字符的上下文', async () => {
      const condensedContext = `# 对话摘要

## 当前工作
处理特殊字符: <>&"'()

\`\`\`
console.log("特殊字符测试");
\`\`\`

## 中英文混合
这是一个包含中文和 English mixed content 的测试。`;

      const result = await condenseTool.handler.execute(mockContext, {
        context: condensedContext,
      });

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.accepted).toBe(true);
    });
  });

  describe('时间戳验证', () => {
    it('应该生成有效的 ISO 8601 时间戳', async () => {
      const beforeTime = new Date().toISOString();

      const result = await condenseTool.handler.execute(mockContext, {
        context: '测试上下文',
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      const data = result.data as CondenseResult;
      expect(data.timestamp).toBeDefined();

      // 验证时间戳在合理范围内
      const timestamp = new Date(data.timestamp);
      const before = new Date(beforeTime);
      const after = new Date(afterTime);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('createCondenseTool 便捷函数', () => {
    it('应该创建带有自定义回调的工具', () => {
      const mockCallback = vi.fn();
      const customTool = createCondenseTool(mockCallback);

      expect(customTool.name).toBe('condense');
      expect(customTool.handler).toBeDefined();
      expect(customTool.handler).not.toBe(condenseTool.handler);
    });

    it('应该正确设置回调函数', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        accepted: true,
      });

      const customTool = createCondenseTool(mockCallback);

      const result = await customTool.handler.execute(mockContext, {
        context: '测试上下文',
      });

      expect(mockCallback).toHaveBeenCalledWith('测试上下文');
      expect(result.success).toBe(true);
    });
  });
});
