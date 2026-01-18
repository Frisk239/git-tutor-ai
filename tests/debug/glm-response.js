/**
 * 调试 GLM-4.7 API 响应
 *
 * 详细查看 GLM-4.7 返回的完整响应内容
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

async function debugGLMResponse() {
  console.log('🔍 调试 GLM-4.7 API 响应\n');
  console.log('='.repeat(80));

  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const model = process.env.OPENAI_COMPATIBLE_MODEL || 'glm-4.7';

  console.log('📋 配置:');
  console.log(`  - Base URL: ${baseURL}`);
  console.log(`  - Model: ${model}`);
  console.log(`  - API Key: ${apiKey?.substring(0, 20)}...\n`);

  try {
    console.log('📡 发送请求...\n');

    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个有帮助的 AI 助手,擅长编程和技术问题。'
          },
          {
            role: 'user',
            content: '你好!请用两三句话介绍一下 TypeScript,并说明它的主要特点。'
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 响应成功!\n');
    console.log('='.repeat(80));
    console.log('📦 完整响应数据:\n');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('🔍 详细分析:\n');

    // 分析响应结构
    console.log('1️⃣ HTTP 状态码:', response.status);
    console.log('2️⃣ 响应头:', JSON.stringify(response.headers, null, 2));

    console.log('\n3️⃣ 响应体结构:');

    if (response.data.choices) {
      console.log(`   - choices 数量: ${response.data.choices.length}`);

      response.data.choices.forEach((choice, index) => {
        console.log(`\n   Choice [${index}]:`);
        console.log(`   - index: ${choice.index}`);
        console.log(`   - finish_reason: ${choice.finish_reason}`);
        console.log(`   - message.role: ${choice.message?.role}`);
        console.log(`   - message.content: "${choice.message?.content}"`);
        console.log(`   - message.content 类型: ${typeof choice.message?.content}`);
        console.log(`   - message.content 长度: ${choice.message?.content?.length || 0}`);

        if (choice.message?.content) {
          console.log(`\n   📝 实际内容:`);
          console.log('   ' + choice.message.content);
        }
      });
    }

    if (response.data.usage) {
      console.log('\n4️⃣ Token 使用:');
      console.log(`   - prompt_tokens: ${response.data.usage.prompt_tokens}`);
      console.log(`   - completion_tokens: ${response.data.usage.completion_tokens}`);
      console.log(`   - total_tokens: ${response.data.usage.total_tokens}`);
    }

    if (response.data.model) {
      console.log(`\n5️⃣ 模型: ${response.data.model}`);
    }

    if (response.data.id) {
      console.log(`\n6️⃣ 请求 ID: ${response.data.id}`);
    }

    if (response.data.created) {
      console.log(`\n7️⃣ 创建时间: ${new Date(response.data.created * 1000).toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 分析完成!\n');

  } catch (error) {
    console.error('\n❌ 请求失败!\n');
    console.error('='.repeat(80));

    if (error.response) {
      console.error('HTTP 状态码:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers, null, 2));
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('网络错误: 未能收到响应');
      console.error('请求配置:', {
        url: `${baseURL}/chat/completions`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey?.substring(0, 20)}...`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }

    console.log('\n' + '='.repeat(80));
    process.exit(1);
  }
}

debugGLMResponse();
