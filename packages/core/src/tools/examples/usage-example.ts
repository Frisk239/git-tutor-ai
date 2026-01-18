/**
 * 工具系统使用示例
 *
 * 演示如何使用工具系统
 */

import {
  initializeTools,
  toolRegistry,
  toolExecutor,
  generateToolPrompt,
  ToolContext,
} from "../index.js";
import { createGitManager } from "../../git/manager.js";
import { createGitHubClient } from "../../github/client.js";
import { AIProvider } from "@git-tutor/shared";

async function example1() {
  console.log("=== 示例 1: 初始化工具系统 ===\n");

  // 1. 初始化工具（注册所有内置工具）
  initializeTools();

  // 2. 查看工具统计
  const stats = toolRegistry.getStats();
  console.log("工具统计:");
  console.log("- 总数:", stats.total);
  console.log("- 已启用:", stats.enabled);
  console.log("- 已禁用:", stats.disabled);
  console.log("- 实验性:", stats.experimental);
  console.log("- 按类别:", stats.byCategory);
  console.log("");

  // 3. 按类别查看工具
  const gitTools = toolRegistry.getByCategory("git");
  console.log("Git 工具:");
  gitTools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.displayName}`);
  });
  console.log("");

  const githubTools = toolRegistry.getByCategory("github");
  console.log("GitHub 工具:");
  githubTools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.displayName}`);
  });
}

async function example2() {
  console.log("\n=== 示例 2: 执行 Git 状态工具 ===\n");

  initializeTools();

  // 创建工具上下文
  const context: ToolContext = {
    projectId: "demo-project",
    projectPath: "/path/to/repo",
    conversationId: "conv-123",
    userId: "user-456",
    services: {
      git: createGitManager("/path/to/repo"),
    },
  };

  // 执行工具
  const result = await toolExecutor.execute("git_status", {}, context);

  if (result.success) {
    console.log("✅ 工具执行成功");
    console.log("数据:", result.data);
  } else {
    console.log("❌ 工具执行失败");
    console.log("错误:", result.error);
  }
}

async function example3() {
  console.log("\n=== 示例 3: 智能提交工具 ===\n");

  initializeTools();

  const context: ToolContext = {
    projectPath: "/path/to/repo",
    services: {
      git: createGitManager("/path/to/repo"),
    },
  };

  // 执行智能提交
  const result = await toolExecutor.execute(
    "git_smart_commit",
    {
      style: "conventional",
      language: "zh-CN",
    },
    context
  );

  if (result.success) {
    console.log("✅ 智能提交成功");
    console.log("生成的消息:", result.data?.message);
    console.log("Commit:", result.data?.commit);
  } else {
    console.log("❌ 提交失败:", result.error);
  }
}

async function example4() {
  console.log("\n=== 示例 4: GitHub 搜索仓库 ===\n");

  initializeTools();

  const context: ToolContext = {
    services: {
      github: createGitHubClient({
        token: process.env.GITHUB_TOKEN || "your-token",
      }),
    },
  };

  // 搜索 React 仓库
  const result = await toolExecutor.execute(
    "github_search_repos",
    {
      query: "react typescript",
      sort: "stars",
      order: "desc",
      limit: 5,
    },
    context
  );

  if (result.success) {
    console.log("✅ 搜索成功");
    console.log("仓库数量:", result.data?.totalCount);
    console.log("\n找到的仓库:");
    result.data?.repositories.forEach((repo: any) => {
      console.log(`  - ${repo.fullName}: ${repo.description || "无描述"}`);
      console.log(`    ⭐ ${repo.stargazersCount} stars`);
    });
  } else {
    console.log("❌ 搜索失败:", result.error);
  }
}

async function example5() {
  console.log("\n=== 示例 5: AI 审查 PR ===\n");

  initializeTools();

  const context: ToolContext = {
    services: {
      github: createGitHubClient({
        token: process.env.GITHUB_TOKEN || "your-token",
      }),
    },
  };

  // 审查 PR
  const result = await toolExecutor.execute(
    "github_review_pr",
    {
      owner: "facebook",
      repo: "react",
      prNumber: 12345,
      focus: "security",
      autoComment: false,
    },
    context
  );

  if (result.success) {
    console.log("✅ 审查完成");
    console.log("评分:", result.data?.review.rating, "/10");
    console.log("批准:", result.data?.review.approved);
    console.log("问题数量:", result.data?.review.issues.length);

    if (result.data?.review.issues.length > 0) {
      console.log("\n发现问题:");
      result.data.review.issues.forEach((issue: any, i: number) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.file}:${issue.line}`);
        console.log(`     ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
      });
    }
  } else {
    console.log("❌ 审查失败:", result.error);
  }
}

async function example6() {
  console.log("\n=== 示例 6: 批量执行工具 ===\n");

  initializeTools();

  const context: ToolContext = {
    projectPath: "/path/to/repo",
    services: {
      git: createGitManager("/path/to/repo"),
    },
  };

  // 批量执行多个工具
  const results = await toolExecutor.executeBatch(
    [
      {
        toolName: "git_status",
        params: {},
      },
      {
        toolName: "git_log",
        params: { maxCount: 5 },
      },
      {
        toolName: "git_diff",
        params: {},
      },
    ],
    context
  );

  console.log("批量执行结果:");
  results.forEach((result, i) => {
    console.log(`\n工具 ${i + 1}: ${result.success ? "✅" : "❌"}`);
    if (result.success) {
      console.log("数据:", JSON.stringify(result.data, null, 2));
    } else {
      console.log("错误:", result.error);
    }
  });
}

