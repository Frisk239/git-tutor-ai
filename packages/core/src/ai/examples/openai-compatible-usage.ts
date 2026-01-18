/**
 * OpenAI Compatible 提供商使用示例
 *
 * 这个提供商可以连接任何兼容 OpenAI API 格式的服务
 *
 * 支持的服务包括：
 * - vLLM (https://github.com/vllm-project/vllm)
 * - LocalAI (https://localai.io/)
 * - Text Generation WebUI (https://github.com/oobabooga/text-generation-webui)
 * - llama.cpp (https://github.com/ggerganov/llama.cpp)
 * - FastChat (https://github.com/lm-sys/FastChat)
 * - 自建的 OpenAI API 代理
 * - 任何其他兼容 OpenAI API 格式的服务
 */

import { aiManager, AIProvider } from '@git-tutor/core';

async function example() {
  // 1. 设置环境变量
  // 在 .env 文件中配置：
  // OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000/v1
  // OPENAI_COMPATIBLE_API_KEY=your-api-key  # 可选，有些服务不需要

  // 2. 检查提供商是否启用
  const isEnabled = aiManager.isProviderEnabled(AIProvider.OPENAI_COMPATIBLE);
  console.log('OpenAI Compatible 启用状态:', isEnabled);

  if (!isEnabled) {
    console.error('请先配置 OPENAI_COMPATIBLE_BASE_URL 环境变量');
    return;
  }

  // 3. 非流式聊天示例
  console.log('\n=== 非流式聊天 ===');
  const response = await aiManager.chat(
    AIProvider.OPENAI_COMPATIBLE,
    {
      model: 'your-model-name', // 根据你的服务配置，例如 "llama-2-7b", "vicuna-7b" 等
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful coding assistant.',
    },
    [{ role: 'user', content: 'What is TypeScript?' }]
  );

  console.log('AI 回复:', response.content);
  console.log('Token 使用:', response.usage);

  // 4. 流式聊天示例
  console.log('\n=== 流式聊天 ===');
  console.log('AI 回复: ');

  for await (const chunk of aiManager.chatStream(
    AIProvider.OPENAI_COMPATIBLE,
    {
      model: 'your-model-name',
      temperature: 0.7,
      maxTokens: 500,
    },
    [{ role: 'user', content: 'Explain React hooks in simple terms.' }]
  )) {
    process.stdout.write(chunk);
  }

  console.log('\n\n=== 完成 ===');
}

// 运行示例（仅在直接执行此文件时）
if (require.main === module) {
  example().catch(console.error);
}

export { example };
