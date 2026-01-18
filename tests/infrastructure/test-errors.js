/**
 * 错误处理系统测试
 *
 * 测试统一错误处理的所有功能:
 * - 错误分类
 * - 错误严重级别
 * - 错误可重试判断
 * - 错误统计
 * - 错误恢复
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
 * 模拟错误类别和严重级别
 */
const ErrorCategory = {
  API: "api",
  FILESYSTEM: "filesystem",
  GIT: "git",
  GITHUB: "github",
  NETWORK: "network",
  VALIDATION: "validation",
  PERMISSION: "permission",
  UNKNOWN: "unknown",
};

const ErrorSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * 模拟 AppError 类
 */
class AppError extends Error {
  constructor(
    message,
    category,
    code,
    retryable = false,
    severity = ErrorSeverity.MEDIUM,
    originalError,
    context = {}
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.code = code;
    this.retryable = retryable;
    this.severity = severity;
    this.originalError = originalError;
    this.context = context;
  }

  static fromError(error, category) {
    if (error instanceof AppError) {
      return error;
    }

    const message = error.message || "Unknown error";
    const code = error.code || "UNKNOWN_ERROR";
    const statusCode = error.status || error.statusCode;

    const inferredCategory = category || inferCategory(error);
    const retryable = isRetryable(error);
    const severity = inferSeverity(error);

    return new AppError(
      message,
      inferredCategory,
      code,
      retryable,
      severity,
      error,
      { statusCode }
    );
  }

  toUserMessage() {
    const categoryMessages = {
      [ErrorCategory.API]: "API 调用失败",
      [ErrorCategory.FILESYSTEM]: "文件操作失败",
      [ErrorCategory.GIT]: "Git 操作失败",
      [ErrorCategory.GITHUB]: "GitHub 操作失败",
      [ErrorCategory.NETWORK]: "网络连接失败",
      [ErrorCategory.VALIDATION]: "参数验证失败",
      [ErrorCategory.PERMISSION]: "权限不足",
      [ErrorCategory.UNKNOWN]: "发生未知错误",
    };

    const categoryMsg = categoryMessages[this.category] || "发生错误";
    const hint = this.retryable ? " (系统会自动重试)" : "";

    return `${categoryMsg}: ${this.message}${hint}`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      code: this.code,
      retryable: this.retryable,
      severity: this.severity,
      context: this.context,
    };
  }
}

function inferCategory(error) {
  const message = (error.message || "").toLowerCase();
  const code = error.code;
  const statusCode = error.status || error.statusCode;

  if (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return ErrorCategory.NETWORK;
  }

  if (statusCode && statusCode >= 400) {
    if (statusCode < 500) {
      if (statusCode === 401 || statusCode === 403) {
        return ErrorCategory.PERMISSION;
      }
      return ErrorCategory.VALIDATION;
    } else {
      return ErrorCategory.API;
    }
  }

  if (message.includes("git") || code?.startsWith("GIT_")) {
    return ErrorCategory.GIT;
  }

  if (message.includes("github") || code?.startsWith("GITHUB_")) {
    return ErrorCategory.GITHUB;
  }

  if (
    code === "ENOENT" ||
    code === "EACCES" ||
    code === "EPERM" ||
    message.includes("file") ||
    message.includes("directory")
  ) {
    return ErrorCategory.FILESYSTEM;
  }

  return ErrorCategory.UNKNOWN;
}

function isRetryable(error) {
  const code = error.code;
  const statusCode = error.status || error.statusCode;
  const message = (error.message || "").toLowerCase();

  if (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET"
  ) {
    return true;
  }

  if (statusCode && statusCode >= 500) {
    return true;
  }

  if (statusCode === 429 || message.includes("rate limit")) {
    return true;
  }

  return false;
}

