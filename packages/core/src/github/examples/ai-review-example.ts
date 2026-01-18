/**
 * GitHub AI 代码审查使用示例
 *
 * 演示如何使用 AI 自动审查 Pull Request
 */

import { createGitHubClient } from '../client.js';
import { createGitHubAIReviewService, AIReviewOptions } from '../ai-review.js';
import { AIProvider } from '@git-tutor/shared';

async function example1() {
  console.log('=== 示例 1: 基本 PR 审查 ===\n');

  // 1. 创建 GitHub 客户端
  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  // 2. 创建 AI 审查服务
  const reviewService = createGitHubAIReviewService(github, AIProvider.ANTHROPIC);

  try {
    // 3. 执行审查
    const review = await reviewService.reviewPullRequest('owner', 'repo', 123);

    console.log('评分:', review.rating);
    console.log('总结:', review.summary);
    console.log('问题数量:', review.issues.length);
    console.log('是否批准:', review.approved);
  } catch (error) {
    console.error('审查失败:', error);
  }
}

async function example2() {
  console.log('\n=== 示例 2: 审查并自动评论 ===\n');

  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  const reviewService = createGitHubAIReviewService(github);

  try {
    // 审查并发布评论
    const result = await reviewService.reviewAndComment('owner', 'repo', 123);

    console.log('审查完成！');
    console.log('评论 URL:', result.commentUrl);
    console.log('评分:', result.review.rating);
  } catch (error) {
    console.error('失败:', error);
  }
}

async function example3() {
  console.log('\n=== 示例 3: 智能审查并自动批准/拒绝 ===\n');

  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  const reviewService = createGitHubAIReviewService(github);

  try {
    // AI 自动决定是否批准
    const result = await reviewService.reviewAndApprove('owner', 'repo', 123);

    if (result.approved) {
      console.log('✅ PR 已自动批准');
      console.log('评分:', result.review.rating);
    } else {
      console.log('⚠️ PR 需要人工审查');
      console.log('评分:', result.review.rating);
      console.log('建议:', result.review.summary);
    }
  } catch (error) {
    console.error('失败:', error);
  }
}

async function example4() {
  console.log('\n=== 示例 4: 自定义审查选项 ===\n');

  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  const reviewService = createGitHubAIReviewService(github, AIProvider.GEMINI);

  const options: AIReviewOptions = {
    provider: AIProvider.GEMINI,
    model: 'gemini-2.5-pro',
    language: 'zh-CN',
    focus: 'security', // 专注于安全性审查
    maxIssues: 20,
  };

  try {
    const review = await reviewService.reviewPullRequest('owner', 'repo', 123, options);

    console.log('安全性审查结果:');
    console.log('评分:', review.rating);
    console.log('严重问题:', review.issues.filter((i) => i.severity === 'error').length);
  } catch (error) {
    console.error('失败:', error);
  }
}

async function example5() {
  console.log('\n=== 示例 5: AI 对话集成 ===\n');

  // 用户: "帮我审查一下最新的 PR"
  // AI 的处理流程：

  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  const reviewService = createGitHubAIReviewService(github);

  try {
    // 1. AI 识别意图 -> 审查 PR
    // 2. AI 获取最新的 PR
    // 3. 调用审查服务
    const review = await reviewService.reviewPullRequest('owner', 'repo', 123);

    // 4. AI 返回友好的回复
    const response = `
📊 **PR 审查报告**

**评分**: ${review.rating}/10 ${review.rating >= 7 ? '✅' : '⚠️'}

**总结**:
${review.summary}

**发现的问题**: ${review.issues.length} 个

${review.issues
  .slice(0, 5)
  .map(
    (issue, i) => `
${i + 1}. **${issue.severity.toUpperCase()}** - ${issue.file}:${issue.line}
   ${issue.message}
${issue.suggestion ? `   💡 ${issue.suggestion}` : ''}
`
  )
  .join('\n')}

${review.approved ? '✅ 建议合并此 PR' : '⚠️ 建议修改后再合并'}
    `;

    console.log(response);
  } catch (error) {
    console.error('审查失败:', error);
  }
}

async function example6() {
  console.log('\n=== 示例 6: 完整的 PR 工作流 ===\n');

  const github = createGitHubClient({
    token: process.env.GITHUB_TOKEN || 'your-github-token',
  });

  const reviewService = createGitHubAIReviewService(github);

  try {
    // 1. 获取 PR 信息
    const pr = await github.getPullRequest('owner', 'repo', 123);
    console.log(`PR #${pr.number}: ${pr.title}`);
    console.log(`分支: ${pr.head.ref} -> ${pr.base.ref}`);
    console.log(`更改: +${pr.additions} -${pr.deletions} (${pr.changedFiles} 文件)\n`);

    // 2. 执行 AI 审查
    console.log('执行 AI 审查...');
    const review = await reviewService.reviewPullRequest('owner', 'repo', 123);

    // 3. 根据评分决定下一步
    if (review.rating >= 8 && review.issues.filter((i) => i.severity === 'error').length === 0) {
      console.log('✅ PR 质量优秀，自动批准');
      // 自动合并（如果配置允许）
      // const result = await github.mergePullRequest("owner", "repo", 123);
    } else if (review.rating >= 5) {
      console.log('⚠️ PR 质量良好，但有小问题');
      console.log('发布审查评论...');
      await reviewService.reviewAndComment('owner', 'repo', 123);
    } else {
      console.log('🚫 PR 存在严重问题，请求更改');
      await reviewService.reviewAndComment('owner', 'repo', 123);
    }

    // 4. 输出报告
    console.log('\n审查完成:');
    console.log('- 评分:', review.rating + '/10');
    console.log('- 问题:', review.issues.length + ' 个');
    console.log('- 状态:', review.approved ? '批准' : '需要改进');
  } catch (error) {
    console.error('失败:', error);
  }
}

// 运行所有示例
async function runAllExamples() {
  console.log('GitHub AI 代码审查示例\n');
  console.log('⚠️  警告：这些示例需要有效的 GitHub Token 和仓库');
  console.log('请设置 GITHUB_TOKEN 环境变量后运行\n');

  // 取消注释以运行：
  // await example1();
  // await example2();
  // await example3();
  // await example4();
  // await example5();
  // await example6();
}

if (require.main === module) {
  runAllExamples().catch(console.error);
}

export { example1, example2, example3, example4, example5, example6 };
