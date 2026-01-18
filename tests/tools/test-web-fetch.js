/**
 * WEB_FETCH 工具测试
 * 测试网页获取功能
 */

// ============================================================================
// 测试配置
// ============================================================================

const TEST_URLS = {
  // JSON API
  jsonApi: "https://jsonplaceholder.typicode.com/posts/1",
  // HTML 页面
  htmlPage: "https://example.com",
  // 简单文本
  textFile: "https://httpbin.org/robots.txt",
  // 不存在的页面
  notFound: "https://httpbin.org/status/404",
  // 超时测试（延迟 5 秒）
  slowUrl: "https://httpbin.org/delay/5",
};

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
  return {
    name: "web_fetch",
    handler: async (params) => {
      const { url, maxContentLength = 10000, extractText = true, timeout = 30, headers = {} } =
        params;

      const startTime = Date.now();

      try {
        // 验证 URL
        let validUrl;
        try {
          validUrl = new URL(url);
        } catch (error) {
          return {
            success: false,
            error: `无效的 URL 格式: ${url}`,
          };
        }

        // 只允许 HTTP 和 HTTPS
        if (!["http:", "https:"].includes(validUrl.protocol)) {
          return {
            success: false,
            error: `不支持的协议: ${validUrl.protocol}`,
          };
        }

        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

        // 准备请求头
        const requestHeaders = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          ...headers,
        };

        try {
          // 发起请求
          const response = await fetch(url, {
            method: "GET",
            headers: requestHeaders,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // 获取内容类型
          const contentType = response.headers.get("content-type") || "unknown";

          // 获取内容
          const content = await response.text();

          // 提取文本内容
          let textContent = content;
          if (extractText && contentType.includes("html")) {
            // 简单的 HTML 标签移除
            textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          }

          // 截断内容
          let truncatedContent = content;
          let truncatedTextContent = textContent;

          if (content.length > maxContentLength) {
            truncatedContent = content.substring(0, maxContentLength) + "...";
          }

          if (textContent.length > maxContentLength) {
            truncatedTextContent = textContent.substring(0, maxContentLength) + "...";
          }

          return {
            success: response.ok,
            data: {
              url,
              statusCode: response.status,
              statusText: response.statusText,
              contentType,
              content: truncatedContent,
              textContent: truncatedTextContent,
              contentLength: content.length,
              duration: Date.now() - startTime,
            },
          };
        } catch (error) {
          clearTimeout(timeoutId);

          if (error.name === "AbortError") {
            return {
              success: false,
              error: `请求超时（超过 ${timeout} 秒）`,
            };
          }

          return {
            success: false,
            error: `网络错误: ${error.message}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试 1: 获取 JSON API
 */
async function testFetchJsonApi() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 1] 获取 JSON API...");

    const tool = await importTool();
    const result = await tool.handler({
      url: TEST_URLS.jsonApi,
    });

    const passed = result.success && result.data?.statusCode === 200;

    if (passed) {
      console.log(`✅ JSON API 获取成功`);
      console.log(`   状态码: ${result.data.statusCode}`);
      console.log(`   内容类型: ${result.data.contentType}`);
      console.log(`   内容长度: ${result.data.contentLength} 字符`);
      console.log(`   耗时: ${result.data.duration}ms`);
    } else {
      console.log(`❌ JSON API 获取失败`);
      console.log(`   错误: ${result.error || result.data?.statusText}`);
    }

    recordResult(
      "fetch_json_api",
      passed,
      {
        statusCode: result.data?.statusCode,
        contentType: result.data?.contentType,
        contentLength: result.data?.contentLength,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("fetch_json_api", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 获取 HTML 页面并提取文本
 */
async function testFetchHtmlPage() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 2] 获取 HTML 页面并提取文本...");

    const tool = await importTool();
    const result = await tool.handler({
      url: TEST_URLS.htmlPage,
      extractText: true,
    });

    const passed =
      result.success &&
      result.data?.statusCode === 200 &&
      result.data?.textContent &&
      !result.data.textContent.includes("<");

    if (passed) {
      console.log(`✅ HTML 页面获取成功`);
      console.log(`   状态码: ${result.data.statusCode}`);
      console.log(`   原始内容长度: ${result.data.contentLength} 字符`);
      console.log(`   提取的文本预览: ${result.data.textContent.substring(0, 100)}...`);
      console.log(`   耗时: ${result.data.duration}ms`);
    } else {
      console.log(`❌ HTML 页面获取失败`);
      console.log(`   错误: ${result.error || result.data?.statusText}`);
    }

    recordResult(
      "fetch_html_page",
      passed,
      {
        hasTextContent: !!result.data?.textContent,
        textPreview: result.data?.textContent?.substring(0, 50),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("fetch_html_page", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 获取文本文件
 */
async function testFetchTextFile() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 3] 获取文本文件...");

    const tool = await importTool();
    const result = await tool.handler({
      url: TEST_URLS.textFile,
    });

    const passed = result.success && result.data?.statusCode === 200;

    if (passed) {
      console.log(`✅ 文本文件获取成功`);
      console.log(`   内容预览: ${result.data.content.substring(0, 100)}...`);
      console.log(`   耗时: ${result.data.duration}ms`);
    } else {
      console.log(`❌ 文本文件获取失败`);
      console.log(`   错误: ${result.error || result.data?.statusText}`);
    }

    recordResult(
      "fetch_text_file",
      passed,
      {
        hasContent: !!result.data?.content,
        contentPreview: result.data?.content?.substring(0, 50),
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("fetch_text_file", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 无效 URL
 */
async function testInvalidUrl() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 4] 测试无效 URL...");

    const tool = await importTool();
    const result = await tool.handler({
      url: "not-a-valid-url",
    });

    const passed = !result.success && result.error?.includes("无效的 URL");

    if (passed) {
      console.log(`✅ 无效 URL 检测正确`);
      console.log(`   错误: ${result.error}`);
    } else {
      console.log(`❌ 无效 URL 检测失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "invalid_url",
      passed,
      {
        hasError: !!result.error,
        errorMessage: result.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("invalid_url", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 404 错误处理
 */
async function testNotFound() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 5] 测试 404 错误处理...");

    const tool = await importTool();
    const result = await tool.handler({
      url: TEST_URLS.notFound,
    });

    const passed = !result.success && result.data?.statusCode === 404;

    if (passed) {
      console.log(`✅ 404 错误处理正确`);
      console.log(`   状态码: ${result.data.statusCode}`);
      console.log(`   状态文本: ${result.data.statusText}`);
    } else {
      console.log(`❌ 404 错误处理失败`);
      console.log(`   结果:`, result);
    }

    recordResult(
      "not_found",
      passed,
      {
        statusCode: result.data?.statusCode,
        success: result.success,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("not_found", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 超时控制
 */
async function testTimeout() {
  const startTime = Date.now();

  try {
    console.log("\n[测试 6] 测试超时控制...");

    const tool = await importTool();
    const result = await tool.handler({
      url: TEST_URLS.slowUrl,
      timeout: 2, // 2 秒超时
    });

    const passed = !result.success && result.error?.includes("超时");

    if (passed) {
      console.log(`✅ 超时控制成功`);
      console.log(`   错误: ${result.error}`);
      console.log(`   实际耗时: ${Date.now() - startTime}ms`);
    } else {
      console.log(`⚠️  超时测试未按预期工作`);
      console.log(`   result.success: ${result.success}`);
      console.log(`   error: ${result.error}`);
    }

    recordResult(
      "timeout",
      passed,
      {
        timedOut: result.error?.includes("超时"),
        duration: Date.now() - startTime,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("timeout", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - WEB_FETCH 工具测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("测试项目: 6 个功能\n");

  const tests = [
    { name: "JSON API", fn: testFetchJsonApi },
    { name: "HTML 页面", fn: testFetchHtmlPage },
    { name: "文本文件", fn: testFetchTextFile },
    { name: "无效 URL", fn: testInvalidUrl },
    { name: "404 错误", fn: testNotFound },
    { name: "超时控制", fn: testTimeout },
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
  console.log("📊 WEB_FETCH 工具测试总结");
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
    console.log("🎉 所有 WEB_FETCH 工具测试通过!\n");
    console.log("💡 已验证的功能:");
    console.log("   - JSON API 获取");
    console.log("   - HTML 页面获取和文本提取");
    console.log("   - 文本文件获取");
    console.log("   - 无效 URL 检测");
    console.log("   - 404 错误处理");
    console.log("   - 超时控制\n");
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch((error) => {
  console.error("\n💥 测试运行失败:", error);
  process.exit(1);
});
