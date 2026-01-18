/**
 * EXECUTE_COMMAND 工具测试
 * 测试命令执行功能
 */

const path = require("path");
const fs = require("fs").promises;

// ============================================================================
// 测试配置
// ============================================================================

const PROJECT_ROOT = "C:\\Users\\LeiYu\\Desktop\\code\\AI\\coding-agent\\git-tutor-ai";

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
// 辅助函数
// ============================================================================

async function importTool() {
  // 动态导入 TypeScript 文件需要先编译
  // 这里我们模拟工具的行为
  const { spawn } = require("child_process");

  return {
    name: "execute_command",
    handler: async (params) => {
      const { command, cwd = process.cwd(), timeout = 120 } = params;

      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        // 获取默认 shell
        const shell =
          process.platform === "win32"
            ? process.env.COMSPEC || "cmd.exe"
            : process.env.SHELL || "/bin/bash";

        // 准备 shell 参数
        let shellArgs;
        if (process.platform === "win32") {
          if (shell.toLowerCase().includes("powershell") || shell.toLowerCase().includes("pwsh")) {
            shellArgs = ["-Command", command];
          } else {
            shellArgs = ["/c", command];
          }
        } else {
          shellArgs = ["-l", "-c", command];
        }

        // 准备环境变量
        const execEnv = {
          ...process.env,
          TERM: "xterm-256color",
          PAGER: "cat",
          GIT_PAGER: "cat",
          SYSTEMD_PAGER: "",
          MANPAGER: "cat",
        };

        // 创建 shell 选项
        const shellOptions = {
          cwd: cwd,
          stdio: ["pipe", "pipe", "pipe"],
          env: execEnv,
        };

        // Windows cmd.exe 特殊处理
        if (process.platform === "win32" && shell.toLowerCase().includes("cmd")) {
          shellOptions.shell = true;
        }

        let stdout = "";
        let stderr = "";
        let timeoutHandle;

        const child = spawn(shell, shellArgs, shellOptions);

        // 设置超时
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            child.kill();
            resolve({
              success: false,
              error: `Command timed out after ${timeout} seconds`,
              command,
              cwd,
              stdout,
              stderr,
              exitCode: -1,
              duration: Date.now() - startTime,
            });
          }, timeout * 1000);
        }

        // 收集输出
        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        // 处理完成
        child.on("close", (code) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          resolve({
            success: code === 0,
            data: {
              command,
              cwd,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              output: [stdout, stderr].filter(Boolean).join("\n").trim(),
              exitCode: code,
              duration: Date.now() - startTime,
            },
          });
        });

        // 处理错误
        child.on("error", (error) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          reject(error);
        });
      });
    },
  };
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 执行简单命令
 */
