/**
 * 鲁棒性测试 Tavily API
 *
 * 增加重试机制和更详细的错误处理
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

async function testTavilyWithRetry() {
  console.log('🧪 鲁棒性测试 Tavily API (带重试)\n');
  console.log('='.repeat(80));

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.log('❌ 未配置 TAVILY_API_KEY');
    process.exit(1);
  }

  console.log('✅ TAVILY_API_KEY 已配置\n');

  const endpoint = 'https://api.tavily.com/search';

  // 带重试的请求函数
  async function searchWithRetry(query, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   尝试 ${attempt}/${maxRetries}...`);

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

        return { success: true, data: response.data };

      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        console.log(`   ${isLastAttempt ? '❌' : '⚠️'}  失败: ${error.message}`);

        if (error.response) {
          console.log(`      状态码: ${error.response.status}`);
          if (error.response.data) {
            console.log(`      详情:`, JSON.stringify(error.response.data).substring(0, 200));
          }
          // API 错误不重试
          return { success: false, error: error.message, data: error.response.data };
        }

        if (error.code === 'ECONNABORTED') {
          console.log('      超时错误');
          if (!isLastAttempt) {
            console.log('      等待 2 秒后重试...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          console.log('      网络连接错误');
          if (!isLastAttempt) {
            console.log('      等待 3 秒后重试...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else {
          // 其他错误不重试
          return { success: false, error: error.message };
        }

        if (isLastAttempt) {
          return { success: false, error: `重试 ${maxRetries} 次后仍然失败: ${error.message}` };
        }
      }
    }
  }

  // 测试查询
  const testQueries = [
    { query: 'TypeScript', desc: '简单查询' },
    { query: 'Git tutorial', desc: '英文查询' },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const { query, desc } of testQueries) {
    console.log(`\n📡 测试: ${desc}`);
    console.log(`🔍 搜索: "${query}"`);

    const startTime = Date.now();
    const result = await searchWithRetry(query);
    const duration = Date.now() - startTime;

    if (result.success) {
      successCount++;
      console.log(`   ✅ 成功 (${duration}ms)`);

      // 显示结果摘要
      const results = result.data.results || [];
      console.log(`   📋 找到 ${results.length} 个结果`);

      if (result.data.answer) {
        console.log(`   🤖 AI 答案: ${result.data.answer.substring(0, 80)}...`);
      }

      if (results.length > 0) {
        console.log(`   🔗 第一个结果: ${results[0].title}`);
        console.log(`      URL: ${results[0].url}`);
      }
    } else {
      failCount++;
      console.log(`   ❌ 失败: ${result.error}`);
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 测试总结:\n');
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ❌ 失败: ${failCount}`);
  console.log(`   📈 成功率: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%\n`);

  if (successCount > 0) {
    console.log('🎉 Tavily API 集成基本成功!\n');
    console.log('ℹ️  如果有部分失败,可能是网络问题:');
    console.log('   1. 检查网络连接');
    console.log('   2. 检查防火墙设置');
    console.log('   3. 如果在中国,可能需要代理\n');
  } else {
    console.log('⚠️  所有测试都失败了\n');
    console.log('可能的原因:');
    console.log('   1. API Key 无效或过期');
    console.log('   2. 网络连接问题');
    console.log('   3. Tavily API 服务暂时不可用\n');
    console.log('建议:');
    console.log('   1. 检查 API Key: https://docs.tavily.com/docs/tavily-api/keys');
    console.log('   2. 测试网络: curl -v https://api.tavily.com');
    console.log('   3. 查看 Tavily 状态页: https://status.tavily.com\n');
  }

  console.log('='.repeat(80));
  console.log('✨ 测试完成!\n');
}

testTavilyWithRetry().catch(error => {
  console.error('\n💥 测试异常!\n');
  console.error('错误:', error.message);
  console.error('堆栈:', error.stack);
  process.exit(1);
});
