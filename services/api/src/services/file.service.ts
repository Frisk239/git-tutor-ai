import { toolsAPI } from '@git-tutor/core/tools'
import path from 'path'

const toolExecutor = toolsAPI.executor

export class FileService {
  private workingDirectory: string

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string) {
    const result = await toolExecutor.execute('read_file', {
      filePath: path.join(this.workingDirectory, filePath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 写入文件
   */
  async writeFile(filePath: string, content: string) {
    const result = await toolExecutor.execute('write_file', {
      filePath: path.join(this.workingDirectory, filePath),
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
    const result = await toolExecutor.execute('list_files', {
      directoryPath: path.join(this.workingDirectory, directoryPath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 搜索文件
   */
  async searchFiles(pattern: string, directoryPath?: string) {
    const result = await toolExecutor.execute('search_files', {
      pattern,
      directoryPath: directoryPath
        ? path.join(this.workingDirectory, directoryPath)
        : this.workingDirectory,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath: string) {
    const result = await toolExecutor.execute('get_file_stats', {
      filePath: path.join(this.workingDirectory, filePath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }
}

export const fileService = new FileService()
