/**
 * TaskState 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskState } from '../state/TaskState.js';
import { TaskStatus, TaskPhase } from '../types.js';

describe('TaskState', () => {
  let taskState: TaskState;

  beforeEach(() => {
    taskState = new TaskState();
  });

  describe('初始化', () => {
    it('应该创建初始状态', () => {
      expect(taskState.status).toBe(TaskStatus.CREATED);
      expect(taskState.phase).toBeDefined();
    });

    it('应该创建初始快照', () => {
      const snapshots = taskState.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
    });
  });

  describe('状态转换', () => {
    it('应该允许有效的状态转换', async () => {
      await taskState.setStatus(TaskStatus.RUNNING);
      expect(taskState.status).toBe(TaskStatus.RUNNING);
    });

    it('应该拒绝无效的状态转换', async () => {
      // 先设置为 RUNNING
      await taskState.setStatus(TaskStatus.RUNNING);

      // 然后尝试从 RUNNING 直接回到 CREATED（无效转换）
      await expect(taskState.setStatus(TaskStatus.CREATED)).rejects.toThrow(
        'Invalid status transition'
      );
    });
  });

  describe('消息管理', () => {
    it('应该添加助手内容', async () => {
      const content = [{ type: 'text' as const, text: 'Test' }];
      await taskState.addAssistantContent(content);

      expect(taskState.assistantMessageContent).toHaveLength(1);
    });

    it('应该添加用户内容', async () => {
      const content = [{ type: 'text' as const, text: 'Test' }];
      await taskState.addUserContent(content);

      expect(taskState.userMessageContent).toHaveLength(1);
    });

    it('应该清空消息', async () => {
      await taskState.addAssistantContent([{ type: 'text' as const, text: 'Test' }]);
      await taskState.clearMessages();

      expect(taskState.assistantMessageContent).toHaveLength(0);
      expect(taskState.userMessageContent).toHaveLength(0);
    });
  });

  describe('工具执行状态', () => {
    it('应该记录工具使用', () => {
      taskState.recordToolUse('test_tool');

      expect(taskState.didAlreadyUseTool).toBe(true);
      expect(taskState.lastToolName).toBe('test_tool');
      expect(taskState.consecutiveMistakeCount).toBe(0);
    });

    it('应该增加错误计数', () => {
      taskState.incrementMistakeCount();
      taskState.incrementMistakeCount();

      expect(taskState.consecutiveMistakeCount).toBe(2);
    });

    it('应该重置错误计数', () => {
      taskState.incrementMistakeCount();
      taskState.resetMistakeCount();

      expect(taskState.consecutiveMistakeCount).toBe(0);
    });

    it('应该检测最大错误数', () => {
      for (let i = 0; i < taskState.MAX_CONSECUTIVE_MISTAKES; i++) {
        taskState.incrementMistakeCount();
      }

      expect(taskState.hasReachedMaxMistakes()).toBe(true);
    });
  });

  describe('任务中止', () => {
    it('应该请求中止', async () => {
      await taskState.requestAbort();

      expect(taskState.abort).toBe(true);
    });

    it('应该重置中止状态', async () => {
      await taskState.requestAbort();
      await taskState.resetAbortState();

      expect(taskState.abort).toBe(false);
    });
  });

  describe('状态查询', () => {
    it('应该正确判断活动状态', async () => {
      await taskState.setStatus(TaskStatus.RUNNING);
      expect(taskState.isActive()).toBe(true);

      await taskState.setStatus(TaskStatus.COMPLETED);
      expect(taskState.isActive()).toBe(false);
    });

    it('应该正确判断终态', async () => {
      // CREATED -> RUNNING -> COMPLETED
      await taskState.setStatus(TaskStatus.RUNNING);
      await taskState.setStatus(TaskStatus.COMPLETED);
      expect(taskState.isTerminal()).toBe(true);
    });

    it('应该正确判断是否可执行', () => {
      taskState.abort = false;
      taskState.didCompleteReadingStream = false;
      (taskState as any)._status = TaskStatus.RUNNING;

      expect(taskState.canExecute()).toBe(true);
    });

    it('应该生成状态摘要', () => {
      const summary = taskState.getSummary();

      expect(summary.status).toBeDefined();
      expect(summary.phase).toBeDefined();
      expect(summary.messageCount).toBeDefined();
      expect(summary.isStreaming).toBeDefined();
    });
  });

  describe('快照管理', () => {
    it('应该创建快照', async () => {
      const initialCount = taskState.getSnapshots().length;

      await taskState.setStatus(TaskStatus.RUNNING);

      const newCount = taskState.getSnapshots().length;
      expect(newCount).toBeGreaterThan(initialCount);
    });

    it('应该限制快照数量', async () => {
      // 创建超过限制的快照
      // 通过在 RUNNING、PAUSED、COMPLETED 之间循环切换来创建快照
      const states = [TaskStatus.RUNNING, TaskStatus.PAUSED, TaskStatus.COMPLETED];

      for (let i = 0; i < taskState['MAX_SNAPSHOTS'] + 10; i++) {
        const state = states[i % states.length];
        if (i === 0) {
          await taskState.setStatus(TaskStatus.RUNNING);
        } else if (state === TaskStatus.COMPLETED) {
          // COMPLETED 是终态，不能从它转换，需要重新创建
          taskState = new TaskState();
          await taskState.setStatus(TaskStatus.RUNNING);
        } else {
          await taskState.setState(state, TaskPhase.EXECUTING);
        }
      }

      const snapshots = taskState.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(taskState['MAX_SNAPSHOTS']);
    });
  });
});
