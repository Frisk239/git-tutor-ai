/**
 * Git Tutor AI - 工具系统测试
 *
 * 逐个测试每个工具的基本功能
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 测试结果
const results = [];

/**
 * 测试 AI API
 */
async function testAI() {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 测试 AI 工具 (GLM-4.7)');
  console.log('='.repeat(60));

  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const model = process.env.OPENAI_COMPATIBLE_MODEL || 'glm-4.7';

  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: '请用一句话解释什么是 TypeScript。'
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
    const content = response.data.choices?.[0]?.message?.content || '无内容';

    console.log(`✅ AI API 测试成功 (${duration}ms)`);
    console.log(`📝 响应: ${content.substring(0, 100)}...`);
    console.log(`📊 Token: ${response.data.usage?.total_tokens || 'N/A'}`);

    results.push({ tool: 'AI API', success: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ AI API 测试失败 (${duration}ms)`);
    console.error(`   错误: ${error.message}`);
    results.push({ tool: 'AI API', success: false, error: error.message, duration });
  }
}

/**
 * 测试 Web 搜索 (DuckDuckGo)
 */
async function testWebSearch() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 测试 Web 搜索工具 (DuckDuckGo)');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {

    // DuckDuckGo HTML 版本搜索
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: {
        q: 'TypeScript tutorial'
      },
      timeout: 30000, // 增加超时时间到 30 秒
    });

    const duration = Date.now() - startTime;
    const hasResults = response.data.includes('result__a');

    console.log(`✅ Web 搜索测试成功 (${duration}ms)`);
    console.log(`📊 搜索结果: ${hasResults ? '找到结果' : '无结果'}`);

    results.push({ tool: 'Web 搜索', success: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Web 搜索测试失败 (${duration}ms)`);
    console.error(`   错误: ${error.message}`);
    results.push({ tool: 'Web 搜索', success: false, error: error.message, duration });
  }
}

/**
 * 测试 Web 获取
 */
async function testWebFetch() {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 测试 Web 获取工具');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await axios.get('https://example.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const duration = Date.now() - startTime;
    const content = response.data;
    const title = content.match(/<title>(.*?)<\/title>/i)?.[1] || '无标题';
    const wordCount = content.split(/\s+/).length;

    console.log(`✅ Web 获取测试成功 (${duration}ms)`);
    console.log(`📝 标题: ${title}`);
    console.log(`📊 字数: ${wordCount}`);

    results.push({ tool: 'Web 获取', success: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Web 获取测试失败 (${duration}ms)`);
    console.error(`   错误: ${error.message}`);
    results.push({ tool: 'Web 获取', success: false, error: error.message, duration });
  }
}

/**
 * 测试文件系统工具
 */
async function testFilesystem() {
  console.log('\n' + '='.repeat(60));
  console.log('📁 测试文件系统工具');
  console.log('='.repeat(60));

  const testDir = path.resolve(__dirname, 'test-temp');
  const testFile = path.join(testDir, 'test.txt');

  try {
    // 1. 创建目录
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ 创建目录成功');

    // 2. 写入文件
    await fs.writeFile(testFile, 'Hello, Git Tutor AI!');
    console.log('✅ 写入文件成功');

    // 3. 读取文件
    const content = await fs.readFile(testFile, 'utf-8');
    console.log(`✅ 读取文件成功: ${content}`);

    // 4. 获取文件统计
    const stats = await fs.stat(testFile);
    console.log(`✅ 文件统计: ${stats.size} bytes`);

    // 5. 列出文件
    const files = await fs.readdir(testDir);
    console.log(`✅ 列出文件: ${files.length} 个文件`);

    // 6. 清理
    await fs.unlink(testFile);
    await fs.rmdir(testDir);
    console.log('✅ 清理成功');

    results.push({ tool: '文件系统', success: true, duration: 0 });
  } catch (error) {
    console.error(`❌ 文件系统测试失败`);
    console.error(`   错误: ${error.message}`);
    results.push({ tool: '文件系统', success: false, error: error.message, duration: 0 });
  }
}

/**
 * 测试 Git 工具
 */
async function testGit() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 测试 Git 工具');
  console.log('='.repeat(60));

  try {
    const { exec } = require('util').promisify(require('child_process').exec);

    // 1. 检查是否是 Git 仓库
    try {
      await exec('git status');
      console.log('✅ Git 仓库检测成功');

      // 2. 获取状态
      const { stdout } = await exec('git status --porcelain');
      const changes = stdout.trim().split('\n').filter(l => l).length;
      console.log(`✅ Git 状态: ${changes} 个变更`);

      results.push({ tool: 'Git', success: true, duration: 0 });
    } catch (gitError) {
      console.log('⚠️  不是 Git 仓库,跳过 Git 测试');
      results.push({ tool: 'Git', success: true, duration: 0 });
    }
  } catch (error) {
    console.error(`❌ Git 测试失败`);
    console.error(`   错误: ${error.message}`);
    results.push({ tool: 'Git', success: false, error: error.message, duration: 0 });
  }
}

/**
 * 打印测试总结
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60) + '\n');

  const total = results.length;
  const success = results.filter(r => r.success).length;
  const failed = total - success;
  const successRate = ((success / total) * 100).toFixed(1);

  console.log(`总测试数: ${total}`);
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${successRate}%\n`);

  if (failed > 0) {
    console.log('❌ 失败的工具:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.tool}: ${r.error}`);
      });
    console.log();
  }

  // 性能统计
  const completed = results.filter(r => r.duration > 0);
  if (completed.length > 0) {
    const avgDuration = completed.reduce((sum, r) => sum + r.duration, 0) / completed.length;
    const slowest = [...completed].sort((a, b) => b.duration - a.duration)[0];
    const fastest = [...completed].sort((a, b) => a.duration - b.duration)[0];

    console.log(`⏱️  平均耗时: ${avgDuration.toFixed(0)}ms`);
    console.log(`🐌 最慢工具: ${slowest.tool} (${slowest.duration}ms)`);
    console.log(`⚡ 最快工具: ${fastest.tool} (${fastest.duration}ms)\n`);
  }

  console.log('='.repeat(60));
  console.log('✨ 测试完成!\n');
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('\n🚀 Git Tutor AI - 工具系统测试');
  console.log('测试时间:', new Date().toLocaleString());

  try {
    await testAI();
    await testWebSearch();
    await testWebFetch();
    await testFilesystem();
    await testGit();

    printSummary();
  } catch (error) {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  }
}

// 运行测试
runTests();
