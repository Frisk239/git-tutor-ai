/**
 * FOCUS_CHAIN 工具 - 任务进度管理工具
 *
 * 设计说明:
 * - Cline (VSCode插件): focus_chain 不是独立工具，而是集成到所有工具的 task_progress 参数
 * - Git Tutor AI (Web应用): 实现为独立的工具，管理任务进度和 TODO 列表
 *
 * 核心差异:
 * 1. Cline: 通过 task_progress 参数在每次工具调用时更新进度
 * 2. Git Tutor AI: 提供独立的工具来创建、更新、查询 TODO 列表
 *
 * 使用场景:
 * - 创建任务清单
 * - 更新任务进度
 * - 查询当前任务状态
 * - 标记任务完成
 */

import { ToolDefinition, ToolPermission, ToolHandler, ToolContext } from '../types.js';

/**
 * TODO 项
 */
export interface TodoItem {
  /** 任务描述 */
  description: string;
  /** 是否已完成 */
  completed: boolean;
  /** 创建时间（可选） */
  createdAt?: number;
  /** 完成时间（可选） */
  completedAt?: number;
}

/**
 * FOCUS_CHAIN 工具参数
 */
export interface FocusChainParams {
  /** 操作类型 */
  action: 'create' | 'update' | 'get' | 'complete' | 'clear';
  /** TODO 列表（create/update 时使用） */
  todos?: TodoItem[];
  /** 任务 ID（用于标识不同的任务） */
  taskId?: string;
  /** 索引（complete 时使用） */
  index?: number;
}

/**
 * FOCUS_CHAIN 工具返回结果
 */
export interface FocusChainResult {
  /** 当前 TODO 列表 */
  todos: TodoItem[];
  /** 总任务数 */
  total: number;
  /** 已完成任务数 */
  completed: number;
  /** 完成进度（百分比） */
  progress: number;
  /** 操作结果描述 */
  message: string;
}

/**
 * 任务存储接口
 *
 * 实现此接口以连接到你的存储后端
 */
export interface TodoStorage {
  /**
   * 保存 TODO 列表
   * @param taskId 任务 ID
   * @param todos TODO 列表
   */
  saveTodos(taskId: string, todos: TodoItem[]): Promise<void>;

  /**
   * 加载 TODO 列表
   * @param taskId 任务 ID
   * @returns TODO 列表，如果不存在则返回 null
   */
  loadTodos(taskId: string): Promise<TodoItem[] | null>;

  /**
   * 删除 TODO 列表
   * @param taskId 任务 ID
   */
  deleteTodos(taskId: string): Promise<void>;
}

/**
 * 创建默认的内存存储
 *
 * 注意: 这仅用于演示和测试，实际应用中应该使用持久化存储
 */
export function createMemoryStorage(): TodoStorage {
  const storage = new Map<string, TodoItem[]>();

  return {
    saveTodos: async (taskId: string, todos: TodoItem[]): Promise<void> => {
      storage.set(taskId, todos);
    },

    loadTodos: async (taskId: string): Promise<TodoItem[] | null> => {
      return storage.get(taskId) || null;
    },

    deleteTodos: async (taskId: string): Promise<void> => {
      storage.delete(taskId);
    },
  };
}

/**
 * 计算任务进度
 */
function calculateProgress(todos: TodoItem[]): {
  total: number;
  completed: number;
  progress: number;
} {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, progress };
}

/**
 * 格式化 TODO 列表为 Markdown
 */
function formatTodosToMarkdown(todos: TodoItem[]): string {
  if (todos.length === 0) {
    return '暂无任务';
  }

  const { total, completed, progress } = calculateProgress(todos);

  let markdown = `## 任务进度 (${completed}/${total} - ${progress}%)\n\n`;

  todos.forEach((todo, index) => {
    const checkbox = todo.completed ? '[x]' : '[ ]';
    markdown += `${index + 1}. ${checkbox} ${todo.description}\n`;
  });

  return markdown;
}

