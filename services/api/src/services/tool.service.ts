import { toolsAPI } from '@git-tutor/core/tools'
import type { ExecuteToolInput, ToolExecutionResponse } from '../schemas/tools.js'

const toolExecutor = toolsAPI.executor

export class ToolService {
  /**
   * 执行单个工具（增强错误处理）
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
    } catch (error: any) {
      // 详细的错误处理
      if (error instanceof Error) {
        // 检查常见错误类型
        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
          return {
            success: false,
            result: undefined,
            error: `文件或目录不存在: ${input.args.filePath || input.args.directoryPath || '未指定路径'}`,
          }
        }

        if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
          return {
            success: false,
            result: undefined,
            error: '权限不足，无法访问该文件或目录',
          }
        }

        if (error.message.includes('git') && error.message.includes('not a git repository')) {
          return {
            success: false,
            result: undefined,
            error: '当前目录不是 Git 仓库',
          }
        }

        if (error.message.includes('tool') && error.message.includes('not found')) {
          return {
            success: false,
            result: undefined,
            error: `工具 "${input.tool}" 不存在或未注册`,
          }
        }

        return {
          success: false,
          result: undefined,
          error: error.message,
        }
      }

      return {
        success: false,
        result: undefined,
        error: '未知错误',
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
