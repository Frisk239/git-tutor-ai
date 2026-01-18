// 工具系统类型定义
import { ToolPermission } from '@git-tutor/shared';

// 重新导出 ToolPermission 以方便使用
export { ToolPermission };

/**
 * 工具定义
 */
export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  permissions: ToolPermission[];
  enabled: boolean;
  experimental?: boolean;
  handler: ToolHandler;
}

/**
 * 工具类别
 */
export type ToolCategory =
  | 'filesystem' // 文件系统操作
  | 'git' // Git 操作
  | 'github' // GitHub API
  | 'ai' // AI 相关
  | 'browser' // 浏览器操作
  | 'terminal' // 终端命令
  | 'search' // 搜索
  | 'mcp' // MCP 协议工具
  | 'planning' // 计划工具
  | 'completion' // 完成工具
  | 'interaction' // 交互工具
  | 'task' // 任务管理工具
  | 'custom'; // 自定义工具

/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  format?: string; // 例如 "file-path", "url", "email"
  items?: ToolParameterItem; // 数组或对象项的定义
}

/**
 * 工具参数项定义（用于数组和对象类型）
 */
export interface ToolParameterItem {
  type?: string;
  properties?: Record<string, any>;
}

/**
 * 工具处理函数签名
 */
export type ToolHandler = (
  context: ToolContext,
  params: Record<string, any>
) => Promise<ToolResult> | ToolResult;

/**
 * 工具执行上下文
 */
export interface ToolContext {
  // 项目信息
  projectId?: string;
  projectPath?: string;

  // Workspace 信息
  workspaceId?: string;
  workspacePath?: string;

  // AI 对话上下文
  conversationId?: string;
  messageId?: string;

  // 用户信息
  userId?: string;

  // 共享服务实例
  services: {
    git?: any; // GitManager
    github?: any; // GitHubClient
    ai?: any; // AIManager
    workspace?: any; // WorkspaceManager
  };

  // 配置
  config?: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 工具注册表
 */
export interface ToolRegistry {
  // 注册工具
  register(tool: ToolDefinition): void;

  // 取消注册
  unregister(toolName: string): void;

  // 获取工具
  get(toolName: string): ToolDefinition | undefined;

  // 获取所有工具
  getAll(): ToolDefinition[];

  // 按类别获取
  getByCategory(category: ToolCategory): ToolDefinition[];

  // 搜索工具
  search(query: string): ToolDefinition[];
}

/**
 * 工具执行器
 */
export interface ToolExecutor {
  // 执行工具
  execute(toolName: string, params: Record<string, any>, context: ToolContext): Promise<ToolResult>;

  // 批量执行
  executeBatch(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
    }>,
    context: ToolContext
  ): Promise<ToolResult[]>;

  // 检查权限
  checkPermission(toolName: string, permissions: ToolPermission[]): boolean;
}

/**
 * MCP 工具定义
 */
export interface MCPToolDefinition extends ToolDefinition {
  mcpServerName: string;
  mcpToolName: string;
}

/**
 * 工具执行状态
 */
export interface ToolExecution {
  id: string;
  toolName: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ToolResult;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}
