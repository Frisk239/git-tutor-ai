/**
 * 工具注册表测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry } from './registry.js';
import type { ToolDefinition } from './types.js';

describe('工具注册表', () => {
  let testTool: ToolDefinition;

  beforeEach(() => {
    // 清空注册表
    toolRegistry.clear();

    // 创建测试工具
    testTool = {
      name: 'test_tool',
      displayName: '测试工具',
      description: '用于测试的工具',
      category: 'filesystem' as any,
      parameters: [
        {
          name: 'param1',
          type: 'string',
          description: '测试参数',
          required: true,
        },
      ],
      permissions: [],
      enabled: true,
      handler: {
        async execute(_context: any, _params: any) {
          return { success: true, data: { result: 'ok' } };
        },
      },
    } as any;
  });

  describe('注册功能', () => {
    it('应该成功注册一个工具', () => {
      toolRegistry.register(testTool);

      const retrieved = toolRegistry.get('test_tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test_tool');
    });

    it('应该拒绝重复注册同名工具', () => {
      toolRegistry.register(testTool);

      expect(() => {
        toolRegistry.register(testTool);
      }).toThrow();
    });

    it('应该批量注册多个工具', () => {
      const tool1 = { ...testTool, name: 'tool1' } as any;
      const tool2 = { ...testTool, name: 'tool2' } as any;

      toolRegistry.registerAll([tool1, tool2]);

      expect(toolRegistry.get('tool1')).toBeDefined();
      expect(toolRegistry.get('tool2')).toBeDefined();
    });
  });

  describe('查询功能', () => {
    it('应该能够获取已注册的工具', () => {
      toolRegistry.register(testTool);

      const tool = toolRegistry.get('test_tool');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test_tool');
      expect(tool?.displayName).toBe('测试工具');
    });

    it('对于未注册的工具应该返回 undefined', () => {
      const tool = toolRegistry.get('non_existent_tool');

      expect(tool).toBeUndefined();
    });

    it('应该能够获取所有工具', () => {
      const tool1 = { ...testTool, name: 'tool1' } as any;
      const tool2 = { ...testTool, name: 'tool2' } as any;

      toolRegistry.registerAll([tool1, tool2]);

      const allTools = toolRegistry.getAll();

      expect(allTools).toHaveLength(2);
      expect(allTools[0]?.name).toBe('tool1');
      expect(allTools[1]?.name).toBe('tool2');
    });

    it('应该能够按类别筛选工具', () => {
      const tool1 = { ...testTool, name: 'tool1', category: 'filesystem' as any } as any;
      const tool2 = { ...testTool, name: 'tool2', category: 'git' as any } as any;

      toolRegistry.registerAll([tool1, tool2]);

      const gitTools = toolRegistry.getByCategory('git');

      expect(gitTools).toHaveLength(1);
      expect(gitTools[0]?.name).toBe('tool2');
    });

    it('应该能够获取工具的类别列表', () => {
      const tool1 = { ...testTool, name: 'tool1', category: 'filesystem' as any } as any;
      const tool2 = { ...testTool, name: 'tool2', category: 'git' as any } as any;
      const tool3 = { ...testTool, name: 'tool3', category: 'filesystem' as any } as any;

      toolRegistry.registerAll([tool1, tool2, tool3]);

      const categories = toolRegistry.getCategories();

      expect(categories).toEqual(expect.arrayContaining(['filesystem', 'git']));
    });

    it('应该能够检查工具是否存在', () => {
      toolRegistry.register(testTool);

      expect(toolRegistry.has('test_tool')).toBe(true);
      expect(toolRegistry.has('non_existent_tool')).toBe(false);
    });
  });

  describe('注销功能', () => {
    it('应该能够注销工具', () => {
      toolRegistry.register(testTool);

      toolRegistry.unregister('test_tool');

      expect(toolRegistry.has('test_tool')).toBe(false);
    });

    it('注销不存在的工具不应该抛出错误', () => {
      expect(() => {
        toolRegistry.unregister('non_existent_tool');
      }).not.toThrow();
    });
  });

  describe('清空功能', () => {
    it('应该能够清空所有工具', () => {
      const tool1 = { ...testTool, name: 'tool1' } as any;
      const tool2 = { ...testTool, name: 'tool2' } as any;

      toolRegistry.registerAll([tool1, tool2]);

      toolRegistry.clear();

      expect(toolRegistry.getAll()).toHaveLength(0);
    });
  });
});
