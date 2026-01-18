/**
 * Git Tutor AI - 全面工具测试
 *
 * 测试所有 25 个工具的基本功能
 */

import { initializeTools, toolExecutor } from "@git-tutor/core/tools";
import { ToolContext } from "@git-tutor/core/tools/types";
import { loadEnv } from "../utils/env";

// 加载环境变量
loadEnv();

// 初始化工具系统
initializeTools();

// 创建测试上下文
const context: ToolContext = {
  projectPath: process.cwd(),
  services: {},
};

// 测试结果记录
const testResults: Array<{
  tool: string;
  success: boolean;
  error?: string;
  duration: number;
}> = [];

/**
 * 执行单个工具测试
 */
async function testTool(
  toolName: string,
  params: Record<string, any>
): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`\n🔧 测试工具: ${toolName}`);
    console.log(`📋 参数:`, JSON.stringify(params, null, 2));

    const result = await toolExecutor.execute(toolName, params, context);

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ 成功 (${duration}ms)`);
      console.log(`📊 结果:`, JSON.stringify(result.data, null, 2).substring(0, 500) + "...");
      testResults.push({
        tool: toolName,
        success: true,
        duration,
      });
    } else {
      console.log(`❌ 失败 (${duration}ms)`);
      console.log(`🔴 错误:`, result.error);
      testResults.push({
        tool: toolName,
        success: false,
        error: result.error,
        duration,
      });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`💥 异常 (${duration}ms)`);
    console.log(`🔴 异常信息:`, error.message);
    testResults.push({
      tool: toolName,
      success: false,
      error: error.message,
      duration,
    });
  }
}

/**
 * 测试套件
 */
async function runTests(): Promise<void> {
  console.log("🚀 开始测试 Git Tutor AI 工具系统\n");
  console.log("=" .repeat(60));

  // ============================================
  // 1. Git 工具测试 (6 个)
  // ============================================
  console.log("\n\n📁 测试 Git 工具 (6 个)");

  await testTool("git_status", {});
  await testTool("git_diff", {});
  await testTool("git_log", { maxCount: 5 });

  // git_commit 需要实际变更,跳过
  // await testTool("git_commit", { message: "Test commit" });
  // await testTool("git_smart_commit", { preview: true });
  // await testTool("git_create_branch", { branch: "test-branch" });

  // ============================================
  // 2. 文件系统工具测试 (11 个)
  // ============================================
  console.log("\n\n📂 测试文件系统工具 (11 个)");

  // 创建测试目录
  const testDir = "test-temp";
  const testFile = `${testDir}/test.txt`;

  await testTool("create_directory", { path: testDir });
  await testTool("write_file", {
    path: testFile,
    content: "Hello, Git Tutor AI!",
  });
  await testTool("read_file", { path: testFile });
  await testTool("get_file_stats", { path: testFile });
  await testTool("list_files", { path: testDir });
  await testTool("edit_file", {
    path: testFile,
    edits: [
      {
        oldText: "Hello",
        newText: "Hi",
      },
    ],
  });
  await testTool("copy_file", {
    source: testFile,
    destination: `${testDir}/test-copy.txt`,
  });
  await testTool("move_file", {
    source: `${testDir}/test-copy.txt`,
    destination: `${testDir}/test-moved.txt`,
  });
  await testTool("search_files", {
    pattern: "*.txt",
    path: testDir,
  });

  // 清理测试文件
  await testTool("delete_file", { path: `${testDir}/test-moved.txt` });
  await testTool("delete_file", { path: testFile });

  // ============================================
  // 3. 补丁工具测试 (1 个)
  // ============================================
  console.log("\n\n🔨 测试补丁工具 (1 个)");

  await testTool("apply_patch", {
    patch: `
@@ v4a
@ ${testDir}/patch-test.txt
+ This is a new line
- This line will be removed
  This line is modified
`,
    workspace: process.cwd(),
  });

  // ============================================
  // 4. Web 工具测试 (2 个)
  // ============================================
  console.log("\n\n🌐 测试 Web 工具 (2 个)");

  // DuckDuckGo 不需要 API key
  await testTool("web_search", {
    query: "TypeScript tutorial",
    provider: "duckduckgo",
    limit: 3,
  });

  await testTool("web_fetch", {
    url: "https://example.com",
    returnFormat: "markdown",
    maxContentLength: 5000,
  });

  // ============================================
  // 5. AI 工具测试 (1 个)
  // ============================================
  console.log("\n\n🤖 测试 AI 工具 (1 个)");

  // 需要先有一些 Git 变更
  await testTool("generate_explanation", {
    style: "summary",
    maxLength: 500,
  });

  // ============================================
  // 6. GitHub 工具测试 (跳过,需要 GITHUB_TOKEN)
  // ============================================
  console.log("\n\n🐙 GitHub 工具 (跳过,需要 GITHUB_TOKEN)");
  console.log("如果需要测试,请设置 GITHUB_TOKEN 环境变量");

  // ============================================
  // 测试总结
  // ============================================
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 测试总结\n");

  const total = testResults.length;
  const success = testResults.filter((r) => r.success).length;
  const failed = total - success;
  const successRate = ((success / total) * 100).toFixed(1);

  console.log(`总测试数: ${total}`);
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${successRate}%`);

  // 失败的测试
  if (failed > 0) {
    console.log("\n❌ 失败的工具:");
    testResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.tool}: ${r.error}`);
      });
  }

  // 性能统计
  const avgDuration =
    testResults.reduce((sum, r) => sum + r.duration, 0) / total;
  console.log(`\n⏱️  平均耗时: ${avgDuration.toFixed(0)}ms`);

  // 最慢的工具
  const slowest = [...testResults].sort((a, b) => b.duration - a.duration)[0];
  console.log(`🐌 最慢工具: ${slowest.tool} (${slowest.duration}ms)`);

  // 最快的工具
  const fastest = [...testResults].sort((a, b) => a.duration - b.duration)[0];
  console.log(`⚡ 最快工具: ${fastest.tool} (${fastest.duration}ms)`);

  console.log("\n" + "=".repeat(60));
  console.log("✨ 测试完成!\n");
}

// 运行测试
runTests().catch((error) => {
  console.error("💥 测试运行失败:", error);
  process.exit(1);
});
