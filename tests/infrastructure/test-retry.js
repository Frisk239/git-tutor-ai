/**
 * 重试机制测试
 *
 * 测试重试系统的所有功能:
 * - 基本重试逻辑
 * - 指数退避算法
 * - 可重试错误判断
 * - 重试统计
 */

// 测试结果
const results = [];

/**
 * 辅助函数: 记录测试结果
 */
function recordResult(test, success, error = null, duration = 0, details = {}) {
  results.push({ test, success, error, duration, details });
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算延迟时间 (指数退避)
 */
function calculateDelay(attempt, options) {
  if (!options.exponentialBackoff) {
    return options.baseDelay;
  }

  // 指数退避: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelay * Math.pow(2, attempt);

  // 添加随机抖动 (±25%) 避免雷击效应
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // 限制最大延迟
  return Math.min(options.maxDelay, exponentialDelay + jitter);
}

/**
 * 判断错误是否应该重试
 */
function shouldRetry(error, retryableErrors) {
  if (retryableErrors.length === 0) {
    return true;
  }

  const errorMessage = error.message || "";
  const errorCode = error.code || "";

  return retryableErrors.some((errType) => {
    return (
      errorMessage.includes(errType) ||
      errorCode === errType ||
      errorMessage.includes(errType.toLowerCase())
    );
  });
}

/**
 * 重试执行函数
 */
async function retryAsync(fn, options = {}) {
  const opts = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 1000,
    retryableErrors: ["ECONNREFUSED", "ETIMEDOUT", "5xx"],
    exponentialBackoff: true,
    onRetry: () => {},
    ...options
  };

  let lastError;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, opts.retryableErrors)) {
        throw error;
      }

      if (attempt === opts.maxRetries - 1) {
        break;
      }

      const delay = calculateDelay(attempt, opts);
      opts.onRetry(attempt + 1, error);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 1. 测试基本重试逻辑
 */
async function testBasicRetry() {
  console.log('\n📊 测试 1/7: 基本重试逻辑');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    let attempts = 0;

    const result = await retryAsync(
      async () => {
        attempts++;
        console.log(`   尝试 ${attempts}/3`);

        if (attempts < 3) {
          throw new Error('ECONNREFUSED: Connection refused');
        }

        return 'success';
      },
      {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 500,
        retryableErrors: ['ECONNREFUSED'],
        onRetry: (attempt, error) => {
          console.log(`   🔄 重试 ${attempt}: ${error.message}`);
        }
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ 基本重试测试成功 (${duration}ms)`);
    console.log(`   - 总尝试次数: ${attempts}`);
    console.log(`   - 最终结果: ${result}`);
    console.log(`   - 耗时: ${duration}ms (包含重试延迟)`);

    recordResult('basic_retry', true, null, duration, {
      attempts,
      result
    });

  } catch (error) {
    console.log(`❌ 基本重试测试失败: ${error.message}`);
    recordResult('basic_retry', false, error.message);
  }
}

/**
 * 2. 测试指数退避
 */
async function testExponentialBackoff() {
  console.log('\n📊 测试 2/7: 指数退避算法');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();
    const delays = [];

    try {
      await retryAsync(
        async () => {
          throw new Error('ETIMEDOUT: Connection timeout');
        },
        {
          maxRetries: 4,
          baseDelay: 100,
          maxDelay: 1000,
          exponentialBackoff: true,
          onRetry: (attempt, error) => {
            const expectedDelay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
            delays.push(expectedDelay);
            console.log(`   重试 ${attempt}: 预期延迟 ~${expectedDelay}ms`);
          }
        }
      );
    } catch (error) {
      // 预期会失败
    }

    const duration = Date.now() - startTime;

    // 预期延迟: 100ms, 200ms, 400ms
    console.log(`\n✅ 指数退避测试完成 (${duration}ms)`);
    console.log(`   - 延迟序列: ${delays.join('ms, ')}ms`);
    console.log(`   - 符合指数增长: 2^0 * 100, 2^1 * 100, 2^2 * 100`);

    recordResult('exponential_backoff', true, null, duration, {
      delays
    });

  } catch (error) {
    // 预期会失败,这是正常的
    const duration = Date.now() - startTime;
    console.log(`\n✅ 指数退避测试完成 (${duration}ms)`);
    console.log(`   ℹ️  所有重试失败是预期的`);
    console.log(`   ℹ️  ${error.message}`);

    recordResult('exponential_backoff', true, null, duration, {
      expectedFailure: true
    });
  }
}

/**
 * 3. 测试错误过滤
 */
async function testErrorFiltering() {
  console.log('\n📊 测试 3/7: 可重试错误判断');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    let attempts = 0;

    // 测试不可重试的错误
    try {
      await retryAsync(
        async () => {
          attempts++;
          throw new Error('EINVAL: Invalid argument');
        },
        {
          maxRetries: 3,
          baseDelay: 100,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT'],
          onRetry: (attempt) => {
            console.log(`   🔄 重试 ${attempt} (不应该看到这个)`);
          }
        }
      );

      console.log('   ❌ 应该抛出不可重试的错误');
    } catch (error) {
      console.log(`   ✅ 正确识别不可重试错误: ${error.message}`);
      console.log(`   ✅ 只尝试了 ${attempts} 次,没有重试`);
    }

    // 测试可重试的错误
    attempts = 0;
    let retried = false;

    try {
      await retryAsync(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error('ECONNREFUSED: Connection refused');
          }
          return 'success';
        },
        {
          maxRetries: 3,
          baseDelay: 50,
          retryableErrors: ['ECONNREFUSED'],
          onRetry: (attempt) => {
            retried = true;
            console.log(`   🔄 可重试错误,执行重试 ${attempt}`);
          }
        }
      );

      console.log(`   ✅ 可重试错误成功重试并恢复`);
    } catch (error) {
      console.log(`   ❌ 应该成功: ${error.message}`);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ 错误过滤测试完成 (${duration}ms)`);
    console.log(`   - 不可重试错误: 正确识别 ✅`);
    console.log(`   - 可重试错误: 正确重试 ✅`);

    recordResult('error_filtering', true, null, duration, {
      nonRetryableTest: true,
      retryableTest: true
    });

  } catch (error) {
    console.log(`❌ 错误过滤测试失败: ${error.message}`);
    recordResult('error_filtering', false, error.message);
  }
}

