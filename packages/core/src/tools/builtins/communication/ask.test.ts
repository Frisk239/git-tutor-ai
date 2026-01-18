/**
 * ASK 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { askTool, createAskTool, AskResult } from './ask.js';
import type { ToolContext } from '../../types.js';

describe('ask 工具', () => {
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
      expect(askTool.name).toBe('ask');
      expect(askTool.displayName).toBe('询问用户');
      expect(askTool.category).toBe('communication');
      expect(askTool.enabled).toBe(true);
    });

    it('应该有必要的参数定义', () => {
      expect(askTool.parameters).toHaveLength(2);
      expect(askTool.parameters[0].name).toBe('question');
      expect(askTool.parameters[0].type).toBe('string');
      expect(askTool.parameters[0].required).toBe(true);
      expect(askTool.parameters[1].name).toBe('options');
      expect(askTool.parameters[1].type).toBe('array');
      expect(askTool.parameters[1].required).toBe(false);
    });

    it('应该有详细的描述', () => {
      expect(askTool.description).toContain('询问用户');
      expect(askTool.description).toContain('问题');
      expect(askTool.description).toContain('options');
    });
  });

  describe('工具执行 - 基本验证', () => {
    it('应该在缺少 question 参数时返回错误', async () => {
      const result = await askTool.handler.execute(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('缺少必需参数: question');
    });

    it('应该在 question 为空字符串时返回错误', async () => {
      const result = await askTool.handler.execute(mockContext, {
        question: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('question 参数不能为空');
    });

    it('应该在 question 只有空格时返回错误', async () => {
      const result = await askTool.handler.execute(mockContext, {
        question: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('question 参数不能为空');
    });

    it('应该在 question 类型错误时返回错误', async () => {
      const result = await askTool.handler.execute(mockContext, {
        question: 123,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('question 参数不能为空');
    });
  });

  describe('工具执行 - options 验证', () => {
    it('应该接受有效的 options 参数', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', 'develop'],
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith('选择哪个分支?', ['main', 'develop']);
    });

    it('应该在 options 不是数组时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: 'main' as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('options 参数必须是数组');
    });

    it('应该在 options 少于2个时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('options 参数必须包含 2-5 个选项');
    });

    it('应该在 options 多于5个时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['1', '2', '3', '4', '5', '6'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('options 参数必须包含 2-5 个选项');
    });

    it('应该在 options 包含空字符串时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', ''],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('每个选项都必须是非空字符串');
    });

    it('应该在 options 包含只有空格的字符串时返回错误', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', '   '],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('每个选项都必须是非空字符串');
    });

    it('应该自动 trim 选项', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: [' main ', ' develop '],
      });

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith('选择哪个分支?', ['main', 'develop']);
    });
  });

  describe('工具执行 - 无回调情况', () => {
    it('应该在无回调时返回错误', async () => {
      const result = await askTool.handler.execute(mockContext, {
        question: '测试问题',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('未设置用户交互回调,ask 工具无法执行');
    });
  });

  describe('工具执行 - 有回调情况', () => {
    it('应该成功调用回调并返回响应', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: '这是用户的响应',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '请问您需要什么?',
      });

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.response).toBe('这是用户的响应');
      expect(data.wasOptionSelected).toBe(false);
      expect(data.selectedOption).toBeUndefined();
      expect(mockCallback).toHaveBeenCalledWith('请问您需要什么?', undefined);
    });

    it('应该检测选项选择', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'main',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', 'develop', 'feature'],
      });

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.response).toBe('main');
      expect(data.wasOptionSelected).toBe(true);
      expect(data.selectedOption).toBe('main');
    });

    it('应该大小写不敏感地匹配选项', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'MAIN',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', 'develop'],
      });

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.wasOptionSelected).toBe(true);
      expect(data.selectedOption).toBe('main');
    });

    it('应该处理自定义响应(非选项)', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: '我想创建一个新分支',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '选择哪个分支?',
        options: ['main', 'develop'],
      });

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.response).toBe('我想创建一个新分支');
      expect(data.wasOptionSelected).toBe(false);
      expect(data.selectedOption).toBeUndefined();
    });

    it('应该处理带文件内容的响应', async () => {
      const fileContent = '// 文件内容\nexport function test() {}';
      const mockCallback = vi.fn().mockResolvedValue({
        response: '这是代码文件',
        fileContents: fileContent,
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '请提供代码文件',
      });

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.response).toBe('这是代码文件');
      expect(data.fileContents).toBe(fileContent);
    });

    it('应该处理回调异常', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('用户取消操作'));

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '测试问题',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户取消操作');
    });
  });

  describe('时间戳验证', () => {
    it('应该生成有效的 ISO 8601 时间戳', async () => {
      const beforeTime = new Date().toISOString();

      const mockCallback = vi.fn().mockResolvedValue({
        response: '测试响应',
      });

      const toolWithCallback = createAskTool(mockCallback);

      const result = await toolWithCallback.handler.execute(mockContext, {
        question: '测试问题',
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      const data = result.data as AskResult;
      expect(data.timestamp).toBeDefined();

      const timestamp = new Date(data.timestamp);
      const before = new Date(beforeTime);
      const after = new Date(afterTime);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('createAskTool 便捷函数', () => {
    it('应该创建带有自定义回调的工具', () => {
      const mockCallback = vi.fn().mockResolvedValue({
        response: 'test',
      });
      const customTool = createAskTool(mockCallback);

      expect(customTool.name).toBe('ask');
      expect(customTool.handler).toBeDefined();
      expect(customTool.handler).not.toBe(askTool.handler);
    });
  });
});
