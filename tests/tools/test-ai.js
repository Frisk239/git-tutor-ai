/**
 * 快速测试 - AI 工具 (JavaScript 版本)
 *
 * 测试 GLM-4.7 API 是否正常工作
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testAI() {
  console.log('🚀 测试 AI 提供商 (GLM-4.7)\n');

  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const model = process.env.OPENAI_COMPATIBLE_MODEL || 'glm-4.7';

  if (!apiKey) {
    console.error('❌ 缺少 API Key!');
    console.error('请检查 .env 文件中的 OPENAI_COMPATIBLE_API_KEY');
    process.exit(1);
  }

  if (!baseURL) {
    console.error('❌ 缺少 Base URL!');
    console.error('请检查 .env 文件中的 OPENAI_COMPATIBLE_BASE_URL');
    process.exit(1);
  }

  console.log('📋 配置信息:');
  console.log(`  - Base URL: ${baseURL}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(-10)}\n`);

  try {
    console.log('📡 发送测试请求...\n');

    const startTime = Date.now();

    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个有帮助的 AI 助手。'
          },
          {
            role: 'user',
            content: '你好!请用一句话介绍一下你自己。'
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const duration = Date.now() - startTime;

    console.log('✅ AI 响应成功!\n');
    console.log(`⏱️  耗时: ${duration}ms\n`);

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('📝 响应内容:');
      console.log(content);
      console.log();
    }

    if (response.data.usage) {
      console.log('📊 Token 使用:');
      console.log(`  - 输入: ${response.data.usage.prompt_tokens}`);
      console.log(`  - 输出: ${response.data.usage.completion_tokens}`);
      console.log(`  - 总计: ${response.data.usage.total_tokens}`);
      console.log();
    }

    console.log('✨ 测试通过!\n');

  } catch (error) {
    console.error('❌ AI 测试失败!\n');

    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误数据:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('网络错误: 未能收到响应');
      console.error(`请求 URL: ${baseURL}/chat/completions`);
    } else {
      console.error('错误信息:', error.message);
    }

    console.error('\n请检查:');
    console.error('1. .env 文件是否正确配置');
    console.error('2. API Key 是否有效');
    console.error('3. Base URL 是否正确: ' + baseURL);
    console.error('4. 网络连接是否正常');
    console.error('5. API 服务是否可用\n');

    process.exit(1);
  }
}

testAI();
