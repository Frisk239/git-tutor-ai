/**
 * 上下文类型定义
 */

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  /** 工作区目录 */
  workspacePath?: string;
  /** 任务 ID */
  taskId?: string;
  /** 额外上下文数据 */
  metadata?: Record<string, any>;
}

/**
 * 上下文更新
 */
export interface ContextUpdate {
  /** 更新类型 */
  type: 'add' | 'remove' | 'modify';
  /** 更新的内容 */
  content: string;
  /** 元数据 */
  metadata?: string[];
}

/**
 * 消息上下文
 */
export interface MessageContext {
  /** 消息 ID */
  id: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 上下文更新 */
  contextUpdates?: Map<number, ContextUpdate[]>;
}
