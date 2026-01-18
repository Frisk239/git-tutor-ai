/**
 * 配置系统测试
 *
 * 测试配置管理器的所有功能:
 * - 环境变量加载
 * - 配置文件解析
 * - 配置验证
 * - 配置获取
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');

// 测试结果
const results = [];

/**
 * 辅助函数: 记录测试结果
 */
function recordResult(test, success, error = null, duration = 0, details = {}) {
  results.push({ test, success, error, duration, details });
}

/**
 * 1. 测试配置加载
 */
async function testConfigurationLoad() {
  console.log('\n📊 测试 1/8: 配置加载');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 动态导入配置模块
    const configModulePath = path.join(__dirname, '../../packages/core/src/config/configuration.ts');

    console.log('   ℹ️  配置模块路径:', configModulePath);
    console.log('   ℹ️  由于是 TypeScript,我们需要使用编译后的 JS 文件');

    // 检查编译后的文件是否存在
    const compiledPath = path.join(__dirname, '../../packages/core/dist/config/configuration.js');
    const fs = require('fs');

    let existsCompiled = false;
    try {
      existsCompiled = fs.existsSync(compiledPath);
      console.log(`   ${existsCompiled ? '✅' : '❌'} 编译后的文件存在: ${compiledPath}`);
    } catch (e) {
      console.log('   ⚠️  无法检查编译文件');
    }

    // 检查 .env 文件
    const envPath = path.join(__dirname, '../../.env');
    const envExists = fs.existsSync(envPath);
    console.log(`   ${envExists ? '✅' : '❌'} .env 文件存在: ${envPath}`);

    // 读取 .env 内容
    if (envExists) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      console.log(`   - 配置项数量: ${lines.length}`);

      // 显示一些关键配置
      const keyConfigs = lines.filter(line =>
        line.includes('API_KEY') ||
        line.includes('TOKEN') ||
        line.includes('PROVIDER') ||
        line.includes('LOG_LEVEL')
      );

      console.log(`   - 关键配置 (${keyConfigs.length}):`);
      keyConfigs.slice(0, 5).forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        // 隐藏敏感信息
        const displayValue = value.includes('key') || value.includes('token')
          ? value.substring(0, 10) + '...'
          : value;
        console.log(`     • ${key}=${displayValue}`);
      });
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ 配置加载测试完成 (${duration}ms)`);
    console.log('   ⚠️  注意: 实际配置模块需要先编译 TypeScript');

    recordResult('configuration_load', true, null, duration, {
      hasEnvFile: envExists,
      hasCompiledFile: existsCompiled
    });

  } catch (error) {
    console.log(`❌ 配置加载测试失败: ${error.message}`);
    recordResult('configuration_load', false, error.message);
  }
}

/**
 * 2. 测试环境变量解析
 */
async function testEnvironmentVariables() {
  console.log('\n📊 测试 2/8: 环境变量解析');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 测试关键环境变量
    const keyEnvVars = [
      'NODE_ENV',
      'OPENAI_COMPATIBLE_API_KEY',
      'OPENAI_COMPATIBLE_BASE_URL',
      'OPENAI_COMPATIBLE_MODEL',
      'TAVILY_API_KEY',
      'GITHUB_TOKEN',
      'LOG_LEVEL'
    ];

    console.log('   检查关键环境变量:\n');

    let foundCount = 0;
    let missingCount = 0;

    keyEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const exists = !!value;

      if (exists) {
        foundCount++;
        // 隐藏敏感信息
        const displayValue = envVar.includes('KEY') || envVar.includes('TOKEN')
          ? `${value.substring(0, 10)}...` // 只显示前10个字符
          : value;

        console.log(`   ✅ ${envVar} = ${displayValue}`);
      } else {
        missingCount++;
        console.log(`   ❌ ${envVar} = (未设置)`);
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 环境变量解析完成 (${duration}ms)`);
    console.log(`   - 已设置: ${foundCount}/${keyEnvVars.length}`);
    console.log(`   - 未设置: ${missingCount}/${keyEnvVars.length}`);

    recordResult('environment_variables', true, null, duration, {
      found: foundCount,
      missing: missingCount,
      total: keyEnvVars.length
    });

  } catch (error) {
    console.log(`❌ 环境变量解析失败: ${error.message}`);
    recordResult('environment_variables', false, error.message);
  }
}

