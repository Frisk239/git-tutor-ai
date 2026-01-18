/**
 * MCP Hub 测试
 * 测试 MCP 协议的完整实现
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 动态导入以支持 .ts 文件
async function importMcpHub() {
  const modulePath = path.join(__dirname, "../../packages/core/src/mcp/hub.ts");
  return await import(modulePath);
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
// 测试函数
// ============================================================================

/**
 * 测试 1: 创建 McpHub 实例
 */
async function testCreateHub() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new McpHub(testPath, "0.1.0");

    const passed = hub !== null && hub !== undefined;

    recordResult(
      "create_hub",
      passed,
      {
        hubExists: passed,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("create_hub", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 2: 读取空配置
 */
async function testReadEmptyConfig() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers-empty");
    await fs.mkdir(testPath, { recursive: true });

    const hub = new McpHub(testPath, "0.1.0");
    await hub.initialize();

    const servers = hub.getServers();

    const passed = Array.isArray(servers) && servers.length === 0;

    recordResult(
      "read_empty_config",
      passed,
      {
        serversCount: servers.length,
        isEmpty: servers.length === 0,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("read_empty_config", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 3: 创建测试配置文件
 */
async function testCreateConfigFile() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    await fs.mkdir(testPath, { recursive: true });

    const config = {
      mcpServers: {
        "test-server": {
          type: "stdio",
          command: "node",
          args: ["-e", "console.log('test')"],
          disabled: true,
          timeout: 30,
        },
      },
    };

    const configPath = path.join(testPath, "mcp-settings.json");
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

    const exists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    recordResult(
      "create_config_file",
      exists,
      {
        configPath,
        fileExists: exists,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("create_config_file", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 4: 加载配置文件
 */
async function testLoadConfigFile() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new McpHub(testPath, "0.1.0");
    await hub.initialize();

    const servers = hub.getServers();
    const testServer = servers.find((s) => s.name === "test-server");

    const passed = testServer !== undefined && testServer.disabled === true;

    recordResult(
      "load_config_file",
      passed,
      {
        serversCount: servers.length,
        testServerFound: testServer !== undefined,
        testServerDisabled: testServer?.disabled,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("load_config_file", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 5: 获取服务器信息
 */
async function testGetServer() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new McpHub(testPath, "0.1.0");
    await hub.initialize();

    const server = hub.getServer("test-server");

    const passed = server !== undefined && server.name === "test-server";

    recordResult(
      "get_server",
      passed,
      {
        serverFound: server !== undefined,
        serverName: server?.name,
        serverDisabled: server?.disabled,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("get_server", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 6: 工具执行器验证
 */
async function testToolValidators() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new McpHub(testPath, "0.1.0");

    // 测试 UseMcpToolExecutor
    const useExecutor = new (await import("../../packages/core/src/mcp/tools/use.js")).UseMcpToolExecutor(hub);

    // 测试有效参数
    const validParams = {
      server_name: "test-server",
      tool_name: "test-tool",
    };

    const validResult = useExecutor.validateParams(validParams);

    // 测试无效参数
    const invalidParams = {
      server_name: "", // 空字符串
    };

    const invalidResult = useExecutor.validateParams(invalidParams);

    const passed = validResult.valid === true && invalidResult.valid === false;

    recordResult(
      "tool_validators",
      passed,
      {
        validParamsPassed: validResult.valid,
        invalidParamsRejected: !invalidResult.valid,
        invalidParamsError: invalidResult.error,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("tool_validators", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: MCP 文档生成
 */
async function testMcpDocs() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new McpHub(testPath, "0.1.0");

    const docsExecutor = new (await import("../../packages/core/src/mcp/tools/docs.js")).LoadMcpDocumentationExecutor(hub);
    const docs = await docsExecutor.execute({}, {});

    const hasHeader = docs.includes("# MCP 服务器开发指南");
    const hasServerList = docs.includes("当前已连接的 MCP 服务器");
    const hasExamples = docs.includes("创建 MCP 服务器");

    const passed = hasHeader && hasServerList && hasExamples;

    recordResult(
      "mcp_docs",
      passed,
      {
        hasHeader,
        hasServerList,
        hasExamples,
        docsLength: docs.length,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("mcp_docs", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - MCP Hub 测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("测试项目: 7 个 MCP 功能\n");

  const tests = [
    { name: "创建 McpHub 实例", fn: testCreateHub },
    { name: "读取空配置", fn: testReadEmptyConfig },
    { name: "创建配置文件", fn: testCreateConfigFile },
    { name: "加载配置文件", fn: testLoadConfigFile },
    { name: "获取服务器信息", fn: testGetServer },
    { name: "工具验证器", fn: testToolValidators },
    { name: "MCP 文档生成", fn: testMcpDocs },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`📊 测试 ${i + 1}/${tests.length}: ${test.name}`);
    console.log("".repeat(80), "\n");

    await test.fn();

    const result = testResults[testResults.length - 1];
    if (result.passed) {
      console.log(`✅ ${test.name}测试完成 (${result.duration}ms)`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          if (typeof value === "object") {
            console.log(`   - ${key}:`, JSON.stringify(value));
          } else if (typeof value === "string" && value.length > 80) {
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
  }

  printSummary();

  // 清理测试文件
  try {
    const { execSync } = await import("node:child_process");
    execSync(`rm -rf "${path.join(__dirname, "test-mcp-servers")}"`, {
      stdio: "ignore",
    });
    execSync(`rm -rf "${path.join(__dirname, "test-mcp-servers-empty")}"`, {
      stdio: "ignore",
    });
  } catch (error) {
    // 忽略清理错误
  }
}

function printSummary() {
  console.log("=".repeat(80));
  console.log("📊 MCP Hub 测试总结");
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
    if (!result.passed && result.error) {
      console.log(`      错误: ${result.error.message}`);
    }
  });

  console.log();
  console.log("=".repeat(80));

  // 评分
  let rating = "";
  if (successRate === "100.0") rating = "⭐⭐⭐⭐⭐ 优秀!";
  else if (parseFloat(successRate) >= 80) rating = "⭐⭐⭐⭐ 很好!";
  else if (parseFloat(successRate) >= 70) rating = "⭐⭐⭐ 良好!";
  else if (parseFloat(successRate) >= 60) rating = "⭐⭐ 及格";
  else rating = "⭐ 需要改进";

  console.log(`🎯 总体评分: ${rating}\n`);

  if (passed === total) {
    console.log("🎉 所有 MCP Hub 测试通过!\n");
    console.log("💡 关键特性:");
    console.log("   - MCP Hub 架构完整");
    console.log("   - 配置文件读写正常");
    console.log("   - 服务器信息管理正确");
    console.log("   - 工具验证器工作正常");
    console.log("   - MCP 文档生成完善\n");
  } else if (passed >= total * 0.8) {
    console.log(`✅ MCP Hub 基本功能测试通过! (${passed}/${total})\n`);
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败,请查看上面的错误信息\n`);
  }
}

// 运行
main().catch((error) => {
  console.error("\n💥 测试运行失败:", error);
  process.exit(1);
});