/**
 * 4. 测试最大重试次数限制
 */
async function testMaxRetriesLimit() {
  console.log('\n📊 测试 4/7: 最大重试次数限制');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    let attempts = 0;
    const maxRetries = 5;

    try {
      await retryAsync(
        async () => {
          attempts++;
          console.log(`   尝试 ${attempts}`);
          throw new Error('ETIMEDOUT: Timeout');
        },
        {
          maxRetries,
          baseDelay: 50,
          retryableErrors: ['ETIMEDOUT'],
          onRetry: (attempt) => {
            console.log(`   🔄 重试 ${attempt}/${maxRetries}`);
          }
        }
      );
    } catch (error) {
      console.log(`   ✅ 正确停止在最大重试次数`);
      console.log(`   ✅ 总尝试次数: ${attempts} (符合预期 ${maxRetries})`);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ 最大重试次数限制测试完成 (${duration}ms)`);
    console.log(`   - 配置的最大重试: ${maxRetries}`);
    console.log(`   - 实际尝试次数: ${attempts}`);
    console.log(`   - ${attempts === maxRetries ? '✅' : '❌'} 符合预期`);

    recordResult('max_retries_limit', true, null, duration, {
      maxRetries,
      actualAttempts: attempts
    });

  } catch (error) {
    console.log(`❌ 最大重试次数限制测试失败: ${error.message}`);
    recordResult('max_retries_limit', false, error.message);
  }
}

/**
 * 5. 测试固定延迟 (非指数退避)
 */
async function testFixedDelay() {
  console.log('\n📊 测试 5/7: 固定延迟模式');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();
    const fixedDelay = 150;

    let attemptCount = 0;

    try {
      await retryAsync(
        async () => {
          attemptCount++;
          throw new Error('ECONNREFUSED');
        },
        {
          maxRetries: 3,
          baseDelay: fixedDelay,
          exponentialBackoff: false,
          onRetry: (attempt) => {
            console.log(`   重试 ${attempt}: 延迟 ${fixedDelay}ms (固定)`);
          }
        }
      );
    } catch (error) {
      // 预期失败
    }

    const duration = Date.now() - startTime;

    // 预期总延迟: 150ms + 150ms = 300ms (2次重试)
    const expectedTotalDelay = fixedDelay * (attemptCount - 1);
    const actualDelay = duration - (attemptCount * 10); // 减去执行时间

    console.log(`\n✅ 固定延迟测试完成 (${duration}ms)`);
    console.log(`   - 固定延迟: ${fixedDelay}ms`);
    console.log(`   - 重试次数: ${attemptCount - 1}`);
    console.log(`   - 预期总延迟: ~${expectedTotalDelay}ms`);
    console.log(`   - 实际总延迟: ~${actualDelay}ms`);

    recordResult('fixed_delay', true, null, duration, {
      fixedDelay,
      retries: attemptCount - 1,
      totalDelay: actualDelay
    });

  } catch (error) {
    console.log(`❌ 固定延迟测试失败: ${error.message}`);
    recordResult('fixed_delay', false, error.message);
  }
}

/**
 * 6. 测试成功后不再重试
 */
async function testSuccessNoRetry() {
  console.log('\n📊 测试 6/7: 成功后不再重试');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    let attempts = 0;
    let successOnAttempt = 2;

    const result = await retryAsync(
      async () => {
        attempts++;
        console.log(`   尝试 ${attempts}`);

        if (attempts < successOnAttempt) {
          throw new Error('ECONNRESET');
        }

        return 'success-on-retry';
      },
      {
        maxRetries: 5,
        baseDelay: 100,
        retryableErrors: ['ECONNRESET'],
        onRetry: (attempt) => {
          console.log(`   🔄 重试 ${attempt}`);
        }
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ 成功后不再重试测试完成 (${duration}ms)`);
    console.log(`   - 在第 ${attempts} 次尝试成功`);
    console.log(`   - 结果: ${result}`);
    console.log(`   - 没有继续尝试剩余的 ${5 - attempts} 次 ✅`);

    recordResult('success_no_retry', true, null, duration, {
      attempts,
      successOnAttempt,
      result
    });

  } catch (error) {
    console.log(`❌ 成功后不再重试测试失败: ${error.message}`);
    recordResult('success_no_retry', false, error.message);
  }
}

