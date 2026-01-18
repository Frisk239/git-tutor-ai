/**
 * MCP_USE 工具处理器
 * 使用 MCP 服务器提供的工具
 */

import { McpHub } from '../hub.js';
import type { ToolExecutor, ToolExecutionContext } from '../../tools/index.js';

/**
 * MCP_USE 工具参数
 */
interface UseMcpToolParams {
  /** MCP 服务器名称 */
  server_name: string;
  /** 工具名称 */
  tool_name: string;
  /** 工具参数(JSON 字符串) */
  arguments?: string;
}

/**
 * MCP_USE 工具执行器
 */
export class UseMcpToolExecutor implements ToolExecutor {
  constructor(private mcpHub: McpHub) {}

  /**
   * 执行 MCP 工具
   */
  async execute(params: UseMcpToolParams, context: ToolExecutionContext): Promise<string> {
    const { server_name, tool_name, arguments: argsString } = params;

    // 验证参数
    if (!server_name || !tool_name) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameters: server_name and tool_name are required',
      });
    }

    // 解析参数
    let parsedArguments: Record<string, unknown> | undefined;
    if (argsString) {
      try {
        parsedArguments = JSON.parse(argsString);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: `Invalid JSON arguments: ${(error as Error).message}`,
        });
      }
    }

    try {
      // 调用 MCP 工具
      const toolResult = await this.mcpHub.callTool(server_name, tool_name, parsedArguments);

      // 处理结果
      const toolResultText =
        toolResult.content
          ?.map((item) => {
            if (item.type === 'text') {
              return item.text;
            }
            if (item.type === 'resource') {
              const { blob, ...rest } = item.resource;
              return JSON.stringify(rest, null, 2);
            }
            if (item.type === 'image') {
              return `[Image: ${item.data}]`;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n\n') || '(No response)';

      return JSON.stringify({
        success: true,
        content: toolResultText,
        isError: toolResult.isError,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error executing MCP tool: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 获取工具描述
   */
  getDescription(): string {
    return `使用 MCP 服务器提供的工具执行操作。

参数:
  - server_name: MCP 服务器名称(必需)
  - tool_name: 要执行的工具名称(必需)
  - arguments: 工具的 JSON 参数对象(可选)

返回:
  - success: 是否成功
  - content: 工具执行结果
  - error: 错误信息(如果失败)

示例:
  使用数据库工具查询数据
  使用文件系统工具读取文件
  使用 API 工具调用外部服务`;
  }

  /**
   * 验证参数
   */
  validateParams(params: any): { valid: boolean; error?: string } {
    if (!params.server_name || typeof params.server_name !== 'string') {
      return { valid: false, error: 'server_name must be a non-empty string' };
    }

    if (!params.tool_name || typeof params.tool_name !== 'string') {
      return { valid: false, error: 'tool_name must be a non-empty string' };
    }

    if (params.arguments !== undefined) {
      try {
        JSON.parse(params.arguments);
      } catch (error) {
        return { valid: false, error: 'arguments must be valid JSON string' };
      }
    }

    return { valid: true };
  }
}
