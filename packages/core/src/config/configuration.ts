// 配置管理系统实现
// 使用 Zod 进行配置验证,基于 Cline 的配置管理

import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 环境变量验证 Schema
 */
const EnvSchema = z.object({
  // Node 环境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI 提供商配置 - Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),

  // AI 提供商配置 - OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_ORGANIZATION_ID: z.string().optional(),

  // AI 提供商配置 - OpenAI Native
  OPENAI_NATIVE_API_KEY: z.string().optional(),
  OPENAI_NATIVE_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Gemini
  GEMINI_API_KEY: z.string().optional(),

  // AI 提供商配置 - Vertex AI
  VERTEX_PROJECT_ID: z.string().optional(),
  VERTEX_CLIENT_EMAIL: z.string().optional(),
  VERTEX_PRIVATE_KEY: z.string().optional(),
  VERTEX_API_KEY: z.string().optional(),

  // AI 提供商配置 - AWS Bedrock
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BEDROCK_REGION: z.string().optional(),

  // AI 提供商配置 - Azure OpenAI
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().optional(),

  // AI 提供商配置 - OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().optional(),

  // AI 提供商配置 - LiteLLM
  LITELLM_API_KEY: z.string().optional(),
  LITELLM_BASE_URL: z.string().optional(),

  // AI 提供商配置 - OpenAI Compatible
  OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Ollama
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),

  // AI 提供商配置 - LM Studio
  LM_STUDIO_BASE_URL: z.string().optional(),
  LM_STUDIO_MODEL: z.string().optional(),

  // AI 提供商配置 - DeepSeek
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Qwen
  QWEN_API_KEY: z.string().optional(),
  QWEN_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Qwen Code
  QWEN_CODE_API_KEY: z.string().optional(),
  QWEN_CODE_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Doubao
  DOUBAO_API_KEY: z.string().optional(),
  DOUBAO_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Moonshot
  MOONSHOT_API_KEY: z.string().optional(),
  MOONSHOT_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Mistral
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_BASE_URL: z.string().optional(),

  // AI 提供商配置 - xAI
  XAI_API_KEY: z.string().optional(),
  XAI_BASE_URL: z.string().optional(),

  // AI 提供商配置 - AskSage
  ASKSAGE_API_KEY: z.string().optional(),
  ASKSAGE_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Requesty
  REQUESTY_API_KEY: z.string().optional(),
  REQUESTY_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Together
  TOGETHER_API_KEY: z.string().optional(),
  TOGETHER_BASE_URL: z.string().optional(),

  // AI 提供商配置 - Fireworks
  FIREWORKS_API_KEY: z.string().optional(),
  FIREWORKS_BASE_URL: z.string().optional(),

  // GitHub 配置
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_URL: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // 数据库配置
  DATABASE_URL: z.string().optional(),
  DATABASE_POOL_SIZE: z.coerce.number().optional().default(10),

  // Redis 配置 (用于缓存和会话)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().optional().default(0),

  // 服务器配置
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // API 配置
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),

  // CORS 配置
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // 缓存配置
  CACHE_TTL: z.coerce.number().default(300000), // 5 分钟
  ENABLE_CACHE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // 日志配置
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),

  // 安全配置
  JWT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),

  // 限流配置
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000), // 1 分钟

  // 文件上传配置
  MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // MCP 配置
  MCP_SERVERS_PATH: z.string().default('./mcp-servers'),
  MCP_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // 功能开关
  ENABLE_WEBSOCKET: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_ANALYTICS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

/**
 * 环境变量类型
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * 配置文件 Schema
 */
