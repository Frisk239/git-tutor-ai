/**
 * act_mode_respond 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { actModeRespondTool, createActModeRespondTool } from './act-mode-respond.js';
import type { ToolContext } from '../../types.js';

describe('act_mode_respond 工具', () => {
  let mockContext: ToolContext;
  let showProgressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 模拟 ToolContext
    mockContext = {
      sessionId: 'test-session',
      userId: 'test-user',
      workingDirectory: '/test/dir',
    } as any;

    // 模拟进度更新回调
    showProgressCallback = vi.fn().mockResolvedValue(undefined);
  });

  describe('基本功能', () => {
    it('应该成功创建工具实例', () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      expect(tool).toBeDefined();
      expect(tool.name).toBe('act_mode_respond');
      expect(tool.enabled).toBe(true);
    });

    it('应该正确设置工具元数据', () => {
      expect(actModeRespondTool.name).toBe('act_mode_respond');
      expect(actModeRespondTool.displayName).toBe('执行模式响应');
      expect(actModeRespondTool.category).toBe('interaction');
      expect(actModeRespondTool.description).toContain('非阻塞的进度更新');
    });
  });

  describe('参数验证', () => {
    it('应该定义必需的参数', () => {
      const params = actModeRespondTool.parameters;

      expect(params.length).toBeGreaterThanOrEqual(1);

      const responseParam = params.find((p) => p.name === 'response');
      expect(responseParam).toBeDefined();
      expect(responseParam?.required).toBe(true);

      const progressParam = params.find((p) => p.name === 'task_progress');
      expect(progressParam).toBeDefined();
      expect(progressParam?.required).toBe(false);
    });
  });

  describe('工具执行', () => {
    it('应该成功处理有效的进度更新请求', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      const result = await tool.handler.execute(mockContext, {
        response: '正在处理文件...',
        task_progress: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        message: '进度更新已显示',
      });
      expect(showProgressCallback).toHaveBeenCalledTimes(1);
      expect(showProgressCallback).toHaveBeenCalledWith('正在处理文件...', 50);
    });

    it('应该处理只有 response 的情况', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      const result = await tool.handler.execute(mockContext, {
        response: '正在初始化...',
      });

      expect(result.success).toBe(true);
      expect(showProgressCallback).toHaveBeenCalledWith('正在初始化...', undefined);
    });

    it('应该拒绝缺少 response 参数的请求', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      const result = await tool.handler.execute(mockContext, {
        // 缺少 response
        task_progress: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少必需参数');
    });

    it('应该处理回调函数未设置的情况', async () => {
      const tool = createActModeRespondTool(); // 不设置回调

      const result = await tool.handler.execute(mockContext, {
        response: '测试进度更新',
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.message).toBe('进度更新已显示');
    });
  });

  describe('频率限制', () => {
    it('应该防止在短时间内连续调用', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      // 第一次调用
      const result1 = await tool.handler.execute(mockContext, {
        response: '第一次调用',
      });

      expect(result1.success).toBe(true);

      // 立即第二次调用（应该被拒绝）
      const result2 = await tool.handler.execute(mockContext, {
        response: '第二次调用',
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('不能在短时间内连续调用');

      // 等待最小间隔后再调用
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result3 = await tool.handler.execute(mockContext, {
        response: '第三次调用',
      });

      expect(result3.success).toBe(true);
    });

    it('应该支持自定义的最小间隔', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks, 500); // 500ms 间隔

      const result1 = await tool.handler.execute(mockContext, {
        response: '第一次调用',
      });

      expect(result1.success).toBe(true);

      // 等待 600ms（超过最小间隔）
      await new Promise((resolve) => setTimeout(resolve, 600));

      const result2 = await tool.handler.execute(mockContext, {
        response: '第二次调用',
      });

      expect(result2.success).toBe(true);
    });
  });

  describe('进度值验证', () => {
    it('应该接受有效的进度值 (0-100)', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      const result1 = await tool.handler.execute(mockContext, {
        response: '进度 0%',
        task_progress: 0,
      });

      const result2 = await tool.handler.execute(mockContext, {
        response: '进度 100%',
        task_progress: 100,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('应该处理超出范围的进度值', async () => {
      const callbacks = { showProgress: showProgressCallback };
      const tool = createActModeRespondTool(callbacks);

      // 超出范围的值应该被传递但不做验证
      const result = await tool.handler.execute(mockContext, {
        response: '进度 150%',
        task_progress: 150,
      });

      expect(result.success).toBe(true);
      expect(showProgressCallback).toHaveBeenCalledWith('进度 150%', 150);
    });
  });

  describe('权限检查', () => {
    it('应该定义正确的权限', () => {
      expect(actModeRespondTool.permissions).toHaveLength(0);
    });
  });

  describe('工具状态', () => {
    it('工具默认应该是启用状态', () => {
      expect(actModeRespondTool.enabled).toBe(true);
    });

    it('应该能够动态设置回调函数', () => {
      const newCallback = vi.fn();
      const callbacks = { showProgress: newCallback };
      const tool = createActModeRespondTool(callbacks);

      expect(tool).toBeDefined();
      expect(tool.handler).toBeDefined();
    });
  });
});
