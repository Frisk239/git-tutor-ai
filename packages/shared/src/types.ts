import { AIProvider, ProjectType, McpTransport } from "./enums.js";

// ============= AI 提供商配置 =============
export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  apiKey?: string;
  baseURL?: string;
  models: string[];
}

// ============= 模型信息 =============
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsReasoning?: boolean;
}

// ============= 项目配置 =============
export interface ProjectConfig {
  id: string;
  name: string;
  description?: string;
  path: string;
  type: ProjectType;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Git 配置 =============
export interface GitConfig {
  userName?: string;
  userEmail?: string;
  defaultBranch?: string;
}

// ============= GitHub 配置 =============
export interface GitHubConfig {
  token?: string;
  username?: string;
  organization?: string;
}

// ============= MCP 配置 =============
export interface McpServerConfig {
  name: string;
  transport: McpTransport;
  command?: string;
  url?: string;
  args?: string[];
  enabled: boolean;
}

// ============= 应用配置 =============
export interface AppConfig {
  ai: {
    defaultProvider: AIProvider;
    defaultModel: string;
    providers: AIProviderConfig[];
  };
  git: GitConfig;
  github: GitHubConfig;
  mcp: {
    servers: McpServerConfig[];
  };
}