const ConfigFileSchema = z.object({
  // AI 提供商默认配置
  ai: z
    .object({
      defaultProvider: z.string().optional(),
      defaultModel: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().positive().optional(),
      streamResponse: z.boolean().optional(),
    })
    .optional(),

  // Git 配置
  git: z
    .object({
      defaultBranch: z.string().optional(),
      commitMessageStyle: z.enum(['conventional', 'simple', 'detailed']).optional(),
      commitMessageLanguage: z.enum(['zh-CN', 'en-US']).optional(),
      autoPush: z.boolean().optional(),
    })
    .optional(),

  // GitHub 配置
  github: z
    .object({
      defaultOwner: z.string().optional(),
      defaultRepo: z.string().optional(),
      autoCreatePRs: z.boolean().optional(),
      aiReviewEnabled: z.boolean().optional(),
      aiReviewThreshold: z.number().min(1).max(10).optional(),
    })
    .optional(),

  // 缓存配置
  cache: z
    .object({
      modelInfoTTL: z.number().positive().optional(),
      providerCacheTTL: z.number().positive().optional(),
      responseCacheTTL: z.number().positive().optional(),
      enableMultiLevel: z.boolean().optional(),
    })
    .optional(),

  // 日志配置
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      format: z.enum(['json', 'text']).optional(),
      file: z.string().optional(),
      maxFiles: z.number().positive().optional(),
    })
    .optional(),

  // 工具配置
  tools: z
    .object({
      enabledCategories: z.array(z.string()).optional(),
      disabledTools: z.array(z.string()).optional(),
      requirePermission: z.boolean().optional(),
    })
    .optional(),

  // 上下文配置
  context: z
    .object({
      maxTokens: z.number().positive().optional(),
      compressionThreshold: z.number().min(0).max(1).optional(),
      retainSystemMessages: z.boolean().optional(),
      retainLatestMessages: z.number().positive().optional(),
    })
    .optional(),

  // 安全配置
  security: z
    .object({
      enableAuth: z.boolean().optional(),
      enableRateLimit: z.boolean().optional(),
      enableCORS: z.boolean().optional(),
      allowedOrigins: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * 配置文件类型
 */
export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/**
 * 配置管理器
 */
export class ConfigurationManager {
  private env: Env;
  private configFile: ConfigFile;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.findConfigFile();
    this.load();
  }

  /**
   * 加载配置
   */
  private load(): void {
    // 1. 加载并验证环境变量
    try {
      this.env = EnvSchema.parse(process.env);
    } catch (error: any) {
      throw new Error(
        `环境变量验证失败:\n${error.errors
          .map((e: any) => `  - ${e.path.join('.')}: ${e.message}`)
          .join('\n')}`
      );
    }

    // 2. 加载并验证配置文件
    this.configFile = this.loadConfigFile();

    // 3. 验证必需的配置
    this.validateRequiredConfig();
  }

  /**
   * 查找配置文件
   */
  private findConfigFile(): string {
    const possiblePaths = [
      join(process.cwd(), 'config.json'),
      join(process.cwd(), 'config', 'config.json'),
      join(process.cwd(), '.config', 'git-tutor', 'config.json'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // 默认路径
    return join(process.cwd(), 'config.json');
  }

  /**
   * 加载配置文件
   */
  private loadConfigFile(): ConfigFile {
    if (!existsSync(this.configPath)) {
      return {};
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const json = JSON.parse(content);
      return ConfigFileSchema.parse(json);
    } catch (error: any) {
      console.warn(`配置文件加载失败,使用默认配置: ${error.message}`);
      return {};
    }
  }

  /**
   * 验证必需的配置
   */
  private validateRequiredConfig(): void {
    const errors: string[] = [];

    // 检查是否至少配置了一个 AI 提供商
    const hasAIProvider =
      this.env.ANTHROPIC_API_KEY ||
      this.env.OPENAI_API_KEY ||
      this.env.GEMINI_API_KEY ||
      this.env.DEEPSEEK_API_KEY ||
      this.env.QWEN_API_KEY ||
      this.env.OLLAMA_BASE_URL ||
      this.env.LM_STUDIO_BASE_URL;

    if (!hasAIProvider) {
      errors.push(
        '至少需要配置一个 AI 提供商的 API Key (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, QWEN_API_KEY, OLLAMA_BASE_URL, LM_STUDIO_BASE_URL 等)'
      );
    }

    // 生产环境必需的配置
    if (this.env.NODE_ENV === 'production') {
      if (!this.env.DATABASE_URL) {
        errors.push('生产环境必须配置 DATABASE_URL');
      }

      if (!this.env.JWT_SECRET && !this.env.SESSION_SECRET) {
        errors.push('生产环境必须配置 JWT_SECRET 或 SESSION_SECRET');
      }
    }

    if (errors.length > 0) {
      throw new Error(`配置错误:\n${errors.join('\n')}`);
    }
  }

  /**
   * 获取环境变量
   */
  getEnv(): Env {
    return this.env;
  }

  /**
   * 获取单个环境变量
   */
  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  /**
   * 获取配置文件
   */
  getConfig(): ConfigFile {
    return this.configFile;
  }

  /**
   * 获取嵌套配置值
   */
  get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.configFile;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * 检查是否是开发环境
   */
  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  /**
   * 检查是否是生产环境
   */
  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  /**
   * 检查是否是测试环境
   */
  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  /**
   * 获取服务器配置
   */
  getServerConfig() {
    return {
      port: this.env.PORT,
      host: this.env.HOST,
      apiPrefix: this.env.API_PREFIX,
      apiVersion: this.env.API_VERSION,
      cors: {
        origin: this.env.CORS_ORIGIN,
        credentials: this.env.CORS_CREDENTIALS,
      },
    };
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    return {
      url: this.env.DATABASE_URL,
      poolSize: this.env.DATABASE_POOL_SIZE,
    };
  }

  /**
   * 获取 Redis 配置
   */
  getRedisConfig() {
    return {
      url: this.env.REDIS_URL,
      password: this.env.REDIS_PASSWORD,
      db: this.env.REDIS_DB,
    };
  }

  /**
   * 获取 AI 提供商配置
   */
  getAIConfig() {
    return {
      ...this.configFile.ai,
      providers: {
        anthropic: {
          apiKey: this.env.ANTHROPIC_API_KEY,
          baseURL: this.env.ANTHROPIC_BASE_URL,
        },
        openai: {
          apiKey: this.env.OPENAI_API_KEY,
          baseURL: this.env.OPENAI_BASE_URL,
          organizationId: this.env.OPENAI_ORGANIZATION_ID,
        },
        gemini: {
          apiKey: this.env.GEMINI_API_KEY,
        },
        deepseek: {
          apiKey: this.env.DEEPSEEK_API_KEY,
          baseURL: this.env.DEEPSEEK_BASE_URL,
        },
        ollama: {
          baseURL: this.env.OLLAMA_BASE_URL,
          model: this.env.OLLAMA_MODEL,
        },
        lmStudio: {
          baseURL: this.env.LM_STUDIO_BASE_URL,
          model: this.env.LM_STUDIO_MODEL,
        },
        // ... 其他提供商
      },
    };
  }

  /**
   * 获取 GitHub 配置
   */
  getGitHubConfig() {
    return {
      token: this.env.GITHUB_TOKEN,
      apiUrl: this.env.GITHUB_API_URL,
      webhookSecret: this.env.GITHUB_WEBHOOK_SECRET,
      ...this.configFile.github,
    };
  }

  /**
   * 获取缓存配置
   */
  getCacheConfig() {
    return {
      ttl: this.env.CACHE_TTL,
      enabled: this.env.ENABLE_CACHE,
      ...this.configFile.cache,
    };
  }

  /**
   * 获取日志配置
   */
  getLoggingConfig() {
    return {
      level: this.env.LOG_LEVEL,
      format: this.env.LOG_FORMAT,
      ...this.configFile.logging,
    };
  }

  /**
   * 获取安全配置
   */
  getSecurityConfig() {
    return {
      jwtSecret: this.env.JWT_SECRET,
      sessionSecret: this.env.SESSION_SECRET,
      encryptionKey: this.env.ENCRYPTION_KEY,
      enableAuth: this.configFile.security?.enableAuth ?? true,
      enableRateLimit: this.configFile.security?.enableRateLimit ?? true,
      enableCORS: this.configFile.security?.enableCORS ?? true,
      allowedOrigins: this.configFile.security?.allowedOrigins,
    };
  }

  /**
   * 获取限流配置
   */
  getRateLimitConfig() {
    return {
      max: this.env.RATE_LIMIT_MAX,
      window: this.env.RATE_LIMIT_WINDOW,
    };
  }

  /**
   * 获取文件上传配置
   */
  getFileUploadConfig() {
    return {
      maxFileSize: this.env.MAX_FILE_SIZE,
      uploadDir: this.env.UPLOAD_DIR,
    };
  }

  /**
   * 获取 MCP 配置
   */
  getMCPConfig() {
    return {
      serversPath: this.env.MCP_SERVERS_PATH,
      enabled: this.env.MCP_ENABLED,
    };
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.load();
  }

  /**
   * 验证配置
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.validateRequiredConfig();
    } catch (error: any) {
      errors.push(...error.message.split('\n'));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 全局配置实例
 */
export const config = new ConfigurationManager();

/**
 * 便捷函数: 获取环境变量
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return config.get(key);
}

/**
 * 便捷函数: 获取配置值
 */
export function getConfig<T = any>(path: string): T | undefined {
  return config.get<T>(path);
}

/**
 * 便捷函数: 检查环境
 */
export const isDevelopment = () => config.isDevelopment();
export const isProduction = () => config.isProduction();
export const isTest = () => config.isTest();
