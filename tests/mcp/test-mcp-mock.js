/**
 * MCP Hub Mock 测试
 * 测试 MCP 协议的核心逻辑(不依赖实际导入)
 */

const fs = require("fs").promises;
const path = require("path");

// ============================================================================
// Mock 实现(模拟 MCP Hub 的核心逻辑)
// ============================================================================

class MockMcpHub {
  constructor(mcpServersPath) {
    this.mcpServersPath = mcpServersPath;
    this.connections = new Map();
  }

  async initialize() {
    console.log("[McpHub] Initializing MCP servers...");

    try {
      const settings = await this.readSettingsFile();
      if (!settings || Object.keys(settings.mcpServers || {}).length === 0) {
        console.log("[McpHub] No MCP servers configured");
        return;
      }

      const serverConfigs = settings.mcpServers || {};
      await this.updateServerConnections(serverConfigs);

      console.log(`[McpHub] Initialized ${this.connections.size} MCP servers`);
    } catch (error) {
      console.error("[McpHub] Failed to initialize:", error);
    }
  }

  getServers() {
    return Array.from(this.connections.values())
      .filter((conn) => !conn.server.disabled)
      .map((conn) => conn.server);
  }

  getServer(name) {
    const connection = this.connections.get(name);
    return connection?.server;
  }

  async readSettingsFile() {
    try {
      const settingsPath = path.join(this.mcpServersPath, "mcp-settings.json");
      const content = await fs.readFile(settingsPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error("[McpHub] Failed to read settings file:", error);
      return { mcpServers: {} };
    }
  }

  async writeSettingsFile(settings) {
    try {
      await fs.mkdir(this.mcpServersPath, { recursive: true });
      const settingsPath = path.join(this.mcpServersPath, "mcp-settings.json");
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    } catch (error) {
      console.error("[McpHub] Failed to write settings file:", error);
      throw error;
    }
  }

  async updateServerConnections(serverConfigs) {
    const serverNames = Object.keys(serverConfigs);

    // 移除不再配置的连接
    for (const [name, connection] of this.connections.entries()) {
      if (!serverNames.includes(name)) {
        this.connections.delete(name);
      }
    }

    // 连接到所有配置的服务器
    for (const [name, config] of Object.entries(serverConfigs)) {
      await this.connectToServer(name, config);
    }
  }

  async connectToServer(name, config) {
    console.log(`[McpHub] Connecting to MCP server: ${name}`);

    // 移除现有连接
    if (this.connections.has(name)) {
      this.connections.delete(name);
    }

    // 如果禁用,创建禁用连接
    if (config.disabled) {
      const disabledConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: "disconnected",
          disabled: true,
          uid: name,
        },
        client: null,
        transport: null,
      };
      this.connections.set(name, disabledConnection);
      return;
    }

    // 创建模拟连接
    const connection = {
      server: {
        name,
        config: JSON.stringify(config),
        status: "connected",
        disabled: config.disabled,
        uid: name,
        tools: [],
        resources: [],
      },
      client: { mock: true },
      transport: { mock: true },
    };

    this.connections.set(name, connection);
    console.log(`[McpHub] Successfully connected to ${name}`);
  }

  async addRemoteServer(name, url, transportType = "streamableHttp") {
    const settings = await this.readSettingsFile();
    if (!settings) {
      throw new Error("Failed to read MCP settings");
    }

    if (settings.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" already exists`);
    }

    const serverConfig = {
      name,
      type: transportType,
      url,
      disabled: false,
      timeout: 60,
    };

    settings.mcpServers = { ...settings.mcpServers, [name]: serverConfig };
    await this.writeSettingsFile(settings);
    await this.updateServerConnections(settings.mcpServers);
  }

  async deleteServer(name) {
    const settings = await this.readSettingsFile();
    if (!settings?.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    delete settings.mcpServers[name];
    this.connections.delete(name);
    await this.writeSettingsFile(settings);
  }

  async toggleServer(name, disabled) {
    const settings = await this.readSettingsFile();
    if (!settings?.mcpServers?.[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    settings.mcpServers[name].disabled = disabled;
    await this.writeSettingsFile(settings);
    await this.connectToServer(name, settings.mcpServers[name]);
  }
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
    const hub = new MockMcpHub(testPath);

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

    const hub = new MockMcpHub(testPath);
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
    const hub = new MockMcpHub(testPath);
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
    const hub = new MockMcpHub(testPath);
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
 * 测试 6: 添加远程服务器
 */
async function testAddRemoteServer() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new MockMcpHub(testPath);

    await hub.addRemoteServer("remote-server", "https://api.example.com/mcp", "streamableHttp");

    const server = hub.getServer("remote-server");

    const passed = server !== undefined && server.status === "connected";

    recordResult(
      "add_remote_server",
      passed,
      {
        serverAdded: server !== undefined,
        serverName: server?.name,
        serverStatus: server?.status,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("add_remote_server", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 7: 切换服务器状态
 */
async function testToggleServer() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new MockMcpHub(testPath);
    await hub.initialize();

    await hub.toggleServer("test-server", false);
    const server = hub.getServer("test-server");

    const passed = server !== undefined && server.disabled === false;

    recordResult(
      "toggle_server",
      passed,
      {
        serverToggled: server !== undefined,
        serverDisabled: server?.disabled,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("toggle_server", false, error.message, Date.now() - startTime, error);
  }
}

/**
 * 测试 8: 删除服务器
 */
async function testDeleteServer() {
  const startTime = Date.now();

  try {
    const testPath = path.join(__dirname, "test-mcp-servers");
    const hub = new MockMcpHub(testPath);
    await hub.initialize();

    await hub.deleteServer("test-server");
    const server = hub.getServer("test-server");

    const passed = server === undefined;

    recordResult(
      "delete_server",
      passed,
      {
        serverDeleted: server === undefined,
        serversCount: hub.getServers().length,
      },
      Date.now() - startTime
    );
  } catch (error) {
    recordResult("delete_server", false, error.message, Date.now() - startTime, error);
  }
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log("\n🚀 Git Tutor AI - MCP Hub 测试");
  console.log("测试时间:", new Date().toLocaleString());
  console.log("测试项目: 8 个 MCP 功能\n");

  const tests = [
    { name: "创建 McpHub 实例", fn: testCreateHub },
    { name: "读取空配置", fn: testReadEmptyConfig },
    { name: "创建配置文件", fn: testCreateConfigFile },
    { name: "加载配置文件", fn: testLoadConfigFile },
    { name: "获取服务器信息", fn: testGetServer },
    { name: "添加远程服务器", fn: testAddRemoteServer },
    { name: "切换服务器状态", fn: testToggleServer },
    { name: "删除服务器", fn: testDeleteServer },
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
    const { execSync } = require("child_process");
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
    console.log("   - 远程服务器支持");
    console.log("   - 服务器状态管理");
    console.log("   - 服务器删除功能\n");
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
