/**
 * MCP 类型定义
 * 参考 Cline 项目的 MCP 实现
 */

import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP 传输层类型联合
 */
export type McpTransport =
  | StdioClientTransport
  | SSEClientTransport
  | StreamableHTTPClientTransport;

/**
 * MCP 服务器状态
 */
export enum McpServerStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

/**
 * MCP OAuth 认证状态
 */
export enum McpOAuthStatus {
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
  Pending = 'pending',
}

/**
 * MCP 服务器配置
 */
export interface McpServerConfig {
  /** 服务器唯一名称 */
  name: string;
  /** 传输类型 */
  type: 'stdio' | 'sse' | 'streamableHttp';
  /** 是否禁用 */
  disabled?: boolean;
  /** 自动批准的工具列表 */
  autoApprove?: string[];
  /** 超时时间(秒) */
  timeout?: number;
  /** stdio: 命令 */
  command?: string;
  /** stdio: 参数 */
  args?: string[];
  /** stdio: 工作目录 */
  cwd?: string;
  /** stdio: 环境变量 */
  env?: Record<string, string>;
  /** sse/http: URL */
  url?: string;
  /** sse/http: 请求头 */
  headers?: Record<string, string>;
}

/**
 * MCP 服务器信息
 */
export interface McpServer {
  /** 服务器名称 */
  name: string;
  /** 配置(JSON 字符串) */
  config: string;
  /** 连接状态 */
  status: McpServerStatus;
  /** 错误信息 */
  error?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** OAuth 认证是否需要 */
  oauthRequired?: boolean;
  /** OAuth 认证状态 */
  oauthAuthStatus?: McpOAuthStatus;
  /** 工具列表 */
  tools?: McpTool[];
  /** 资源列表 */
  resources?: McpResource[];
  /** 资源模板列表 */
  resourceTemplates?: McpResourceTemplate[];
  /** 唯一标识符 */
  uid?: string;
}

/**
 * MCP 工具定义
 */
export interface McpTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 输入模式(JSON Schema) */
  inputSchema?: string;
  /** 是否自动批准 */
  autoApprove?: boolean;
}

/**
 * MCP 资源定义
 */
export interface McpResource {
  /** 资源 URI */
  uri: string;
  /** 资源名称 */
  name: string;
  /** 资源描述 */
  description?: string;
  /** 资源类型 */
  mimeType?: string;
}

/**
 * MCP 资源模板
 */
export interface McpResourceTemplate {
  /** 模板 URI */
  uriTemplate: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 模板类型 */
  mimeType?: string;
}

/**
 * MCP 连接
 */
export interface McpConnection {
  /** 服务器信息 */
  server: McpServer;
  /** MCP 客户端 */
  client: Client;
  /** 传输层 */
  transport: McpTransport;
  /** OAuth 提供商(可选) */
  authProvider?: OAuthClientProvider;
}

/**
 * MCP 工具调用结果
 */
export interface McpToolResult {
  /** 内容项 */
  content: Array<{
    /** 内容类型 */
    type: 'text' | 'image' | 'resource';
    /** 文本内容 */
    text?: string;
    /** 图片数据 */
    data?: string;
    /** 资源 */
    resource?: any;
  }>;
  /** 是否错误 */
  isError?: boolean;
  /** 错误信息 */
  _meta?: {
    /** 进度标记 */
    progressToken?: string;
    /** 请求 ID */
    requestId?: string;
  };
}

/**
 * MCP 设置
 */
export interface McpSettings {
  /** MCP 服务器配置映射 */
  mcpServers: Record<string, McpServerConfig>;
}

/**
 * MCP 通知消息
 */
export interface McpNotification {
  /** 服务器名称 */
  serverName: string;
  /** 级别 */
  level: 'debug' | 'info' | 'warning' | 'error';
  /** 消息内容 */
  message: string;
  /** 时间戳 */
  timestamp: number;
}
