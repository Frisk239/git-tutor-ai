// Git 管理器 - 基于 simple-git
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import type {
  GitRepositoryInfo,
  GitCommit,
  GitBranch,
  GitStatus,
  GitDiff,
  GitOptions,
  GitCloneOptions,
  GitCommitOptions,
  GitMergeOptions,
  GitRebaseOptions,
} from './types.js';
import { GitOperation } from '@git-tutor/shared';

/**
 * Git 管理器
 * 封装所有 Git 操作，提供统一的接口
 */
export class GitManager {
  private git: SimpleGit;

  constructor(cwd?: string) {
    this.git = simpleGit(cwd);
  }

  /**
   * 克隆仓库
   */
  async clone(url: string, targetPath: string, options?: GitCloneOptions): Promise<string> {
    const git = options?.cwd ? simpleGit(options.cwd) : this.git;

    const args: string[] = [];
    if (options?.branch) {
      args.push('--branch', options.branch);
    }
    if (options?.depth) {
      args.push('--depth', options.depth.toString());
    }

    await git.clone(url, targetPath, args);
    return targetPath;
  }

  /**
   * 获取仓库信息
   */
  async getRepositoryInfo(): Promise<GitRepositoryInfo> {
    const cwd = this.git.cwd();
    const status = await this.git.status();
    const branches = await this.git.branch();
    const log = await this.git.log({ maxCount: 1 });

    return {
      path: cwd,
      currentBranch: status.current || 'HEAD',
      remote: status.remote,
      commitCount: status.trackingBranchCount || status.total,
      branchCount: branches.all.length,
      latestCommit: log.latest
        ? {
            hash: log.latest.hash,
            author: log.latest.author_name,
            email: log.latest.author_email,
            date: new Date(log.latest.date),
            message: log.latest.message,
          }
        : undefined,
    };
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'HEAD';
  }

  /**
   * 获取所有分支
   */
  async getBranches(): Promise<GitBranch[]> {
    const branches = await this.git.branch();
    return branches.all.map((name) => ({
      name,
      current: name === branches.current,
      commit: branches.branches[name]?.commit || '',
    }));
  }

  /**
   * 创建新分支
   */
  async createBranch(branchName: string, startPoint?: string): Promise<void> {
    await this.git.branch(['-c', startPoint || 'HEAD', branchName]);
  }

  /**
   * 切换分支
   */
  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }

  /**
   * 删除分支
   */
  async deleteBranch(branchName: string, force?: boolean): Promise<void> {
    if (force) {
      await this.git.branch(['-D', branchName]);
    } else {
      await this.git.deleteLocalBranch(branchName);
    }
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<GitStatus> {
    const status = await this.git.status();

    return {
      conflicted: status.conflicted,
      created: status.created,
      deleted: status.deleted,
      modified: status.modified,
      renamed: status.renamed,
      staged: status.staged,
      files: status.files.map((file) => ({
        path: file.path,
        index: file.index,
        working: file.working_dir,
      })),
    };
  }

  /**
   * 添加文件到暂存区
   */
  async add(files: string | string[]): Promise<void> {
    await this.git.add(files);
  }

  /**
   * 添加所有文件
   */
  async addAll(): Promise<void> {
    await this.git.add('.');
  }

  /**
   * 提交更改
   */
  async commit(options: GitCommitOptions): Promise<GitCommit> {
    const args: string[] = [];
    if (options.amend) {
      args.push('--amend');
    }
    if (options.allowEmpty) {
      args.push('--allow-empty');
    }

    const result = await this.git.commit(options.message, args);

    const log = await this.git.log({ maxCount: 1 });
    if (!log.latest) {
      throw new Error('Failed to get commit info');
    }

    return {
      hash: log.latest.hash,
      author: log.latest.author_name,
      email: log.latest.author_email,
      date: new Date(log.latest.date),
      message: log.latest.message,
    };
  }

  /**
   * 使用 AI 生成提交消息并提交
   */
  async smartCommit(files?: string[]): Promise<GitCommit> {
    // TODO: 集成 AI 管理器生成智能提交消息
    const status = await this.getStatus();

    // 暂时使用简单的提交消息
    const message = `Update ${files ? files.length : status.files.length} file(s)`;

    if (files) {
      await this.add(files);
    } else {
      await this.addAll();
    }

    return this.commit({ message });
  }

  /**
   * 获取提交历史
   */
  async getLog(maxCount: number = 10, file?: string): Promise<GitCommit[]> {
    const log = await this.git.log({ maxCount: maxCount, file });
    return log.all.map((commit) => ({
      hash: commit.hash,
      author: commit.author_name,
      email: commit.author_email,
      date: new Date(commit.date),
      message: commit.message,
    }));
  }

  /**
   * 获取文件差异
   */
  async getDiff(file?: string): Promise<GitDiff[]> {
    const diff = await this.git.diff([file || '']);

    // 解析差异统计
    const summary = await this.git.diffSummary([file || '']);

    return summary.files.map((f) => ({
      file: f.file,
      changes: f.changes,
      insertions: f.insertions,
      deletions: f.deletions,
      patch: diff,
    }));
  }

  /**
   * 拉取更改
   */
  async pull(remote?: string, branch?: string): Promise<void> {
    if (remote && branch) {
      await this.git.pull(remote, branch);
    } else {
      await this.git.pull();
    }
  }

  /**
   * 推送更改
   */
  async push(remote?: string, branch?: string): Promise<void> {
    if (remote && branch) {
      await this.git.push(remote, branch);
    } else {
      await this.git.push();
    }
  }

  /**
   * 合并分支
   */
  async merge(branch: string, options?: GitMergeOptions): Promise<void> {
    const args: string[] = [branch];

    if (options?.strategy) {
      args.push('--strategy', options.strategy);
    }
    if (options?.fastForward === false) {
      args.push('--no-ff');
    }

    await this.git.merge(args);
  }

  /**
   * 变基操作
   */
  async rebase(options?: GitRebaseOptions): Promise<void> {
    const args: string[] = [];

    if (options?.branch) {
      args.push(options.branch);
    }
    if (options?.interactive) {
      args.push('-i');
    }
    if (options?.onto) {
      args.push('--onto', options.onto);
    }

    if (args.length > 0) {
      await this.git.rebase(args);
    } else {
      await this.git.rebase();
    }
  }

  /**
   * 获取远程仓库
   */
  async getRemotes(): Promise<Record<string, string>> {
    const remotes = await this.git.getRemotes(true);
    return remotes.reduce(
      (acc, remote) => {
        acc[remote.name] = remote.refs.fetch;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  /**
   * 添加远程仓库
   */
  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
  }

  /**
   * 删除远程仓库
   */
  async removeRemote(name: string): Promise<void> {
    await this.git.removeRemote(name);
  }

  /**
   * 检查是否是 Git 仓库
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取最近的提交
   */
  async getLatestCommit(): Promise<GitCommit | null> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      if (!log.latest) return null;

      return {
        hash: log.latest.hash,
        author: log.latest.author_name,
        email: log.latest.author_email,
        date: new Date(log.latest.date),
        message: log.latest.message,
      };
    } catch {
      return null;
    }
  }
}

/**
 * 导出工厂函数
 */
export function createGitManager(cwd?: string): GitManager {
  return new GitManager(cwd);
}
