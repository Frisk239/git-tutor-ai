/**
 * ACT_MODE_RESPOND 工具测试
 *
 * 测试非阻塞进度更新功能
 */

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 工具导入
// ============================================================================

async function importTool() {
  // 使用 file:// 协议处理 Windows 绝对路径
  const modulePath = path.join(__dirname, "../../packages/core/src/tools/builtins/interaction/act-mode-respond.ts").replace(/\\/g, "/");
  const module = await import(`file:///${modulePath}`);

  return module.actModeRespondTool || module.default;
}

// ============================================================================
// 测试辅助函数
// ============================================================================

const testResults = [];

function recordResult(testName, passed, details = {}, duration = 0) {
  testResults.push({
    test: testName,
    passed,
    details,
    duration,
  });
}

function printSummary() {
  console.log("\n📊 ACT_MODE_RESPOND 工具测试总结");
  console.log("=".repeat(80));

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  const total = testResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(`📈 统计:`);
  console.log(`   - 总测试数: ${total}`);
  console.log(`   - ✅ 成功: ${passed}`);
  console.log(`   - ❌ 失败: ${failed}`);
  console.log(`   - 📊 成功率: ${successRate}%`);

  console.log(`\n📋 详细结果:\n`);

  testResults.forEach((result, idx) => {
    const status = result.passed ? "✅" : "❌";
    const statusText = result.passed ? "通过" : "失败";
    console.log(`   ${idx + 1}. ${status} ${result.test} (${statusText})`);
    if (!result.passed || Object.keys(result.details).length > 0) {
      console.log(`      详情:`, result.details);
    }
  });

  console.log("\n" + "=".repeat(80));

  // 评分
  let rating = "";
  if (successRate === "100.0") {
    rating = "⭐⭐⭐⭐⭐ 优秀!";
    console.log(`🎯 总体评分: ${rating}`);
    console.log(`\n🎉 所有 ACT_MODE_RESPOND 工具测试通过!\n`);
  } else if (parseFloat(successRate) >= 80) {
    rating = "⭐⭐⭐⭐ 良好";
    console.log(`⚠️  总体评分: ${rating}`);
    console.log(`\n❌ ${failed} 个测试失败,需要修复\n`);
  } else if (parseFloat(successRate) >= 60) {
    rating = "⭐⭐⭐ 及格";
    console.log(`⚠️  总体评分: ${rating}`);
    console.log(`\n❌ ${failed} 个测试失败,需要修复\n`);
  } else {
    rating = "⭐⭐ 需要改进";
    console.log(`⚠️  总体评分: ${rating}`);
    console.log(`\n❌ ${failed} 个测试失败,需要修复\n`);
  }

  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// 测试用例
// ============================================================================

/**
 * 测试 1: 基本进度更新
 */
async function testBasicProgressUpdate() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1: 基本进度更新...");

    const tool = await importTool();

    const result = await tool.handler.execute(
      {},
      {
        response: "正在读取配置文件...",
      }
    );

    const passed = result.success && result.data?.success === true;

    if (passed) {
      console.log(`✅ 基本进度更新成功`);
      console.log(`   消息: ${result.data.message}`);
    } else {
      console.log(`❌ 基本进度更新失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "basic_progress_update",
      passed,
      {
        message: result.data?.message,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 基本进度更新异常: ${error.message}`);
    recordResult("basic_progress_update", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 2: 带任务清单的进度更新
 */
async function testProgressWithTaskList() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2: 带任务清单的进度更新...");

    const tool = await importTool();

    const taskProgress = `- [x] 读取配置文件
- [ ] 分析代码结构
- [ ] 实现新功能
- [ ] 编写测试`;

    const result = await tool.handler.execute(
      {},
      {
        response: "正在分析代码结构...",
        task_progress: taskProgress,
      }
    );

    const passed = result.success && result.data?.success === true && result.data?.progressUpdated === true;

    if (passed) {
      console.log(`✅ 带任务清单的进度更新成功`);
      console.log(`   消息: ${result.data.message}`);
      console.log(`   任务清单已更新: ${result.data.progressUpdated}`);
    } else {
      console.log(`❌ 带任务清单的进度更新失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "progress_with_task_list",
      passed,
      {
        message: result.data?.message,
        progressUpdated: result.data?.progressUpdated,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 带任务清单的进度更新异常: ${error.message}`);
    recordResult("progress_with_task_list", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 3: 缺少必需参数
 */
async function testMissingRequiredParameter() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3: 缺少必需参数...");

    const tool = await importTool();

    // 不提供 response 参数
    const result = await tool.handler.execute({}, {});

    const passed = !result.success && result.error?.includes("response");

    if (passed) {
      console.log(`✅ 参数验证成功`);
      console.log(`   正确捕获了缺少参数的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 参数验证失败`);
      console.log(`   应该返回错误但没有`);
    }

    recordResult(
      "missing_required_parameter",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 参数验证异常: ${error.message}`);
    recordResult("missing_required_parameter", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 4: 空字符串参数
 */
async function testEmptyStringParameter() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4: 空字符串参数...");

    const tool = await importTool();

    // 提供空字符串
    const result = await tool.handler.execute(
      {},
      {
        response: "   ",
      }
    );

    const passed = !result.success && result.error?.includes("response");

    if (passed) {
      console.log(`✅ 空字符串验证成功`);
      console.log(`   正确捕获了空字符串的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 空字符串验证失败`);
      console.log(`   应该返回错误但没有`);
    }

    recordResult(
      "empty_string_parameter",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 空字符串验证异常: ${error.message}`);
    recordResult("empty_string_parameter", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 5: 防止频繁调用
 */
async function testRateLimiting() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5: 防止频繁调用...");

    const tool = await importTool();

    // 第一次调用
    const result1 = await tool.handler.execute(
      {},
      {
        response: "第一次调用...",
      }
    );

    // 立即进行第二次调用 (应该被拒绝)
    const result2 = await tool.handler.execute(
      {},
      {
        response: "第二次调用...",
      }
    );

    const passed =
      result1.success && !result2.success && result2.error?.includes("不能连续调用");

    if (passed) {
      console.log(`✅ 防止频繁调用成功`);
      console.log(`   第一次调用: 成功`);
      console.log(`   第二次调用: 被拒绝`);
      console.log(`   错误信息: ${result2.error}`);
    } else {
      console.log(`❌ 防止频繁调用失败`);
      console.log(`   result1.success: ${result1.success}`);
      console.log(`   result2.success: ${result2.success}`);
      console.log(`   result2.error: ${result2.error}`);
    }

    recordResult(
      "rate_limiting",
      passed,
      {
        firstCallSuccess: result1.success,
        secondCallSuccess: result2.success,
        secondCallError: result2.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 防止频繁调用异常: ${error.message}`);
    recordResult("rate_limiting", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 6: 非阻塞特性
 */
async function testNonBlocking() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6: 非阻塞特性...");

    const tool = await importTool();

    const callStart = Date.now();

    const result = await tool.handler.execute(
      {},
      {
        response: "正在执行长时间操作...",
      }
    );

    const callDuration = Date.now() - callStart;

    // 非阻塞调用应该非常快 (< 100ms)
    const passed = result.success && callDuration < 100;

    if (passed) {
      console.log(`✅ 非阻塞特性验证成功`);
      console.log(`   调用时长: ${callDuration}ms`);
      console.log(`   确实是非阻塞的 (< 100ms)`);
    } else {
      console.log(`❌ 非阻塞特性验证失败`);
      console.log(`   调用时长: ${callDuration}ms`);
      console.log(`   可能是阻塞的 (> 100ms)`);
    }

    recordResult(
      "non_blocking",
      passed,
      {
        callDuration,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 非阻塞特性验证异常: ${error.message}`);
    recordResult("non_blocking", false, { error: error.message }, Date.now() - startTime);
  }
}

// ============================================================================
// 测试运行器
// ============================================================================

async function runTests() {
  console.log("🚀 开始 ACT_MODE_RESPOND 工具测试\n");

  // 运行所有测试
  await testBasicProgressUpdate();
  await testProgressWithTaskList();
  await testMissingRequiredParameter();
  await testEmptyStringParameter();
  await testRateLimiting();
  await testNonBlocking();

  // 打印总结
  printSummary();
}

// ============================================================================
// 主程序
// ============================================================================

runTests().catch((error) => {
  console.error("测试运行失败:", error);
  process.exit(1);
});
