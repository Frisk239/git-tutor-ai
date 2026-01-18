/**
 * FOCUS_CHAIN 工具 - 任务进度清单管理
 *
 * 基于 Cline 的 Focus Chain (TODO) 实现
 * 允许 AI 创建和管理任务进度清单,跟踪子任务完成状态
 *
 * 与 Cline 的差异:
 * - Cline: 集成在所有工具中,通过 task_progress 参数
 * - Git Tutor AI: 独立工具,可选择性集成到其他工具
 */

import type { ToolDefinition, ToolContext, ToolResult } from "../../types.js";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 任务进度项
 */
export interface TaskProgressItem {
  /** 任务标题 */
  title: string;
  /** 是否已完成 */
  completed: boolean;
  /** 额外信息(可选) */
  info?: string;
  /** 子任务(可选) */
  subtasks?: TaskProgressItem[];
}

/**
 * 聚焦链状态
 */
export interface FocusChainState {
  /** 任务ID */
  taskId: string;
  /** 对话ID */
  conversationId: string;
  /** 任务进度列表 */
  items: TaskProgressItem[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 创建聚焦链参数
 */
export interface CreateFocusChainParams {
  /** 任务进度项 */
  items: TaskProgressItem[];
  /** 任务ID(可选,默认自动生成) */
  taskId?: string | undefined;
}

/**
 * 更新聚焦链参数
 */
export interface UpdateFocusChainParams {
  /** 任务ID */
  taskId: string;
  /** 要更新的项索引 */
  index: number;
  /** 新的完成状态 */
  completed: boolean;
}

/**
 * 添加进度项参数
 */
export interface AddProgressItemParams {
  /** 任务ID */
  taskId: string;
  /** 要添加的进度项 */
  item: TaskProgressItem;
  /** 父项索引(如果添加子任务) */
  parentIndex?: number | undefined;
}

/**
 * 聚焦链结果
 */
export interface FocusChainResult {
  /** 任务ID */
  taskId: string;
  /** 操作类型 */
  action: "created" | "updated" | "added" | "deleted";
  /** 当前进度项 */
  items: TaskProgressItem[];
  /** Markdown 格式的清单 */
  markdown: string;
  /** 完成百分比 */
  progress: number;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成任务ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 计算完成百分比
 * 只计算叶子节点(没有子任务的任务)的进度
 */
function calculateProgress(items: TaskProgressItem[]): number {
  if (items.length === 0) return 0;

  let total = 0;
  let completed = 0;

  function countItems(itemList: TaskProgressItem[]) {
    for (const item of itemList) {
      // 如果有子任务,递归计算子任务,父任务本身不计入
      if (item.subtasks && item.subtasks.length > 0) {
        countItems(item.subtasks);
      } else {
        // 叶子节点才计入进度
        total++;
        if (item.completed) {
          completed++;
        }
      }
    }
  }

  countItems(items);
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * 转换为 Markdown 格式
 */
function toMarkdown(items: TaskProgressItem[]): string {
  const lines: string[] = [];

  function renderItems(itemList: TaskProgressItem[], level: number = 0) {
    const indent = "  ".repeat(level);

    for (const item of itemList) {
      const checkbox = item.completed ? "- [x]" : "- [ ]";
      const info = item.info ? ` (${item.info})` : "";
      lines.push(`${indent}${checkbox} ${item.title}${info}`);

      if (item.subtasks && item.subtasks.length > 0) {
        renderItems(item.subtasks, level + 1);
      }
    }
  }

  renderItems(items);
  return lines.join("\n");
}

/**
 * 解析 Markdown 格式的清单
 */
function parseMarkdown(markdown: string): TaskProgressItem[] {
  const items: TaskProgressItem[] = [];
  const lines = markdown.split("\n");
  const stack: TaskProgressItem[][] = [items];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 计算缩进级别
    const indentLevel = (line.match(/^\s*/)?.[0]?.length || 0) / 2;
    const match = trimmed.match(/^-\s*\[([ x])\]\s*(.+)$/);

    if (match) {
      const completed = match[1] === "x";
      const title = match[2].trim();
      const infoMatch = title.match(/^(.+?)\s+\(([^)]+)\)$/);
      const finalTitle = infoMatch ? infoMatch[1] : title;
      const info = infoMatch ? infoMatch[2] : undefined;

      const item: TaskProgressItem = {
        title: finalTitle,
        completed,
        info,
      };

      // 调整栈以处理缩进
      while (stack.length > indentLevel + 1) {
        stack.pop();
      }

      const currentList = stack[stack.length - 1];
      if (currentList) {
        currentList.push(item);

        // 如果不是最顶层,作为子任务添加
        if (stack.length > 1) {
          const parent = stack[stack.length - 2][stack[stack.length - 2].length - 1];
          if (parent && !parent.subtasks) {
            parent.subtasks = [];
          }
          if (parent && parent.subtasks) {
            parent.subtasks.push(item);
            // 从当前列表移除,避免重复
            currentList.pop();
          }
        } else {
          // 为子任务创建新层级
          stack.push([]);
        }
      }
    }
  }

  return items;
}

/**
 * 验证任务进度项
 */
function validateTaskProgressItem(item: any): boolean {
  if (!item || typeof item !== "object") {
    return false;
  }

  if (typeof item.title !== "string" || item.title.trim().length === 0) {
    return false;
  }

  if (typeof item.completed !== "boolean") {
    return false;
  }

  if (item.subtasks && Array.isArray(item.subtasks)) {
    return item.subtasks.every((subtask) => validateTaskProgressItem(subtask));
  }

  return true;
}

// ============================================================================
// 状态管理器
// ============================================================================

/**
 * 聚焦链管理器
 * 使用内存存储(可扩展为文件存储)
 */
class FocusChainManager {
  /** 存储所有聚焦链状态 */
  private chains: Map<string, FocusChainState> = new Map();

  /**
   * 创建聚焦链
   */
  create(params: CreateFocusChainParams, conversationId: string): FocusChainResult {
    const taskId = params.taskId || generateTaskId();
    const now = new Date().toISOString();

    // 验证所有项
    if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
      throw new Error("任务进度项不能为空");
    }

    const validItems = params.items.filter(validateTaskProgressItem);
    if (validItems.length === 0) {
      throw new Error("没有有效的任务进度项");
    }

    const state: FocusChainState = {
      taskId,
      conversationId,
      items: validItems,
      createdAt: now,
      updatedAt: now,
    };

    this.chains.set(taskId, state);

    return this.buildResult(taskId, "created", state);
  }

  /**
   * 更新聚焦链项
   */
  update(params: UpdateFocusChainParams): FocusChainResult {
    const state = this.chains.get(params.taskId);
    if (!state) {
      throw new Error(`任务 ${params.taskId} 不存在`);
    }

    function updateItem(items: TaskProgressItem[], index: number, completed: boolean): boolean {
      if (index < 0 || index >= items.length) {
        return false;
      }

      items[index].completed = completed;
      return true;
    }

    if (!updateItem(state.items, params.index, params.completed)) {
      throw new Error(`索引 ${params.index} 无效`);
    }

    state.updatedAt = new Date().toISOString();

    return this.buildResult(params.taskId, "updated", state);
  }

  /**
   * 添加进度项
   */
  add(params: AddProgressItemParams): FocusChainResult {
    const state = this.chains.get(params.taskId);
    if (!state) {
      throw new Error(`任务 ${params.taskId} 不存在`);
    }

    if (!validateTaskProgressItem(params.item)) {
      throw new Error("无效的任务进度项");
    }

    if (params.parentIndex !== undefined) {
      // 添加为子任务
      if (
        params.parentIndex < 0 ||
        params.parentIndex >= state.items.length
      ) {
        throw new Error(`父索引 ${params.parentIndex} 无效`);
      }

      const parent = state.items[params.parentIndex];
      if (!parent.subtasks) {
        parent.subtasks = [];
      }
      parent.subtasks.push(params.item);
    } else {
      // 添加为顶级项
      state.items.push(params.item);
    }

    state.updatedAt = new Date().toISOString();

    return this.buildResult(params.taskId, "added", state);
  }

  /**
   * 获取聚焦链
   */
  get(taskId: string): FocusChainResult | null {
    const state = this.chains.get(taskId);
    if (!state) {
      return null;
    }

    return this.buildResult(taskId, "updated", state);
  }

  /**
   * 删除聚焦链
   */
  delete(taskId: string): boolean {
    return this.chains.delete(taskId);
  }

  /**
   * 列出所有聚焦链
   */
  list(conversationId?: string): FocusChainState[] {
    const all = Array.from(this.chains.values());

    if (conversationId) {
      return all.filter((state) => state.conversationId === conversationId);
    }

    return all;
  }

  /**
   * 从 Markdown 创建
   */
  fromMarkdown(markdown: string, conversationId: string, taskId?: string): FocusChainResult {
    const items = parseMarkdown(markdown);

    if (items.length === 0) {
      throw new Error("无法解析 Markdown 清单");
    }

    return this.create({ taskId, items }, conversationId);
  }

  /**
   * 构建结果对象
   */
  private buildResult(taskId: string, action: FocusChainResult["action"], state: FocusChainState): FocusChainResult {
    return {
      taskId,
      action,
      items: state.items,
      markdown: toMarkdown(state.items),
      progress: calculateProgress(state.items),
    };
  }
}

// ============================================================================
// 工具处理器
// ============================================================================

/**
 * 全局聚焦链管理器实例
 */
const globalFocusChainManager = new FocusChainManager();

/**
 * Focus Chain 工具处理器
 */
async function focusChainHandler(
  context: ToolContext,
  params: Record<string, any>
): Promise<ToolResult> {
  try {
    const action = params.action;

    switch (action) {
      case "create":
        return handleCreate(context, params);
      case "update":
        return handleUpdate(params);
      case "add":
        return handleAdd(params);
      case "get":
        return handleGet(params);
      case "delete":
        return handleDelete(params);
      case "list":
        return handleList(context, params);
      case "from_markdown":
        return handleFromMarkdown(context, params);
      default:
        return {
          success: false,
          error: `未知的操作: ${action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 处理创建操作
 */
function handleCreate(context: ToolContext, params: Record<string, any>): ToolResult {
  const { items, taskId } = params as CreateFocusChainParams;

  const result = globalFocusChainManager.create(
    { items, taskId },
    context.conversationId || "default"
  );

  return {
    success: true,
    data: result,
  };
}

/**
 * 处理更新操作
 */
function handleUpdate(params: Record<string, any>): ToolResult {
  const { taskId, index, completed } = params as UpdateFocusChainParams;

  const result = globalFocusChainManager.update({ taskId, index, completed });

  return {
    success: true,
    data: result,
  };
}

/**
 * 处理添加操作
 */
function handleAdd(params: Record<string, any>): ToolResult {
  const { taskId, item, parentIndex } = params as AddProgressItemParams;

  const result = globalFocusChainManager.add({ taskId, item, parentIndex });

  return {
    success: true,
    data: result,
  };
}

/**
 * 处理获取操作
 */
function handleGet(params: Record<string, any>): ToolResult {
  const { taskId } = params;

  const result = globalFocusChainManager.get(taskId);

  if (!result) {
    return {
      success: false,
      error: `任务 ${taskId} 不存在`,
    };
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * 处理删除操作
 */
function handleDelete(params: Record<string, any>): ToolResult {
  const { taskId } = params;

  const deleted = globalFocusChainManager.delete(taskId);

  if (!deleted) {
    return {
      success: false,
      error: `任务 ${taskId} 不存在`,
    };
  }

  return {
    success: true,
    data: {
      taskId,
      message: "任务已删除",
    },
  };
}

/**
 * 处理列表操作
 */
function handleList(context: ToolContext, _params: Record<string, any>): ToolResult {
  const chains = globalFocusChainManager.list(context.conversationId);

  return {
    success: true,
    data: {
      chains,
      count: chains.length,
    },
  };
}

/**
 * 处理从 Markdown 创建操作
 */
function handleFromMarkdown(context: ToolContext, params: Record<string, any>): ToolResult {
  const { markdown, taskId } = params;

  const result = globalFocusChainManager.fromMarkdown(
    markdown,
    context.conversationId || "default",
    taskId
  );

  return {
    success: true,
    data: result,
  };
}

// ============================================================================
// 工具定义
// ============================================================================

const focusChainTool: ToolDefinition = {
  name: "focus_chain",
  displayName: "聚焦链",
  description:
    "管理任务进度清单(聚焦链)。允许创建、更新和跟踪子任务完成状态。支持嵌套子任务、Markdown 格式导入导出,以及进度百分比计算。适用于需要多步骤完成的复杂任务。" +
    "\n\n**使用场景**:" +
    "\n1. **任务分解**: 将大任务分解为可追踪的子任务" +
    "\n2. **进度可视化**: 实时显示任务完成进度" +
    "\n3. **状态同步**: 保持 AI、前端和文件系统之间的状态同步" +
    "\n4. **提醒机制**: 基于消息间隔、模式切换等触发提醒" +
    "\n\n**Markdown 格式**:" +
    "\n```" +
    "\n- [ ] 未完成任务" +
    "\n- [x] 已完成任务" +
    "\n- [ ] 带信息的任务 (额外信息)" +
    "\n  - [ ] 子任务 1" +
    "\n  - [x] 子任务 2" +
    "\n```",
  category: "task",
  parameters: [
    {
      name: "action",
      type: "string",
      description:
        "要执行的操作。可用选项: 'create'(创建), 'update'(更新完成状态), 'add'(添加新项), 'get'(获取), 'delete'(删除), 'list'(列出所有), 'from_markdown'(从 Markdown 创建)",
      required: true,
      enum: ["create", "update", "add", "get", "delete", "list", "from_markdown"],
    },
    {
      name: "taskId",
      type: "string",
      description: "任务ID(创建时可选,其他操作必需)",
      required: false,
    },
    {
      name: "items",
      type: "array",
      description: "任务进度项数组(action='create' 时必需)",
      required: false,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "任务标题" },
          completed: { type: "boolean", description: "是否已完成" },
          info: { type: "string", description: "额外信息" },
          subtasks: {
            type: "array",
            description: "子任务列表",
          },
        },
      },
    },
    {
      name: "index",
      type: "number",
      description: "要更新的项索引(action='update' 时必需)",
      required: false,
    },
    {
      name: "completed",
      type: "boolean",
      description: "新的完成状态(action='update' 时必需)",
      required: false,
    },
    {
      name: "item",
      type: "object",
      description: "要添加的进度项(action='add' 时必需)",
      required: false,
    },
    {
      name: "parentIndex",
      type: "number",
      description: "父项索引,如果添加子任务(action='add' 时可选)",
      required: false,
    },
    {
      name: "markdown",
      type: "string",
      description: "Markdown 格式的清单(action='from_markdown' 时必需)",
      required: false,
    },
  ],
  permissions: [],
  enabled: true,
  handler: focusChainHandler,
};

// ============================================================================
// 导出
// ============================================================================

export { focusChainTool };
export type {
  TaskProgressItem,
  FocusChainState,
  CreateFocusChainParams,
  UpdateFocusChainParams,
  AddProgressItemParams,
  FocusChainResult,
};
export { FocusChainManager };

// 默认导出
export default focusChainTool;
