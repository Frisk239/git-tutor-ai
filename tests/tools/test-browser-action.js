/**
 * BROWSER_ACTION 工具测试
 *
 * 测试浏览器自动化功能
 */

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 工具导入
// ============================================================================

async function importTool() {
  const modulePath = path.join(__dirname, "../../packages/core/src/tools/builtins/browser/browser-action.ts").replace(/\\/g, "/");
  const module = await import(`file:///${modulePath}`);
  return module.browserActionTool || module.default;
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
  console.log("\n📊 BROWSER_ACTION 工具测试总结");
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

  if (successRate === "100.0") {
    console.log(`🎯 总体评分: ⭐⭐⭐⭐⭐ 优秀!`);
    console.log(`\n🎉 所有 BROWSER_ACTION 工具测试通过!\n`);
  } else if (parseFloat(successRate) >= 80) {
    console.log(`⚠️  总体评分: ⭐⭐⭐⭐ 良好`);
  } else if (parseFloat(successRate) >= 60) {
    console.log(`⚠️  总体评分: ⭐⭐⭐ 及格`);
  } else {
    console.log(`⚠️  总体评分: ⭐⭐ 需要改进`);
  }

  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// 测试用例
// ============================================================================

/**
 * 测试 1: 参数验证 - 无效操作
 */
async function testInvalidAction() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1: 无效操作...");

    const tool = await importTool();

    const result = await tool.handler.execute({}, {
      action: "invalid_action",
    });

    const passed = !result.success && result.error?.includes("无效的操作类型");

    if (passed) {
      console.log(`✅ 参数验证成功`);
      console.log(`   正确捕获了无效操作错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 参数验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "invalid_action",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 参数验证异常: ${error.message}`);
    recordResult("invalid_action", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 2: launch 缺少 URL 参数
 */
async function testLaunchMissingUrl() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2: launch 缺少 URL 参数...");

    const tool = await importTool();

    const result = await tool.handler.execute({}, {
      action: "launch",
    });

    const passed = !result.success && result.error?.includes("url");

    if (passed) {
      console.log(`✅ 参数验证成功`);
      console.log(`   正确捕获了缺少 URL 参数的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 参数验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "launch_missing_url",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 参数验证异常: ${error.message}`);
    recordResult("launch_missing_url", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 3: click 缺少坐标参数
 */
async function testClickMissingCoordinate() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3: click 缺少坐标参数...");

    const tool = await importTool();

    const result = await tool.handler.execute({}, {
      action: "click",
    });

    const passed = !result.success && result.error?.includes("coordinate");

    if (passed) {
      console.log(`✅ 参数验证成功`);
      console.log(`   正确捕获了缺少坐标参数的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 参数验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "click_missing_coordinate",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 参数验证异常: ${error.message}`);
    recordResult("click_missing_coordinate", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 4: type 缺少文本参数
 */
async function testTypeMissingText() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4: type 缺少文本参数...");

    const tool = await importTool();

    const result = await tool.handler.execute({}, {
      action: "type",
    });

    const passed = !result.success && result.error?.includes("text");

    if (passed) {
      console.log(`✅ 参数验证成功`);
      console.log(`   正确捕获了缺少文本参数的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 参数验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "type_missing_text",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 参数验证异常: ${error.message}`);
    recordResult("type_missing_text", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 5: 坐标格式验证
 */
async function testCoordinateFormatValidation() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5: 坐标格式验证...");

    const tool = await importTool();

    // 测试错误的坐标格式
    const result = await tool.handler.execute({}, {
      action: "click",
      coordinate: "invalid_format",
    });

    const passed = !result.success && result.error?.includes("坐标格式错误");

    if (passed) {
      console.log(`✅ 坐标格式验证成功`);
      console.log(`   正确捕获了坐标格式错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 坐标格式验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "coordinate_format_validation",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 坐标格式验证异常: ${error.message}`);
    recordResult("coordinate_format_validation", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 6: 坐标范围验证
 */
async function testCoordinateRangeValidation() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6: 坐标范围验证...");

    const tool = await importTool();

    // 测试超出范围的坐标
    const result = await tool.handler.execute({}, {
      action: "click",
      coordinate: "9999,9999",
    });

    const passed = !result.success && result.error?.includes("坐标超出视口范围");

    if (passed) {
      console.log(`✅ 坐标范围验证成功`);
      console.log(`   正确捕获了坐标超出范围的错误`);
      console.log(`   错误信息: ${result.error}`);
    } else {
      console.log(`❌ 坐标范围验证失败`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   result.error: ${result.error}`);
    }

    recordResult(
      "coordinate_range_validation",
      passed,
      {
        error: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ 坐标范围验证异常: ${error.message}`);
    recordResult("coordinate_range_validation", false, { error: error.message }, Date.now() - startTime);
  }
}

/**
 * 测试 7: close 操作
 */
async function testCloseOperation() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 7: close 操作...");

    const tool = await importTool();

    const result = await tool.handler.execute({}, {
      action: "close",
    });

    // close 操作应该成功(即使没有浏览器启动)
    const passed = result.success;

    if (passed) {
      console.log(`✅ close 操作成功`);
      console.log(`   浏览器已关闭`);
    } else {
      console.log(`❌ close 操作失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "close_operation",
      passed,
      {
        data: result.data,
      },
      Date.now() - startTime
    );
  } catch (error) {
    console.log(`❌ close 操作异常: ${error.message}`);
    recordResult("close_operation", false, { error: error.message }, Date.now() - startTime);
  }
}

// ============================================================================
// 测试运行器
// ============================================================================

async function runTests() {
  console.log("🚀 开始 BROWSER_ACTION 工具测试\n");
  console.log("⚠️  注意: 完整的浏览器测试需要安装 puppeteer-core");
  console.log("当前只测试参数验证功能,不涉及实际的浏览器操作\n");

  // 运行所有测试
  await testInvalidAction();
  await testLaunchMissingUrl();
  await testClickMissingCoordinate();
  await testTypeMissingText();
  await testCoordinateFormatValidation();
  await testCoordinateRangeValidation();
  await testCloseOperation();

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
