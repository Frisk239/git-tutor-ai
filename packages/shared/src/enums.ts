// ============= 模型家族枚举 =============
export enum ModelFamily {
  CLAUDE = 'claude',
  GPT = 'gpt',
  GPT_5 = 'gpt-5',
  NATIVE_GPT_5 = 'gpt-5-native',
  NATIVE_GPT_5_1 = 'gpt-5-1-native',
  GEMINI = 'gemini',
  GEMINI_3 = 'gemini3',
  QWEN = 'qwen',
  GLM = 'glm',
  HERMES = 'hermes',
  DEVSTRAL = 'devstral',
  NEXT_GEN = 'next-gen',
  GENERIC = 'generic',
  XS = 'xs',
  NATIVE_NEXT_GEN = 'native-next-gen',
}

// ============= AI 提供商枚举 =============
// 完整支持主流 AI 提供商
export enum AIProvider {
  // 主要提供商
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OPENAI_NATIVE = 'openai-native', // OpenAI 官方 API (支持 o1/o3 系列)
  GEMINI = 'gemini',
  VERTEX = 'vertex', // Google Vertex AI (Gemini 合作模型)

  // 云服务商
  BEDROCK = 'bedrock', // AWS Bedrock
  AZURE_OPENAI = 'azure-openai', // Microsoft Azure OpenAI

  // 聚合平台
  OPENROUTER = 'openrouter', // OpenRouter
  LITELLM = 'litellm', // LiteLLM
  OPENAI_COMPATIBLE = 'openai-compatible', // 通用 OpenAI 兼容 API

  // 本地模型
  OLLAMA = 'ollama',
  LM_STUDIO = 'lmstudio',

  // 专用服务
  REQUESTY = 'requesty',
  TOGETHER = 'together',
  FIREWORKS = 'fireworks',

  // 中国提供商
  DEEPSEEK = 'deepseek',
  QWEN = 'qwen', // 通义千问
  QWEN_CODE = 'qwen-code', // 通义千问代码模型
  DOUBAO = 'doubao', // 豆包
  MOONSHOT = 'moonshot', // Moonshot AI (月之暗面)

  // 其他
  MISTRAL = 'mistral',
  XAI = 'xai', // xAI (Grok)
  ASKSAGE = 'asksage',
}

// ============= 项目类型枚举 =============
export enum ProjectType {
  LOCAL = 'local',
  GIT = 'git',
  GITHUB = 'github',
}

// ============= 分析类型枚举 =============
export enum AnalysisType {
  STRUCTURE = 'structure',
  DEPENDENCY = 'dependency',
  COMPLEXITY = 'complexity',
  SECURITY = 'security',
  CUSTOM = 'custom',
}

// ============= 消息角色枚举 =============
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// ============= MCP 传输类型 =============
export enum McpTransport {
  STDIO = 'stdio',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
}

// ============= 工具权限类型 =============
export enum ToolPermission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
}

// ============= Git 操作类型 =============
export enum GitOperation {
  CLONE = 'clone',
  PULL = 'pull',
  PUSH = 'push',
  COMMIT = 'commit',
  BRANCH = 'branch',
  MERGE = 'merge',
  REBASE = 'rebase',
  CHECKOUT = 'checkout',
  FETCH = 'fetch',
  STATUS = 'status',
  DIFF = 'diff',
  LOG = 'log',
}

// ============= 任务状态枚举 =============
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============= 优先级枚举 =============
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