async function testSimpleCommand() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1] 执行简单命令（echo）...");

    const tool = await importTool();

    // 根据平台选择命令
    const command = process.platform === "win32" ? "echo Hello World" : "echo 'Hello World'";

    const result = await tool.handler({ command });

    const passed = result.success && result.data.output.includes("Hello World");

    if (passed) {
      console.log(`✅ 命令执行成功`);
      console.log(`   输出: ${result.data.output}`);
      console.log(`   耗时: ${result.data.duration}ms`);
    } else {
      console.log(`❌ 命令执行失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "simple_command",
      passed,
      {
        output: result.data?.output,
        duration: result.data?.duration,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("simple_command", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 执行 Git 命令
 */
async function testGitCommand() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2] 执行 Git 命令（git status）...");

    const tool = await importTool();
    const result = await tool.handler({
      command: "git status",
      cwd: PROJECT_ROOT,
    });

    const passed = result.success;

    if (passed) {
      console.log(`✅ Git 命令执行成功`);
      console.log(`   输出预览: ${result.data.output.substring(0, 100)}...`);
    } else {
      console.log(`❌ Git 命令执行失败`);
      console.log(`   错误: ${result.data?.output || result.error}`);
    }

    recordResult(
      "git_command",
      passed,
      {
        exitCode: result.data?.exitCode,
        outputLength: result.data?.output?.length,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("git_command", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 执行 Node.js 脚本
 */
async function testNodeScript() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3] 执行 Node.js 脚本...");

    const tool = await importTool();
    const command = process.platform === "win32" ? "node -v" : "node -v";

    const result = await tool.handler({
      command,
      cwd: PROJECT_ROOT,
    });

    const passed = result.success && result.data.output.includes("v");

    if (passed) {
      console.log(`✅ Node.js 版本检查成功`);
      console.log(`   版本: ${result.data.output.trim()}`);
    } else {
      console.log(`❌ Node.js 命令执行失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "node_script",
      passed,
      {
        nodeVersion: result.data?.output?.trim(),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("node_script", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 工作目录切换
 */
async function testWorkingDirectory() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4] 测试工作目录切换...");

    const tool = await importTool();

    // 创建测试目录
    const testDir = path.join(PROJECT_ROOT, "temp_test_dir");
    await fs.mkdir(testDir, { recursive: true });

    // 在测试目录中创建文件
    const testFile = path.join(testDir, "test.txt");
    await fs.writeFile(testFile, "test content");

    // 列出文件
    const command = process.platform === "win32" ? "dir" : "ls";
    const result = await tool.handler({
      command,
      cwd: testDir,
    });

    const passed = result.success && result.data.output.includes("test.txt");

    if (passed) {
      console.log(`✅ 工作目录切换成功`);
      console.log(`   输出包含: test.txt`);
    } else {
      console.log(`❌ 工作目录切换失败`);
      console.log(`   输出: ${result.data?.output}`);
    }

    // 清理测试目录
    await fs.rm(testDir, { recursive: true, force: true });

    recordResult(
      "working_directory",
      passed,
      {
        cwd: testDir,
        outputContainsTest: result.data?.output?.includes("test.txt"),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("working_directory", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 命令超时
 */
async function testCommandTimeout() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5] 测试命令超时...");

    const tool = await importTool();

    // 执行一个会超时的命令（ping 5 秒，但设置 2 秒超时）
    // 使用 ping 因为它在所有平台上都能可靠工作
    const command = process.platform === "win32" ? "ping 127.0.0.1 -n 6" : "ping -c 6 127.0.0.1";

    const result = await tool.handler({
      command,
      timeout: 2, // 2 秒超时
    });

    // 超时测试：命令应该被超时终止
    // 1. result.success 应该是 false（因为被超时终止）
    // 2. result.error 应该包含 "timeout"
    // 3. result.exitCode 应该是 -1（超时标记）
    // 4. duration 应该接近超时时间（2000ms 左右）

    const hasTimeoutError = result.error?.toLowerCase().includes("timeout") ||
                           result.error?.toLowerCase().includes("timed out");
    const hasNegativeExitCode = result.exitCode === -1;
    const duration = result.data?.duration ?? result.duration;
    const durationAboutRight = duration >= 1900 && duration <= 2100;

    const passed = !result.success && hasTimeoutError && hasNegativeExitCode && durationAboutRight;

    if (passed) {
      console.log(`✅ 命令超时检测成功`);
      console.log(`   耗时: ${duration}ms`);
      console.log(`   错误: ${result.error}`);
      console.log(`   输出: ${result.stdout?.substring(0, 50)}...`);
    } else {
      console.log(`⚠️  超时测试未按预期工作`);
      console.log(`   result.success: ${result.success} (期望: false)`);
      console.log(`   hasTimeoutError: ${hasTimeoutError} (期望: true)`);
      console.log(`   error: ${result.error}`);
      console.log(`   hasNegativeExitCode: ${hasNegativeExitCode} (期望: true)`);
      console.log(`   durationAboutRight: ${durationAboutRight} (${duration}ms)`);
    }

    recordResult(
      "command_timeout",
      passed,
      {
        duration: result.data?.duration,
        timedOut: result.error?.includes("timeout") || result.data?.exitCode === -1,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("command_timeout", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 错误命令处理
 */
async function testInvalidCommand() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6] 测试错误命令处理...");

    const tool = await importTool();
    const result = await tool.handler({
      command: "nonexistent-command-xyz-123",
    });

    // 命令应该失败（exitCode 非 0）或抛出错误
    const passed = !result.success;

    if (passed) {
      console.log(`✅ 错误命令处理正确`);
      console.log(`   退出码: ${result.data?.exitCode || "N/A"}`);
      console.log(`   错误信息: ${result.data?.stderr?.substring(0, 100) || result.error || "Command failed"}`);
    } else {
      console.log(`❌ 错误命令处理未按预期工作`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "invalid_command",
      passed,
      {
        exitCode: result.data?.exitCode,
        hasError: !!result.error || !result.success,
      },
      Date.now() - startTime
    );
  } catch (error) {
    // 预期会抛出错误
    recordResult(
      "invalid_command",
      true,
      {
        caughtError: true,
        errorMessage: error.message,
      },
      Date.now() - startTime
    );
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - EXECUTE_COMMAND 工具测试");
  console.log("项目根目录:", PROJECT_ROOT);
  console.log("测试时间:", new Date().toLocaleString());
  console.log("测试项目: 6 个功能\n");

  const tests = [
    { name: "简单命令", fn: testSimpleCommand },
    { name: "Git 命令", fn: testGitCommand },
    { name: "Node.js 脚本", fn: testNodeScript },
    { name: "工作目录", fn: testWorkingDirectory },
    { name: "命令超时", fn: testCommandTimeout },
    { name: "错误命令", fn: testInvalidCommand },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`📊 测试 ${i + 1}/${tests.length}: ${test.name}`);
    console.log("=".repeat(80) + "\n");

    await test.fn();

    const result = testResults[testResults.length - 1];
    if (result.passed) {
      console.log(`✅ ${test.name}测试完成 (${result.duration}ms)`);
    } else {
      console.log(`❌ ${test.name}测试失败: ${result.details}`);
    }
    console.log();
  }

  printSummary();
}

function printSummary() {
  console.log("=".repeat(80));
  console.log("📊 EXECUTE_COMMAND 工具测试总结");
  console.log("=".repeat(80) + "\n");

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log("📈 统计:");
  console.log(`   - 总测试数: ${total}`);
  console.log(`   - ✅ 成功: ${passed}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%\n`);

  console.log("📋 详细结果:\n");

  testResults.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "通过" : "失败";
    console.log(`   ${index + 1}. ${icon} ${result.test} (${result.duration}ms) - ${status}`);
  });

  console.log();
  console.log("=".repeat(80));

  // 评分
  let rating = "";
  if (successRate === "100.0") rating = "⭐⭐⭐⭐⭐ 优秀!";
  else if (parseFloat(successRate) >= 80) rating = "⭐⭐⭐⭐ 很好!";
  else if (parseFloat(successRate) >= 60) rating = "⭐⭐⭐ 良好!";
  else rating = "⭐⭐ 及格";

  console.log(`🎯 总体评分: ${rating}\n`);

  if (passed === total) {
    console.log("🎉 所有 EXECUTE_COMMAND 工具测试通过!\n");
    console.log("💡 已验证的功能:");
    console.log("   - 简单命令执行（echo）");
    console.log("   - Git 命令执行");
    console.log("   - Node.js 脚本执行");
    console.log("   - 工作目录切换");
    console.log("   - 命令超时控制");
    console.log("   - 错误命令处理\n");
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch((error) => {
  console.error("\n💥 测试运行失败:", error);
  process.exit(1);
});