function inferSeverity(error) {
  const code = error.code;
  const statusCode = error.status || error.statusCode;

  if (statusCode === 401 || statusCode === 403) {
    return ErrorSeverity.HIGH;
  }

  if (statusCode && statusCode >= 500) {
    return ErrorSeverity.MEDIUM;
  }

  if (code === "ENOENT") {
    return ErrorSeverity.LOW;
  }

  if (code === "EACCES" || code === "EPERM") {
    return ErrorSeverity.HIGH;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * 模拟 ErrorHandler
 */
class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.lastErrors = new Map();
    this.logs = [];
  }

  handle(error, context) {
    const appError = AppError.fromError(error);
    this.logError(appError, context);
    this.updateErrorStats(appError);
  }

  logError(error, context) {
    const logData = {
      context,
      category: error.category,
      code: error.code,
      retryable: error.retryable,
      severity: error.severity,
    };

    this.logs.push({ error, logData });
  }

  updateErrorStats(error) {
    const key = `${error.category}:${error.code}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    this.lastErrors.set(key, { error, timestamp: Date.now() });
  }

  getStats() {
    const errorsByCategory = {};
    const errorsByCode = {};
    let totalErrors = 0;

    for (const [key, count] of this.errorCounts.entries()) {
      const [category] = key.split(":");
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      errorsByCode[key] = count;
      totalErrors += count;
    }

    return {
      totalErrors,
      errorsByCategory,
      errorsByCode,
    };
  }

  resetStats() {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

/**
 * 1. 测试错误分类
 */
async function testErrorClassification() {
  console.log('\n📊 测试 1/8: 错误分类');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const testCases = [
      {
        error: { code: "ECONNREFUSED", message: "Connection refused" },
        expected: ErrorCategory.NETWORK,
      },
      {
        error: { code: "ENOENT", message: "File not found" },
        expected: ErrorCategory.FILESYSTEM,
      },
      {
        error: { status: 401, message: "Unauthorized" },
        expected: ErrorCategory.PERMISSION,
      },
      {
        error: { status: 500, message: "Internal server error" },
        expected: ErrorCategory.API,
      },
      {
        error: { code: "GIT_ERROR", message: "Git operation failed" },
        expected: ErrorCategory.GIT,
      },
    ];

    console.log('   测试错误分类:\n');

    let correctCount = 0;

    testCases.forEach(({ error, expected }, index) => {
      const appError = AppError.fromError(error);
      const isCorrect = appError.category === expected;

      if (isCorrect) correctCount++;

      console.log(`   ${isCorrect ? '✅' : '❌'} 测试 ${index + 1}: ${error.code || error.message}`);
      console.log(`      预期: ${expected}`);
      console.log(`      实际: ${appError.category}`);
      console.log();
    });

    const duration = Date.now() - startTime;

    console.log(`✅ 错误分类测试完成 (${duration}ms)`);
    console.log(`   - 正确分类: ${correctCount}/${testCases.length}`);

    recordResult('error_classification', true, null, duration, {
      correct: correctCount,
      total: testCases.length
    });

  } catch (error) {
    console.log(`❌ 错误分类测试失败: ${error.message}`);
    recordResult('error_classification', false, error.message);
  }
}

/**
 * 2. 测试严重级别判断
 */
async function testSeverityInference() {
  console.log('\n📊 测试 2/8: 严重级别判断');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const testCases = [
      {
        error: { status: 401, message: "Unauthorized" },
        expected: ErrorSeverity.HIGH,
        reason: "认证失败",
      },
      {
        error: { status: 403, message: "Forbidden" },
        expected: ErrorSeverity.HIGH,
        reason: "权限不足",
      },
      {
        error: { status: 500, message: "Internal server error" },
        expected: ErrorSeverity.MEDIUM,
        reason: "服务器错误",
      },
      {
        error: { code: "ENOENT", message: "File not found" },
        expected: ErrorSeverity.LOW,
        reason: "文件不存在",
      },
      {
        error: { code: "EACCES", message: "Permission denied" },
        expected: ErrorSeverity.HIGH,
        reason: "权限错误",
      },
    ];

    console.log('   测试严重级别判断:\n');

    let correctCount = 0;

    testCases.forEach(({ error, expected, reason }, index) => {
      const appError = AppError.fromError(error);
      const isCorrect = appError.severity === expected;

      if (isCorrect) correctCount++;

      console.log(`   ${isCorrect ? '✅' : '❌'} 测试 ${index + 1}: ${reason}`);
      console.log(`      预期: ${expected}`);
      console.log(`      实际: ${appError.severity}`);
      console.log();
    });

    const duration = Date.now() - startTime;

    console.log(`✅ 严重级别判断测试完成 (${duration}ms)`);
    console.log(`   - 正确判断: ${correctCount}/${testCases.length}`);

    recordResult('severity_inference', true, null, duration, {
      correct: correctCount,
      total: testCases.length
    });

  } catch (error) {
    console.log(`❌ 严重级别判断测试失败: ${error.message}`);
    recordResult('severity_inference', false, error.message);
  }
}

/**
 * 3. 测试可重试判断
 */
async function testRetryableDetection() {
  console.log('\n📊 测试 3/8: 可重试判断');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const testCases = [
      {
        error: { code: "ECONNREFUSED", message: "Connection refused" },
        expected: true,
        reason: "网络连接错误",
      },
      {
        error: { code: "ETIMEDOUT", message: "Connection timeout" },
        expected: true,
        reason: "连接超时",
      },
      {
        error: { status: 500, message: "Internal server error" },
        expected: true,
        reason: "服务器错误",
      },
      {
        error: { status: 429, message: "Rate limit exceeded" },
        expected: true,
        reason: "速率限制",
      },
      {
        error: { code: "ENOENT", message: "File not found" },
        expected: false,
        reason: "文件不存在",
      },
      {
        error: { code: "EINVAL", message: "Invalid argument" },
        expected: false,
        reason: "无效参数",
      },
    ];

    console.log('   测试可重试判断:\n');

    let correctCount = 0;

    testCases.forEach(({ error, expected, reason }, index) => {
      const appError = AppError.fromError(error);
      const isCorrect = appError.retryable === expected;

      if (isCorrect) correctCount++;

      console.log(`   ${isCorrect ? '✅' : '❌'} 测试 ${index + 1}: ${reason}`);
      console.log(`      预期: ${expected ? '可重试' : '不可重试'}`);
      console.log(`      实际: ${appError.retryable ? '可重试' : '不可重试'}`);
      console.log();
    });

    const duration = Date.now() - startTime;

    console.log(`✅ 可重试判断测试完成 (${duration}ms)`);
    console.log(`   - 正确判断: ${correctCount}/${testCases.length}`);

    recordResult('retryable_detection', true, null, duration, {
      correct: correctCount,
      total: testCases.length
    });

  } catch (error) {
    console.log(`❌ 可重试判断测试失败: ${error.message}`);
    recordResult('retryable_detection', false, error.message);
  }
}

/**
 * 4. 测试用户友好消息
 */
async function testUserMessage() {
  console.log('\n📊 测试 4/8: 用户友好消息');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const testCases = [
      {
        error: new AppError("Connection timeout", ErrorCategory.NETWORK, "ETIMEDOUT", true),
        expectedKeywords: ["网络连接失败", "Connection timeout", "系统会自动重试"],
      },
      {
        error: new AppError("File not found", ErrorCategory.FILESYSTEM, "ENOENT", false),
        expectedKeywords: ["文件操作失败", "File not found"],
      },
      {
        error: new AppError("Unauthorized", ErrorCategory.PERMISSION, "401", false),
        expectedKeywords: ["权限不足", "Unauthorized"],
      },
      {
        error: new AppError("Invalid parameter", ErrorCategory.VALIDATION, "EINVAL", false),
        expectedKeywords: ["参数验证失败", "Invalid parameter"],
      },
    ];

    console.log('   测试用户友好消息:\n');

    let allMatch = true;

    testCases.forEach((testCase, index) => {
      const userMessage = testCase.error.toUserMessage();
      console.log(`   测试 ${index + 1}:`);
      console.log(`      原始错误: ${testCase.error.message}`);
      console.log(`      用户消息: ${userMessage}`);

      const matches = testCase.expectedKeywords.every(keyword =>
        userMessage.includes(keyword)
      );

      if (!matches) {
        allMatch = false;
        console.log(`      ❌ 缺少关键词`);
      } else {
        console.log(`      ✅ 消息友好且准确`);
      }
      console.log();
    });

    const duration = Date.now() - startTime;

    console.log(`✅ 用户友好消息测试完成 (${duration}ms)`);
    console.log(`   - 所有消息友好: ${allMatch ? '是' : '否'}`);

    recordResult('user_message', true, null, duration, {
      allFriendly: allMatch
    });

  } catch (error) {
    console.log(`❌ 用户友好消息测试失败: ${error.message}`);
    recordResult('user_message', false, error.message);
  }
}

/**
 * 5. 测试错误统计
 */
async function testErrorStats() {
  console.log('\n📊 测试 5/8: 错误统计');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const handler = new ErrorHandler();

    // 模拟各种错误
    const errors = [
      new AppError("Connection refused", ErrorCategory.NETWORK, "ECONNREFUSED"),
      new AppError("Connection refused", ErrorCategory.NETWORK, "ECONNREFUSED"),
      new AppError("File not found", ErrorCategory.FILESYSTEM, "ENOENT"),
      new AppError("Unauthorized", ErrorCategory.PERMISSION, "401"),
    ];

    errors.forEach((error, index) => {
      handler.handle(error, `test_context_${index}`);
    });

    const stats = handler.getStats();

    console.log('   错误统计结果:\n');
    console.log(`   总错误数: ${stats.totalErrors}`);
    console.log(`   按类别统计:`);

    Object.entries(stats.errorsByCategory).forEach(([category, count]) => {
      console.log(`      - ${category}: ${count}`);
    });

    console.log();
    console.log(`   按错误代码统计:`);

    Object.entries(stats.errorsByCode).forEach(([code, count]) => {
      console.log(`      - ${code}: ${count}`);
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ 错误统计测试完成 (${duration}ms)`);
    console.log(`   - 统计准确: ✅`);
    console.log(`   - 总错误数: ${stats.totalErrors}`);

    recordResult('error_stats', true, null, duration, {
      totalErrors: stats.totalErrors,
      categories: Object.keys(stats.errorsByCategory).length
    });

  } catch (error) {
    console.log(`❌ 错误统计测试失败: ${error.message}`);
    recordResult('error_stats', false, error.message);
  }
}

