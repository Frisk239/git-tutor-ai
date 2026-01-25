import { toolsAPI } from '@git-tutor/core/tools'
import path from 'path'

const toolExecutor = toolsAPI.executor

export class FileService {
  private workingDirectory: string

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory
  }

  /**
   * 验证文件名是否包含非法字符
   */
  private validateFileName(filePath: string): void {
    // 阻止包含非法字符的路径
    const invalidChars = /[<>:"|?]/
    if (invalidChars.test(filePath)) {
      throw new Error(`Invalid file path: contains invalid characters`)
    }

    // 阻止绝对路径（攻击者绕过尝试）
    if (path.isAbsolute(filePath)) {
      throw new Error(`Absolute paths are not allowed: ${filePath}`)
    }

    // 阻止包含可疑的目录名（如 ... 用于混淆）
    // 支持跨平台路径分隔符
    const pathSegments = filePath.split(/[\\/]/).filter(Boolean)
    if (pathSegments.some(segment => segment === '...')) {
      throw new Error(`Invalid file path: contains suspicious directory name`)
    }
  }

  /**
   * 验证路径是否在工作空间内
   * 防止路径遍历攻击（如 ../../etc/passwd）
   */
  private validatePath(filePath: string): string {
    // 首先验证文件名
    this.validateFileName(filePath)

    // 解析完整路径
    const resolvedPath = path.resolve(path.join(this.workingDirectory, filePath))

    // 解析工作空间路径
    const workspacePath = path.resolve(this.workingDirectory)

    // 验证路径是否在工作空间内
    if (!resolvedPath.startsWith(workspacePath)) {
      throw new Error(
        `Access denied: path outside workspace. ` +
        `Requested: ${filePath}, ` +
        `Resolved: ${resolvedPath}, ` +
        `Workspace: ${workspacePath}`
      )
    }

    return resolvedPath
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string) {
    const validatedPath = this.validatePath(filePath)

    const result = await toolExecutor.execute('read_file', {
      filePath: validatedPath,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 写入文件
   */
  async writeFile(filePath: string, content: string) {
    const validatedPath = this.validatePath(filePath)

    const result = await toolExecutor.execute('write_file', {
      filePath: validatedPath,
      content,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 列出目录
   */
  async listFiles(directoryPath: string) {
    const validatedPath = this.validatePath(directoryPath)

    const result = await toolExecutor.execute('list_files', {
      directoryPath: validatedPath,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 搜索文件
   */
  async searchFiles(pattern: string, directoryPath?: string) {
    const validatedPath = directoryPath
      ? this.validatePath(directoryPath)
      : this.workingDirectory

    const result = await toolExecutor.execute('search_files', {
      pattern,
      directoryPath: validatedPath,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath: string) {
    const validatedPath = this.validatePath(filePath)

    const result = await toolExecutor.execute('get_file_stats', {
      filePath: validatedPath,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 生成文件差异
   */
  async generateDiff(filePath: string) {
    const validatedPath = this.validatePath(filePath)

    const result = await toolExecutor.execute('diff_file', {
      filePath: validatedPath,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }
}

export const fileService = new FileService()
