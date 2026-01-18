# @git-tutor/core

核心业务逻辑包，包含 AI 提供商管理、Git 操作、GitHub 集成和工具系统。

## 🚀 功能特性

### AI 提供商支持

完整支持 **20+ AI 提供商**，覆盖主流商业模型、开源模型和本地模型：

#### 主要提供商

- **Anthropic Claude**: Claude Sonnet 4.5, Opus 4.5, Haiku 4.5 等
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4 Turbo 等
- **OpenAI Native**: GPT-5.2, GPT-5.1, o3-mini, o1 等 (官方 API)
- **Google Gemini**: Gemini 3 Pro/Flash, Gemini 2.5 Pro/Flash 等
- **Google Vertex AI**: Gemini 合作模型

#### 云服务商

- **AWS Bedrock**: Claude, Mistral 等模型
- **Azure OpenAI**: GPT-4o, GPT-4 Turbo 等

#### 聚合平台

- **OpenRouter**: 统一访问 200+ 模型
- **LiteLLM**: 多提供商统一接口
- **OpenAI Compatible**: 通用 OpenAI 兼容 API（支持 vLLM, LocalAI, Text Generation WebUI 等所有兼容服务）

#### 本地模型

- **Ollama**: Llama 3.3, DeepSeek Coder, Code Llama 等
- **LM Studio**: 动态加载本地模型

#### 专用服务

- **Requesty**, **Together AI**, **Fireworks AI**

#### 中国提供商

- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **通义千问 (Qwen)**: qwen-max, qwen-plus, qwen-turbo
- **通义千问代码**: qwen-coder-plus, qwen-coder-turbo
- **豆包 (Doubao)**: doubao-pro-256k, doubao-pro-32k
- **Moonshot AI**: moonshot-v1-128k, moonshot-v1-32k

#### 其他

- **Mistral AI**: mistral-large, mistral-small, codestral
- **xAI (Grok)**: grok-2, grok-beta
- **AskSage**

## 📦 使用方法

### AI 管理器

```typescript
import { aiManager, AIProvider } from "@git-tutor/core";

// 检查可用提供商
const enabledProviders = aiManager.getEnabledProviders();
console.log("可用提供商:", enabledProviders);

// 非流式聊天
const response = await aiManager.chat(
  AIProvider.ANTHROPIC,
  {
    model: "claude-sonnet-4-5-20250929",
    temperature: 0,
    maxTokens: 8192,
    systemPrompt: "You are a helpful assistant.",
  },
  [
    { role: "user", content: "Hello, how are you?" }
  ]
);

console.log("AI 回复:", response.content);
console.log("Token 使用:", response.usage);

// 流式聊天
for await (const chunk of aiManager.chatStream(
  AIProvider.ANTHROPIC,
  {
    model: "claude-sonnet-4-5-20250929",
    temperature: 0,
  },
  [
    { role: "user", content: "Tell me a story" }
  ]
)) {
  process.stdout.write(chunk);
}
```

## 🏗️ 架构

```text
src/
├── ai/                    # AI 提供商管理
│   ├── providers.ts       # 提供商配置和模型识别
│   ├── manager.ts         # AI 管理器 (统一接口)
│   └── handlers/          # 各提供商实现
│       ├── base.ts        # 基类
│       ├── anthropic.ts   # Anthropic Claude
│       ├── openai.ts      # OpenAI & OpenAI Native
│       ├── openai-compatible.ts  # OpenAI 兼容 API
│       ├── gemini.ts      # Google Gemini
│       ├── openrouter.ts  # OpenRouter
│       └── ollama.ts      # Ollama (本地)
├── git/                   # Git 操作 (待实现)
├── github/                # GitHub API (待实现)
├── tools/                 # 工具系统 (待实现)
└── context/               # 上下文管理 (待实现)
```

## 🔧 环境变量

在 `.env` 文件中配置 API 密钥：

```bash
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_BASE_URL=https://api.anthropic.com

# OpenAI
OPENAI_API_KEY=sk-proj-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_NATIVE_API_KEY=sk-proj-xxx

# Google Gemini
GEMINI_API_KEY=xxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# Vertex AI
VERTEX_PROJECT_ID=your-project-id
VERTEX_REGION=us-central1
VERTEX_API_KEY=xxx

# AWS Bedrock
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_KEY=xxx
AWS_REGION=us-east-1

# Azure OpenAI
AZURE_API_KEY=xxx
AZURE_ENDPOINT=https://your-resource.openai.azure.com
AZURE_API_VERSION=2024-08-01-preview

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxx
OPENROUTER_APP_URL=http://localhost:3000
OPENROUTER_APP_TITLE=Git Tutor AI

# OpenAI Compatible (通用兼容 API)
OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000/v1
OPENAI_COMPATIBLE_API_KEY=your-api-key  # 可选

# Ollama (本地)
OLLAMA_BASE_URL=http://localhost:11434

# LM Studio (本地)
LM_STUDIO_BASE_URL=http://localhost:1234/v1

# 中国提供商
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1  # 可选
QWEN_API_KEY=sk-xxx
QWEN_BASE_URL=your-base-url  # 可选
QWEN_CODE_API_KEY=sk-xxx
QWEN_CODE_BASE_URL=your-base-url  # 可选
DOUBAO_API_KEY=xxx
DOUBAO_BASE_URL=your-base-url  # 可选
MOONSHOT_API_KEY=sk-xxx

# Mistral
MISTRAL_API_KEY=xxx

# xAI
XAI_API_KEY=xxx

# Others
REQUESTY_API_KEY=xxx
TOGETHER_API_KEY=xxx
FIREWORKS_API_KEY=xxx
LITELLM_API_KEY=xxx
LITELLM_BASE_URL=http://localhost:4000
ASKSAGE_API_KEY=xxx
ASKSAGE_API_URL=xxx
```

## 🎯 下一步

- [ ] 实现 Git 操作管理器
- [ ] 实现 GitHub API 客户端
- [ ] 实现工具执行系统 (基于 Cline 的工具架构)
- [ ] 实现上下文管理和消息压缩
- [ ] 实现提示词变体系统
- [ ] 添加单元测试

## 📝 注意事项

1. **模型家族识别**: 自动识别模型类型并选择合适的提示词变体
2. **流式支持**: 大多数提供商支持流式输出
3. **统一接口**: 所有提供商使用相同的 API 调用方式
4. **错误处理**: 自动重试和错误分类
5. **Token 计数**: 自动跟踪 API 成本

## 🔗 相关文档

- [Anthropic Claude 文档](https://docs.anthropic.com/)
- [OpenAI API 文档](https://platform.openai.com/docs/)
- [Google Gemini 文档](https://ai.google.dev/gemini-api/docs)
- [OpenRouter 文档](https://openrouter.ai/docs)
- [Ollama 文档](https://ollama.com/docs)
