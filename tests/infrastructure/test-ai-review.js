/**
 * Git Tutor AI - AI Review 功能测试
 *
 * 测试 AI 代码审查功能(模拟测试,不实际调用 GitHub API)
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
    max_tokens: 1000,
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
// AI Review 核心逻辑
// ============================================================================

function parseReviewResponse(content) {
  // 尝试解析 AI 返回的审查结果
  const review = {
    rating: 5,
    summary: "代码审查完成",
    issues: [],
    approved: false,
  };

  // 尝试提取评分
  const ratingMatch = content.match(/(?:评分|rating)[:：]\s*(\d+)/i);
  if (ratingMatch) {
    review.rating = parseInt(ratingMatch[1], 10);
  }

  // 尝试提取摘要
  const summaryMatch = content.match(/(?:摘要|summary)[:：](.+?)(?:\n|$)/i);
  if (summaryMatch) {
    review.summary = summaryMatch[1].trim();
  }

  // 尝试提取问题
  const issuePattern = /(?:问题|issue)[:：](.+?)(?=(?:问题|issue)|$)/gis;
  const issueMatches = content.match(issuePattern);
  if (issueMatches) {
    review.issues = issueMatches.map((issue, index) => ({
      severity: index === 0 ? "warning" : "info",
      message: issue.trim(),
      file: "unknown",
      line: 0,
    }));
  }

  // 根据评分决定是否批准
  review.approved = review.rating >= 7;

  return review;
}

function formatReviewComment(review) {
  let comment = `## AI 代码审查\n\n`;
  comment += `**评分**: ${review.rating}/10\n\n`;
  comment += `**摘要**: ${review.summary}\n\n`;

  if (review.issues.length > 0) {
    comment += `**发现的问题**:\n\n`;
    review.issues.forEach((issue, index) => {
      const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
      comment += `${index + 1}. ${icon} ${issue.message}\n`;
    });
  } else {
    comment += `✅ 未发现明显问题\n`;
  }

  comment += `\n---\n*由 Git Tutor AI 自动生成*`;

  return comment;
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 审查响应解析
 */
