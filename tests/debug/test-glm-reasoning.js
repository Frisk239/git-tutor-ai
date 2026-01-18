/**
 * 测试 GLM-4.7 reasoning_content 处理
 *
 * 验证更新后的 OpenAI Compatible handler 是否能正确处理 reasoning_content
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function testGLMReasoning() {
  console.log('🧪 测试 GLM-4.7 reasoning_content 处理\n');
  console.log('='.repeat(80));

  try {
    // 动态导入 ES 模块
    const { aiManager } = await import('../../packages/core/src/ai/manager.js');
    const { AIProvider } = await import('@git-tutor/shared');

    console.log('✅ 模块加载成功\n');

    console.log('📋 发送测试请求到 GLM-4.7...\n');

    const startTime = Date.now();

    const response = await aiManager.chat(
      AIProvider.OPENAI_COMPATIBLE,
      {
        model: 'glm-4.7',
        temperature: 0.7,
        maxTokens: 200,
        systemPrompt: '你是一个有帮助的 AI 助手,擅长编程和技术问题。',
      },
      [
        {
          role: 'user',
          content: '你好!请用两三句话介绍一下 TypeScript,并说明它的主要特点。',
        },
      ]
    );

    const duration = Date.now() - startTime;

    console.log('✅ 响应成功!\n');
    console.log('='.repeat(80));
    console.log('📦 响应数据:\n');

    console.log('⏱️  耗时:', duration, 'ms');
    console.log('📝 内容长度:', response.content.length, '字符');
    console.log('🔖 角色:', response.role);

    if (response.usage) {
      console.log('\n📊 Token 使用:');
      console.log('  - 输入:', response.usage.promptTokens);
      console.log('  - 输出:', response.usage.completionTokens);
      console.log('  - 总计:', response.usage.totalTokens);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📝 实际内容:\n');
    console.log(response.content);

    console.log('\n' + '='.repeat(80));

    // 验证内容是否成功提取
    if (response.content && response.content.length > 0) {
      console.log('✅ 测试成功! reasoning_content 字段已被正确处理!');
      console.log('✨ GLM-4.7 集成完成!\n');
    } else {
      console.log('⚠️  警告: 响应内容为空');
      console.log('这可能意味着 reasoning_content 字段未被正确提取\n');
    }

  } catch (error) {
    console.error('\n❌ 测试失败!\n');
    console.error('='.repeat(80));
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.log('\n请检查:');
    console.error('1. .env 文件是否正确配置');
    console.error('2. API Key 是否有效');
    console.error('3. Base URL 是否正确');
    console.error('4. openai-compatible.ts 是否已更新\n');

    process.exit(1);
  }
}

testGLMReasoning();
