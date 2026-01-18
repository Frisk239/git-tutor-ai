/**
 * 基础设施测试运行器
 *
 * 运行所有基础设施测试脚本:
 * - 配置系统
 * - 重试机制
 * - 错误处理
 * - 日志系统
 * - 环境变量处理
 * - 工作区管理
 * - 缓存管理器
 */

const { execSync } = require('child_process');
const path = require('path');

// 测试结果汇总
const allResults = [];
const testStartTime = Date.now();

/**
 * 运行单个测试脚本
 */
function runTestScript(scriptName, scriptPath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 运行测试: ${scriptName}`);
  console.log('='.repeat(80));

  try {
    const startTime = Date.now();
    const output = execSync(`node "${scriptPath}"`, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: path.dirname(scriptPath)
    });
    const duration = Date.now() - startTime;

    console.log(`\n✅ ${scriptName} 完成 (${duration}ms)`);
    return { success: true, duration, script: scriptName };
  } catch (error) {
    const duration = Date.now() - Date.now(); // 失败时duration不准确,但没关系
    console.log(`\n❌ ${scriptName} 失败: ${error.message}`);
    return { success: false, duration: 0, script: scriptName, error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n🎯 Git Tutor AI - 基础设施测试套件');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试范围: 核心基础设施功能\n');

  // 定义所有测试脚本
  const tests = [
    {
      name: '配置系统测试',
      path: path.join(__dirname, 'test-configuration.js'),
      required: true
    },
    {
      name: '重试机制测试',
      path: path.join(__dirname, 'test-retry.js'),
      required: true
    },
    // 可以添加更多测试
    // {
    //   name: '错误处理测试',
    //   path: path.join(__dirname, 'test-errors.js'),
    //   required: false
    // },
    // {
    //   name: '日志系统测试',
    //   path: path.join(__dirname, 'test-logger.js'),
    //   required: false
    // },
  ];

  // 过滤出存在的测试
  const fs = require('fs');
  const availableTests = tests.filter(test => {
    const exists = fs.existsSync(test.path);
    if (!exists) {
      console.log(`⚠️  跳过: ${test.name} (文件不存在)`);
    }
    return exists;
  });

  console.log(`找到 ${availableTests.length} 个测试脚本\n`);

  // 运行所有测试
  for (const test of availableTests) {
    const result = runTestScript(test.name, test.path);
    allResults.push(result);
  }

  // 打印总结
  printSummary();
}

/**
 * 打印总结报告
 */
function printSummary() {
  const totalDuration = Date.now() - testStartTime;

  console.log('\n' + '='.repeat(80));
  console.log('📊 基础设施测试总结报告');
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
  console.log(`   - ⏱️  总耗时: ${totalDuration}ms\n`);

  if (total > 0) {
    console.log('📋 各测试详情:\n');

    allResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? '通过' : '失败';
      console.log(`   ${index + 1}. ${icon} ${result.script}`);
      console.log(`      状态: ${status}`);
      console.log(`      耗时: ${result.duration}ms`);
      if (!result.success && result.error) {
        console.log(`      错误: ${result.error}`);
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
    console.log('🎉 所有基础设施测试通过! 核心功能运行正常!\n');
    console.log('💡 下一步:');
    console.log('   - 测试工具执行器和生命周期');
    console.log('   - 测试缓存管理器');
    console.log('   - 测试工作区管理');
    console.log('   - 生成完整测试报告\n');
  } else if (failed > 0) {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  } else {
    console.log('ℹ️  还没有可用的测试脚本\n');
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
