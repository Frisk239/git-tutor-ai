/**
 * PLAN_MODE_RESPOND 工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { planModeRespondTool, type PlanModeRespondParams } from './plan-mode-respond.js';

// Mock context
const mockContext = {
  conversationId: 'test-conversation',
  projectPath: '/test/project',
  services: {},
};

describe('plan_mode_respond 工具', () => {
  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
  });

  describe('工具定义', () => {
    it('应该定义正确的工具名称', () => {
      expect(planModeRespondTool.name).toBe('plan_mode_respond');
    });

    it('应该定义正确的显示名称', () => {
      expect(planModeRespondTool.displayName).toBe('计划模式响应');
    });

    it('应该定义正确的类别', () => {
      expect(planModeRespondTool.category).toBe('planning');
    });

    it('应该包含清晰的描述', () => {
      expect(planModeRespondTool.description).toBeDefined();
      expect(planModeRespondTool.description).toContain('计划模式');
    });
  });

  describe('参数验证', () => {
    it('应该定义必需的参数', () => {
      const params = planModeRespondTool.parameters;

      expect(params).toHaveLength(4);

      const responseParam = params.find((p) => p.name === 'response');
      expect(responseParam).toBeDefined();
      expect(responseParam?.required).toBe(true);

      const optionsParam = params.find((p) => p.name === 'options');
      expect(optionsParam).toBeDefined();
      expect(optionsParam?.required).toBe(false);

      const explorationParam = params.find((p) => p.name === 'needs_more_exploration');
      expect(explorationParam).toBeDefined();
      expect(explorationParam?.required).toBe(false);

      const progressParam = params.find((p) => p.name === 'task_progress');
      expect(progressParam).toBeDefined();
      expect(progressParam?.required).toBe(false);
    });
  });

  describe('工具执行', () => {
    it('应该成功处理基本的响应请求', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '这是我的计划',
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('这是我的计划');
      expect(result.data?.mode).toBe('plan');
      expect(result.data?.timestamp).toBeDefined();
    });

    it('应该处理包含选项的响应请求', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '请选择下一步操作',
        options: ['批准计划', '修改计划', '取消'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('请选择下一步操作');
      expect(result.data?.options).toEqual(['批准计划', '修改计划', '取消']);
    });

    it('应该处理 needs_more_exploration=true 的情况', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '我需要先检查配置文件',
        needs_more_exploration: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.needs_more_exploration).toBe(true);
      expect(result.data?.message).toContain('more exploration');
    });

    it('应该处理包含任务进度的响应请求', async () => {
      const taskProgress = [
        { title: '步骤1', completed: true },
        { title: '步骤2', completed: false },
      ];

      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划如下',
        task_progress: taskProgress,
      });

      expect(result.success).toBe(true);
      expect(result.data?.task_progress).toEqual(taskProgress);
    });

    it('应该拒绝缺少 response 参数的请求', async () => {
      const result = await planModeRespondTool.handler(mockContext, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('response');
    });

    it('应该拒绝空字符串的 response 参数', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('response');
    });

    it('应该拒绝空的选项数组', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('options');
      expect(result.error).toContain('空数组');
    });

    it('应该拒绝包含空字符串的选项数组', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: ['选项1', '', '选项3'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('options');
    });

    it('应该拒绝无效的任务进度格式', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        task_progress: [
          { title: '步骤1', completed: true },
          { title: '步骤2' }, // 缺少 completed 字段
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('task_progress');
    });

    it('应该正确 trim 响应字符串', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '  计划内容  ',
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('计划内容');
    });
  });

  describe('选项解析', () => {
    it('应该处理字符串格式的选项（JSON 数组）', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: JSON.stringify(['选项1', '选项2']),
      });

      expect(result.success).toBe(true);
      expect(result.data?.options).toEqual(['选项1', '选项2']);
    });

    it('应该处理无效的 JSON 字符串选项', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: 'not a valid json',
      });

      // 无效 JSON 应该被忽略，不报错
      expect(result.success).toBe(true);
      expect(result.data?.options).toBeUndefined();
    });

    it('应该处理已经是数组的选项', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: ['选项1', '选项2', '选项3'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.options).toEqual(['选项1', '选项2', '选项3']);
    });
  });

  describe('needs_more_exploration 行为', () => {
    it('needs_more_exploration=true 应该立即返回', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '需要更多信息',
        needs_more_exploration: true,
        options: ['选项1', '选项2'], // 即使有选项也应该被忽略
      });

      expect(result.success).toBe(true);
      expect(result.data?.needs_more_exploration).toBe(true);
      // 当 needs_more_exploration 为 true 时，不应该包含选项
      expect(result.data?.options).toBeUndefined();
    });

    it('needs_more_exploration=false 应该正常处理', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划',
        needs_more_exploration: false,
        options: ['批准'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.needs_more_exploration).toBeUndefined();
      expect(result.data?.options).toEqual(['批准']);
    });
  });

  describe('响应数据结构', () => {
    it('应该包含时间戳', async () => {
      const beforeTime = new Date().toISOString();

      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划',
      });

      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.timestamp >= beforeTime).toBe(true);
      expect(result.data?.timestamp <= afterTime).toBe(true);
    });

    it('应该包含模式标记', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划',
      });

      expect(result.data?.mode).toBe('plan');
    });
  });

  describe('权限检查', () => {
    it('应该不需要特殊权限', () => {
      expect(planModeRespondTool.permissions).toHaveLength(0);
    });
  });

  describe('工具状态', () => {
    it('工具默认应该是启用状态', () => {
      expect(planModeRespondTool.enabled).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的任务进度数组', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划',
        task_progress: [],
      });

      expect(result.success).toBe(true);
      // 空数组不应该包含在响应中
      expect(result.data?.task_progress).toBeUndefined();
    });

    it('应该处理包含额外信息的任务进度项', async () => {
      const taskProgress = [
        {
          title: '步骤1',
          completed: true,
          info: '额外信息',
        },
      ];

      const result = await planModeRespondTool.handler(mockContext, {
        response: '计划',
        task_progress: taskProgress,
      });

      expect(result.success).toBe(true);
      expect(result.data?.task_progress[0]?.info).toBe('额外信息');
    });

    it('应该处理非常长的响应内容', async () => {
      const longResponse = 'A'.repeat(10000);

      const result = await planModeRespondTool.handler(mockContext, {
        response: longResponse,
      });

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe(longResponse);
    });

    it('应该处理单个选项', async () => {
      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: ['唯一选项'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.options).toEqual(['唯一选项']);
    });

    it('应该处理很多选项', async () => {
      const manyOptions = Array.from({ length: 20 }, (_, i) => `选项${i + 1}`);

      const result = await planModeRespondTool.handler(mockContext, {
        response: '测试',
        options: manyOptions,
      });

      expect(result.success).toBe(true);
      expect(result.data?.options).toHaveLength(20);
    });
  });

  describe('完整场景', () => {
    it('应该处理包含所有参数的完整响应', async () => {
      const fullParams: PlanModeRespondParams = {
        response: '这是完整的实现计划',
        options: ['批准', '修改', '取消'],
        task_progress: [
          { title: '步骤1', completed: false },
          { title: '步骤2', completed: false, info: '待处理' },
        ],
      };

      const result = await planModeRespondTool.handler(mockContext, fullParams);

      expect(result.success).toBe(true);
      expect(result.data?.response).toBe('这是完整的实现计划');
      expect(result.data?.options).toEqual(['批准', '修改', '取消']);
      expect(result.data?.task_progress).toHaveLength(2);
      expect(result.data?.mode).toBe('plan');
      expect(result.data?.timestamp).toBeDefined();
    });
  });
});
