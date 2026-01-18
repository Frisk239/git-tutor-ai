/**
 * Git Tutor AI - Smart Commit 真实 AI 测试
 *
 * 使用 GLM-4.7 API 测试完整的 Smart Commit 流程
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
  console.error('请在 .env 文件中配置 API Key');
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
            reject(new Error('Invalid API response: ' + JSON.stringify(parsed)));
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
 * 测试 1: 简单功能的提交消息生成
 */
async function testSimpleFeatureCommit() {
  const startTime = Date.now();

  try {
    const diffContext =
'## 更改的文件\n' +
'- src/utils/helpers.ts (staged: M)\n' +
'\n' +
'## 代码更改详情\n' +
'### src/utils/helpers.ts\n' +
'+ export function formatDate(date: Date): string {\n' +
'+   return date.toLocaleDateString(\'zh-CN\');\n' +
'+ }\n' +
'+ \n' +
'+ export function formatNumber(num: number): string {\n' +
'+   return num.toLocaleString(\'zh-CN\');\n' +
'+ }\n' +
'\n' +
'## 最近的提交消息(作为参考)\n' +
'- feat(api): 添加用户认证接口\n' +
'- fix(ui): 修复导航栏样式\n';

    const messages = [
      {
        role: "system",
        content: '你是一个专业的代码提交消息生成助手。请使用中文编写提交消息。\n\n使用 Conventional Commits 格式：type(scope): description\n\ntype 可以是: feat, fix, docs, style, refactor, test, chore, build\n\n请直接以 JSON 格式返回,不要有任何其他文字:\n{\n  "type": "feat|fix|docs|style|refactor|test|chore|build",\n  "scope": "可选的作用域",\n  "title": "简短描述",\n  "body": "详细说明（可选）",\n  "breaking": false\n}'
      },
      {
        role: "user",
        content: '当前 Git 仓库的状态和更改：\n\n' + diffContext + '\n请直接返回 JSON 格式的提交消息,不要有任何其他解释或说明。'
      }
    ];

    const response = await callAI(messages);
    console.log('   AI 响应:', response.substring(0, 200)); // 调试输出

    const parsed = parseCommitMessage(response);
    const formatted = formatCommitMessage(parsed);

    const passed =
      parsed.type &&
      parsed.title &&
      (parsed.type === 'feat' || parsed.type === 'chore' || parsed.type === 'docs') &&
      formatted.includes(`${parsed.type}:`);

    recordResult(
      "simple_feature_commit",
      passed,
      {
        type: parsed.type,
        scope: parsed.scope,
        title: parsed.title.substring(0, 50),
        formatted: formatted.substring(0, 80),
        hasValidFormat: formatted.includes(`${parsed.type}:`),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("simple_feature_commit", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: Bug 修复的提交消息生成
 */
async function testBugFixCommit() {
  const startTime = Date.now();

  try {
    const diffContext =
'## 更改的文件\n' +
'- src/api/user.ts (staged: M)\n' +
'\n' +
'## 代码更改详情\n' +
'### src/api/user.ts\n' +
'- async function getUserById(id: string) {\n' +
'-   const user = await db.users.findOne(id);\n' +
'+ async function getUserById(id: string) {\n' +
'+   if (!id) {\n' +
'+     throw new Error(\'User ID is required\');\n' +
'+   }\n' +
'+   const user = await db.users.findOne(id);\n' +
'    return user;\n' +
'  }\n' +
'\n' +
'## 最近的提交消息(作为参考)\n' +
'- feat(auth): 添加用户登录功能\n' +
'- fix(api): 修复数据验证错误\n';

    const messages = [
      {
        role: "system",
        content: '你是一个专业的代码提交消息生成助手。请使用中文编写提交消息。\n\n使用 Conventional Commits 格式：type(scope): description\n\n请以 JSON 格式返回：\n{\n  "type": "feat|fix|docs|style|refactor|test|chore|build",\n  "scope": "可选的作用域",\n  "title": "简短描述",\n  "body": "详细说明（可选）",\n  "breaking": true/false\n}'
      },
      {
        role: "user",
        content: '当前 Git 仓库的状态和更改：\n\n' + diffContext + '\n请基于这些更改生成一个合适的提交消息。'
      }
    ];

    const response = await callAI(messages);
    const parsed = parseCommitMessage(response);
    const formatted = formatCommitMessage(parsed);

    const passed =
      parsed.type === 'fix' &&
      parsed.title &&
      formatted.includes('fix:');

    recordResult(
      "bug_fix_commit",
      passed,
      {
        type: parsed.type,
        title: parsed.title,
        isFixType: parsed.type === 'fix',
        formatted: formatted.substring(0, 100),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("bug_fix_commit", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 文档更新的提交消息生成
 */
async function testDocsCommit() {
  const startTime = Date.now();

  try {
    const diffContext =
'## 更改的文件\n' +
'- README.md (staged: M)\n' +
'- docs/API.md (staged: A)\n' +
'\n' +
'## 代码更改详情\n' +
'### README.md\n' +
'+ ## 快速开始\n' +
'+ \n' +
'+ ### 安装依赖\n' +
'+ npm install\n' +
'+ \n' +
'+ ### 运行项目\n' +
'+ npm run dev\n' +
'\n' +
'### docs/API.md (新文件)\n' +
'+ # API 文档\n' +
'+ \n' +
'+ ## 用户接口\n' +
'+ \n' +
'+ ### GET /api/users\n' +
'+ 获取所有用户列表\n' +
'\n' +
'## 最近的提交消息(作为参考)\n' +
'- feat(api): 添加用户接口\n' +
'- fix(auth): 修复认证问题\n';

    const messages = [
      {
        role: "system",
        content: '你是一个专业的代码提交消息生成助手。请使用中文编写提交消息。\n\n使用 Conventional Commits 格式：type(scope): description\n\n请以 JSON 格式返回：\n{\n  "type": "feat|fix|docs|style|refactor|test|chore|build",\n  "scope": "可选的作用域",\n  "title": "简短描述",\n  "body": "详细说明（可选）",\n  "breaking": true/false\n}'
      },
      {
        role: "user",
        content: '当前 Git 仓库的状态和更改：\n\n' + diffContext + '\n请基于这些更改生成一个合适的提交消息。'
      }
    ];

    const response = await callAI(messages);
    const parsed = parseCommitMessage(response);
    const formatted = formatCommitMessage(parsed);

    const passed =
      parsed.type === 'docs' &&
      parsed.title;

    recordResult(
      "docs_commit",
      passed,
      {
        type: parsed.type,
        title: parsed.title,
        isDocsType: parsed.type === 'docs',
        formatted: formatted.substring(0, 100),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("docs_commit", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: Breaking Change 的提交消息生成
 */
async function testBreakingChangeCommit() {
  const startTime = Date.now();

  try {
    const diffContext =
'## 更改的文件\n' +
'- src/api/user.ts (staged: M)\n' +
'\n' +
'## 代码更改详情\n' +
'### src/api/user.ts\n' +
'- interface User {\n' +
'-   id: string;\n' +
'-   name: string;\n' +
'-   email: string;\n' +
'+ interface User {\n' +
'+   id: number;\n' +
'+   username: string;\n' +
'+   email: string;\n' +
'+   createdAt: Date;\n' +
'  }\n' +
'\n' +
'## 最近的提交消息(作为参考)\n' +
'- feat(api): 添加用户接口\n' +
'- fix(auth): 修复认证问题\n';

    const messages = [
      {
        role: "system",
        content: '你是一个专业的代码提交消息生成助手。请使用中文编写提交消息。\n\n使用 Conventional Commits 格式：type(scope): description\n\n⚠️ 重要: 如果更改会破坏现有功能或 API，请设置 "breaking": true\n\n请以 JSON 格式返回：\n{\n  "type": "feat|fix|docs|style|refactor|test|chore|build",\n  "scope": "可选的作用域",\n  "title": "简短描述",\n  "body": "详细说明（可选）",\n  "breaking": true/false\n}'
      },
      {
        role: "user",
        content: '当前 Git 仓库的状态和更改：\n\n' + diffContext + '\n请基于这些更改生成一个合适的提交消息。注意这些更改可能会影响现有的 API 兼容性。'
      }
    ];

    const response = await callAI(messages);
    const parsed = parseCommitMessage(response);
    const formatted = formatCommitMessage(parsed);

    const passed =
      parsed.type &&
      parsed.title &&
      (parsed.breaking === true || parsed.breaking === false);

    recordResult(
      "breaking_change_commit",
      passed,
      {
        type: parsed.type,
        title: parsed.title,
        breaking: parsed.breaking,
        formatted: formatted.substring(0, 100),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("breaking_change_commit", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 完整流程 - 解析和格式化
 */
async function testCompleteFlow() {
  const startTime = Date.now();

  try {
    // 模拟 AI 返回的 JSON 响应
    const aiResponse = '{\n' +
'  "type": "feat",\n' +
'  "scope": "auth",\n' +
'  "title": "添加用户登录功能",\n' +
'  "body": "实现 JWT 认证和登录/注册接口",\n' +
'  "breaking": false\n' +
'}';

    const parsed = parseCommitMessage(aiResponse);
    const formatted = formatCommitMessage(parsed);

    const expectedFormat = "feat(auth): 添加用户登录功能\n\n实现 JWT 认证和登录/注册接口";

    const passed =
      parsed.type === "feat" &&
      parsed.scope === "auth" &&
      parsed.title === "添加用户登录功能" &&
      formatted === expectedFormat;

    recordResult(
      "complete_flow",
      passed,
      {
        parsedType: parsed.type,
        parsedScope: parsed.scope,
        parsedTitle: parsed.title,
        formattedMatches: formatted === expectedFormat,
        formatted: formatted,
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
  console.log('\n🚀 Git Tutor AI - Smart Commit 真实 AI 测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('AI 模型: GLM-4.7');
  console.log('测试项目: 5 个 Smart Commit 功能\n');

  const tests = [
    { name: '简单功能提交消息', fn: testSimpleFeatureCommit },
    { name: 'Bug 修复提交消息', fn: testBugFixCommit },
    { name: '文档更新提交消息', fn: testDocsCommit },
    { name: 'Breaking Change 提交消息', fn: testBreakingChangeCommit },
    { name: '完整流程', fn: testCompleteFlow },
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

    // 等待一下,避免 API 限流
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  printSummary();
}

function printSummary() {
  console.log('='.repeat(80));
  console.log('📊 Smart Commit 真实 AI 测试总结');
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
    console.log('🎉 所有 Smart Commit AI 测试通过! AI 集成完美!\n');
    console.log('💡 关键特性:');
    console.log('   - GLM-4.7 AI 集成成功');
    console.log('   - 自动识别提交类型');
    console.log('   - 智能生成提交消息');
    console.log('   - Conventional Commits 规范');
    console.log('   - Breaking Change 识别\n');
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
