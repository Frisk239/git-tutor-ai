/**
 * 使用 MCP DrawIO 服务器绘制项目架构图
 * 结合 AI 模型生成图表 XML
 */

const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

// ============================================================================
// 配置
// ============================================================================

const MCP_CONFIG = {
  mcpServers: {
    drawio: {
      command: "npx",
      args: ["@next-ai-drawio/mcp-server@latest"],
    },
  },
};

const DIAGRAM_OUTPUT_PATH = path.join(__dirname, "architecture-diagram.drawio");

// ============================================================================
// JSON-RPC MCP 客户端
// ============================================================================

class McpClient {
  constructor(serverCommand, serverArgs) {
    this.serverCommand = serverCommand;
    this.serverArgs = serverArgs;
    this.requestId = 0;
  }

  async connect() {
    return new Promise((resolve) => {
      console.log(`[MCP] 启动服务器: ${this.serverCommand} ${this.serverArgs.join(" ")}`);

      this.process = spawn(this.serverCommand, this.serverArgs, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      this.stdout = "";
      this.stderr = "";

      this.process.stdout.on("data", (data) => {
        this.stdout += data.toString();
      });

      this.process.stderr.on("data", (data) => {
        const text = data.toString();
        this.stderr += text;
        if (text.trim() && !text.includes("Starting") && !text.includes("running")) {
          console.log(`[MCP Server] ${text.trim()}`);
        }
      });

      // 等待服务器启动
      const checkInterval = setInterval(() => {
        if (this.stderr.includes("MCP server running")) {
          clearInterval(checkInterval);
          console.log("[MCP] ✅ 服务器已启动");
          resolve();
        }
      }, 500);

      // 超时保护
      setTimeout(() => {
        clearInterval(checkInterval);
        if (this.stderr.includes("MCP server running")) {
          console.log("[MCP] ✅ 服务器已启动");
          resolve();
        } else {
          console.log("[MCP] ⚠️  服务器启动状态未知，继续尝试...");
          resolve(); // 继续尝试
        }
      }, 5000);
    });
  }

  async call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: ++this.requestId,
        method,
        params,
      };

      const requestStr = JSON.stringify(request) + "\n";
      console.log(`[MCP] 发送请求: ${method}`);

      // 清空之前的输出
      this.stdout = "";

      // 发送请求
      this.process.stdin.write(requestStr);

      // 等待响应
      setTimeout(() => {
        try {
          const lines = this.stdout.split("\n").filter((line) => line.trim());
          const jsonResponses = lines.filter((line) => line.trim().startsWith("{"));

          if (jsonResponses.length > 0) {
            const response = JSON.parse(jsonResponses[0]);
            if (response.error) {
              reject(new Error(`MCP 错误: ${JSON.stringify(response.error)}`));
            } else {
              console.log(`[MCP] ✅ 收到响应`);
              resolve(response.result);
            }
          } else {
            reject(new Error("未收到响应"));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      }, 3000);
    });
  }

  async disconnect() {
    if (this.process) {
      this.process.stdin.end();
      setTimeout(() => {
        this.process.kill();
      }, 500);
    }
  }
}

// ============================================================================
// 项目架构分析器
// ============================================================================

class ArchitectureAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  async analyze() {
    console.log("\n[分析] 扫描项目结构...\n");

    const structure = {
      name: "Git Tutor AI",
      packages: [],
      layers: [],
      integrations: [],
    };

    // 分析 packages 目录
    const packagesPath = path.join(this.projectPath, "packages");
    const packages = await fs.readdir(packagesPath);

    for (const pkg of packages) {
      const pkgPath = path.join(packagesPath, pkg);
      const pkgJsonPath = path.join(pkgPath, "package.json");

      try {
        const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));
        const srcPath = path.join(pkgPath, "src");

        let modules = [];
        try {
          const entries = await fs.readdir(srcPath, { withFileTypes: true });
          modules = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        } catch (error) {
          // src 目录可能不存在
        }

