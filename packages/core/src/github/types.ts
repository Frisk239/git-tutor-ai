// GitHub API 类型定义
import { GitOperation } from '@git-tutor/shared';

/**
 * GitHub 仓库信息
 */
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: GitHubOwner;
  description: string | null;
  private: boolean;
  fork: boolean;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date | null;
  language: string | null;
  stargazersCount: number;
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  url: string;
  sshUrl: string;
  cloneUrl: string;
  homepage: string | null;
  size: number;
}

/**
 * GitHub 用户/组织信息
 */
export interface GitHubOwner {
  login: string;
  id: number;
  avatarUrl: string;
  type: 'User' | 'Organization';
  siteAdmin: boolean;
}

/**
 * GitHub Issue/PR 信息
 */
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'all';
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  user: GitHubUser;
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  milestone: GitHubMilestone | null;
  comments: number;
  pullRequest?: GitHubPRReference;
  url: string;
  repositoryUrl: string;
}

/**
 * GitHub PR 引用（用于区分 Issue 和 PR）
 */
export interface GitHubPRReference {
  url: string;
  htmlUrl: string;
  diffUrl: string;
  patchUrl: string;
}

/**
 * GitHub Pull Request 详细信息
 */
export interface GitHubPullRequest extends GitHubIssue {
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergedAt: Date | null;
  mergeCommitSha: string | null;
  head: GitHubPRBranch;
  base: GitHubPRBranch;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewComments: number;
  commits: number;
}

/**
 * GitHub PR 分支信息
 */
export interface GitHubPRBranch {
  label: string;
  ref: string;
  sha: string;
  repo: GitHubRepository;
}

/**
 * GitHub 用户信息
 */
export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl: string;
  gravatarId: string | null;
  type: 'User' | 'Bot';
  siteAdmin: boolean;
  name: string | null;
  email: string | null;
  bio: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GitHub 标签
 */
export interface GitHubLabel {
  id: number;
  nodeId: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description: string | null;
}

/**
 * GitHub 里程碑
 */
export interface GitHubMilestone {
  id: number;
  number: number;
  state: 'open' | 'closed' | 'all';
  title: string;
  description: string | null;
  creator: GitHubUser;
  openIssues: number;
  closedIssues: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  dueOn: Date | null;
}

/**
 * GitHub 评论
 */
export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  createdAt: Date;
  updatedAt: Date;
  htmlUrl: string;
}

/**
 * GitHub 提交信息
 */
export interface GitHubCommit {
  sha: string;
  nodeId: string;
  message: string;
  author: GitHubCommitAuthor;
  committer: GitHubCommitAuthor;
  tree: GitHubCommitTree;
  url: string;
  htmlUrl: string;
  commentsUrl: string;
}

/**
 * GitHub 提交作者
 */
export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: Date;
}

/**
 * GitHub 提交树
 */
export interface GitHubCommitTree {
  sha: string;
  url: string;
}

/**
 * GitHub 文件内容
 */
export interface GitHubFileContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  name: string;
  path: string;
  content?: string; // Base64 编码
  sha: string;
  url: string;
  gitUrl: string;
  htmlUrl: string;
  downloadUrl: string | null;
}

/**
 * GitHub 代码审查评论
 */
export interface GitHubReviewComment {
  id: number;
  pullRequestReviewId: number;
  body: string;
  user: GitHubUser;
  createdAt: Date;
  updatedAt: Date;
  path: string | null;
  position: number | null;
  line: number | null;
  commitId: string;
  originalCommitId: string;
}

/**
 * GitHub 代码审查
 */
export interface GitHubReview {
  id: number;
  user: GitHubUser;
  body: string | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
  submittedAt: Date | null;
  commitId: string;
  bodyHtml: string | null;
}

/**
 * GitHub 仓库搜索选项
 */
export interface GitHubRepositorySearchOptions {
  query: string;
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

/**
 * GitHub Issue/PR 搜索选项
 */
export interface GitHubIssueSearchOptions {
  query: string;
  sort?:
    | 'comments'
    | 'reactions'
    | 'reactions-+1'
    | 'reactions--1'
    | 'reactions-smile'
    | 'reactions-thinking_face'
    | 'reactions-heart'
    | 'reactions-tada'
    | 'interactions'
    | 'created'
    | 'updated';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

/**
 * GitHub 创建 Issue 选项
 */
export interface GitHubCreateIssueOptions {
  title: string;
  body?: string;
  assignees?: string[];
  milestone?: number;
  labels?: string[];
}

/**
 * GitHub 创建 PR 选项
 */
export interface GitHubCreatePROptions {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
}

/**
 * GitHub 合并 PR 选项
 */
export interface GitHubMergePROptions {
  commitTitle?: string;
  commitMessage?: string;
  method?: 'merge' | 'squash' | 'rebase';
}