async function example7() {
  console.log("\n=== 示例 7: 生成 AI 工具提示词 ===\n");

  initializeTools();

  // 生成工具定义（用于 AI 系统提示词）
  const prompt = generateToolPrompt();

  console.log("AI 工具提示词:");
  console.log(prompt);
  console.log("\n---\n");

  // 或者获取简化版本
  const definition = toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      required: p.required,
    })),
  }));

  console.log("工具定义 JSON:");
  console.log(JSON.stringify(definition, null, 2));
}

async function example8() {
  console.log("\n=== 示例 8: 搜索工具 ===\n");

  initializeTools();

  // 搜索工具
  const searchResults = toolRegistry.search("commit");

  console.log("搜索 'commit' 的结果:");
  searchResults.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.displayName}`);
    console.log(`    ${tool.description}`);
  });
  console.log("");

  // 搜索 Git 类别的工具
  const gitTools = toolRegistry.getByCategory("git");
  console.log("Git 类别的所有工具:");
  gitTools.forEach((tool) => {
    console.log(`  - ${tool.name}`);
  });
}

async function example9() {
  console.log("\n=== 示例 9: 查看执行历史 ===\n");

  initializeTools();

  const context: ToolContext = {
    projectPath: "/path/to/repo",
    services: {
      git: createGitManager("/path/to/repo"),
    },
  };

  // 执行一些工具
  await toolExecutor.execute("git_status", {}, context);
  await toolExecutor.execute("git_log", { maxCount: 3 }, context);

  // 查看执行历史
  const history = toolExecutor.getExecutionHistory(10);

  console.log("执行历史:");
  history.forEach((exec) => {
    console.log(`\n${exec.id}:`);
    console.log(`  工具: ${exec.toolName}`);
    console.log(`  状态: ${exec.status}`);
    console.log(`  耗时: ${exec.duration}ms`);
    if (exec.result) {
      console.log(`  结果: ${exec.result.success ? "成功" : "失败"}`);
    }
    if (exec.error) {
      console.log(`  错误: ${exec.error.message}`);
    }
  });

  // 查看统计
  const stats = toolExecutor.getStats();
  console.log("\n执行统计:");
  console.log(`  总计: ${stats.total}`);
  console.log(`  完成: ${stats.completed}`);
  console.log(`  失败: ${stats.failed}`);
  console.log(`  平均耗时: ${stats.avgDuration}ms`);
}

async function example10() {
  console.log("\n=== 示例 10: AI 对话中的工具调用 ===\n");

  initializeTools();

  const context: ToolContext = {
    projectPath: "/path/to/repo",
    conversationId: "conv-123",
    userId: "user-456",
    services: {
      git: createGitManager("/path/to/repo"),
      github: createGitHubClient({
        token: process.env.GITHUB_TOKEN || "your-token",
      }),
    },
  };

  // 用户说: "帮我查看 Git 状态并提交这些更改"
  // AI 的处理流程:

  console.log("用户输入: \"帮我查看 Git 状态并提交这些更改\"\n");

  // 1. AI 识别意图 -> 需要执行 git_status 和 git_smart_commit
  console.log("1. AI 识别意图: 查看状态 + 智能提交\n");

  // 2. 调用 git_status
  console.log("2. 执行 git_status...");
  const statusResult = await toolExecutor.execute("git_status", {}, context);
  if (statusResult.success) {
    console.log("   ✅ Git 状态获取成功");
    console.log(`   更改的文件: ${statusResult.data?.files.length} 个\n`);
  }

  // 3. 调用 git_smart_commit
  console.log("3. 执行 git_smart_commit...");
  const commitResult = await toolExecutor.execute(
    "git_smart_commit",
    {
      style: "conventional",
      language: "zh-CN",
    },
    context
  );

  if (commitResult.success) {
    console.log("   ✅ 智能提交成功");
    console.log(`   生成的消息: ${commitResult.data?.message.title}`);
    console.log(`   Commit: ${commitResult.data?.commit.hash}\n`);
  }

  // 4. AI 生成友好的回复
  const aiResponse = `
✅ 已完成任务！

**Git 状态:**
- 更改的文件: ${statusResult.data?.files.length} 个
- 状态: ${statusResult.data?.files.length > 0 ? "有未提交的更改" : "工作区干净"}

**智能提交:**
- 类型: ${commitResult.data?.message.type}
- 描述: ${commitResult.data?.message.title}
- Commit: ${commitResult.data?.commit.hash?.substring(0, 7)}

代码已成功提交！🎉
  `;

  console.log("4. AI 回复:");
  console.log(aiResponse);
}

// 运行所有示例
async function runAllExamples() {
  console.log("工具系统示例\n");
  console.log("⚠️  警告：某些示例需要有效的 Git 仓库和 GitHub Token\n");

  try {
    await example1();
    // await example2();  // 需要实际的 Git 仓库
    // await example3();
    // await example4();
    // await example5();
    // await example6();
    await example7();  // 不需要实际仓库
    await example8();
    // await example9();
    // await example10();
  } catch (error: any) {
    console.error("示例执行失败:", error.message);
  }
}

if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
  example8,
  example9,
  example10,
};