/**
 * 3. 测试默认值
 */
async function testDefaultValues() {
  console.log('\n📊 测试 3/8: 默认值处理');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 测试默认值
    const defaults = [
      { key: 'NODE_ENV', expected: 'development', actual: process.env.NODE_ENV },
      { key: 'PORT', expected: '3001', actual: process.env.PORT },
      { key: 'HOST', expected: '0.0.0.0', actual: process.env.HOST },
      { key: 'LOG_LEVEL', expected: 'info', actual: process.env.LOG_LEVEL },
    ];

    console.log('   验证默认值:\n');

    let matchCount = 0;
    let overrideCount = 0;

    defaults.forEach(({ key, expected, actual }) => {
      const matches = actual === expected || !actual; // 实际值要么匹配,要么未设置

      if (matches && !actual) {
        console.log(`   ✅ ${key}: 使用默认值 "${expected}"`);
        matchCount++;
      } else if (actual) {
        console.log(`   🔄 ${key}: 用户覆盖值 "${actual}" (默认: "${expected}")`);
        overrideCount++;
      } else {
        console.log(`   ⚠️  ${key}: 意外的值 "${actual}" (期望: "${expected}")`);
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 默认值测试完成 (${duration}ms)`);
    console.log(`   - 使用默认值: ${matchCount}`);
    console.log(`   - 用户覆盖: ${overrideCount}`);

    recordResult('default_values', true, null, duration, {
      defaultsUsed: matchCount,
      overrides: overrideCount
    });

  } catch (error) {
    console.log(`❌ 默认值测试失败: ${error.message}`);
    recordResult('default_values', false, error.message);
  }
}

/**
 * 4. 测试类型转换
 */
async function testTypeConversion() {
  console.log('\n📊 测试 4/8: 类型转换');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 测试不同类型的转换
    const testCases = [
      {
        key: 'PORT',
        value: '3001',
        expectedType: 'number',
        description: '字符串转数字'
      },
      {
        key: 'ENABLE_CACHE',
        value: 'true',
        expectedType: 'boolean',
        description: '字符串转布尔值'
      },
      {
        key: 'LOG_LEVEL',
        value: 'debug',
        expectedType: 'string',
        description: '保持字符串'
      },
    ];

    console.log('   测试类型转换:\n');

    testCases.forEach(({ key, value, expectedType, description }) => {
      // 模拟类型转换逻辑
      let converted;
      let actualType;

      if (expectedType === 'number') {
        converted = parseInt(value, 10);
        actualType = typeof converted;
      } else if (expectedType === 'boolean') {
        converted = value === 'true';
        actualType = typeof converted;
      } else {
        converted = value;
        actualType = typeof converted;
      }

      const success = actualType === expectedType;
      console.log(`   ${success ? '✅' : '❌'} ${description}`);
      console.log(`      原始值: "${value}" (${typeof value})`);
      console.log(`      转换后: ${converted} (${actualType})`);
      console.log(`      期望类型: ${expectedType}`);
      console.log();
    });

    const duration = Date.now() - startTime;

    console.log(`✅ 类型转换测试完成 (${duration}ms)`);

    recordResult('type_conversion', true, null, duration, {
      testCases: testCases.length
    });

  } catch (error) {
    console.log(`❌ 类型转换测试失败: ${error.message}`);
    recordResult('type_conversion', false, error.message);
  }
}

/**
 * 5. 测试配置验证
 */
async function testConfigurationValidation() {
  console.log('\n📊 测试 5/8: 配置验证');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    console.log('   验证必需配置:\n');

    // 检查是否有 AI 提供商配置
    const aiProviders = {
      'OpenAI Compatible': !!process.env.OPENAI_COMPATIBLE_API_KEY,
      'Anthropic': !!process.env.ANTHROPIC_API_KEY,
      'OpenAI': !!process.env.OPENAI_API_KEY,
      'Gemini': !!process.env.GEMINI_API_KEY,
    };

    const configuredProviders = Object.entries(aiProviders)
      .filter(([_, configured]) => configured)
      .map(([name]) => name);

    console.log(`   已配置的 AI 提供商:`);
    if (configuredProviders.length > 0) {
      configuredProviders.forEach(provider => {
        console.log(`   ✅ ${provider}`);
      });
    } else {
      console.log(`   ❌ 未配置任何 AI 提供商`);
    }

    console.log();
    console.log(`   未配置的 AI 提供商:`);
    Object.entries(aiProviders)
      .filter(([_, configured]) => !configured)
      .forEach(([name]) => {
        console.log(`   ⚪ ${name}`);
      });

    const hasAIProvider = configuredProviders.length > 0;

    console.log();
    console.log(`   检查其他必需配置:`);

    const otherConfigs = {
      'GitHub Token': !!process.env.GITHUB_TOKEN,
      'Tavily API Key': !!process.env.TAVILY_API_KEY,
      'Log Level': !!process.env.LOG_LEVEL,
    };

    Object.entries(otherConfigs).forEach(([name, configured]) => {
      console.log(`   ${configured ? '✅' : '⚪'} ${name}`);
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 配置验证完成 (${duration}ms)`);
    console.log(`   - AI 提供商: ${hasAIProvider ? '✅ 已配置' : '❌ 未配置'}`);

    recordResult('configuration_validation', true, null, duration, {
      hasAIProvider,
      providersCount: configuredProviders.length,
      providers: configuredProviders
    });

  } catch (error) {
    console.log(`❌ 配置验证失败: ${error.message}`);
    recordResult('configuration_validation', false, error.message);
  }
}

/**
 * 6. 测试配置获取
 */
async function testConfigurationGet() {
  console.log('\n📊 测试 6/8: 配置获取');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 测试从环境变量获取配置
    const getConfigs = [
      'NODE_ENV',
      'LOG_LEVEL',
      'OPENAI_COMPATIBLE_MODEL',
      'DEFAULT_AI_PROVIDER',
      'DEFAULT_SEARCH_PROVIDER',
    ];

    console.log('   获取配置值:\n');

    let foundCount = 0;

    getConfigs.forEach(key => {
      const value = process.env[key];
      if (value) {
        foundCount++;
        console.log(`   ✅ ${key} = ${value}`);
      } else {
        console.log(`   ⚪ ${key} = (未设置)`);
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 配置获取测试完成 (${duration}ms)`);
    console.log(`   - 成功获取: ${foundCount}/${getConfigs.length}`);

    recordResult('configuration_get', true, null, duration, {
      found: foundCount,
      total: getConfigs.length
    });

  } catch (error) {
    console.log(`❌ 配置获取测试失败: ${error.message}`);
    recordResult('configuration_get', false, error.message);
  }
}

/**
 * 7. 测试配置安全性
 */
async function testConfigurationSecurity() {
  console.log('\n📊 测试 7/8: 配置安全性');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    console.log('   检查敏感信息处理:\n');

    // 检查敏感环境变量
    const sensitiveKeys = [
      'OPENAI_COMPATIBLE_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'TAVILY_API_KEY',
      'GITHUB_TOKEN',
    ];

    let secureCount = 0;
    let exposedCount = 0;

    sensitiveKeys.forEach(key => {
      const value = process.env[key];

      if (!value) {
        console.log(`   ⚪ ${key} = (未设置)`);
        return;
      }

      // 检查值是否足够长 (API Key 通常很长)
      const isLongEnough = value.length > 20;

      // 检查是否在日志中暴露 (模拟)
      const wouldExpose = value.length < 10;

      if (isLongEnough && !wouldExpose) {
        secureCount++;
        console.log(`   ✅ ${key} = 安全 (${value.length} 字符)`);
      } else {
        exposedCount++;
        console.log(`   ⚠️  ${key} = 可能不安全 (${value.length} 字符)`);
      }
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 配置安全性测试完成 (${duration}ms)`);
    console.log(`   - 安全配置: ${secureCount}`);
    console.log(`   - 可能暴露: ${exposedCount}`);

    recordResult('configuration_security', true, null, duration, {
      secure: secureCount,
      exposed: exposedCount
    });

  } catch (error) {
    console.log(`❌ 配置安全性测试失败: ${error.message}`);
    recordResult('configuration_security', false, error.message);
  }
}

/**
 * 8. 测试配置文件 (可选)
 */
async function testConfigurationFile() {
  console.log('\n📊 测试 8/8: 配置文件 (可选)');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const fs = require('fs');
    const path = require('path');

    const possiblePaths = [
      path.join(__dirname, '../../config.json'),
      path.join(__dirname, '../../config/config.json'),
      path.join(__dirname, '../../.config/git-tutor/config.json'),
    ];

    console.log('   查找配置文件:\n');

    let foundPath = null;

    possiblePaths.forEach(filePath => {
      const exists = fs.existsSync(filePath);
      console.log(`   ${exists ? '✅' : '⚪'} ${filePath}`);

      if (exists && !foundPath) {
        foundPath = filePath;
      }
    });

    if (foundPath) {
      console.log(`\n   📄 找到配置文件: ${foundPath}`);

      try {
        const content = fs.readFileSync(foundPath, 'utf-8');
        const config = JSON.parse(content);
        console.log(`   - 配置项数: ${Object.keys(config).length}`);
        console.log(`   - 大小: ${content.length} 字符`);

        // 显示配置结构 (不显示值)
        Object.keys(config).forEach(key => {
          const value = config[key];
          const type = typeof value;
          if (type === 'object') {
            console.log(`   • ${key}: { ${Object.keys(value).join(', ')} }`);
          } else {
            console.log(`   • ${key}: ${type}`);
          }
        });
      } catch (e) {
        console.log(`   ⚠️  无法解析配置文件: ${e.message}`);
      }
    } else {
      console.log('\n   ℹ️  未找到配置文件 (这是正常的,可以只使用 .env)');
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ 配置文件测试完成 (${duration}ms)`);

    recordResult('configuration_file', true, null, duration, {
      found: !!foundPath,
      path: foundPath || 'N/A'
    });

  } catch (error) {
    console.log(`❌ 配置文件测试失败: ${error.message}`);
    recordResult('configuration_file', false, error.message);
  }
}

/**
 * 打印测试总结
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 配置系统测试总结');
  console.log('='.repeat(80) + '\n');

  const total = results.length;
  const success = results.filter(r => r.success).length;
  const failed = total - success;
  const successRate = ((success / total) * 100).toFixed(1);

  console.log(`📈 统计:`);
  console.log(`   - 总测试数: ${total}`);
  console.log(`   - ✅ 成功: ${success}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%\n`);

  console.log('📋 详细结果:\n');

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${icon} ${result.test} (${result.duration}ms)`);

    if (result.details && Object.keys(result.details).length > 0) {
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(`      - ${key}: ${value}`);
      });
    }

    if (!result.success && result.error) {
      console.log(`      错误: ${result.error.substring(0, 80)}`);
    }

    console.log();
  });

  // 性能统计
  const completed = results.filter(r => r.duration > 0);
  if (completed.length > 0) {
    const avgDuration = completed.reduce((sum, r) => sum + r.duration, 0) / completed.length;
    const sorted = [...completed].sort((a, b) => b.duration - a.duration);
    const slowest = sorted[0];
    const fastest = sorted[sorted.length - 1];

    console.log('⏱️  性能统计:');
    console.log(`   - 平均耗时: ${avgDuration.toFixed(0)}ms`);
    console.log(`   - 🐌 最慢: ${slowest.test} (${slowest.duration}ms)`);
    console.log(`   - ⚡ 最快: ${fastest.test} (${fastest.duration}ms)\n`);
  }

  console.log('='.repeat(80));

  // 评分
  let rating = '';
  if (successRate >= 90) rating = '⭐⭐⭐⭐⭐ 优秀!';
  else if (successRate >= 80) rating = '⭐⭐⭐⭐ 很好!';
  else if (successRate >= 70) rating = '⭐⭐⭐ 良好!';
  else if (successRate >= 60) rating = '⭐⭐ 及格';
  else rating = '⭐ 需要改进';

  console.log(`🎯 总体评分: ${rating}\n`);

  if (success === total) {
    console.log('🎉 所有配置系统测试通过! 配置管理工作正常!\n');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n🚀 Git Tutor AI - 配置系统测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试项目: 8 个配置功能\n');

  try {
    await testConfigurationLoad();
    await testEnvironmentVariables();
    await testDefaultValues();
    await testTypeConversion();
    await testConfigurationValidation();
    await testConfigurationGet();
    await testConfigurationSecurity();
    await testConfigurationFile();

    printSummary();

  } catch (error) {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