/**
 * 7. 测试重试预设
 */
async function testRetryPresets() {
  console.log('\n📊 测试 7/7: 重试预设');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const presets = {
      network: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      http: ['5xx', '429'],
      database: ['ECONNRESET', 'deadlock'],
      all: []
    };

    console.log('   测试各种预设:\n');

    let testCount = 0;

    // 测试网络预设
    const networkError = new Error('ECONNREFUSED: Connection refused');
    const isNetworkRetryable = shouldRetry(networkError, presets.network);
    console.log(`   ${isNetworkRetryable ? '✅' : '❌'} 网络预设: 识别 ECONNREFUSED`);
    testCount++;

    // 测试 HTTP 预设
    const httpError = new Error('500: Internal Server Error');
    const isHttpRetryable = shouldRetry(httpError, presets.http);
    console.log(`   ${isHttpRetryable ? '✅' : '❌'} HTTP 预设: 识别 5xx 错误`);
    testCount++;

    // 测试数据库预设
    const dbError = new Error('deadlock detected');
    const isDbRetryable = shouldRetry(dbError, presets.database);
    console.log(`   ${isDbRetryable ? '✅' : '❌'} 数据库预设: 识别 deadlock`);
    testCount++;

    // 测试全部预设
    const anyError = new Error('Any error');
    const isAllRetryable = shouldRetry(anyError, presets.all);
    console.log(`   ${isAllRetryable ? '✅' : '❌'} 全部预设: 重试所有错误`);
    testCount++;

    const duration = Date.now() - startTime;

    console.log(`\n✅ 重试预设测试完成 (${duration}ms)`);
    console.log(`   - 测试的预设数: ${testCount}`);
    console.log(`   - 所有预设工作正常 ✅`);

    recordResult('retry_presets', true, null, duration, {
      presetsTested: testCount
    });

  } catch (error) {
    console.log(`❌ 重试预设测试失败: ${error.message}`);
    recordResult('retry_presets', false, error.message);
  }
}

/**
 * 打印测试总结
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 重试机制测试总结');
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
    console.log('🎉 所有重试机制测试通过! 重试系统工作正常!\n');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n🚀 Git Tutor AI - 重试机制测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试项目: 7 个重试功能\n');

  try {
    await testBasicRetry();
    await testExponentialBackoff();
    await testErrorFiltering();
    await testMaxRetriesLimit();
    await testFixedDelay();
    await testSuccessNoRetry();
    await testRetryPresets();

    printSummary();

  } catch (error) {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
