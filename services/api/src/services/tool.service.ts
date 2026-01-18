import { toolsAPI } from '@git-tutor/core/tools'
import type { ExecuteToolInput, ToolExecutionResponse } from '../schemas/tools.js'

const toolExecutor = toolsAPI.executor

export class ToolService {
  /**
   * 执行单个工具
   */
  async executeTool(input: ExecuteToolInput): Promise<ToolExecutionResponse> {
    try {
      const result = await toolExecutor.execute(input.tool, input.args, {
        workingDirectory: process.cwd(),
      })

      return {
        success: result.success,
        result: result.data,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        result: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 获取所有可用工具列表
   */
  async listTools() {
    const tools = toolExecutor.getAll()
    return tools.map((tool: any) => ({
      name: tool.name,
      category: tool.category,
      displayName: tool.displayName,
      description: tool.description,
      parameters: tool.parameters,
      enabled: tool.enabled,
      experimental: tool.experimental,
    }))
  }

  /**
   * 获取工具详情
   */
  async getTool(toolName: string) {
    const tool = toolExecutor.get(toolName)
    if (!tool) {
      return null
    }

    return {
      name: tool.name,
      category: tool.category,
      displayName: tool.displayName,
      description: tool.description,
      parameters: tool.parameters,
      enabled: tool.enabled,
      experimental: tool.experimental,
    }
  }
}

export const toolService = new ToolService()
