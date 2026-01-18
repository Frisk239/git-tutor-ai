/**
 * MCP_ACCESS 工具处理器
 * 访问 MCP 服务器提供的资源
 */

import { McpHub } from "../hub.js";
import type { ToolExecutor, ToolExecutionContext } from "../../tools/index.js";

/**
 * MCP_ACCESS 工具参数
 */
interface AccessMcpResourceParams {
  /** MCP 服务器名称 */
  server_name: string;
  /** 资源 URI */
  uri: string;
}

/**
 * MCP_ACCESS 工具执行器
 */
export class AccessMcpResourceExecutor implements ToolExecutor {
  constructor(private mcpHub: McpHub) {}

  /**
   * 执行资源访问
   */
  async execute(
    params: AccessMcpResourceParams,
    context: ToolExecutionContext,
  ): Promise<string> {
    const { server_name, uri } = params;

    // 验证参数
    if (!server_name || !uri) {
      return JSON.stringify({
        success: false,
        error: "Missing required parameters: server_name and uri are required",
      });
    }

    try {
      // 读取资源
      const resourceResult = await this.mcpHub.readResource(server_name, uri);

      // 处理结果
      const resourceText =
        resourceResult.contents
          ?.map((item: any) => item.text || "")
          .filter(Boolean)
          .join("\n\n") || "(Empty response)";

      return JSON.stringify({
        success: true,
        content: resourceText,
        uri,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error accessing MCP resource: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 获取工具描述
   */
  getDescription(): string {
    return `访问 MCP 服务器提供的资源(如文件、数据库记录等)。

参数:
  - server_name: MCP 服务器名称(必需)
  - uri: 资源的唯一标识符(必需)

返回:
  - success: 是否成功
  - content: 资源内容
  - uri: 资源 URI
  - error: 错误信息(如果失败)

示例:
  读取数据库记录: resource://db/users/123
  读取文件内容: resource://file:///path/to/file.txt
  读取配置: resource://config/settings.json`;
  }

  /**
   * 验证参数
   */
  validateParams(params: any): { valid: boolean; error?: string } {
    if (!params.server_name || typeof params.server_name !== "string") {
      return { valid: false, error: "server_name must be a non-empty string" };
    }

    if (!params.uri || typeof params.uri !== "string") {
      return { valid: false, error: "uri must be a non-empty string" };
    }

    return { valid: true };
  }
}
