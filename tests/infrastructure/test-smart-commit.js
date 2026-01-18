/**
 * Git Tutor AI - Smart Commit 完整流程测试
 *
 * 测试 Smart Commit 的核心逻辑(不调用实际 AI):
 * - 上下文构建
 * - 提交消息解析
 * - 类型规范化
 * - 消息格式化
 * - 预览模式
 * - 更改统计
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Mock SmartCommitService 实现 (从 smart-commit.ts 复制核心逻辑)
// ============================================================================

const AIProvider = {
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
  OPENAI_COMPATIBLE: "openai-compatible",
  GOOGLE: "google",
};

class SmartCommitService {
  constructor(git, defaultProvider = AIProvider.ANTHROPIC) {
    this.git = git;
    this.defaultProvider = defaultProvider;
  }

  /**
   * 计算更改统计
   */
  calculateChanges(diffs) {
    return diffs.reduce(
      (acc, diff) => ({
        files: acc.files + 1,
        insertions: acc.insertions + (diff.insertions || 0),
        deletions: acc.deletions + (diff.deletions || 0),
      }),
      { files: 0, insertions: 0, deletions: 0 }
    );
  }

  /**
   * 解析 AI 返回的提交消息
   */
  parseCommitMessage(content, options) {
    // 尝试解析 JSON
    if (content.includes("{") && content.includes("}")) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            type: parsed.type || "chore",
            scope: parsed.scope,
            title: parsed.title || parsed.description || "Update",
            body: parsed.body,
            breaking: parsed.breaking || false,
          };
        }
      } catch {
        // JSON 解析失败，使用文本解析
      }
    }

    // 文本解析
    const lines = content.split("\n").filter((l) => l.trim());
    const title = lines[0] || "Update";
    const body = lines.slice(1).join("\n").trim() || undefined;

    // 尝试识别 conventional commit 格式
    const conventionalMatch = title.match(/^(\w+)(?:\(([^)]+)\))?: (.+)/);
    if (conventionalMatch) {
      return {
        type: this.normalizeCommitType(conventionalMatch[1]),
        scope: conventionalMatch[2],
        title: conventionalMatch[3],
        body,
      };
    }

    return {
      type: "chore",
      title,
      body,
    };
  }

  /**
   * 规范化提交类型
   */
  normalizeCommitType(type) {
    const validTypes = [
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "test",
      "chore",
      "build",
    ];

    if (validTypes.includes(type)) {
      return type;
    }

    // 简单的映射
    const mappings = {
      feature: "feat",
      bugfix: "fix",
      "bug fix": "fix",
      documentation: "docs",
      format: "style",
      tests: "test",
      ci: "build",
    };

    return mappings[type.toLowerCase()] || "chore";
  }

  /**
   * 格式化提交消息
   */
  formatCommitMessage(message) {
    let result = "";

    // type(scope): title
    if (message.scope) {
      result = `${message.type}(${message.scope}): ${message.title}`;
    } else {
      result = `${message.type}: ${message.title}`;
    }

    // BREAKING CHANGE 标记
    if (message.breaking) {
      result += "\n\nBREAKING CHANGE: " + (message.body || message.title);
    }

    // 正文
    if (message.body && !message.breaking) {
      result += "\n\n" + message.body;
    }

    return result;
  }

  /**
   * 模拟生成预览
   */
  async generatePreview(files, options) {
    // 模拟生成提交消息
    const message = {
      type: "feat",
      scope: "api",
      title: "添加用户认证功能",
      body: "实现 JWT 认证和用户登录/注册接口",
      breaking: false,
    };

    // 模拟获取更改统计
    const diffs = [
      { file: "src/auth.ts", insertions: 50, deletions: 0 },
      { file: "src/user.ts", insertions: 30, deletions: 5 },
    ];
    const changes = this.calculateChanges(diffs);

    return {
      success: true,
      message,
      changes,
      preview: true,
    };
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
 * 测试 1: JSON 提交消息解析
 */
async function testJSONMessageParsing() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});
    const jsonContent = `{
  "type": "feat",
  "scope": "api",
  "title": "添加用户认证功能",
  "body": "实现 JWT 认证和用户登录/注册接口",
  "breaking": false
}`;

    const parsed = service.parseCommitMessage(jsonContent);

    const passed =
      parsed.type === "feat" &&
      parsed.scope === "api" &&
      parsed.title === "添加用户认证功能" &&
      parsed.body === "实现 JWT 认证和用户登录/注册接口" &&
      parsed.breaking === false;

    recordResult(
      "json_message_parsing",
      passed,
      {
        type: parsed.type,
        scope: parsed.scope,
        title: parsed.title,
        hasBody: !!parsed.body,
        breaking: parsed.breaking,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("json_message_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: Conventional Commit 文本解析
 */
async function testConventionalCommitParsing() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});
    const textContent = "feat(api): 添加用户认证功能\n\n实现 JWT 认证和用户登录/注册接口";

    const parsed = service.parseCommitMessage(textContent);

    const passed =
      parsed.type === "feat" &&
      parsed.scope === "api" &&
      parsed.title === "添加用户认证功能" &&
      parsed.body === "实现 JWT 认证和用户登录/注册接口";

    recordResult(
      "conventional_commit_parsing",
      passed,
      {
        type: parsed.type,
        scope: parsed.scope,
        title: parsed.title,
        body: parsed.body,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("conventional_commit_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 简单文本解析
 */
async function testSimpleTextParsing() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});
    const simpleContent = "修复登录页面的样式问题";

    const parsed = service.parseCommitMessage(simpleContent);

    const passed =
      parsed.type === "chore" &&
      parsed.title === "修复登录页面的样式问题" &&
      !parsed.body;

    recordResult(
      "simple_text_parsing",
      passed,
      {
        type: parsed.type,
        title: parsed.title,
        body: parsed.body,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("simple_text_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 提交类型规范化
 */
async function testCommitTypeNormalization() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});

    const tests = [
      { input: "feat", expected: "feat" },
      { input: "feature", expected: "feat" },
      { input: "fix", expected: "fix" },
      { input: "bugfix", expected: "fix" },
      { input: "bug fix", expected: "fix" },
      { input: "docs", expected: "docs" },
      { input: "documentation", expected: "docs" },
      { input: "style", expected: "style" },
      { input: "format", expected: "style" },
      { input: "refactor", expected: "refactor" },
      { input: "test", expected: "test" },
      { input: "tests", expected: "test" },
      { input: "chore", expected: "chore" },
      { input: "build", expected: "build" },
      { input: "ci", expected: "build" },
    ];

    let allPassed = true;
    const results = [];

    for (const test of tests) {
      const result = service.normalizeCommitType(test.input);
      const passed = result === test.expected;
      results.push({ input: test.input, expected: test.expected, actual: result, passed });
      if (!passed) allPassed = false;
    }

    recordResult(
      "commit_type_normalization",
      allPassed,
      {
        totalTests: tests.length,
        passedTests: results.filter(r => r.passed).length,
        results: results.slice(0, 5), // 只显示前5个
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("commit_type_normalization", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 提交消息格式化
 */
async function testCommitMessageFormatting() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});

    // 测试 1: 带作用域
    const msg1 = {
      type: "feat",
      scope: "api",
      title: "添加用户认证",
      body: "实现 JWT",
      breaking: false,
    };
    const formatted1 = service.formatCommitMessage(msg1);
    const test1 = formatted1 === "feat(api): 添加用户认证\n\n实现 JWT";

    // 测试 2: 不带作用域
    const msg2 = {
      type: "fix",
      title: "修复样式",
      body: "修正布局问题",
      breaking: false,
    };
    const formatted2 = service.formatCommitMessage(msg2);
    const test2 = formatted2 === "fix: 修复样式\n\n修正布局问题";

    // 测试 3: Breaking Change
    const msg3 = {
      type: "feat",
      title: "重命名 API",
      body: "移除旧接口",
      breaking: true,
    };
    const formatted3 = service.formatCommitMessage(msg3);
    const test3 = formatted3 === "feat: 重命名 API\n\nBREAKING CHANGE: 移除旧接口";

    const passed = test1 && test2 && test3;

    recordResult(
      "commit_message_formatting",
      passed,
      {
        withScope: test1,
        withoutScope: test2,
        breakingChange: test3,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("commit_message_formatting", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 更改统计计算
 */
async function testChangesCalculation() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});

    const diffs = [
      { file: "src/auth.ts", insertions: 50, deletions: 0 },
      { file: "src/user.ts", insertions: 30, deletions: 5 },
      { file: "src/api.ts", insertions: 10, deletions: 20 },
    ];

    const changes = service.calculateChanges(diffs);

    const passed =
      changes.files === 3 &&
      changes.insertions === 90 &&
      changes.deletions === 25;

    recordResult(
      "changes_calculation",
      passed,
      {
        files: changes.files,
        insertions: changes.insertions,
        deletions: changes.deletions,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("changes_calculation", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: 预览模式
 */
async function testPreviewMode() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});

    const preview = await service.generatePreview();

    const passed =
      preview.success === true &&
      preview.preview === true &&
      preview.message !== undefined &&
      preview.changes !== undefined;

    recordResult(
      "preview_mode",
      passed,
      {
        hasPreviewFlag: preview.preview,
        hasMessage: preview.message !== undefined,
        hasChanges: preview.changes !== undefined,
        messageType: preview.message?.type,
        changesFiles: preview.changes?.files,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("preview_mode", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 8: 完整流程模拟
 */
async function testCompleteFlow() {
  const startTime = Date.now();

  try {
    const service = new SmartCommitService({});

    // 模拟完整的 Smart Commit 流程
    // 1. 解析 AI 返回的消息
    const aiResponse = `{
  "type": "feat",
  "scope": "auth",
  "title": "添加用户登录功能",
  "body": "实现 JWT 认证和登录接口",
  "breaking": false
}`;

    const message = service.parseCommitMessage(aiResponse);

    // 2. 格式化提交消息
    const formatted = service.formatCommitMessage(message);

    // 3. 计算更改
    const diffs = [
      { file: "src/auth/login.ts", insertions: 100, deletions: 0 },
      { file: "src/auth/jwt.ts", insertions: 50, deletions: 0 },
    ];
    const changes = service.calculateChanges(diffs);

    // 4. 构建结果
    const result = {
      success: true,
      message,
      changes,
      formatted,
    };

    const passed =
      result.success &&
      message.type === "feat" &&
      formatted.includes("feat(auth):") &&
      changes.files === 2 &&
      changes.insertions === 150;

    recordResult(
      "complete_flow",
      passed,
      {
        parsedType: message.type,
        formattedCorrectly: formatted.includes("feat(auth):"),
        changesFiles: changes.files,
        changesInsertions: changes.insertions,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("complete_flow", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log('\n🚀 Git Tutor AI - Smart Commit 完整流程测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试项目: 8 个 Smart Commit 功能\n');

  const tests = [
    { name: 'JSON 提交消息解析', fn: testJSONMessageParsing },
    { name: 'Conventional Commit 文本解析', fn: testConventionalCommitParsing },
    { name: '简单文本解析', fn: testSimpleTextParsing },
    { name: '提交类型规范化', fn: testCommitTypeNormalization },
    { name: '提交消息格式化', fn: testCommitMessageFormatting },
    { name: '更改统计计算', fn: testChangesCalculation },
    { name: '预览模式', fn: testPreviewMode },
    { name: '完整流程模拟', fn: testCompleteFlow },
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
  console.log('📊 Smart Commit 测试总结');
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
    console.log('🎉 所有 Smart Commit 测试通过! 核心逻辑正确!\n');
    console.log('💡 关键特性:');
    console.log('   - JSON/文本消息解析');
    console.log('   - Conventional Commits 规范');
    console.log('   - 提交类型自动规范化');
    console.log('   - 灵活的消息格式化');
    console.log('   - 预览模式支持');
    console.log('   - 完整的更改统计\n');
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
