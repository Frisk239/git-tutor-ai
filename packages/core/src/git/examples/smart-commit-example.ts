/**
 * 智能 Commit 使用示例
 *
 * 演示如何使用 AI 生成智能 Git 提交消息
 */

import { createGitManager } from "../manager.js";
import { createSmartCommitService, SmartCommitOptions } from "../smart-commit.js";
import { AIProvider } from "@git-tutor/shared";

async function example1() {
  console.log("=== 示例 1: 自动生成并执行提交 ===\n");

  // 1. 创建 Git 管理器
  const git = createGitManager("/path/to/your/repo");

  // 2. 创建智能提交服务
  const smartCommit = createSmartCommitService(git, AIProvider.ANTHROPIC);

  try {
    // 3. 执行智能提交（自动分析更改并生成消息）
    const result = await smartCommit.smartCommit();

    console.log("✅ 提交成功！");
    console.log("📝 生成的消息结构:", result.message);
    console.log("🔑 Commit Hash:", result.commit.hash);
    console.log("📄 完整消息:", result.commit.message);
  } catch (error) {
    console.error("❌ 提交失败:", error);
  }
}

async function example2() {
  console.log("\n=== 示例 2: 只生成消息，不提交 ===\n");

  const git = createGitManager("/path/to/your/repo");
  const smartCommit = createSmartCommitService(git);

  try {
    // 只生成提交消息
    const message = await smartCommit.generateCommitMessage();

    console.log("生成的提交消息:");
    console.log("Type:", message.type);
    console.log("Scope:", message.scope || "无");
    console.log("Title:", message.title);
    console.log("Body:", message.body || "无");
    console.log("Breaking:", message.breaking || false);
  } catch (error) {
    console.error("生成失败:", error);
  }
}

async function example3() {
  console.log("\n=== 示例 3: 自定义选项 ===\n");

  const git = createGitManager("/path/to/your/repo");
  const smartCommit = createSmartCommitService(git);

  const options: SmartCommitOptions = {
    provider: AIProvider.GEMINI,
    model: "gemini-2.5-pro",
    language: "zh-CN",
    style: "conventional",
    maxLength: 100,
  };

  try {
    const message = await smartCommit.generateCommitMessage(options);
    console.log("自定义选项生成的消息:", message);
  } catch (error) {
    console.error("生成失败:", error);
  }
}

async function example4() {
  console.log("\n=== 示例 4: 提交指定文件 ===\n");

  const git = createGitManager("/path/to/your/repo");
  const smartCommit = createSmartCommitService(git);

  try {
    // 只提交特定文件
    const files = ["src/components/Button.tsx", "src/styles/button.css"];
    const result = await smartCommit.smartCommit(files);

    console.log("✅ 指定文件提交成功！");
    console.log("提交的文件:", files);
    console.log("生成的消息:", result.message);
  } catch (error) {
    console.error("提交失败:", error);
  }
}

async function example5() {
  console.log("\n=== 示例 5: 不同风格的提交消息 ===\n");

  const git = createGitManager("/path/to/your/repo");
  const smartCommit = createSmartCommitService(git);

  try {
    // Conventional Commits 风格
    const conventional = await smartCommit.generateCommitMessage({
      style: "conventional",
      language: "en-US",
    });
    console.log("Conventional:", conventional);

    // 简单风格
    const simple = await smartCommit.generateCommitMessage({
      style: "simple",
      language: "en-US",
    });
    console.log("Simple:", simple);

    // 详细风格
    const detailed = await smartCommit.generateCommitMessage({
      style: "detailed",
      language: "zh-CN",
    });
    console.log("Detailed:", detailed);
  } catch (error) {
    console.error("生成失败:", error);
  }
}

/**
 * 集成到 AI 对话中的示例
 */
async function exampleAIIntegration() {
  console.log("\n=== 示例 6: AI 对话集成 ===\n");

  // 用户: "帮我提交这些更改"
  // AI 的处理流程：

  const git = createGitManager("/path/to/your/repo");
  const smartCommit = createSmartCommitService(git);

  // 1. AI 分析用户意图 -> 识别为 commit 操作
  // 2. AI 调用 smartCommit 工具
  try {
    const result = await smartCommit.smartCommit();

    // 3. AI 返回友好的回复
    const response = `
✅ 已成功提交代码！

**提交信息：**
- 类型: ${result.message.type}
- 描述: ${result.message.title}
${result.message.scope ? `- 范围: ${result.message.scope}` : ""}

**Commit Hash:** \`${result.commit.hash}\`

**完整消息：**
\`\`\`
${result.commit.message}
\`\`\`
    `;

    console.log(response);
  } catch (error) {
    console.error("提交失败:", error);
  }
}

// 运行所有示例
async function runAllExamples() {
  // 注意：这些是示例，实际运行需要有效的 Git 仓库
  console.log("智能 Commit 服务示例\n");
  console.log("⚠️  警告：这些示例需要有效的 Git 仓库");
  console.log("请修改路径后运行\n");

  // 取消注释以运行：
  // await example1();
  // await example2();
  // await example3();
  // await example4();
  // await example5();
  // await exampleAIIntegration();
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
  exampleAIIntegration,
};