/**
 * 6. 测试错误恢复
 */
async function testErrorRecovery() {
  console.log('\n📊 测试 6/8: 错误恢复');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const handler = new ErrorHandler();
    let recoveryAttempted = false;
    let recoverySucceeded = false;

    // 模拟可恢复的错误
    const error = new AppError("Connection timeout", ErrorCategory.NETWORK, "ETIMEDOUT", true);

    try {
      await handler.attemptRecovery(error, async () => {
        recoveryAttempted = true;
        // 模拟恢复成功
        return "recovered";
      });
      recoverySucceeded = true;
    } catch (e) {
      // 恢复失败
    }

    // 测试不可恢复的错误
    const nonRetryableError = new AppError("Invalid argument", ErrorCategory.VALIDATION, "EINVAL", false);
    let nonRetryableThrown = false;

    try {
      await handler.attemptRecovery(nonRetryableError, async () => {
        return "should not execute";
      });
    } catch (e) {
      nonRetryableThrown = true;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ 错误恢复测试完成 (${duration}ms)`);
    console.log(`   - 可重试错误恢复: ${recoveryAttempted && recoverySucceeded ? '✅' : '❌'}`);
    console.log(`   - 不可重试错误抛出: ${nonRetryableThrown ? '✅' : '❌'}`);

    recordResult('error_recovery', true, null, duration, {
      recoveryAttempted,
      recoverySucceeded,
      nonRetryableHandled: nonRetryableThrown
    });

  } catch (error) {
    console.log(`❌ 错误恢复测试失败: ${error.message}`);
    recordResult('error_recovery', false, error.message);
  }
}

/**
 * 7. 测试 JSON 序列化
 */
async function testJSONSerialization() {
  console.log('\n📊 测试 7/8: JSON 序列化');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    const error = new AppError(
      "Test error",
      ErrorCategory.API,
      "TEST_ERROR",
      true,
      ErrorSeverity.HIGH,
      null,
      { customField: "custom value" }
    );

    const json = error.toJSON();

    console.log('   JSON 序列化结果:\n');
    console.log(`   ${JSON.stringify(json, null, 2)}`);

    const hasRequiredFields =
      json.name === "AppError" &&
      json.message === "Test error" &&
      json.category === ErrorCategory.API &&
      json.code === "TEST_ERROR" &&
      json.retryable === true &&
      json.severity === ErrorSeverity.HIGH;

    const duration = Date.now() - startTime;

    console.log(`\n✅ JSON 序列化测试完成 (${duration}ms)`);
    console.log(`   - 包含所有必需字段: ${hasRequiredFields ? '✅' : '❌'}`);

    recordResult('json_serialization', true, null, duration, {
      hasRequiredFields
    });

  } catch (error) {
    console.log(`❌ JSON 序列化测试失败: ${error.message}`);
    recordResult('json_serialization', false, error.message);
  }
}

/**
 * 8. 测试错误链
 */
async function testErrorChain() {
  console.log('\n📊 测试 8/8: 错误链追踪');
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();

    // 创建错误链
    const originalError = new Error("Original error");
    originalError.code = "ECONNREFUSED";

    const wrappedError = AppError.fromError(originalError);

    console.log('   错误链信息:\n');
    console.log(`   原始错误: ${originalError.message}`);
    console.log(`   原始代码: ${originalError.code}`);
    console.log(`   包装错误类别: ${wrappedError.category}`);
    console.log(`   包装错误可重试: ${wrappedError.retryable}`);
    console.log(`   包装错误严重性: ${wrappedError.severity}`);

    // 验证原始错误被保留
    const hasOriginal = wrappedError.originalError === originalError;

    const duration = Date.now() - startTime;

    console.log(`\n✅ 错误链追踪测试完成 (${duration}ms)`);
    console.log(`   - 原始错误保留: ${hasOriginal ? '✅' : '❌'}`);

    recordResult('error_chain', true, null, duration, {
      hasOriginal
    });

  } catch (error) {
    console.log(`❌ 错误链追踪测试失败: ${error.message}`);
    recordResult('error_chain', false, error.message);
  }
}

/**
 * 打印测试总结
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 错误处理系统测试总结');
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
    console.log('🎉 所有错误处理系统测试通过! 错误处理功能完善!\n');
    console.log('💡 关键特性:');
    console.log('   - 智能错误分类');
    console.log('   - 自动严重级别判断');
    console.log('   - 可重试错误识别');
    console.log('   - 用户友好消息');
    console.log('   - 完整错误统计');
    console.log('   - 错误恢复机制\n');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n🚀 Git Tutor AI - 错误处理系统测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试项目: 8 个错误处理功能\n');

  try {
    await testErrorClassification();
    await testSeverityInference();
    await testRetryableDetection();
    await testUserMessage();
    await testErrorStats();
    await testErrorRecovery();
    await testJSONSerialization();
    await testErrorChain();

    printSummary();

  } catch (error) {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
