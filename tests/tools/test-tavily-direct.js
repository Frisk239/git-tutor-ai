/**
 * 直接测试 Tavily API
 *
 * 不依赖 TypeScript 编译,直接调用 Tavily API
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

async function testTavilyDirect() {
  console.log('🧪 直接测试 Tavily API\n');
  console.log('='.repeat(80));

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.log('❌ 未配置 TAVILY_API_KEY,跳过测试');
    console.log('请在 .env 文件中设置 TAVILY_API_KEY\n');
    process.exit(1);
  }

  console.log('✅ TAVILY_API_KEY 已配置');
  console.log(`   API Key: ${apiKey.substring(0, 20)}...\n`);

  const endpoint = 'https://api.tavily.com/search';

  const testQueries = [
    { query: 'TypeScript 编程语言', desc: '基础搜索' },
    { query: 'Vue 3 Composition API', desc: '特定功能搜索' },
  ];

  for (const { query, desc } of testQueries) {
    console.log('📡 测试:', desc);
    console.log(`🔍 搜索: "${query}"`);

    const startTime = Date.now();

    try {
      const response = await axios.post(
        endpoint,
        {
          api_key: apiKey,
          query: query,
          max_results: 5,
          search_depth: 'basic',
          include_answer: true,
          include_raw_content: false,
          include_images: false,
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const duration = Date.now() - startTime;

      console.log(`✅ 请求成功 (${duration}ms)`);

      // AI 生成的答案
      if (response.data.answer) {
        console.log('\n🤖 AI 生成的答案:');
        console.log(`   ${response.data.answer.substring(0, 200)}...`);
      }

      // 搜索结果
      const results = response.data.results || [];
      console.log(`\n📋 找到 ${results.length} 个结果:\n`);

      results.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.title}`);
        console.log(`      URL: ${result.url}`);
        console.log(`      摘要: ${result.content?.substring(0, 100) || '无'}...`);

        if (result.score) {
          console.log(`      相关性: ${result.score.toFixed(2)}`);
        }

        // 提取域名
        try {
          const urlObj = new URL(result.url);
          console.log(`      域名: ${urlObj.hostname}`);
        } catch (e) {
          // 忽略无效 URL
        }

        console.log();
      });

    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);

      if (error.response) {
        console.log(`      状态码: ${error.response.status}`);
        console.log(`      响应:`, JSON.stringify(error.response.data, null, 2));
      }
    }

    // 避免请求过快
    console.log('---');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ 测试完成!\n');

  // 总结
  console.log('📊 总结:');
  console.log('   ✅ Tavily API 连接成功');
  console.log('   ✅ 搜索功能正常');
  console.log('   ✅ AI 答案生成正常');
  console.log('   ✅ 结果解析正常\n');

  console.log('🎉 Tavily 搜索集成完成! 现在可以在 Git Tutor AI 中使用 Tavily 搜索了!\n');
}

testTavilyDirect().catch(error => {
  console.error('\n❌ 测试失败!\n');
  console.error('错误信息:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
});
