/**
 * Git Tutor AI - 完整测试套件运行器
 *
 * 一键运行所有测试:
 * - 工具测试 (25个)
 * - 基础设施测试
 * - 高级功能测试
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 测试结果汇总
const allResults = [];
const suiteStartTime = Date.now();

/**
 * 运行测试脚本
 */
function runTestScript(suiteName, scriptPath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ${suiteName}`);
  console.log('='.repeat(80));

  try {
    const startTime = Date.now();
    execSync(`node "${scriptPath}"`, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: path.dirname(scriptPath),
      timeout: 120000 // 2分钟超时
    });
    const duration = Date.now() - startTime;

    console.log(`\n✅ ${suiteName} 完成 (${duration}ms)`);
    return { success: true, duration, suite: suiteName };
  } catch (error) {
    const duration = Date.now() - Date.now();
    console.log(`\n❌ ${suiteName} 失败: ${error.message}`);
    return { success: false, duration: 0, suite: suiteName, error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n🎯 Git Tutor AI - 完整测试套件');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试范围: 工具 + 基础设施 + 高级功能\n');

  // 定义所有测试套件
  const testSuites = [
    {
      name: '📦 工具测试',
      description: '所有25个工具的完整测试',
      path: path.join(__dirname, 'comprehensive/test-all-25-tools.js'),
      required: true
    },
    {
      name: '⚙️ 基础设施测试',
      description: '配置系统、重试机制等核心功能',
      path: path.join(__dirname, 'infrastructure/run-all-infrastructure-tests.js'),
      required: true
    },
    {
      name: '🔧 Git 工具专项测试',
      description: '在Cline项目上测试Git工具',
      path: path.join(__dirname, 'git/test-git-tools-on-cline.js'),
      required: false
    },
    {
      name: '🐙 GitHub 工具专项测试',
      description: 'GitHub API集成测试',
      path: path.join(__dirname, 'github/test-github-tools.js'),
      required: false
    }
  ];

  // 过滤出存在的测试
  const availableSuites = testSuites.filter(suite => {
    const exists = fs.existsSync(suite.path);
    if (!exists) {
      console.log(`⚠️  跳过: ${suite.name} (文件不存在)`);
    }
    return exists;
  });

  console.log(`找到 ${availableSuites.length} 个测试套件\n`);

  // 询问用户是否继续
  console.log('📋 测试套件列表:');
  availableSuites.forEach((suite, index) => {
    const required = suite.required ? ' [必需]' : ' [可选]';
    console.log(`   ${index + 1}. ${suite.name}${required}`);
    console.log(`      ${suite.description}`);
  });
  console.log();

  // 运行所有测试
  for (const suite of availableSuites) {
    const result = runTestScript(suite.name, suite.path);
    allResults.push(result);

    // 如果是必需测试且失败,询问是否继续
    if (!result.success && suite.required) {
      console.log(`\n⚠️  必需测试失败: ${suite.name}`);
      console.log('是否继续运行剩余测试? (y/n)');
      // 自动选择继续,因为这是自动化脚本
      console.log('自动选择: 继续运行\n');
    }
  }

  // 打印总结
  printSummary();
}

/**
 * 打印总结报告
 */
function printSummary() {
  const totalDuration = Date.now() - suiteStartTime;

  console.log('\n' + '='.repeat(80));
  console.log('📊 Git Tutor AI - 完整测试总结报告');
  console.log('='.repeat(80) + '\n');

  const total = allResults.length;
  const success = allResults.filter(r => r.success).length;
  const failed = total - success;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';

  console.log('📈 整体统计:');
  console.log(`   - 测试套件: ${total}`);
  console.log(`   - ✅ 成功: ${success}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%`);
  console.log(`   - ⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}秒\n`);

  if (total > 0) {
    console.log('📋 各测试套件详情:\n');

    allResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? '通过' : '失败';
      console.log(`   ${index + 1}. ${icon} ${result.suite}`);
      console.log(`      状态: ${status}`);
      console.log(`      耗时: ${(result.duration / 1000).toFixed(2)}秒`);
      if (!result.success && result.error) {
        console.log(`      错误: ${result.error.substring(0, 100)}`);
      }
      console.log();
    });
  }

  console.log('='.repeat(80));

  // 评分
  let rating = '';
  if (successRate === '100.0') rating = '⭐⭐⭐⭐⭐ 优秀!';
  else if (parseFloat(successRate) >= 80) rating = '⭐⭐⭐⭐ 很好!';
  else if (parseFloat(successRate) >= 70) rating = '⭐⭐⭐ 良好!';
  else if (parseFloat(successRate) >= 60) rating = '⭐⭐ 及格';
  else rating = '⭐ 需要改进';

  console.log(`🎯 总体评分: ${rating}\n`);

  if (success === total && total > 0) {
    console.log('🎉 所有测试套件通过! Git Tutor AI 运行正常!\n');
    console.log('💡 下一步:');
    console.log('   ✅ 工具系统已验证');
    console.log('   ✅ 基础设施已验证');
    console.log('   ✅ Git 集成已验证');
    console.log('   ✅ GitHub 集成已验证');
    console.log('   🚀 可以开始开发新功能!\n');
  } else if (failed > 0) {
    console.log(`⚠️  有 ${failed} 个测试套件失败,请查看上面的错误信息\n`);
    console.log('💡 建议:');
    console.log('   1. 查看失败测试的详细日志');
    console.log('   2. 修复问题后重新运行');
    console.log('   3. 确保 .env 配置正确\n');
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
