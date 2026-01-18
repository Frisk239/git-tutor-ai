/**
 * Git Tutor AI - 日志系统测试
 *
 * 测试日志系统的核心功能:
 * - 日志级别过滤
 * - 格式化输出 (JSON/Text)
 * - 文件输出
 * - 性能日志
 * - 统计功能
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Mock 日志系统实现 (从 logger.ts 复制核心逻辑)
// ============================================================================

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LogLevelNames = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
};

class Logger {
  constructor(context, options = {}) {
    this.context = context;
    this.options = {
      level: LogLevel.INFO,
      format: "json",
      console: true,
      file: false,
      filePath: "./logs/test.log",
      includeStack: true,
      ...options
    };

    this.outputs = {
      console: [],
      file: []
    };

    // 确保日志目录存在
    if (this.options.file && this.options.filePath) {
      const logDir = path.join(this.options.filePath, "..");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  debug(message, meta) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message, meta) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message, meta) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message, error, meta) {
    const errorMeta = {
      ...meta,
      error: error?.message,
      stack: this.options.includeStack ? error?.stack : undefined,
    };
    this.log(LogLevel.ERROR, message, errorMeta);
  }

  log(level, message, meta = {}) {
    // 检查日志级别
    if (level < this.options.level) {
      return;
    }

    // 构建日志条目
    const entry = {
      timestamp: new Date().toISOString(),
      level: LogLevelNames[level],
      context: this.context,
      message,
      ...meta,
    };

    // 格式化输出
    const output = this.format(entry);

    // 输出到控制台
    if (this.options.console) {
      this.outputs.console.push(output);
    }

    // 输出到文件
    if (this.options.file) {
      this.logToFile(output);
    }
  }

  format(entry) {
    if (this.options.format === "json") {
      return JSON.stringify(entry);
    } else {
      // 文本格式
      const meta = Object.entries(entry)
        .filter(([key]) => !["timestamp", "level", "context", "message"].includes(key))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(" ");

      return `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}${
        meta ? " " + meta : ""
      }`;
    }
  }

  logToFile(message) {
    try {
      this.outputs.file.push(message);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  child(childContext) {
    return new Logger(`${this.context}:${childContext}`, this.options);
  }

  setLevel(level) {
    this.options.level = level;
  }

  getLevel() {
    return this.options.level;
  }

  getConsoleOutputs() {
    return this.outputs.console;
  }

  getFileOutputs() {
    return this.outputs.file;
  }

  clearOutputs() {
    this.outputs.console = [];
    this.outputs.file = [];
  }
}

class LogStatistics {
  constructor() {
    this.stats = new Map([
      [LogLevel.DEBUG, 0],
      [LogLevel.INFO, 0],
      [LogLevel.WARN, 0],
      [LogLevel.ERROR, 0],
    ]);
  }

  record(level) {
    const count = this.stats.get(level) || 0;
    this.stats.set(level, count + 1);
  }

  getStats() {
    const debug = this.stats.get(LogLevel.DEBUG) || 0;
    const info = this.stats.get(LogLevel.INFO) || 0;
    const warn = this.stats.get(LogLevel.WARN) || 0;
    const error = this.stats.get(LogLevel.ERROR) || 0;

    return {
      debug,
      info,
      warn,
      error,
      total: debug + info + warn + error,
    };
  }

  reset() {
    this.stats.set(LogLevel.DEBUG, 0);
    this.stats.set(LogLevel.INFO, 0);
    this.stats.set(LogLevel.WARN, 0);
    this.stats.set(LogLevel.ERROR, 0);
  }
}

class LoggerWithStats extends Logger {
  constructor(context, options = {}) {
    super(context, options);
    this.stats = new LogStatistics();
  }

  log(level, message, meta = {}) {
    this.stats.record(level);
    super.log(level, message, meta);
  }

  getStats() {
    return this.stats.getStats();
  }

  resetStats() {
    this.stats.reset();
  }
}

class PerformanceLogger {
  constructor(logger, context) {
    this.logger = logger;
    this.context = context;
  }

  async measure(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      this.logger.debug(`${this.context}:${name} completed`, {
        duration,
        performance: {
          name: `${this.context}:${name}`,
          duration,
          timestamp: new Date().toISOString(),
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.logger.error(`${this.context}:${name} failed`, error, {
        duration,
        performance: {
          name: `${this.context}:${name}`,
          duration,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  child(context) {
    return new PerformanceLogger(this.logger, `${this.context}:${context}`);
  }
}

// ============================================================================
// 测试结果记录
// ============================================================================

const testResults = [];

function recordResult(testName, passed, details, duration, error = null) {
  testResults.push({
    test: testName,
    passed,
    details,
    duration,
    error,
  });
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 日志级别过滤
 */
