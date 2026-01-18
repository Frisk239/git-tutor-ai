// AI 提供商配置
import type { AIProviderConfig } from '@git-tutor/shared';
import { AIProvider, ModelFamily } from '@git-tutor/shared';

/**
 * AI 提供商配置接口
 */
export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiKey: string | undefined;
  baseURL: string | undefined;
  models: string[];
  enabled: boolean;
}

/**
 * AI 请求选项
 */
export interface AIRequestOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
  tools?: any[];
}

/**
 * AI 响应接口
 */
export interface AIResponse {
  content: string;
  role: 'assistant';
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
}

/**
 * 默认的 AI 提供商配置
 * 完整支持 Cline 的所有 AI 提供商
 */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  // ========== 主要提供商 ==========
  {
    id: AIProvider.ANTHROPIC,
    name: 'Anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
    models: [
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    enabled: !!process.env.ANTHROPIC_API_KEY,
  },
  {
    id: AIProvider.OPENAI,
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    enabled: !!process.env.OPENAI_API_KEY,
  },
  {
    id: AIProvider.OPENAI_NATIVE,
    name: 'OpenAI Native (Official)',
    apiKey: process.env.OPENAI_NATIVE_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    models: ['gpt-5.2', 'gpt-5.1', 'o3-mini', 'o1', 'o1-mini', 'gpt-4o', 'gpt-4o-mini'],
    enabled: !!process.env.OPENAI_API_KEY,
  },
  {
    id: AIProvider.GEMINI,
    name: 'Google Gemini',
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.GEMINI_BASE_URL,
    models: [
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash-001',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002',
    ],
    enabled: !!process.env.GEMINI_API_KEY,
  },
  {
    id: AIProvider.VERTEX,
    name: 'Google Vertex AI',
    apiKey: process.env.VERTEX_API_KEY, // 可选，使用 Google Cloud 认证
    baseURL: undefined, // Vertex AI 不使用自定义 baseURL
    models: [
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'claude-3-5-sonnet@20240620',
    ],
    enabled: !!process.env.VERTEX_PROJECT_ID,
  },

  // ========== 云服务商 ==========
  {
    id: AIProvider.BEDROCK,
    name: 'AWS Bedrock',
    apiKey: process.env.AWS_ACCESS_KEY_ID,
    baseURL: process.env.AWS_REGION,
    models: [
      'anthropic.claude-sonnet-4-5-20250929-v1:0',
      'anthropic.claude-opus-4-5-20251101-v1:0',
      'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
    ],
    enabled: !!process.env.AWS_ACCESS_KEY_ID,
  },
  {
    id: AIProvider.AZURE_OPENAI,
    name: 'Azure OpenAI',
    apiKey: process.env.AZURE_API_KEY,
    baseURL: process.env.AZURE_ENDPOINT,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    enabled: !!process.env.AZURE_API_KEY,
  },

  // ========== 聚合平台 ==========
  {
    id: AIProvider.OPENROUTER,
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-4.5',
      'anthropic/claude-4.5-20250929',
      'openai/gpt-4o',
      'google/gemini-2.5-pro',
      'deepseek/deepseek-chat',
    ],
    enabled: !!process.env.OPENROUTER_API_KEY,
  },
  {
    id: AIProvider.LITELLM,
    name: 'LiteLLM',
    apiKey: process.env.LITELLM_API_KEY,
    baseURL: process.env.LITELLM_BASE_URL,
    models: [], // 由用户配置
    enabled: !!process.env.LITELLM_BASE_URL,
  },
  {
    id: AIProvider.OPENAI_COMPATIBLE,
    name: 'OpenAI Compatible (通用)',
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || '', // 可选，有些服务不需要
    baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL,
    models: [], // 由用户配置，支持任何兼容 OpenAI API 格式的模型
    enabled: !!process.env.OPENAI_COMPATIBLE_BASE_URL,
  },

  // ========== 本地模型 ==========
  {
    id: AIProvider.OLLAMA,
    name: 'Ollama',
    apiKey: '', // 本地服务不需要 API key
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    models: ['llama3.3', 'deepseek-coder-v2', 'codellama', 'mistral', 'qwen2.5-coder'],
    enabled: !!process.env.OLLAMA_BASE_URL,
  },
  {
    id: AIProvider.LM_STUDIO,
    name: 'LM Studio',
    apiKey: '',
    baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    models: [], // 动态加载
    enabled: !!process.env.LM_STUDIO_BASE_URL,
  },

  // ========== 专用服务 ==========
  {
    id: AIProvider.REQUESTY,
    name: 'Requesty',
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: 'https://api.requesty.ai/v1',
    models: ['v1'],
    enabled: !!process.env.REQUESTY_API_KEY,
  },
  {
    id: AIProvider.TOGETHER,
    name: 'Together AI',
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: 'https://api.together.xyz/v1',
    models: ['deepseek-ai/DeepSeek-V3', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
    enabled: !!process.env.TOGETHER_API_KEY,
  },
  {
    id: AIProvider.FIREWORKS,
    name: 'Fireworks AI',
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: 'https://api.fireworks.ai/inference/v1',
    models: [
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
    ],
    enabled: !!process.env.FIREWORKS_API_KEY,
  },

  // ========== 中国提供商 ==========
  {
    id: AIProvider.DEEPSEEK,
    name: 'DeepSeek',
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    enabled: !!process.env.DEEPSEEK_API_KEY,
  },
  {
    id: AIProvider.QWEN,
    name: '通义千问 (Qwen)',
    apiKey: process.env.QWEN_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    enabled: !!process.env.QWEN_API_KEY,
  },
  {
    id: AIProvider.QWEN_CODE,
    name: '通义千问代码模型 (Qwen Code)',
    apiKey: process.env.QWEN_CODE_API_KEY,
    baseURL: process.env.QWEN_CODE_BASE_URL,
    models: ['qwen-coder-plus', 'qwen-coder-turbo'],
    enabled: !!process.env.QWEN_CODE_API_KEY,
  },
  {
    id: AIProvider.DOUBAO,
    name: '豆包 (Doubao)',
    apiKey: process.env.DOUBAO_API_KEY,
    baseURL: process.env.DOUBAO_BASE_URL,
    models: ['doubao-pro-256k', 'doubao-pro-32k'],
    enabled: !!process.env.DOUBAO_API_KEY,
  },
  {
    id: AIProvider.MOONSHOT,
    name: 'Moonshot AI (月之暗面)',
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    enabled: !!process.env.MOONSHOT_API_KEY,
  },

  // ========== 其他提供商 ==========
  {
    id: AIProvider.MISTRAL,
    name: 'Mistral AI',
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
    models: ['mistral-large-2411', 'mistral-small-2503', 'codestral-2501'],
    enabled: !!process.env.MISTRAL_API_KEY,
  },
  {
    id: AIProvider.XAI,
    name: 'xAI (Grok)',
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
    models: ['grok-2', 'grok-beta'],
    enabled: !!process.env.XAI_API_KEY,
  },
  {
    id: AIProvider.ASKSAGE,
    name: 'AskSage',
    apiKey: process.env.ASKSAGE_API_KEY,
    baseURL: process.env.ASKSAGE_API_URL,
    models: [],
    enabled: !!process.env.ASKSAGE_API_KEY,
  },
];

