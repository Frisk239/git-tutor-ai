// MCP (Model Context Protocol) 工具集
import type { ToolDefinition, ToolContext, ToolResult } from "../types.js";
import { ToolPermission } from "@git-tutor/shared";
import { toolRegistry } from "../registry.js";
import type { McpHub } from "../../mcp/hub.js";
import { UseMcpToolExecutor } from "../../mcp/tools/use.js";
import { AccessMcpResourceExecutor } from "../../mcp/tools/access.js";
import { LoadMcpDocumentationExecutor } from "../../mcp/tools/docs.js";

/**
 * MCP_USE 工具 - 使用 MCP 服务器提供的工具
 */
const mcpUseTool: ToolDefinition = {
  name: "mcp_use",
  displayName: "使用 MCP 工具",
  description: "使用 MCP 服务器提供的工具执行操作",
  category: "mcp",
  parameters: [
    {
      name: "server_name",
      type: "string",
      description: "MCP 服务器名称",
      required: true,
    },
    {
      name: "tool_name",
      type: "string",
      description: "要执行的工具名称",
      required: true,
    },
    {
      name: "arguments",
      type: "string",
      description: "工具的 JSON 参数对象",
      required: false,
    },
  ],
  permissions: [ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const mcpHub = context.services.mcpHub as McpHub;
    if (!mcpHub) {
      return {
        success: false,
        error: "MCP Hub 未初始化",
      };
    }

    const executor = new UseMcpToolExecutor(mcpHub);
    const result = await executor.execute(params, context);

    try {
      const parsed = JSON.parse(result);
      return parsed as ToolResult;
    } catch {
      return {
        success: false,
        error: result,
      };
    }
  },
};

/**
 * MCP_ACCESS 工具 - 访问 MCP 资源
 */
const mcpAccessTool: ToolDefinition = {
  name: "mcp_access",
  displayName: "访问 MCP 资源",
  description: "访问 MCP 服务器提供的资源(如文件、数据库记录等)",
  category: "mcp",
  parameters: [
    {
      name: "server_name",
      type: "string",
      description: "MCP 服务器名称",
      required: true,
    },
    {
      name: "uri",
      type: "string",
      description: "资源的唯一标识符",
      required: true,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const mcpHub = context.services.mcpHub as McpHub;
    if (!mcpHub) {
      return {
        success: false,
        error: "MCP Hub 未初始化",
      };
    }

    const executor = new AccessMcpResourceExecutor(mcpHub);
    const result = await executor.execute(params, context);

    try {
      const parsed = JSON.parse(result);
      return parsed as ToolResult;
    } catch {
      return {
        success: false,
        error: result,
      };
    }
  },
};

/**
 * MCP_DOCS 工具 - 加载 MCP 文档
 */
const mcpDocsTool: ToolDefinition = {
  name: "mcp_docs",
  displayName: "加载 MCP 文档",
  description: "加载 MCP (Model Context Protocol) 开发文档",
  category: "mcp",
  parameters: [],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, _params: Record<string, any>): Promise<ToolResult> => {
    const mcpHub = context.services.mcpHub as McpHub;
    if (!mcpHub) {
      return {
        success: false,
        error: "MCP Hub 未初始化",
      };
    }

    const executor = new LoadMcpDocumentationExecutor(mcpHub);
    const result = await executor.execute({}, context);

    return {
      success: true,
      data: result,
    };
  },
};

/**
 * 注册所有 MCP 工具
 */
export function registerMcpTools(): void {
  toolRegistry.register(mcpUseTool);
  toolRegistry.register(mcpAccessTool);
  toolRegistry.register(mcpDocsTool);
}

// 自动注册
registerMcpTools();