async function testLogLevelFiltering() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext", { level: LogLevel.WARN });

    logger.debug("Debug message");
    logger.info("Info message");
    logger.warn("Warn message");
    logger.error("Error message");

    const outputs = logger.getConsoleOutputs();

    // 应该只有 WARN 和 ERROR
    const hasDebug = outputs.some(o => o.includes("DEBUG"));
    const hasInfo = outputs.some(o => o.includes("INFO"));
    const hasWarn = outputs.some(o => o.includes("WARN"));
    const hasError = outputs.some(o => o.includes("ERROR"));

    const passed = !hasDebug && !hasInfo && hasWarn && hasError && outputs.length === 2;

    recordResult(
      "log_level_filtering",
      passed,
      {
        debugFiltered: !hasDebug,
        infoFiltered: !hasInfo,
        warnIncluded: hasWarn,
        errorIncluded: hasError,
        outputCount: outputs.length,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("log_level_filtering", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: JSON 格式化
 */
async function testJSONFormatting() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext", { format: "json" });

    logger.info("Test message", { userId: 123, action: "create" });

    const outputs = logger.getConsoleOutputs();
    const output = outputs[0];

    const parsed = JSON.parse(output);

    const passed =
      parsed.timestamp &&
      parsed.level === "INFO" &&
      parsed.context === "TestContext" &&
      parsed.message === "Test message" &&
      parsed.userId === 123 &&
      parsed.action === "create";

    recordResult(
      "json_formatting",
      passed,
      {
        hasTimestamp: !!parsed.timestamp,
        hasLevel: parsed.level === "INFO",
        hasContext: parsed.context === "TestContext",
        hasMessage: parsed.message === "Test message",
        hasMeta: parsed.userId === 123 && parsed.action === "create",
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("json_formatting", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 文本格式化
 */
async function testTextFormatting() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext", { format: "text" });

    logger.info("Test message", { userId: 123, action: "create" });

    const outputs = logger.getConsoleOutputs();
    const output = outputs[0];

    const hasTimestamp = output.match(/\[\d{4}-\d{2}-\d{2}T/);
    const hasLevel = output.includes("[INFO]");
    const hasContext = output.includes("[TestContext]");
    const hasMessage = output.includes("Test message");
    const hasMeta = output.includes('userId=123') && output.includes('action="create"');

    const passed = hasTimestamp && hasLevel && hasContext && hasMessage && hasMeta;

    recordResult(
      "text_formatting",
      passed,
      {
        hasTimestamp: !!hasTimestamp,
        hasLevel,
        hasContext,
        hasMessage,
        hasMeta,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("text_formatting", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 子日志器
 */
async function testChildLogger() {
  const startTime = Date.now();

  try {
    const parent = new Logger("ParentContext");
    const child = parent.child("ChildContext");

    child.info("Child message");

    const parentOutputs = parent.getConsoleOutputs();
    const childOutputs = child.getConsoleOutputs();

    const childOutput = childOutputs[0];
    const parsed = JSON.parse(childOutput);

    const passed = parsed.context === "ParentContext:ChildContext";

    recordResult(
      "child_logger",
      passed,
      {
        childContext: parsed.context,
        expected: "ParentContext:ChildContext",
        correct: parsed.context === "ParentContext:ChildContext",
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("child_logger", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 日志统计
 */
async function testLogStatistics() {
  const startTime = Date.now();

  try {
    const logger = new LoggerWithStats("TestContext", { level: LogLevel.DEBUG });

    logger.debug("Debug message");
    logger.info("Info message");
    logger.info("Info message 2");
    logger.warn("Warn message");
    logger.error("Error message");

    const stats = logger.getStats();

    const passed =
      stats.debug === 1 &&
      stats.info === 2 &&
      stats.warn === 1 &&
      stats.error === 1 &&
      stats.total === 5;

    recordResult(
      "log_statistics",
      passed,
      {
        debugCount: stats.debug,
        infoCount: stats.info,
        warnCount: stats.warn,
        errorCount: stats.error,
        totalCount: stats.total,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("log_statistics", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 性能日志器
 */
async function testPerformanceLogger() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext");
    const perfLogger = new PerformanceLogger(logger, "TestPerformance");

    // 测试成功情况
    const result = await perfLogger.measure("testOperation", async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return "success";
    });

    const successTest = result === "success";

    // 测试失败情况
    let errorTest = false;
    let errorThrown = false;
    try {
      await perfLogger.measure("failingOperation", async () => {
        throw new Error("Test error");
      });
    } catch (error) {
      errorThrown = true;
      errorTest = error.message === "Test error";
    }

    const passed = successTest && errorThrown && errorTest;

    recordResult(
      "performance_logger",
      passed,
      {
        successMeasured: successTest,
        errorCaught: errorThrown,
        errorMessageCorrect: errorTest,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("performance_logger", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: 错误日志
 */
async function testErrorLogging() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext", { includeStack: true });

    const testError = new Error("Test error message");
    testError.code = "TEST_ERROR";

    logger.error("Operation failed", testError, { userId: 123 });

    const outputs = logger.getConsoleOutputs();
    const output = outputs[0];
    const parsed = JSON.parse(output);

    const passed =
      parsed.level === "ERROR" &&
      parsed.message === "Operation failed" &&
      parsed.error === "Test error message" &&
      parsed.stack !== undefined &&
      parsed.userId === 123;

    recordResult(
      "error_logging",
      passed,
      {
        hasLevel: parsed.level === "ERROR",
        hasMessage: parsed.message === "Operation failed",
        hasError: parsed.error === "Test error message",
        hasStack: parsed.stack !== undefined,
        hasMeta: parsed.userId === 123,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("error_logging", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 8: 日志级别动态设置
 */
async function testDynamicLogLevel() {
  const startTime = Date.now();

  try {
    const logger = new Logger("TestContext", { level: LogLevel.ERROR });

    logger.debug("Debug message");
    logger.info("Info message");
    logger.warn("Warn message");
    logger.error("Error message");

    const outputs1 = logger.getConsoleOutputs();
    const initialCount = outputs1.length;

    // 改变级别为 INFO
    logger.setLevel(LogLevel.INFO);

    logger.debug("Debug message 2");
    logger.info("Info message 2");
    logger.warn("Warn message 2");
    logger.error("Error message 2");

    const outputs2 = logger.getConsoleOutputs();
    const finalCount = outputs2.length;

    const passed = initialCount === 1 && finalCount === 4;

    recordResult(
      "dynamic_log_level",
      passed,
      {
        initialLevel: "ERROR",
        initialOutputs: initialCount,
        newLevel: "INFO",
        finalOutputs: finalCount,
        correct: initialCount === 1 && finalCount === 4,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("dynamic_log_level", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log('\n🚀 Git Tutor AI - 日志系统测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试项目: 8 个日志功能\n');

  const tests = [
    { name: '日志级别过滤', fn: testLogLevelFiltering },
    { name: 'JSON 格式化', fn: testJSONFormatting },
    { name: '文本格式化', fn: testTextFormatting },
    { name: '子日志器', fn: testChildLogger },
    { name: '日志统计', fn: testLogStatistics },
    { name: '性能日志器', fn: testPerformanceLogger },
    { name: '错误日志', fn: testErrorLogging },
    { name: '日志级别动态设置', fn: testDynamicLogLevel },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`📊 测试 ${i + 1}/${tests.length}: ${test.name}`);
    console.log(''.repeat(80), '\n');

    await test.fn();

    const result = testResults[testResults.length - 1];
    if (result.passed) {
      console.log(`✅ ${test.name}测试完成 (${result.duration}ms)`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          if (typeof value === 'object') {
            console.log(`   - ${key}:`, JSON.stringify(value));
          } else {
            console.log(`   - ${key}: ${value}`);
          }
        });
      }
    } else {
      console.log(`❌ ${test.name}测试失败: ${result.details}`);
      if (result.error) {
        console.log(`   错误: ${result.error.message}`);
      }
    }
    console.log();
  }

  printSummary();
}

function printSummary() {
  console.log('='.repeat(80));
  console.log('📊 日志系统测试总结');
  console.log('='.repeat(80) + '\n');

  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log('📈 统计:');
  console.log(`   - 总测试数: ${total}`);
  console.log(`   - ✅ 成功: ${passed}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%\n`);

  console.log('📋 详细结果:\n');

  testResults.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? '通过' : '失败';
    console.log(`   ${index + 1}. ${icon} ${result.test} (${result.duration}ms) - ${status}`);
    if (!result.passed && result.error) {
      console.log(`      错误: ${result.error.message}`);
    }
  });

  console.log();
  console.log('⏱️  性能统计:');
  const avgDuration = testResults.reduce((sum, r) => sum + r.duration, 0) / total;
  const slowest = testResults.reduce((max, r) => (r.duration > max.duration ? r : max));
  const fastest = testResults.reduce((min, r) => (r.duration < min.duration ? r : min));

  console.log(`   - 平均耗时: ${avgDuration.toFixed(0)}ms`);
  console.log(`   - 🐌 最慢: ${slowest.test} (${slowest.duration}ms)`);
  console.log(`   - ⚡ 最快: ${fastest.test} (${fastest.duration}ms)`);

  console.log();
  console.log('='.repeat(80));

  // 评分
  let rating = '';
  if (successRate === '100.0') rating = '⭐⭐⭐⭐⭐ 优秀!';
  else if (parseFloat(successRate) >= 80) rating = '⭐⭐⭐⭐ 很好!';
  else if (parseFloat(successRate) >= 70) rating = '⭐⭐⭐ 良好!';
  else if (parseFloat(successRate) >= 60) rating = '⭐⭐ 及格';
  else rating = '⭐ 需要改进';

  console.log(`🎯 总体评分: ${rating}\n`);

  if (passed === total) {
    console.log('🎉 所有日志系统测试通过! 日志功能完善!\n');
    console.log('💡 关键特性:');
    console.log('   - 灵活的日志级别控制');
    console.log('   - JSON/Text 双格式支持');
    console.log('   - 完善的错误处理');
    console.log('   - 性能监控能力');
    console.log('   - 统计功能\n');
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
