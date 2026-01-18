/**
 * GIT_CHECKOUT 工具 - Git 分支和文件切换
 *
 * 封装常用的 git checkout 操作,提供更友好的接口
 */

import { ToolDefinition, ToolHandler, ToolContext, ToolResult } from '../../types.js';
import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

// ============================================================================
// 常量定义
// ============================================================================

// 临时定义 ToolPermission 枚举(避免依赖 @git-tutor/shared)
enum ToolPermission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
}

export enum CheckoutType {
  BRANCH = 'branch', // 切换分支
  CREATE_BRANCH = 'create_branch', // 创建并切换到新分支
  FILE = 'file', // 恢复文件
  COMMIT = 'commit', // 切换到指定 commit
}

// ============================================================================
// 工具参数和返回值
// ============================================================================

export interface GitCheckoutParams {
  /** 工作目录 */
  cwd: string;
  /** Checkout 类型 */
  type: CheckoutType;
  /** 分支名 (type=branch 或 create_branch 时必需) */
  branch?: string;
  /** 起始分支 (type=create_branch 时可选) */
  startPoint?: string;
  /** 文件路径 (type=file 时必需) */
  filePath?: string;
  /** Commit hash (type=commit 时必需) */
  commit?: string;
  /** 是否创建新分支 (type=branch 时可选,等价于 type=create_branch) */
  createNew?: boolean;
  /** 是否强制操作 (丢弃本地更改) */
  force?: boolean;
}

