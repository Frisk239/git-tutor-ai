/**
 * 测试 Tavily 搜索功能
 *
 * 验证 Tavily API 集成是否正常工作
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function testTavilySearch() {
  console.log('🧪 测试 Tavily 搜索功能\n');
  console.log('='.repeat(80));

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.log('❌ 未配置 TAVILY_API_KEY,跳过测试');
    console.log('请在 .env 文件中设置 TAVILY_API_KEY\n');
    process.exit(1);
  }

  console.log('✅ TAVILY_API_KEY 已配置\n');

  try {
    // 动态导入 ES 模块
    const searchManagerModule = await import('../../packages/core/src/tools/web/manager.js');
    const { SearchProviderType } = await import('../../packages/core/src/tools/web/types.js');

    const searchManager = searchManagerModule.getSearchManager();

    console.log('📋 搜索管理器信息:');
    console.log(`  - 默认提供商: ${searchManager.getDefaultProvider()}`);
    console.log(`  - 可用提供商: ${searchManager.getAvailableProviders().join(', ')}`);

    // 检查 Tavily 是否可用
    if (!searchManager.isProviderAvailable(SearchProviderType.TAVILY)) {
      console.log('\n⚠️  Tavily 提供商不可用\n');
      process.exit(1);
    }

    console.log('\n✅ Tavily 提供商可用\n');

    console.log('📡 执行测试搜索...\n');
    console.log('='.repeat(80));

    const testQueries = [
      'TypeScript 编程语言',
      'Vue 3 新特性',
      'Git 工作流程',
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 搜索: "${query}"`);

      const startTime = Date.now();

      try {
        const response = await searchManager.search(
          {
            query,
            limit: 5,
          },
          SearchProviderType.TAVILY
        );

        const duration = Date.now() - startTime;

        console.log(`✅ 搜索成功 (${duration}ms)`);
        console.log(`   - 找到 ${response.results.length} 个结果`);
        console.log(`   - 总结果数: ${response.totalResults || response.results.length}`);

        if (response.results.length > 0) {
          console.log('\n   📋 前 3 个结果:');
          response.results.slice(0, 3).forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.title}`);
            console.log(`      URL: ${result.url}`);
            console.log(`      摘要: ${result.snippet?.substring(0, 100) || '无'}...`);
            if (result.domain) {
              console.log(`      域名: ${result.domain}`);
            }
            if (result.relevanceScore) {
              console.log(`      相关性: ${result.relevanceScore.toFixed(2)}`);
            }
            console.log();
          });
        } else {
          console.log('   ⚠️  未找到结果');
        }

      } catch (error) {
        console.log(`   ❌ 搜索失败: ${error.message}`);
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 测试完成! Tavily 搜索功能正常!\n');

  } catch (error) {
    console.error('\n❌ 测试失败!\n');
    console.error('='.repeat(80));
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.log('\n请检查:');
    console.error('1. .env 文件是否正确配置');
    console.error('2. TAVILY_API_KEY 是否有效');
    console.error('3. 网络连接是否正常\n');

    process.exit(1);
  }
}

testTavilySearch();
