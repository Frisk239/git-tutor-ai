import { toolsAPI } from '@git-tutor/core/tools'

const toolExecutor = toolsAPI.executor

export class GitService {
  private workingDirectory: string

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory
  }

  /**
   * 获取 Git 状态
   */
  async getStatus() {
    const result = await toolExecutor.execute('git_status', {}, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取 Git diff
   */
  async getDiff(ref1?: string, ref2?: string) {
    const result = await toolExecutor.execute('git_diff', {
      ref1,
      ref2,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取提交日志
   */
  async getLog(limit: number = 10) {
    const result = await toolExecutor.execute('git_log', {
      limit,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 创建分支
   */
  async createBranch(branchName: string) {
    const result = await toolExecutor.execute('git_create_branch', {
      branchName,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 提交更改
   */
  async commit(message: string) {
    const result = await toolExecutor.execute('git_commit', {
      message,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 智能提交（AI 生成提交信息）
   */
  async smartCommit() {
    const result = await toolExecutor.execute('git_smart_commit', {}, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }
}

export const gitService = new GitService()
