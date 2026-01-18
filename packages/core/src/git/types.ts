// Git 操作类型定义
import { GitOperation } from "@git-tutor/shared";

/**
 * Git 仓库信息
 */
export interface GitRepositoryInfo {
  path: string;
  currentBranch: string;
  remote?: string;
  commitCount: number;
  branchCount: number;
  latestCommit?: GitCommit;
}

/**
 * Git 提交信息
 */
export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files?: string[];
}

/**
 * Git 分支信息
 */
export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
}

/**
 * Git 状态信息
 */
export interface GitStatus {
  conflicted: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: string[];
  staged: string[];
  files: GitStatusFile[];
}

/**
 * Git 文件状态
 */
export interface GitStatusFile {
  path: string;
  index: string;
  working: string;
}

/**
 * Git 差异信息
 */
export interface GitDiff {
  file: string;
  changes: number;
  insertions: number;
  deletions: number;
  patch?: string;
}

/**
 * Git 操作选项
 */
export interface GitOptions {
  cwd?: string;
  timeout?: number;
}

/**
 * Clone 选项
 */
export interface GitCloneOptions extends GitOptions {
  branch?: string;
  depth?: number;
}

/**
 * Commit 选项
 */
export interface GitCommitOptions extends GitOptions {
  message: string;
  amend?: boolean;
  allowEmpty?: boolean;
}

/**
 * Merge 选项
 */
export interface GitMergeOptions extends GitOptions {
  strategy?: "ours" | "theirs" | "recursive" | "resolve" | "octopus";
  fastForward?: boolean;
}

/**
 * Rebase 选项
 */
export interface GitRebaseOptions extends GitOptions {
  branch?: string;
  interactive?: boolean;
  onto?: string;
}