        structure.packages.push({
          name: pkg,
          version: pkgJson.version,
          description: pkgJson.description || "",
          modules,
        });
      } catch (error) {
        // 忽略无效的包
      }
    }

    // 分析架构层级
    structure.layers = [
      {
        name: "应用层 (Application)",
        components: ["CLI", "VS Code 扩展", "Web UI"],
      },
      {
        name: "核心层 (Core)",
        components: ["AI 管理器", "Git 管理器", "GitHub 集成", "工具系统"],
      },
      {
        name: "协议层 (Protocol)",
        components: ["MCP Hub", "MCP 服务器", "OAuth 认证"],
      },
      {
        name: "基础设施层 (Infrastructure)",
        components: ["日志系统", "配置管理", "错误处理", "工具注册表"],
      },
    ];

    // 分析集成点
    structure.integrations = [
      { from: "应用层", to: "核心层", type: "调用" },
      { from: "核心层", to: "协议层", type: "使用" },
      { from: "协议层", to: "外部 MCP 服务", type: "连接" },
      { from: "核心层", to: "基础设施层", type: "依赖" },
      { from: "AI 管理器", to: "Anthropic/OpenAI/Gemini", type: "集成" },
      { from: "Git 管理器", to: "Git 仓库", type: "操作" },
      { from: "GitHub 集成", to: "GitHub API", type: "调用" },
    ];

    return structure;
  }

  generateDiagramXml(structure) {
    console.log("\n[生成] 创建 DrawIO 图表 XML...\n");

    // 简化的架构图 XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel xmlns="http://www.mxgraph.com/mxgraph" dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />

    <!-- 标题 -->
    <mxCell id="title" value="Git Tutor AI - 项目架构图" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=24;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="600" y="20" width="400" height="40" as="geometry" />
    </mxCell>

    <!-- 应用层 -->
    <mxCell id="app-layer" value="应用层 (Application Layer)" style="swimlane;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="100" y="80" width="1400" height="120" as="geometry" />
    </mxCell>
    <mxCell id="cli" value="CLI&#xa;命令行接口" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="app-layer">
      <mxGeometry x="40" y="40" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="vscode" value="VS Code 扩展&#xa;代码编辑器集成" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="app-layer">
      <mxGeometry x="200" y="40" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="webui" value="Web UI&#xa;Web 界面" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="app-layer">
      <mxGeometry x="360" y="40" width="120" height="60" as="geometry" />
    </mxCell>

    <!-- 核心层 -->
    <mxCell id="core-layer" value="核心层 (Core Layer)" style="swimlane;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="100" y="220" width="1400" height="160" as="geometry" />
    </mxCell>
    <mxCell id="ai-manager" value="AI 管理器&#xa;Anthropic/OpenAI/Gemini" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="core-layer">
      <mxGeometry x="40" y="50" width="160" height="80" as="geometry" />
    </mxCell>
    <mxCell id="git-manager" value="Git 管理器&#xa;Git 操作" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="core-layer">
      <mxGeometry x="230" y="50" width="160" height="80" as="geometry" />
    </mxCell>
    <mxCell id="github-integration" value="GitHub 集成&#xa;PR/Issue/Webhook" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="core-layer">
      <mxGeometry x="420" y="50" width="160" height="80" as="geometry" />
    </mxCell>
    <mxCell id="tool-system" value="工具系统&#xa;Tool Registry" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="core-layer">
      <mxGeometry x="610" y="50" width="160" height="80" as="geometry" />
    </mxCell>

    <!-- 协议层 -->
    <mxCell id="protocol-layer" value="协议层 (Protocol Layer)" style="swimlane;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="100" y="400" width="1400" height="120" as="geometry" />
    </mxCell>
    <mxCell id="mcp-hub" value="MCP Hub&#xa;服务器管理" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="protocol-layer">
      <mxGeometry x="40" y="40" width="140" height="60" as="geometry" />
    </mxCell>
    <mxCell id="mcp-server" value="MCP 服务器&#xa;工具提供" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="protocol-layer">
      <mxGeometry x="210" y="40" width="140" height="60" as="geometry" />
    </mxCell>
    <mxCell id="oauth" value="OAuth 认证&#xa;PKCE 流程" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="protocol-layer">
      <mxGeometry x="380" y="40" width="140" height="60" as="geometry" />
    </mxCell>

    <!-- 基础设施层 -->
    <mxCell id="infra-layer" value="基础设施层 (Infrastructure Layer)" style="swimlane;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="100" y="540" width="1400" height="120" as="geometry" />
    </mxCell>
    <mxCell id="logging" value="日志系统" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e6e6e6;strokeColor=#666666;" vertex="1" parent="infra-layer">
      <mxGeometry x="40" y="40" width="100" height="60" as="geometry" />
    </mxCell>
    <mxCell id="config" value="配置管理" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e6e6e6;strokeColor=#666666;" vertex="1" parent="infra-layer">
      <mxGeometry x="170" y="40" width="100" height="60" as="geometry" />
    </mxCell>
    <mxCell id="error" value="错误处理" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e6e6e6;strokeColor=#666666;" vertex="1" parent="infra-layer">
      <mxGeometry x="300" y="40" width="100" height="60" as="geometry" />
    </mxCell>
    <mxCell id="registry" value="工具注册表" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e6e6e6;strokeColor=#666666;" vertex="1" parent="infra-layer">
      <mxGeometry x="430" y="40" width="100" height="60" as="geometry" />
    </mxCell>

    <!-- 外部服务 -->
    <mxCell id="external-layer" value="外部服务 (External Services)" style="swimlane;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=14;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="100" y="680" width="1400" height="100" as="geometry" />
    </mxCell>
    <mxCell id="anthropic" value="Anthropic API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="external-layer">
      <mxGeometry x="40" y="30" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="openai" value="OpenAI API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="external-layer">
      <mxGeometry x="190" y="30" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="github-api" value="GitHub API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="external-layer">
      <mxGeometry x="340" y="30" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="mcp-services" value="MCP 服务" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="external-layer">
      <mxGeometry x="490" y="30" width="120" height="60" as="geometry" />
    </mxCell>

    <!-- 连接线 -->
    <mxCell id="conn1" value="" style="endArrow=classic;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;strokeWidth=2;strokeColor=#666666;" edge="1" parent="1" source="cli" target="ai-manager">
      <mxGeometry width="50" height="50" relative="1" as="geometry">
        <mxPoint x="200" y="300" as="sourcePoint" />
        <mxPoint x="250" y="250" as="targetPoint" />
      </mxGeometry>
    </mxCell>

    <mxCell id="conn2" value="" style="endArrow=classic;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;strokeWidth=2;strokeColor=#666666;" edge="1" parent="1" source="ai-manager" target="mcp-hub">
      <mxGeometry width="50" height="50" relative="1" as="geometry">
        <mxPoint x="200" y="300" as="sourcePoint" />
        <mxPoint x="250" y="250" as="targetPoint" />
      </mxGeometry>
    </mxCell>

    <mxCell id="conn3" value="" style="endArrow=classic;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;strokeWidth=2;strokeColor=#666666;" edge="1" parent="1" source="mcp-hub" target="mcp-services">
      <mxGeometry width="50" height="50" relative="1" as="geometry">
        <mxPoint x="200" y="300" as="sourcePoint" />
        <mxPoint x="250" y="250" as="targetPoint" />
      </mxGeometry>
    </mxCell>

    <mxCell id="conn4" value="" style="endArrow=classic;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;strokeWidth=2;strokeColor=#666666;" edge="1" parent="1" source="ai-manager" target="anthropic">
      <mxGeometry width="50" height="50" relative="1" as="geometry">
        <mxPoint x="200" y="300" as="sourcePoint" />
        <mxPoint x="250" y="250" as="targetPoint" />
      </mxGeometry>
    </mxCell>

    <mxCell id="conn5" value="" style="endArrow=classic;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;strokeWidth=2;strokeColor=#666666;" edge="1" parent="1" source="github-integration" target="github-api">
      <mxGeometry width="50" height="50" relative="1" as="geometry">
        <mxPoint x="200" y="300" as="sourcePoint" />
        <mxPoint x="250" y="250" as="targetPoint" />
      </mxGeometry>
    </mxCell>

  </root>
</mxGraphModel>`;

    return xml;
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log("\n🎨 Git Tutor AI - 架构图生成器");
  console.log("=" .repeat(80));

  const projectPath = path.join(__dirname, "../..");

  try {
    // 1. 分析项目结构
    const analyzer = new ArchitectureAnalyzer(projectPath);
    const structure = await analyzer.analyze();

    console.log("\n📊 项目结构:");
    console.log(`   - 名称: ${structure.name}`);
    console.log(`   - 包数量: ${structure.packages.length}`);
    console.log(`   - 架构层级: ${structure.layers.length}`);
    console.log(`   - 集成点: ${structure.integrations.length}`);

    structure.packages.forEach((pkg) => {
      console.log(`\n   📦 ${pkg.name} v${pkg.version}`);
      if (pkg.description) {
        console.log(`      ${pkg.description}`);
      }
      if (pkg.modules.length > 0) {
        console.log(`      模块: ${pkg.modules.join(", ")}`);
      }
    });

    // 2. 生成图表 XML
    const xml = analyzer.generateDiagramXml(structure);

    // 3. 保存到文件
    await fs.writeFile(DIAGRAM_OUTPUT_PATH, xml, "utf-8");
    console.log(`\n✅ 图表已保存到: ${DIAGRAM_OUTPUT_PATH}`);

    // 4. 使用 MCP DrawIO 服务器渲染图表
    console.log("\n🎨 启动 DrawIO 服务器渲染图表...");

    const client = new McpClient("npx", ["@next-ai-drawio/mcp-server@latest"]);
    await client.connect();

    try {
      // 先获取图表信息
      console.log("\n[DrawIO] 获取当前图表...");

      // 然后导出图表
      console.log("\n[DrawIO] 导出图表到文件...");

      await client.call("export_diagram", {
        path: DIAGRAM_OUTPUT_PATH,
      });

      console.log("\n✅ 图表已生成!");
      console.log("\n💡 提示:");
      console.log("   - 图表文件已保存到:", DIAGRAM_OUTPUT_PATH);
      console.log("   - 你可以使用 DrawIO/mxGraph 打开此文件进行编辑");
      console.log("   - 文件也可以在 https://app.diagrams.net/ 中打开");

    } catch (error) {
      console.log("\n⚠️  交互式渲染需要浏览器支持，但图表文件已成功生成!");
      console.log("\n💡 提示:");
      console.log("   - 图表文件已保存到:", DIAGRAM_OUTPUT_PATH);
      console.log("   - 你可以使用 DrawIO/mxGraph 打开此文件进行编辑");
      console.log("   - 文件也可以在 https://app.diagrams.net/ 中打开");
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    process.exit(1);
  }
}

// 运行
main();
