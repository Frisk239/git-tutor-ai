/**
 * MCP_DOCS 工具处理器
 * 加载 MCP 服务器开发文档
 */

import { McpHub } from '../hub.js';
import type { ToolExecutor, ToolExecutionContext } from '../../tools/index.js';

/**
 * MCP_DOCS 工具执行器
 */
export class LoadMcpDocumentationExecutor implements ToolExecutor {
  constructor(private mcpHub: McpHub) {}

  /**
   * 生成 MCP 文档
   */
  async execute(params: any, context: ToolExecutionContext): Promise<string> {
    const servers = this.mcpHub.getServers();

    const documentation = `# MCP 服务器开发指南

## 什么是 MCP?

MCP (Model Context Protocol) 是一个开放协议,允许 AI 应用与外部系统(如数据库、文件系统、API)进行交互。

## 当前已连接的 MCP 服务器 (${servers.length})

${
  servers.length === 0
    ? '*暂无已连接的服务器*'
    : servers
        .map(
          (server) => `
### ${server.name}
- **状态**: ${server.status}
- **工具数量**: ${server.tools?.length || 0}
- **资源数量**: ${server.resources?.length || 0}
${
  server.tools && server.tools.length > 0
    ? `
#### 可用工具:
${server.tools.map((tool) => `- \`${tool.name}\`: ${tool.description || '无描述'}`).join('\n')}
`
    : ''
}
`
        )
        .join('\n')
}

## 创建 MCP 服务器

### 步骤 1: 创建项目

使用官方脚手架创建新项目:

\`\`\`bash
npx -y @modelcontextprotocol/create-server@latest my-server
cd my-server
\`\`\`

### 步骤 2: 实现工具处理器

在 \`src/index.ts\` 中实现工具:

\`\`\`typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 创建服务器实例
const server = new Server(
  {
    name: 'my-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_weather',
      description: '获取指定城市的天气信息',
      inputSchema: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['city'],
      },
    },
  ],
}));

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    const city = args?.city as string;
    // 实现天气查询逻辑
    const weather = await getWeatherData(city);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  }

  throw new Error(\`Unknown tool: \${name}\`);
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('My MCP server running on stdio');
}

main().catch(console.error);
\`\`\`

### 步骤 3: 配置服务器

创建配置文件 \`mcp-settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/my-server/build/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "autoApprove": ["get_weather"],
      "timeout": 30
    }
  }
}
\`\`\`

## 高级功能

### 1. 资源支持

允许服务器提供文件、数据库记录等资源:

\`\`\`typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "config:///settings",
      name: "应用设置",
      description: "当前应用配置",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "config:///settings") {
    const settings = await loadSettings();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(settings, null, 2),
        },
      ],
    };
  }

  throw new Error(\`Resource not found: \${uri}\`);
});
\`\`\`

### 2. 远程服务器 (SSE/HTTP)

支持通过 SSE 或 HTTP 连接远程服务器:

\`\`\`json
{
  "mcpServers": {
    "remote-server": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-token"
      },
      "timeout": 60
    }
  }
}
\`\`\`

### 3. OAuth 认证

支持 OAuth 2.0 认证流程:

\`\`\`typescript
// 服务器端实现 OAuth
server.setRequestHandler(OAuthProvidersRequestSchema, async () => ({
  oauthProviders: [
    {
      name: "GitHub",
      authorizationEndpoint: "https://github.com/login/oauth/authorize",
      tokenEndpoint: "https://github.com/login/oauth/access_token",
      scopes: ["read:user", "repo"],
    },
  ],
}));
\`\`\`

## MCP 工具使用示例

### 在 AI 应用中使用

Git Tutor AI 支持三个 MCP 工具:

1. **mcp_use**: 使用 MCP 工具
\`\`\`typescript
await mcpHub.callTool("my-server", "get_weather", { city: "Beijing" });
\`\`\`

2. **mcp_access**: 访问 MCP 资源
\`\`\`typescript
await mcpHub.readResource("my-server", "config:///settings");
\`\`\`

3. **mcp_docs**: 加载 MCP 文档
\`\`\`typescript
// 当前文档即是通过此工具生成
\`\`\`

## 最佳实践

1. **错误处理**: 始终返回正确的错误信息和状态
2. **资源管理**: 及时释放资源,避免内存泄漏
3. **超时控制**: 设置合理的超时时间(默认 60 秒)
4. **日志记录**: 使用 stderr 输出日志信息
5. **版本管理**: 在服务器名称中包含版本号

## 调试技巧

1. **查看服务器状态**:
\`\`\`bash
# 检查服务器是否运行
echo '{"method": "tools/list"}' | node build/index.js
\`\`\`

2. **测试工具调用**:
\`\`\`bash
echo '{"method": "tools/call", "params": {"name": "get_weather", "arguments": {"city": "Beijing"}}}' | node build/index.js
\`\`\`

3. **查看连接日志**:
\`\`\`
[McpHub] Connecting to MCP server: my-server
[McpHub] Successfully connected to my-server
[McpHub] - Tools: 5
[McpHub] - Resources: 3
\`\`\`

## 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [服务器示例](https://github.com/modelcontextprotocol/servers)

---

*本文档由 Git Tutor AI 自动生成*
*最后更新: ${new Date().toISOString()}*
`;

    return documentation;
  }

  /**
   * 获取工具描述
   */
  getDescription(): string {
    return `加载 MCP (Model Context Protocol) 服务器开发文档。

参数: 无

返回:
  完整的 MCP 开发指南,包括:
  - MCP 协议介绍
  - 服务器创建步骤
  - 工具和资源实现
  - 配置和部署
  - 最佳实践和调试技巧
  - 实用代码示例

使用场景:
  - 学习如何创建 MCP 服务器
  - 查看可用工具和资源
  - 了解配置选项
  - 解决开发问题`;
  }

  /**
   * 验证参数
   */
  validateParams(_params: any): { valid: boolean; error?: string } {
    return { valid: true };
  }
}