/**
 * 模型家族识别器
 * 基于 Cline 的模型分层匹配系统
 */
export class ModelFamilyRecognizer {
  /**
   * 识别模型属于哪个家族
   */
  static recognize(modelId: string): ModelFamily {
    // 精确匹配
    if (modelId.startsWith('claude')) {
      if (modelId.includes('3-5-sonnet') || modelId.includes('3-5-haiku')) {
        return ModelFamily.CLAUDE;
      }
      if (modelId.includes('3-opus')) {
        return ModelFamily.CLADE;
      }
    }

    if (modelId.startsWith('gpt-4')) {
      if (modelId.includes('o1') || modelId.includes('o3')) {
        return ModelFamily.GPT_5;
      }
      return ModelFamily.GPT;
    }

    if (modelId.startsWith('gpt-3.5')) {
      return ModelFamily.GPT;
    }

    if (modelId.startsWith('gemini')) {
      if (modelId.includes('2.0')) {
        return ModelFamily.NEXT_GEN;
      }
      return ModelFamily.GENERIC;
    }

    if (modelId.startsWith('deepseek')) {
      return ModelFamily.GENERIC;
    }

    // 默认返回通用类型
    return ModelFamily.GENERIC;
  }

  /**
   * 检查模型是否支持特定能力
   */
  static supportsCapability(modelId: string, capability: string): boolean {
    const family = this.recognize(modelId);

    // Claude 3.5+ 支持所有能力
    if (family === ModelFamily.CLAUDE && modelId.includes('3-5')) {
      return true;
    }

    // GPT-4O+ 支持所有能力
    if (family === ModelFamily.GPT && modelId.includes('gpt-4o')) {
      return true;
    }

    // Gemini 2.0+ 支持所有能力
    if (family === ModelFamily.NEXT_GEN) {
      return true;
    }

    return false;
  }

  /**
   * 获取模型默认提示词变体
   */
  static getPromptVariant(modelId: string): string {
    const family = this.recognize(modelId);

    switch (family) {
      case ModelFamily.CLAUDE:
        return 'claude';
      case ModelFamily.GPT:
      case ModelFamily.GPT_5:
        return 'gpt';
      case ModelFamily.NEXT_GEN:
        return 'next-gen';
      default:
        return 'generic';
    }
  }
}
