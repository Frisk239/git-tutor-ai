/**
 * ask 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { askTool, createAskTool } from './ask.js';
import type { ToolContext } from '../../types.js';

describe('ask 工具', () => {
  let mockContext: ToolContext;
  let onAskCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 模拟 ToolContext
    mockContext = {
      sessionId: 'test-session',
      userId: 'test-user',
      workingDirectory: '/test/dir',
    } as any;

    // 模拟用户确认回调
    onAskCallback = vi.fn();
  });

  describe('基本功能', () => {
    it('应该成功创建工具实例', () => {
      const tool = createAskTool(onAskCallback);

      expect(tool).toBeDefined();
      expect(tool.name).toBe('ask');
      expect(tool.enabled).toBe(true);
    });

    it('应该正确设置工具元数据', () => {
      expect(askTool.name).toBe('ask');
      expect(askTool.displayName).toBe('询问用户');
      expect(String(askTool.category)).toBe('interaction');
      expect(askTool.description).toContain('在任务执行过程中');
    });
  });

  describe('参数验证', () => {
    it('应该定义必需的参数', () => {
      const params = askTool.parameters;

      expect(params).toHaveLength(3);

      const questionParam = params.find((p) => p.name === 'question');
      expect(questionParam).toBeDefined();
      expect(questionParam?.required).toBe(true);

      const optionsParam = params.find((p) => p.name === 'options');
      expect(optionsParam).toBeDefined();
      expect(optionsParam?.required).toBe(true);

      const timeoutParam = params.find((p) => p.name === 'timeout');
      expect(timeoutParam).toBeDefined();
      expect(timeoutParam?.required).toBe(false);
    });
  });

  describe('工具执行', () => {
    it('应该成功处理有效的询问请求', async () => {
      const tool = createAskTool(onAskCallback);
      onAskCallback.mockResolvedValueOnce({
        confirmed: true,
        response: '选项A',
      });

      const result = await tool.handler.execute(mockContext, {
        question: '请选择一个选项',
        options: ['选项A', '选项B', '选项C'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        choice: '选项A',
      });
      expect(onAskCallback).toHaveBeenCalledTimes(1);
    });

    it('应该处理用户取消的情况', async () => {
      const tool = createAskTool(onAskCallback);
      onAskCallback.mockResolvedValueOnce({
        confirmed: false,
        response: null,
      });

      const result = await tool.handler.execute(mockContext, {
        question: '请选择一个选项',
        options: ['选项A', '选项B'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: false,
        error: '用户取消了操作',
      });
    });

    it('应该拒绝缺少必需参数的请求', async () => {
      const tool = createAskTool(onAskCallback);

      const result = await tool.handler.execute(mockContext, {
        // 缺少 question 和 options
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少必需参数');
    });

    it('应该拒绝空选项列表', async () => {
      const tool = createAskTool(onAskCallback);

      const result = await tool.handler.execute(mockContext, {
        question: '请选择',
        options: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('至少需要一个选项');
    });

    it('应该处理回调函数未设置的情况', async () => {
      const tool = createAskTool(); // 不设置回调

      const result = await tool.handler.execute(mockContext, {
        question: '请选择',
        options: ['A', 'B'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.choice).toBe('A'); // 默认选择第一个
    });
  });

  describe('超时处理', () => {
    it('应该支持自定义超时时间', async () => {
      const tool = createAskTool(onAskCallback);
      onAskCallback.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ confirmed: true, response: 'A' }), 100);
          })
      );

      const startTime = Date.now();

      await tool.handler.execute(mockContext, {
        question: '请选择',
        options: ['A', 'B'],
        timeout: 5000,
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000);
    });

    it('超时时应该返回默认选择', async () => {
      const tool = createAskTool(onAskCallback);
      onAskCallback.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ confirmed: true, response: 'A' }), 2000);
          })
      );

      const result = await tool.handler.execute(mockContext, {
        question: '请选择',
        options: ['A', 'B'],
        timeout: 100, // 100ms 超时
      });

      expect(result.success).toBe(true);
      // 超时后应该选择默认选项
      expect(result.data?.choice).toBeDefined();
    }, 3000);
  });

  describe('权限检查', () => {
    it('应该定义正确的权限', () => {
      expect(askTool.permissions).toHaveLength(0); // ask 工具不需要特殊权限
    });
  });

  describe('工具状态', () => {
    it('工具默认应该是启用状态', () => {
      expect(askTool.enabled).toBe(true);
    });

    it('应该能够动态设置回调函数', () => {
      const newCallback = vi.fn();
      const tool = createAskTool(newCallback);

      expect(tool).toBeDefined();
      expect(tool.handler).toBeDefined();
    });
  });
});
