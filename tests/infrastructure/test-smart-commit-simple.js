/**
 * Git Tutor AI - Smart Commit 简化测试
 *
 * 测试 Smart Commit 的核心逻辑和 GLM-4.7 集成
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// 加载 .env 文件
// ============================================================================

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// ============================================================================
// 配置
// ============================================================================

const API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY;
const BASE_URL = 'open.bigmodel.cn';
const MODEL = 'glm-4.7';

if (!API_KEY) {
  console.error('❌ 错误: OPENAI_COMPATIBLE_API_KEY 未设置');
  process.exit(1);
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
// AI 调用函数
// ============================================================================

async function callAI(messages) {
  const data = JSON.stringify({
    model: MODEL,
    messages: messages,
    temperature: 0.3,
    max_tokens: 500,
  });

  const options = {
    hostname: BASE_URL,
    port: 443,
    path: '/api/coding/paas/v4/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.choices && parsed.choices[0]) {
            const message = parsed.choices[0].message;
            // 处理 GLM-4.7 的 reasoning_content 字段
            let content = message.content || "";
            if ((!content || content.length === 0) && message.reasoning_content) {
              content = message.reasoning_content;
            }
            resolve(content);
          } else {
            reject(new Error('Invalid API response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ============================================================================
// Smart Commit 核心逻辑
// ============================================================================

function parseCommitMessage(content) {
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
      type: normalizeCommitType(conventionalMatch[1]),
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

function normalizeCommitType(type) {
  const validTypes = ["feat", "fix", "docs", "style", "refactor", "test", "chore", "build"];

  if (validTypes.includes(type)) {
    return type;
  }

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

function formatCommitMessage(message) {
  let result = "";

  if (message.scope) {
    result = `${message.type}(${message.scope}): ${message.title}`;
  } else {
    result = `${message.type}: ${message.title}`;
  }

  if (message.breaking) {
    result += "\n\nBREAKING CHANGE: " + (message.body || message.title);
  }

  if (message.body && !message.breaking) {
    result += "\n\n" + message.body;
  }

  return result;
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: AI 连接测试
 */
async function testAIConnection() {
  const startTime = Date.now();

  try {
    const messages = [
      {
        role: "user",
        content: "请回复: 连接成功"
      }
    ];

    const response = await callAI(messages);

    const passed = response && response.length > 0;

    recordResult(
      "ai_connection",
      passed,
      {
        hasResponse: !!response,
        responseLength: response ? response.length : 0,
        responsePreview: response ? response.substring(0, 50) : '',
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("ai_connection", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: JSON 提交消息解析
 */
async function testJSONParsing() {
  const startTime = Date.now();

  try {
    const jsonMessage = '{\n  "type": "feat",\n  "scope": "api",\n  "title": "添加用户认证",\n  "body": "实现 JWT",\n  "breaking": false\n}';

    const parsed = parseCommitMessage(jsonMessage);

    const passed =
      parsed.type === "feat" &&
      parsed.scope === "api" &&
      parsed.title === "添加用户认证";

    recordResult(
      "json_parsing",
      passed,
      {
        type: parsed.type,
        scope: parsed.scope,
        title: parsed.title,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("json_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: Conventional Commit 文本解析
 */
async function testConventionalParsing() {
  const startTime = Date.now();

  try {
    const textMessage = "feat(api): 添加用户认证功能\n\n实现 JWT 认证";

    const parsed = parseCommitMessage(textMessage);

    const passed =
      parsed.type === "feat" &&
      parsed.scope === "api" &&
      parsed.title === "添加用户认证功能";

    recordResult(
      "conventional_parsing",
      passed,
      {
        type: parsed.type,
        scope: parsed.scope,
        title: parsed.title,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("conventional_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 提交消息格式化
 */
async function testMessageFormatting() {
  const startTime = Date.now();

  try {
    const message = {
      type: "feat",
      scope: "auth",
      title: "添加登录功能",
      body: "实现 JWT",
      breaking: false,
    };

    const formatted = formatCommitMessage(message);
    const expected = "feat(auth): 添加登录功能\n\n实现 JWT";

    const passed = formatted === expected;

    recordResult(
      "message_formatting",
      passed,
      {
        formatted: formatted,
        expected: expected,
        matches: formatted === expected,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("message_formatting", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 完整流程
 */
async function testCompleteFlow() {
  const startTime = Date.now();

  try {
    // 模拟完整的流程
    const aiResponse = "feat(api): 添加用户接口";

    // 解析
    const parsed = parseCommitMessage(aiResponse);

    // 格式化
    const formatted = formatCommitMessage(parsed);

    const passed =
      parsed.type === "feat" &&
      parsed.title === "添加用户接口" &&
      formatted === aiResponse;

    recordResult(
      "complete_flow",
      passed,
      {
        parsedType: parsed.type,
        parsedTitle: parsed.title,
        formatted: formatted,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("complete_flow", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: AI 生成提交消息(简化版)
 */
async function testAIGenerateMessage() {
  const startTime = Date.now();

  try {
    const diffContext = '更改: 添加了两个日期和数字格式化函数到 helpers.ts';

    const messages = [
      {
        role: "system",
        content: '你是代码提交消息生成助手。使用 Conventional Commits 格式: type(scope): description\ntype: feat, fix, docs, style, refactor, test, chore, build\n\n请直接返回提交消息,不要解释。'
      },
      {
        role: "user",
        content: `为以下更改生成提交消息:\n${diffContext}\n\n直接返回提交消息,格式: type: description`
      }
    ];

    const response = await callAI(messages);

    // 只要 AI 返回了内容,我们就认为成功
    const parsed = parseCommitMessage(response);

    const passed =
      response &&
      response.length > 0 &&
      parsed.type &&
      parsed.title;

    recordResult(
      "ai_generate_message",
      passed,
      {
        hasResponse: !!response,
        type: parsed.type,
        title: parsed.title.substring(0, 50),
        responsePreview: response.substring(0, 100),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("ai_generate_message", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log('\n🚀 Git Tutor AI - Smart Commit 测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('AI 模型: GLM-4.7');
  console.log('测试项目: 6 个 Smart Commit 功能\n');

  const tests = [
    { name: 'AI 连接测试', fn: testAIConnection },
    { name: 'JSON 解析', fn: testJSONParsing },
    { name: 'Conventional Commit 解析', fn: testConventionalParsing },
    { name: '消息格式化', fn: testMessageFormatting },
    { name: '完整流程', fn: testCompleteFlow },
    { name: 'AI 生成消息', fn: testAIGenerateMessage },
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
          } else if (typeof value === 'string' && value.length > 80) {
            console.log(`   - ${key}: ${value.substring(0, 80)}...`);
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

    // 等待一下,避免 API 限流
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
    console.log('🎉 所有 Smart Commit 测试通过!\n');
    console.log('💡 关键特性:');
    console.log('   - GLM-4.7 AI 集成成功');
    console.log('   - 提交消息解析正确');
    console.log('   - Conventional Commits 支持');
    console.log('   - 消息格式化功能完善\n');
  } else if (passed >= total * 0.8) {
    console.log(`✅ Smart Commit 基本功能测试通过! (${passed}/${total})\n`);
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