export interface GitCheckoutResult {
  /** 执行的命令 */
  command: string;
  /** 操作是否成功 */
  success: boolean;
  /** 当前分支 (仅 branch 操作) */
  currentBranch?: string;
  /** 创建的分支 (仅 create_branch 操作) */
  createdBranch?: string;
  /** 恢复的文件 (仅 file 操作) */
  restoredFile?: string;
  /** 切换到的 commit (仅 commit 操作) */
  checkedOutCommit?: string;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// Git 命令执行器
// ============================================================================

class GitCommandExecutor {
  async execute(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async getCurrentBranch(cwd: string): Promise<string> {
    const result = await this.execute('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    return result.stdout.trim();
  }

  async branchExists(branch: string, cwd: string): Promise<boolean> {
    try {
      const result = await this.execute('git', ['rev-parse', '--verify', branch], cwd);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// 工具处理器
// ============================================================================

class GitCheckoutToolHandler implements ToolHandler {
  private executor = new GitCommandExecutor();

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { cwd, type, force = false } = params as GitCheckoutParams;

      // 验证工作目录是否存在
      try {
        await fs.access(cwd);
      } catch {
        return {
          success: false,
          error: `工作目录不存在: ${cwd}`,
        };
      }

      // 检查是否是 Git 仓库
      const gitDir = `${cwd}/.git`;
      try {
        await fs.access(gitDir);
      } catch {
        return {
          success: false,
          error: `不是 Git 仓库: ${cwd}`,
        };
      }

      // 根据类型执行操作
      switch (type) {
        case CheckoutType.BRANCH:
          return await this.checkoutBranch(params as GitCheckoutParams);

        case CheckoutType.CREATE_BRANCH:
          return await this.createBranch(params as GitCheckoutParams);

        case CheckoutType.FILE:
          return await this.checkoutFile(params as GitCheckoutParams);

        case CheckoutType.COMMIT:
          return await this.checkoutCommit(params as GitCheckoutParams);

        default:
          return {
            success: false,
            error: `未知的 checkout 类型: ${type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkoutBranch(params: GitCheckoutParams): Promise<ToolResult> {
    const { cwd, branch, createNew = false, force = false } = params;

    if (!branch) {
      return {
        success: false,
        error: '缺少必需参数: branch',
      };
    }

    // 如果 createNew=true,转换为创建分支操作
    if (createNew) {
      return await this.createBranch({ ...params, type: CheckoutType.CREATE_BRANCH });
    }

    // 构建命令
    const args = ['checkout'];
    if (force) {
      args.push('--force');
    }
    args.push(branch);

    const command = `git ${args.join(' ')}`;

    // 执行命令
    const result = await this.executor.execute('git', args, cwd);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || result.stdout,
        data: {
          command,
          success: false,
          error: result.stderr || result.stdout,
        },
      };
    }

    // 获取当前分支
    const currentBranch = await this.executor.getCurrentBranch(cwd);

    return {
      success: true,
      data: {
        command,
        success: true,
        currentBranch,
      },
    };
  }

  private async createBranch(params: GitCheckoutParams): Promise<ToolResult> {
    const { cwd, branch, startPoint, force = false } = params;

    if (!branch) {
      return {
        success: false,
        error: '缺少必需参数: branch',
      };
    }

    // 构建命令
    const args = ['checkout', '-b'];
    if (force) {
      args.push('--force');
    }
    args.push(branch);

    if (startPoint) {
      args.push(startPoint);
    }

    const command = `git ${args.join(' ')}`;

    // 执行命令
    const result = await this.executor.execute('git', args, cwd);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || result.stdout,
        data: {
          command,
          success: false,
          error: result.stderr || result.stdout,
        },
      };
    }

    return {
      success: true,
      data: {
        command,
        success: true,
        createdBranch: branch,
        currentBranch: branch,
      },
    };
  }

  private async checkoutFile(params: GitCheckoutParams): Promise<ToolResult> {
    const { cwd, filePath, force = false } = params;

    if (!filePath) {
      return {
        success: false,
        error: '缺少必需参数: filePath',
      };
    }

    // 构建命令
    const args = ['checkout'];
    if (force) {
      args.push('--force');
    }
    args.push('--', filePath);

    const command = `git ${args.join(' ')}`;

    // 执行命令
    const result = await this.executor.execute('git', args, cwd);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || result.stdout,
        data: {
          command,
          success: false,
          error: result.stderr || result.stdout,
        },
      };
    }

    return {
      success: true,
      data: {
        command,
        success: true,
        restoredFile: filePath,
      },
    };
  }

  private async checkoutCommit(params: GitCheckoutParams): Promise<ToolResult> {
    const { cwd, commit, force = false } = params;

    if (!commit) {
      return {
        success: false,
        error: '缺少必需参数: commit',
      };
    }

    // 构建命令
    const args = ['checkout'];
    if (force) {
      args.push('--force');
    }
    args.push(commit);

    const command = `git ${args.join(' ')}`;

    // 执行命令
    const result = await this.executor.execute('git', args, cwd);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || result.stdout,
        data: {
          command,
          success: false,
          error: result.stderr || result.stdout,
        },
      };
    }

    return {
      success: true,
      data: {
        command,
        success: true,
        checkedOutCommit: commit,
      },
    };
  }
}

// ============================================================================
// 工具定义
// ============================================================================

export const gitCheckoutTool: ToolDefinition = {
  name: 'git_checkout',
  displayName: 'Git 分支切换',
  description:
    '执行 Git checkout 操作,支持切换分支、创建新分支、恢复文件和切换到指定 commit。' +
    '\n\n**支持的操作类型**:' +
    '\n- **branch**: 切换到已存在的分支' +
    '\n- **create_branch**: 创建并切换到新分支' +
    '\n- **file**: 恢复文件到上次提交的状态' +
    '\n- **commit**: 切换到指定的 commit(进入 detached HEAD 状态)' +
    '\n\n**常用场景**:' +
    "\n- 切换到功能分支: type=branch, branch='feature/new-feature'" +
    "\n- 创建并切换到新分支: type=create_branch, branch='feature/new-feature', startPoint='main'" +
    "\n- 恢复已修改的文件: type=file, filePath='src/app.js'" +
    "\n- 切换到指定 commit: type=commit, commit='a1b2c3d'" +
    '\n- 强制切换(丢弃本地更改): force=true',
  category: 'git',
  parameters: [
    {
      name: 'cwd',
      type: 'string',
      required: true,
      description: '工作目录(Git 仓库根目录)',
    },
    {
      name: 'type',
      type: 'string',
      required: true,
      description: 'Checkout 类型: branch, create_branch, file, commit',
      enum: ['branch', 'create_branch', 'file', 'commit'],
    },
    {
      name: 'branch',
      type: 'string',
      required: false,
      description: '分支名 (type=branch 或 create_branch 时必需)',
    },
    {
      name: 'startPoint',
      type: 'string',
      required: false,
      description: '起始分支或 commit (type=create_branch 时可选,默认为当前 HEAD)',
    },
    {
      name: 'filePath',
      type: 'string',
      required: false,
      description: '文件路径 (type=file 时必需)',
    },
    {
      name: 'commit',
      type: 'string',
      required: false,
      description: 'Commit hash (type=commit 时必需)',
    },
    {
      name: 'createNew',
      type: 'boolean',
      required: false,
      description: '是否创建新分支 (type=branch 时可选,等价于 type=create_branch)',
    },
    {
      name: 'force',
      type: 'boolean',
      required: false,
      description: '是否强制操作(丢弃本地更改)',
    },
  ],
  permissions: [ToolPermission.READ, ToolPermission.WRITE],
  enabled: true,
  handler: new GitCheckoutToolHandler(),
};

// 默认导出
export default gitCheckoutTool;
