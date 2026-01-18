/**
 * new_task 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { newTaskTool, createNewTaskTool } from './new-task.js';
import type { ToolContext } from '../../types.js';

describe('new_task 工具', () => {
  let mockContext: ToolContext;
  let onConfirmCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 模拟 ToolContext
    mockContext = {
      sessionId: 'test-session',
      userId: 'test-user',
      workingDirectory: '/test/dir',
    } as any;

    // 模拟用户确认回调
    onConfirmCallback = vi.fn();
  });

  describe('基本功能', () => {
    it('应该成功创建工具实例', () => {
      const tool = createNewTaskTool(onConfirmCallback);

      expect(tool).toBeDefined();
      expect(tool.name).toBe('new_task');
      expect(tool.enabled).toBe(true);
    });

    it('应该正确设置工具元数据', () => {
      expect(newTaskTool.name).toBe('new_task');
      expect(newTaskTool.displayName).toBe('新建任务');
      expect(newTaskTool.category).toBe('task');
      expect(newTaskTool.description).toContain('创建新任务');
    });
  });

  describe('参数验证', () => {
    it('应该定义必需的参数', () => {
      const params = newTaskTool.parameters;

      expect(params).toHaveLength(1);

      const contextParam = params.find((p) => p.name === 'context');
      expect(contextParam).toBeDefined();
      expect(contextParam?.required).toBe(true);
    });
  });

  describe('工具执行', () => {
    it('应该成功处理有效的任务创建请求', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      onConfirmCallback.mockResolvedValueOnce({
        created: true,
        feedback: '任务已创建',
      });

      const result = await tool.handler.execute(mockContext, {
        context: '请帮我修复这个 bug',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        taskCreated: true,
        message: '用户已创建新任务',
        feedback: '任务已创建',
      });
      expect(onConfirmCallback).toHaveBeenCalledTimes(1);
      expect(onConfirmCallback).toHaveBeenCalledWith('请帮我修复这个 bug');
    });

    it('应该处理用户拒绝创建任务的情况', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      onConfirmCallback.mockResolvedValueOnce({
        created: false,
        feedback: '用户取消了任务创建',
      });

      const result = await tool.handler.execute(mockContext, {
        context: '请帮我修复这个 bug',
      });

      expect(result.success).toBe(true);
      expect(result.data?.taskCreated).toBe(false);
    });

    it('应该拒绝缺少 context 参数的请求', async () => {
      const tool = createNewTaskTool(onConfirmCallback);

      const result = await tool.handler.execute(mockContext, {
        // 缺少 context
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少必需参数');
    });

    it('应该处理回调函数未设置的情况', async () => {
      const tool = createNewTaskTool(); // 不设置回调

      const result = await tool.handler.execute(mockContext, {
        context: '测试任务',
      });

      expect(result.success).toBe(true);
      expect(result.data?.taskCreated).toBe(true);
      expect(result.data?.message).toBe('已创建新任务');
    });

    it('应该处理空字符串 context', async () => {
      const tool = createNewTaskTool(onConfirmCallback);

      const result = await tool.handler.execute(mockContext, {
        context: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少必需参数');
    });

    it('应该处理长文本 context', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      const longContext = 'A'.repeat(10000); // 10KB 文本

      onConfirmCallback.mockResolvedValueOnce({
        created: true,
      });

      const result = await tool.handler.execute(mockContext, {
        context: longContext,
      });

      expect(result.success).toBe(true);
      expect(onConfirmCallback).toHaveBeenCalledWith(longContext);
    });
  });

  describe('用户反馈处理', () => {
    it('应该返回用户的反馈信息', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      onConfirmCallback.mockResolvedValueOnce({
        created: true,
        feedback: '我需要更多细节',
      });

      const result = await tool.handler.execute(mockContext, {
        context: '测试任务',
      });

      expect(result.success).toBe(true);
      expect(result.data?.feedback).toBe('我需要更多细节');
    });

    it('应该处理没有反馈的情况', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      onConfirmCallback.mockResolvedValueOnce({
        created: true,
      });

      const result = await tool.handler.execute(mockContext, {
        context: '测试任务',
      });

      expect(result.success).toBe(true);
      expect(result.data?.feedback).toBeUndefined();
    });
  });

  describe('权限检查', () => {
    it('应该定义正确的权限', () => {
      expect(newTaskTool.permissions).toHaveLength(0); // new_task 不需要特殊权限
    });
  });

  describe('工具状态', () => {
    it('工具默认应该是启用状态', () => {
      expect(newTaskTool.enabled).toBe(true);
    });

    it('应该能够动态设置回调函数', () => {
      const newCallback = vi.fn();
      const tool = createNewTaskTool(newCallback);

      expect(tool).toBeDefined();
      expect(tool.handler).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理回调函数抛出错误的情况', async () => {
      const tool = createNewTaskTool(onConfirmCallback);
      onConfirmCallback.mockRejectedValueOnce(new Error('用户确认失败'));

      const result = await tool.handler.execute(mockContext, {
        context: '测试任务',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('用户确认失败');
    });
  });
});
