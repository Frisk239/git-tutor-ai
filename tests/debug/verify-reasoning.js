/**
 * 验证 GLM-4.7 reasoning_content 处理逻辑
 *
 * 模拟我们更新的 OpenAI Compatible handler 的处理逻辑
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

async function testReasoningContentHandling() {
  console.log('🧪 验证 GLM-4.7 reasoning_content 处理逻辑\n');
  console.log('='.repeat(80));

  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const model = process.env.OPENAI_COMPATIBLE_MODEL || 'glm-4.7';

  console.log('📋 配置:');
  console.log(`  - Base URL: ${baseURL}`);
  console.log(`  - Model: ${model}\n`);

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
    console.log('🔍 模拟 OpenAI Compatible handler 的处理逻辑:\n');

    const choice = response.data.choices[0];
    const message = choice.message;

    console.log('1️⃣ 原始响应结构:');
    console.log(`   - message.content: "${message.content || '(空)'}"`);
    console.log(`   - message.content 类型: ${typeof message.content}`);
    console.log(`   - message.content 长度: ${message.content?.length || 0}`);
    console.log(`   - message.reasoning_content: ${message.reasoning_content ? '(存在)' : '(不存在)'}`);

    if (message.reasoning_content) {
      console.log(`   - message.reasoning_content 长度: ${message.reasoning_content.length}`);
      console.log(`   - message.reasoning_content 类型: ${typeof message.reasoning_content}`);
    }

    // 这是我们更新的处理逻辑
    console.log('\n2️⃣ 处理逻辑 (模拟 openai-compatible.ts):');

    let content = message.content || "";
    console.log(`   - 初始 content: "${content || '(空)'}" (长度: ${content.length})`);

    // 如果 content 为空但有 reasoning_content,使用 reasoning_content
    if ((!content || content.length === 0) && message.reasoning_content) {
      console.log('   - ✅ 检测到空的 content 和存在的 reasoning_content');
      console.log('   - 🔄 使用 reasoning_content 作为内容');
      content = message.reasoning_content;
    } else {
      console.log('   - ℹ️  使用标准 content 字段');
    }

    console.log(`   - 最终 content 长度: ${content.length}`);
    console.log(`   - 最终 content 类型: ${typeof content}`);

    console.log('\n' + '='.repeat(80));
    console.log('📝 处理后的内容:\n');

    if (content && content.length > 0) {
      // 显示前 500 个字符
      const preview = content.length > 500 ? content.substring(0, 500) + '\n... (内容已截断)' : content;
      console.log(preview);

      console.log('\n' + '='.repeat(80));
      console.log('✅ 测试成功!');
      console.log('✨ reasoning_content 字段已被正确处理!');
      console.log('📝 内容长度:', content.length, '字符\n');
    } else {
      console.log('(内容为空)');

      console.log('\n' + '='.repeat(80));
      console.log('⚠️  警告: 处理后内容仍为空');
      console.log('这可能意味着:\n');
      console.log('1. API 返回的 content 和 reasoning_content 都为空');
      console.log('2. 响应格式与预期不同');
      console.log('3. 需要进一步调试\n');
    }

    console.log('='.repeat(80));
    console.log('📊 完整 Token 使用:');
    console.log(`   - prompt_tokens: ${response.data.usage.prompt_tokens}`);
    console.log(`   - completion_tokens: ${response.data.usage.completion_tokens}`);
    console.log(`   - total_tokens: ${response.data.usage.total_tokens}\n`);

  } catch (error) {
    console.error('\n❌ 测试失败!\n');
    console.error('='.repeat(80));
    console.error('错误信息:', error.message);

    if (error.response) {
      console.error('\n响应数据:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

testReasoningContentHandling();