async function testReviewResponseParsing() {
  const startTime = Date.now();

  try {
    const mockResponse = `评分: 8
摘要: 代码质量良好,但有一些小问题
问题: 函数名应该使用 camelCase
问题: 缺少错误处理`;

    const review = parseReviewResponse(mockResponse);

    const passed =
      review.rating === 8 &&
      review.summary === "代码质量良好,但有一些小问题" &&
      review.issues.length === 2 &&
      review.approved === true;

    recordResult(
      "review_response_parsing",
      passed,
      {
        rating: review.rating,
        summary: review.summary,
        issuesCount: review.issues.length,
        approved: review.approved,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("review_response_parsing", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 审查评论格式化
 */
async function testReviewCommentFormatting() {
  const startTime = Date.now();

  try {
    const review = {
      rating: 7,
      summary: "代码质量良好",
      issues: [
        { severity: "warning", message: "函数名应该使用 camelCase", file: "test.js", line: 10 },
        { severity: "info", message: "建议添加注释", file: "test.js", line: 20 },
      ],
      approved: true,
    };

    const comment = formatReviewComment(review);

    const hasRating = comment.includes("评分");
    const hasSummary = comment.includes("代码质量良好");
    const hasIssue1 = comment.includes("函数名应该使用 camelCase");
    const hasIssue2 = comment.includes("建议添加注释");
    const hasHeader = comment.includes("AI 代码审查");

    const passed = hasRating && hasSummary && hasIssue1 && hasIssue2 && hasHeader;

    recordResult(
      "review_comment_formatting",
      passed,
      {
        hasHeader: hasHeader,
        hasRating: hasRating,
        hasSummary: hasSummary,
        hasIssue1: hasIssue1,
        hasIssue2: hasIssue2,
        allChecks: passed,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("review_comment_formatting", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: AI 代码审查(真实调用)
 */
async function testAICodeReview() {
  const startTime = Date.now();

  try {
    const codeDiff = `## Pull Request 信息
标题: 添加用户认证功能
描述: 实现 JWT 认证和登录接口
分支: feature/auth -> main
更改: +150 -20 (3 文件)

## 代码差异
### src/auth/login.ts
+ export async function login(username: string, password: string) {
+   const user = await db.users.findOne({ username });
+   if (user && user.password === password) {
+     return generateToken(user);
+   }
+   throw new Error('Invalid credentials');
+ }`;

    const messages = [
      {
        role: "system",
        content: '你是专业的代码审查助手。请审查以下代码更改,关注:\n1. 安全问题\n2. 代码质量\n3. 性能问题\n4. 最佳实践\n\n请以中文返回审查结果,包含:\n- 评分(1-10)\n- 摘要\n- 发现的问题(如有)\n\n格式:\n评分: X\n摘要: ...\n问题: ...(如有)'
      },
      {
        role: "user",
        content: `请审查以下代码:\n${codeDiff}`
      }
    ];

    const response = await callAI(messages);

    // 只要 AI 返回了内容,我们就认为成功
    const review = parseReviewResponse(response);

    const passed =
      response &&
      response.length > 0 &&
      review.rating >= 1 &&
      review.rating <= 10;

    recordResult(
      "ai_code_review",
      passed,
      {
        hasResponse: !!response,
        rating: review.rating,
        summary: review.summary.substring(0, 50),
        issuesCount: review.issues.length,
        responseLength: response.length,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("ai_code_review", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 审查决策逻辑
 */
async function testReviewDecision() {
  const startTime = Date.now();

  try {
    // 测试 1: 高评分应该批准
    const review1 = { rating: 8, summary: "很好", issues: [], approved: false };
    const parsed1 = parseReviewResponse("评分: 8\n摘要: 很好");

    // 测试 2: 低评分不应该批准
    const review2 = { rating: 5, summary: "一般", issues: [], approved: true };
    const parsed2 = parseReviewResponse("评分: 5\n摘要: 一般");

    // 测试 3: 临界评分
    const review3 = { rating: 7, summary: "及格", issues: [], approved: false };
    const parsed3 = parseReviewResponse("评分: 7\n摘要: 及格");

    const passed =
      parsed1.approved === true &&
      parsed2.approved === false &&
      parsed3.approved === true;

    recordResult(
      "review_decision",
      passed,
      {
        highRatingApproved: parsed1.approved,
        lowRatingRejected: !parsed2.approved,
        boundaryApproved: parsed3.approved,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("review_decision", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 完整审查流程
 */
async function testCompleteReviewFlow() {
  const startTime = Date.now();

  try {
    // 模拟完整的审查流程
    const codeDiff = `+ export function calculate(a, b) {
+   return a + b;
+ }`;

    const messages = [
      {
        role: "system",
        content: '你是代码审查助手。请简要审查代码。'
      },
      {
        role: "user",
        content: `审查这段代码:\n${codeDiff}`
      }
    ];

    const response = await callAI(messages);
    const review = parseReviewResponse(response);

    // 格式化评论
    const comment = formatReviewComment(review);

    const passed =
      review.rating >= 1 &&
      review.rating <= 10 &&
      comment.length > 0 &&
      comment.includes("AI 代码审查");

    recordResult(
      "complete_review_flow",
      passed,
      {
        rating: review.rating,
        commentLength: comment.length,
        hasCommentHeader: comment.includes("AI 代码审查"),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("complete_review_flow", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log('\n🚀 Git Tutor AI - AI Review 功能测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('AI 模型: GLM-4.7');
  console.log('测试项目: 5 个 AI Review 功能\n');

  const tests = [
    { name: '审查响应解析', fn: testReviewResponseParsing },
    { name: '审查评论格式化', fn: testReviewCommentFormatting },
    { name: 'AI 代码审查', fn: testAICodeReview },
    { name: '审查决策逻辑', fn: testReviewDecision },
    { name: '完整审查流程', fn: testCompleteReviewFlow },
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
  console.log('📊 AI Review 测试总结');
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
    console.log('🎉 所有 AI Review 测试通过!\n');
    console.log('💡 关键特性:');
    console.log('   - GLM-4.7 AI 审查集成');
    console.log('   - 审查响应解析正确');
    console.log('   - 评论格式化功能完善');
    console.log('   - 审查决策逻辑正确\n');
  } else if (passed >= total * 0.8) {
    console.log(`✅ AI Review 基本功能测试通过! (${passed}/${total})\n`);
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
