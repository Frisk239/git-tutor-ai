/**
 * SAY 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sayTool, createSayTool, SayResult } from './say.js';
import type { ToolContext } from '../../types.js';

describe('say 工具', () => {
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
      expect(sayTool.name).toBe('say');
      expect(sayTool.displayName).toBe('展示信息');
      expect(sayTool.category).toBe('communication');
      expect(sayTool.enabled).toBe(true);
    });

    it('应该有必要的参数定义', () => {
      expect(sayTool.parameters).toHaveLength(2);
      expect(sayTool.parameters[0].name).toBe('message');
      expect(sayTool.parameters[0].type).toBe('string');
      expect(sayTool.parameters[0].required).toBe(true);
      expect(sayTool.parameters[1].name).toBe('type');
      expect(sayTool.parameters[1].type).toBe('string');
      expect(sayTool.parameters[1].required).toBe(false);
    });

    it('应该有详细的描述', () => {
      expect(sayTool.description).toContain('展示信息');
      expect(sayTool.description).toContain('message');
      expect(sayTool.description).toContain('type');
    });
  });

  describe('工具执行 - 基本验证', () => {
    it('应该在缺少 message 参数时返回错误', async () => {
      const result = await sayTool.handler.execute(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('缺少必需参数: message');
    });

    it('应该在 message 为空字符串时返回错误', async () => {
      const result = await sayTool.handler.execute(mockContext, {
        message: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('message 参数不能为空');
    });

    it('应该在 message 只有空格时返回错误', async () => {
      const result = await sayTool.handler.execute(mockContext, {
        message: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('message 参数不能为空');
    });

    it('应该在 message 类型错误时返回错误', async () => {
      const result = await sayTool.handler.execute(mockContext, {
        message: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('message 参数不能为空');
    });
  });

  describe('工具执行 - type 验证', () => {
    it('应该接受有效的 type 参数', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const validTypes = ['info', 'success', 'warning', 'error', 'progress'];

      for (const type of validTypes) {
        const result = await toolWithCallback.handler.execute(mockContext, {
          message: '测试消息',
          type,
        });

        expect(result.success).toBe(true);
        expect(mockCallback).toHaveBeenCalledWith('测试消息', type);
      }
    });

    it('应该在 type 无效时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
        type: 'invalid' as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('type 参数必须是以下值之一');
    });

    it('应该处理未指定 type 的情况', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith('测试消息', undefined);
    });
  });

  describe('工具执行 - 无回调情况', () => {
    it('应该在无回调时默认成功', async () => {
      const result = await sayTool.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(result.success).toBe(true);
      const data = result.data as SayResult;
      expect(data.displayed).toBe(false);
      expect(data.message).toBe('测试消息');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('工具执行 - 有回调情况', () => {
    it('应该成功调用回调', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(result.success).toBe(true);
      const data = result.data as SayResult;
      expect(data.displayed).toBe(true);
      expect(data.message).toBe('测试消息');
      expect(mockCallback).toHaveBeenCalledWith('测试消息', undefined);
    });

    it('应该传递 type 参数', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '操作成功完成!',
        type: 'success',
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith('操作成功完成!', 'success');
    });

    it('应该处理回调返回 false 的情况', async () => {
      const mockCallback = vi.fn().mockResolvedValue(false);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(result.success).toBe(true);
      const data = result.data as SayResult;
      expect(data.displayed).toBe(false);
    });

    it('应该处理回调异常', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('展示失败'));

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('展示失败');
    });
  });

  describe('时间戳验证', () => {
    it('应该生成有效的 ISO 8601 时间戳', async () => {
      const beforeTime = new Date().toISOString();

      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '测试消息',
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      const data = result.data as SayResult;
      expect(data.timestamp).toBeDefined();

      const timestamp = new Date(data.timestamp);
      const before = new Date(beforeTime);
      const after = new Date(afterTime);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('createSayTool 便捷函数', () => {
    it('应该创建带有自定义回调的工具', () => {
      const mockCallback = vi.fn().mockResolvedValue(true);
      const customTool = createSayTool(mockCallback);

      expect(customTool.name).toBe('say');
      expect(customTool.handler).toBeDefined();
      expect(customTool.handler).not.toBe(sayTool.handler);
    });

    it('应该正确设置回调函数', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const customTool = createSayTool(mockCallback);

      const result = await customTool.handler.execute(mockContext, {
        message: '测试消息',
      });

      expect(mockCallback).toHaveBeenCalledWith('测试消息', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('复杂场景', () => {
    it('应该处理包含特殊字符的消息', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: '特殊字符测试: <>&"\'\n换行符\t制表符',
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith('特殊字符测试: <>&"\'\n换行符\t制表符', undefined);
    });

    it('应该处理长消息', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const longMessage = 'x'.repeat(10_000);

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: longMessage,
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(longMessage, undefined);
    });

    it('应该处理多行消息', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const multiLineMessage = `第一行
第二行
第三行`;

      const result = await toolWithCallback.handler.execute(mockContext, {
        message: multiLineMessage,
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(multiLineMessage, undefined);
    });

    it('应该处理不同 type 的消息', async () => {
      const mockCallback = vi.fn().mockResolvedValue(true);

      const toolWithCallback = createSayTool(mockCallback);

      const testCases = [
        { message: '正在处理...', type: 'info' },
        { message: '操作成功!', type: 'success' },
        { message: '请注意!', type: 'warning' },
        { message: '发生错误!', type: 'error' },
        { message: '进度: 50%', type: 'progress' },
      ];

      for (const testCase of testCases) {
        const result = await toolWithCallback.handler.execute(mockContext, testCase);

        expect(result.success).toBe(true);
        expect(mockCallback).toHaveBeenCalledWith(testCase.message, testCase.type);
      }
    });
  });
});
