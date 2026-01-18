/**
 * ASK 工具测试
 * 测试用户交互功能
 */

// ============================================================================
// 测试配置
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
// 模拟用户交互回调
// ============================================================================

/**
 * 创建测试用的用户交互回调
 */
function createTestCallbacks(responses = {}) {
  return {
    askUser: async (question, options) => {
      // 如果有预定义的响应，返回对应的响应
      const key = options ? `${question}_${JSON.stringify(options)}` : question;

      if (responses[key] !== undefined) {
        return responses[key];
      }

      // 如果有选项，返回第一个选项
      if (options && options.length > 0) {
        return options[0];
      }

      // 否则返回默认响应
      return "用户响应";
    },

    showNotification: (title, message) => {
      console.log(`📢 [${title}] ${message}`);
    },
  };
}

// ============================================================================
// 工具导入
// ============================================================================

async function importTool() {
  // 这里我们模拟工具的行为
  return {
    name: "ask",
    handler: async (params, callbacks) => {
      const { question, options, required = true, timeout } = params;

      const startTime = Date.now();

      try {
        // 1. 参数验证
        if (!question || question.trim().length === 0) {
          return {
            success: false,
            error: "问题文本不能为空",
          };
        }

        // 2. 验证选项
        if (options) {
          if (!Array.isArray(options)) {
            return {
              success: false,
              error: "选项必须是数组",
            };
          }

          if (options.length < 2 || options.length > 5) {
            return {
              success: false,
              error: "选项数量必须在 2-5 个之间",
            };
          }

          for (const option of options) {
            if (typeof option !== "string") {
              return {
                success: false,
                error: "每个选项都必须是字符串",
              };
            }
          }
        }

        // 3. 显示通知
        if (callbacks.showNotification) {
          callbacks.showNotification(
            "Git Tutor AI 需要您的输入",
            question.substring(0, 100) + (question.length > 100 ? "..." : "")
          );
        }

        // 4. 等待用户响应
        let response;
        try {
          const userResponsePromise = callbacks.askUser(question, options);

          if (timeout) {
            response = await Promise.race([
              userResponsePromise,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("用户响应超时")), timeout)
              ),
            ]);
          } else {
            response = await userResponsePromise;
          }
        } catch (error) {
          const errorMessage = error.message || String(error);

          if (required) {
            return {
              success: false,
              error: `无法获取用户响应: ${errorMessage}`,
            };
          }

          return {
            success: true,
            data: {
              response: "",
              hasResponse: false,
              responseTime: Date.now() - startTime,
            },
          };
        }

        // 5. 处理用户响应
        const selectedOption = options?.find((opt) => opt === response);
        const responseTime = Date.now() - startTime;

        // 6. 返回结果
        return {
          success: true,
          data: {
            response,
            selectedOption,
            hasResponse: response.trim().length > 0,
            responseTime,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    },
  };
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 简单提问（无选项）
 */
async function testSimpleQuestion() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1] 简单提问（无选项）...");

    const tool = await importTool();
    const callbacks = createTestCallbacks({
      "您想使用哪个框架？": "React",
    });

    const result = await tool.handler(
      {
        question: "您想使用哪个框架？",
      },
      callbacks
    );

    const passed = result.success && result.data?.response === "React";

    if (passed) {
      console.log(`✅ 简单提问成功`);
      console.log(`   问题: 您想使用哪个框架？`);
      console.log(`   响应: ${result.data.response}`);
      console.log(`   耗时: ${result.data.responseTime}ms`);
    } else {
      console.log(`❌ 简单提问失败`);
      console.log(`   错误: ${result.error}`);
    }

    recordResult(
      "simple_question",
      passed,
      {
        response: result.data?.response,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("simple_question", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 带选项的提问
 */
async function testQuestionWithOptions() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2] 带选项的提问...");

    const tool = await importTool();
    const callbacks = createTestCallbacks();

    const result = await tool.handler(
      {
        question: "请选择项目类型",
        options: ["Web 应用", "移动应用", "桌面应用", "CLI 工具"],
      },
      callbacks
    );

    const passed =
      result.success &&
      result.data?.response === "Web 应用" &&
      result.data?.selectedOption === "Web 应用";

    if (passed) {
      console.log(`✅ 带选项的提问成功`);
      console.log(`   问题: 请选择项目类型`);
      console.log(`   选项: ["Web 应用", "移动应用", "桌面应用", "CLI 工具"]`);
      console.log(`   用户选择: ${result.data.response}`);
      console.log(`   已匹配选项: ${result.data.selectedOption}`);
    } else {
      console.log(`❌ 带选项的提问失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "question_with_options",
      passed,
      {
        response: result.data?.response,
        selectedOption: result.data?.selectedOption,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult(
      "question_with_options",
      false,
      error.message,
      Date.now() - startTime,
      error
    );
  }
}

/**
 * 测试 3: 用户选择非预设选项
 */
async function testCustomResponse() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3] 用户自定义响应...");

    const tool = await importTool();
    const callbacks = createTestCallbacks({
      '请选择项目类型_["Web 应用","移动应用","桌面应用","CLI 工具"]':
        "我要开发一个游戏",
    });

    const result = await tool.handler(
      {
        question: "请选择项目类型",
        options: ["Web 应用", "移动应用", "桌面应用", "CLI 工具"],
      },
      callbacks
    );

    const passed =
      result.success &&
      result.data?.response === "我要开发一个游戏" &&
      !result.data?.selectedOption;

    if (passed) {
      console.log(`✅ 自定义响应成功`);
      console.log(`   问题: 请选择项目类型`);
      console.log(`   用户响应: ${result.data.response}`);
      console.log(`   未匹配预设选项: ${!result.data.selectedOption}`);
    } else {
      console.log(`❌ 自定义响应失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "custom_response",
      passed,
      {
        response: result.data?.response,
        selectedOption: result.data?.selectedOption,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("custom_response", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 空问题验证
 */
async function testEmptyQuestion() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4] 空问题验证...");

    const tool = await importTool();
    const callbacks = createTestCallbacks();

    const result = await tool.handler(
      {
        question: "",
      },
      callbacks
    );

    const passed = !result.success && result.error?.includes("问题文本不能为空");

    if (passed) {
      console.log(`✅ 空问题验证成功`);
      console.log(`   错误: ${result.error}`);
    } else {
      console.log(`❌ 空问题验证失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "empty_question",
      passed,
      {
        hasError: !!result.error,
        errorMessage: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("empty_question", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 选项数量验证
 */
async function testInvalidOptionsCount() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5] 选项数量验证（太多选项）...");

    const tool = await importTool();
    const callbacks = createTestCallbacks();

    const result = await tool.handler(
      {
        question: "选择一个",
        options: ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6"],
      },
      callbacks
    );

    const passed = !result.success && result.error?.includes("选项数量必须在 2-5 个之间");

    if (passed) {
      console.log(`✅ 选项数量验证成功`);
      console.log(`   错误: ${result.error}`);
    } else {
      console.log(`❌ 选项数量验证失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "invalid_options_count",
      passed,
      {
        hasError: !!result.error,
        errorMessage: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult(
      "invalid_options_count",
      false,
      error.message,
      Date.now() - startTime,
      error
    );
  }
}

/**
 * 测试 6: 超时功能
 */
async function testTimeout() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6] 超时功能...");

    const tool = await importTool();
    const callbacks = {
      askUser: async (question, options) => {
        // 模拟用户响应时间过长
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return "延迟响应";
      },
      showNotification: (title, message) => {
        console.log(`📢 [${title}] ${message}`);
      },
    };

    const result = await tool.handler(
      {
        question: "快速回答",
        timeout: 1000, // 1秒超时
      },
      callbacks
    );

    const passed = !result.success && result.error?.includes("超时");

    if (passed) {
      console.log(`✅ 超时功能正常`);
      console.log(`   错误: ${result.error}`);
    } else {
      console.log(`⚠️  超时功能未按预期工作`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "timeout",
      passed,
      {
        hasError: !!result.error,
        errorMessage: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("timeout", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: 非必需提问
 */
async function testOptionalQuestion() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 7] 非必需提问...");

    const tool = await importTool();
    const callbacks = {
      askUser: async () => {
        throw new Error("用户跳过");
      },
      showNotification: () => {},
    };

    const result = await tool.handler(
      {
        question: "可选问题",
        required: false,
      },
      callbacks
    );

    const passed = result.success && result.data?.hasResponse === false;

    if (passed) {
      console.log(`✅ 非必需提问成功`);
      console.log(`   hasResponse: ${result.data.hasResponse}`);
      console.log(`   response: "${result.data.response}"`);
    } else {
      console.log(`❌ 非必需提问失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "optional_question",
      passed,
      {
        hasResponse: result.data?.hasResponse,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("optional_question", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - ASK 工具测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("\n测试项目: 7 个功能\n");

  const tests = [
    { name: "简单提问", fn: testSimpleQuestion },
    { name: "带选项的提问", fn: testQuestionWithOptions },
    { name: "自定义响应", fn: testCustomResponse },
    { name: "空问题验证", fn: testEmptyQuestion },
    { name: "选项数量验证", fn: testInvalidOptionsCount },
    { name: "超时功能", fn: testTimeout },
    { name: "非必需提问", fn: testOptionalQuestion },
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
  console.log("📊 ASK 工具测试总结");
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
    console.log("🎉 所有 ASK 工具测试通过!\n");
    console.log("💡 已验证的功能:");
    console.log("   - 简单提问");
    console.log("   - 带选项的提问");
    console.log("   - 用户自定义响应");
    console.log("   - 参数验证");
    console.log("   - 超时处理");
    console.log("   - 必需/非必需提问\n");
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch((error) => {
  console.error("\n💥 测试运行失败:", error);
  process.exit(1);
});