/**
 * 解析 Markdown 格式的 TODO 列表
 */
function parseTodosFromMarkdown(markdown: string): TodoItem[] {
  const todos: TodoItem[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    // 匹配格式: "1. [x] 任务描述" 或 "1. [ ] 任务描述"
    const match = line.match(/^\d+\.\s+\[(x| )\]\s+(.+)$/);
    if (match) {
      const completed = match[1] === 'x';
      const description = match[2].trim();
      todos.push({
        description,
        completed,
        createdAt: Date.now(),
        completedAt: completed ? Date.now() : undefined,
      });
    }
  }

  return todos;
}

/**
 * FOCUS_CHAIN 工具处理器
 */
class FocusChainToolHandler implements ToolHandler<FocusChainParams, FocusChainResult> {
  private storage: TodoStorage;
  private defaultTaskId: string;

  constructor(storage?: TodoStorage, defaultTaskId: string = 'default') {
    this.storage = storage || createMemoryStorage();
    this.defaultTaskId = defaultTaskId;
  }

  async execute(
    context: ToolContext,
    params: FocusChainParams
  ): Promise<{ success: boolean; data?: FocusChainResult; error?: string }> {
    try {
      const { action, todos, taskId = this.defaultTaskId, index } = params;

      switch (action) {
        case 'create': {
          // 创建新的 TODO 列表
          if (!todos || todos.length === 0) {
            return {
              success: false,
              error: '创建 TODO 列表时必须提供任务列表',
            };
          }

          // 添加时间戳
          const todosWithTimestamps: TodoItem[] = todos.map((todo) => ({
            ...todo,
            createdAt: todo.createdAt || Date.now(),
            completedAt: todo.completed ? Date.now() : undefined,
          }));

          await this.storage.saveTodos(taskId, todosWithTimestamps);

          const { total, completed, progress } = calculateProgress(todosWithTimestamps);

          return {
            success: true,
            data: {
              todos: todosWithTimestamps,
              total,
              completed,
              progress,
              message: `已创建 ${total} 个任务`,
            },
          };
        }

        case 'update': {
          // 更新现有的 TODO 列表
          if (!todos || todos.length === 0) {
            return {
              success: false,
              error: '更新 TODO 列表时必须提供新的任务列表',
            };
          }

          const existingTodos = await this.storage.loadTodos(taskId);
          if (!existingTodos) {
            return {
              success: false,
              error: `任务 ID "${taskId}" 不存在，请先创建 TODO 列表`,
            };
          }

          // 保留原有的创建时间
          const updatedTodos: TodoItem[] = todos.map((todo, idx) => {
            const existing = existingTodos[idx];
            return {
              ...todo,
              createdAt: existing?.createdAt || Date.now(),
              completedAt:
                todo.completed && !existing?.completed ? Date.now() : existing?.completedAt,
            };
          });

          await this.storage.saveTodos(taskId, updatedTodos);

          const { total, completed, progress } = calculateProgress(updatedTodos);

          return {
            success: true,
            data: {
              todos: updatedTodos,
              total,
              completed,
              progress,
              message: `已更新 TODO 列表 (${completed}/${total})`,
            },
          };
        }

        case 'get': {
          // 获取当前的 TODO 列表
          const existingTodos = await this.storage.loadTodos(taskId);

          if (!existingTodos) {
            return {
              success: true,
              data: {
                todos: [],
                total: 0,
                completed: 0,
                progress: 0,
                message: `任务 ID "${taskId}" 尚未创建 TODO 列表`,
              },
            };
          }

          const { total, completed, progress } = calculateProgress(existingTodos);

          return {
            success: true,
            data: {
              todos: existingTodos,
              total,
              completed,
              progress,
              message: `当前进度: ${completed}/${total} (${progress}%)`,
            },
          };
        }

        case 'complete': {
          // 标记指定任务为完成
          if (index === undefined || index < 0) {
            return {
              success: false,
              error: '必须提供有效的任务索引',
            };
          }

          const existingTodos = await this.storage.loadTodos(taskId);
          if (!existingTodos || existingTodos.length === 0) {
            return {
              success: false,
              error: `任务 ID "${taskId}" 不存在或没有任务`,
            };
          }

          if (index >= existingTodos.length) {
            return {
              success: false,
              error: `索引 ${index} 超出范围 (0-${existingTodos.length - 1})`,
            };
          }

          // 标记为完成
          existingTodos[index].completed = true;
          existingTodos[index].completedAt = Date.now();

          await this.storage.saveTodos(taskId, existingTodos);

          const { total, completed, progress } = calculateProgress(existingTodos);

          return {
            success: true,
            data: {
              todos: existingTodos,
              total,
              completed,
              progress,
              message: `已完成任务: ${existingTodos[index].description}`,
            },
          };
        }

        case 'clear': {
          // 清除 TODO 列表
          await this.storage.deleteTodos(taskId);

          return {
            success: true,
            data: {
              todos: [],
              total: 0,
              completed: 0,
              progress: 0,
              message: `已清除任务 ID "${taskId}" 的 TODO 列表`,
            },
          };
        }

        default:
          return {
            success: false,
            error: `未知的操作类型: ${action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * FOCUS_CHAIN 工具定义
 */
export const focusChainTool: ToolDefinition = {
  name: 'focus_chain',
  displayName: '任务进度管理',
  description:
    '管理和跟踪任务进度。支持创建 TODO 列表、更新任务状态、查询进度等功能。' +
    '\n\n使用场景:' +
    '\n- **create**: 创建新的任务清单' +
    '\n- **update**: 更新现有任务清单（如标记任务完成、添加新任务等）' +
    '\n- **get**: 查询当前任务进度' +
    '\n- **complete**: 标记指定索引的任务为完成' +
    '\n- **clear**: 清除任务清单' +
    '\n\n最佳实践:' +
    '\n- 在任务开始时创建 TODO 列表' +
    '\n- 完成每个任务后更新列表' +
    '\n- 使用 get 操作查询当前进度' +
    '\n- 任务描述应清晰、具体、可衡量',
  category: 'task',
  parameters: [
    {
      name: 'action',
      type: 'string',
      required: true,
      description:
        "操作类型。可选值: 'create' (创建), 'update' (更新), 'get' (查询), 'complete' (标记完成), 'clear' (清除)",
    },
    {
      name: 'todos',
      type: 'array',
      required: false,
      description:
        'TODO 列表（create/update 时必需）。每个任务包含 description (string) 和 completed (boolean) 字段。',
    },
    {
      name: 'taskId',
      type: 'string',
      required: false,
      description: "任务 ID，用于标识不同的任务（可选，默认为 'default'）",
    },
    {
      name: 'index',
      type: 'number',
      required: false,
      description: '任务索引（complete 操作时使用），从 0 开始',
    },
  ],
  permissions: [ToolPermission.READ, ToolPermission.WRITE],
  enabled: true,
  handler: new FocusChainToolHandler(),
};

/**
 * 创建自定义的 FOCUS_CHAIN 工具实例
 *
 * @param storage 任务存储接口
 * @param defaultTaskId 默认任务 ID
 * @returns FOCUS_CHAIN 工具定义
 */
export function createFocusChainTool(
  storage?: TodoStorage,
  defaultTaskId?: string
): ToolDefinition {
  return {
    ...focusChainTool,
    handler: new FocusChainToolHandler(storage, defaultTaskId),
  };
}

/**
 * 辅助函数：从字符串数组创建 TODO 列表
 */
export function createTodoItems(descriptions: string[]): TodoItem[] {
  return descriptions.map((description) => ({
    description,
    completed: false,
    createdAt: Date.now(),
  }));
}

/**
 * 辅助函数：将 TODO 列表转换为字符串数组
 */
export function extractDescriptions(todos: TodoItem[]): string[] {
  return todos.map((t) => t.description);
}

// 默认导出
export default focusChainTool;
