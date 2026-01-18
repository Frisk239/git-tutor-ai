/**
 * 快速测试 - AI 工具
 *
 * 测试 GLM-4.7 API 是否正常工作
 */

import { aiManager } from "@git-tutor/core/ai/manager";
import { AIProvider } from "@git-tutor/shared";
import { loadEnv } from "@git-tutor/core/utils/env";

// 加载环境变量
loadEnv();

async function testAI(): Promise<void> {
  console.log("🚀 测试 AI 提供商 (GLM-4.7)\n");

  try {
    console.log("📋 发送测试请求...");

    const response = await aiManager.chat(
      AIProvider.OPENAI_COMPATIBLE,
      {
        model: "glm-4.7",
        temperature: 0.7,
        maxTokens: 100,
        systemPrompt: "你是一个有帮助的 AI 助手。",
      },
      [
        {
          role: "user",
          content: "你好!请用一句话介绍一下你自己。",
        },
      ]
    );

    console.log("✅ AI 响应成功!\n");
    console.log("📝 响应内容:");
    console.log(response.content);

    if (response.usage) {
      console.log("\n📊 Token 使用:");
      console.log(`  - 输入: ${response.usage.promptTokens}`);
      console.log(`  - 输出: ${response.usage.completionTokens}`);
      console.log(`  - 总计: ${response.usage.totalTokens}`);
    }
  } catch (error: any) {
    console.error("❌ AI 测试失败!");
    console.error("错误信息:", error.message);
    console.error("\n请检查:");
    console.error("1. .env 文件是否正确配置");
    console.error("2. API Key 是否有效");
    console.error("3. Base URL 是否正确");
    console.error("4. 网络连接是否正常");
    process.exit(1);
  }
}

testAI();
