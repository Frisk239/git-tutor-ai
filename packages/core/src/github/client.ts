// GitHub API 客户端
import { Octokit } from "@octokit/rest";
import { AIProvider } from "@git-tutor/shared";
import type { aiManager } from "../ai/manager.js";
import type {
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubUser,
  GitHubComment,
  GitHubFileContent,
  GitHubCommit,
  GitHubReview,
  GitHubRepositorySearchOptions,
  GitHubIssueSearchOptions,
  GitHubCreateIssueOptions,
  GitHubCreatePROptions,
  GitHubMergePROptions,
} from "./types.js";

/**
 * GitHub 客户端配置
 */
export interface GitHubClientConfig {
  token: string;
  userAgent?: string;
  baseUrl?: string;
}

/**
 * AI 代码审查结果
 */
export interface AIReviewResult {
  summary: string;
  issues: Array<{
    file: string;
    line: number;
    severity: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  rating: number; // 1-10
  approved: boolean;
}

/**
 * GitHub 客户端
 * 封装所有 GitHub API 操作
 */
export class GitHubClient {
  private octokit: Octokit;
  private token: string;

  constructor(config: GitHubClientConfig) {
    this.token = config.token;
    this.octokit = new Octokit({
      auth: config.token,
      userAgent: config.userAgent || "Git-Tutor-AI",
      baseUrl: config.baseUrl,
    });
  }

  // ============= 仓库操作 =============

  /**
   * 获取仓库信息
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return this.normalizeRepository(data);
  }

  /**
   * 搜索仓库
   */
  async searchRepositories(
    options: GitHubRepositorySearchOptions
  ): Promise<{ items: GitHubRepository[]; totalCount: number }> {
    const { data } = await this.octokit.rest.search.repos({
      q: options.query,
      sort: options.sort,
      order: options.order,
      per_page: options.perPage || 30,
      page: options.page || 1,
    });

    return {
      items: data.items.map((item: any) => this.normalizeRepository(item)),
      totalCount: data.total_count,
    };
  }

  /**
   * 创建仓库
   */
  async createRepository(options: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  }): Promise<GitHubRepository> {
    const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
      name: options.name,
      description: options.description,
      private: options.private || false,
      auto_init: options.autoInit,
    });

    return this.normalizeRepository(data);
  }

  /**
   * Fork 仓库
   */
  async forkRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.rest.repos.createFork({
      owner,
      repo,
    });

    return this.normalizeRepository(data);
  }

  // ============= Issue/PR 操作 =============

  /**
   * 获取 Issue 列表
   */
  async getIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
    });

    return data.map((issue) => this.normalizeIssue(issue));
  }

  /**
   * 获取单个 Issue
   */
  async getIssue(owner: string, repo: string, number: number): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: number,
    });

    return this.normalizeIssue(data);
  }

  /**
   * 创建 Issue
   */
  async createIssue(
    owner: string,
    repo: string,
    options: GitHubCreateIssueOptions
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      assignees: options.assignees,
      milestone: options.milestone,
      labels: options.labels,
    });

    return this.normalizeIssue(data);
  }

  /**
   * 更新 Issue
   */
  async updateIssue(
    owner: string,
    repo: string,
    number: number,
    options: Partial<GitHubCreateIssueOptions> & { state?: "open" | "closed" }
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: number,
      title: options.title,
      body: options.body,
      assignees: options.assignees,
      milestone: options.milestone,
      labels: options.labels,
      state: options.state,
    });

    return this.normalizeIssue(data);
  }

  /**
   * 添加评论
   */
  async createComment(
    owner: string,
    repo: string,
    number: number,
    body: string
  ): Promise<GitHubComment> {
    const { data } = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });

    return this.normalizeComment(data);
  }

  /**
   * 获取 PR 列表
   */
  async getPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ): Promise<GitHubPullRequest[]> {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
    });

    return data.map((pr) => this.normalizePullRequest(pr));
  }

  /**
   * 获取单个 PR
   */
  async getPullRequest(
    owner: string,
    repo: string,
    number: number
  ): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number,
    });

    return this.normalizePullRequest(data);
  }

  /**
   * 创建 PR
   */
  async createPullRequest(
    owner: string,
    repo: string,
    options: GitHubCreatePROptions
  ): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
      draft: options.draft,
      maintainer_can_modify: options.maintainerCanModify,
    });

    return this.normalizePullRequest(data);
  }

  /**
   * 更新 PR
   */
  async updatePullRequest(
    owner: string,
    repo: string,
    number: number,
    options: Partial<GitHubCreatePROptions> & { state?: "open" | "closed" }
  ): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: number,
      title: options.title,
      body: options.body,
      state: options.state,
    });

    return this.normalizePullRequest(data);
  }

  /**
   * 合并 PR
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    number: number,
    options?: GitHubMergePROptions
  ): Promise<{ merged: boolean; sha: string; message: string }> {
    try {
      const { data } = await this.octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: number,
        commit_title: options?.commitTitle,
        commit_message: options?.commitMessage,
        merge_method: options?.method,
      });

      return {
        merged: data.merged,
        sha: data.sha,
        message: data.message,
      };
    } catch (error: any) {
      return {
        merged: false,
        sha: "",
        message: error.message || "Merge failed",
      };
    }
  }

  /**
   * 获取 PR 文件更改
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    number: number
  ): Promise<any[]> {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: number,
    });

    return data;
  }

  /**
   * 获取 PR 评论
   */
  async getPullRequestComments(
    owner: string,
    repo: string,
    number: number
  ): Promise<any[]> {
    const { data } = await this.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: number,
    });

    return data;
  }

  // ============= 用户操作 =============

  /**
   * 获取用户信息
   */
  async getUser(username: string): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getByUsername({
      username,
    });

    return this.normalizeUser(data);
  }

  /**
   * 获取当前用户信息
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated();

    return this.normalizeUser(data);
  }

  // ============= 文件操作 =============

  /**
   * 获取文件内容
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFileContent> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data)) {
      throw new Error("Path is a directory, not a file");
    }

    return {
      type: data.type,
      size: data.size,
      name: data.name,
      path: data.path,
      content: data.content,
      sha: data.sha,
      url: data.url,
      gitUrl: data.git_url,
      htmlUrl: data.html_url,
      downloadUrl: data.download_url,
    };
  }

  /**
   * 创建或更新文件
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<{ content: GitHubFileContent; commit: GitHubCommit }> {
    const contentBase64 = Buffer.from(content).toString("base64");

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      sha,
    });

    return {
      content: {
        type: data.content.type,
        size: data.content.size,
        name: data.content.name,
        path: data.content.path,
        content: data.content.content,
        sha: data.content.sha,
        url: data.content.url,
        gitUrl: data.content.git_url,
        htmlUrl: data.content.html_url,
        downloadUrl: data.content.download_url,
      },
      commit: {
        sha: data.commit.sha,
        nodeId: data.commit.node_id,
        message: data.commit.message,
        author: {
          name: data.commit.author.name,
          email: data.commit.author.email,
          date: new Date(data.commit.author.date),
        },
        committer: {
          name: data.commit.committer.name,
          email: data.commit.committer.email,
          date: new Date(data.commit.committer.date),
        },
        tree: {
          sha: data.commit.tree.sha,
          url: data.commit.tree.url,
        },
        url: data.commit.url,
        htmlUrl: data.commit.html_url,
        commentsUrl: data.commit.html_url,
      },
    };
  }

  // ============= 私有辅助方法 =============

  private normalizeRepository(data: any): GitHubRepository {
    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: {
        login: data.owner.login,
        id: data.owner.id,
        avatarUrl: data.owner.avatar_url,
        type: data.owner.type,
        siteAdmin: data.owner.site_admin,
      },
      description: data.description,
      private: data.private,
      fork: data.fork,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
      language: data.language,
      stargazersCount: data.stargazers_count,
      watchersCount: data.watchers_count,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      defaultBranch: data.default_branch,
      url: data.url,
      sshUrl: data.ssh_url,
      cloneUrl: data.clone_url,
      homepage: data.homepage,
      size: data.size,
    };
  }

  private normalizeIssue(data: any): GitHubIssue {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      locked: data.locked,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : null,
      user: this.normalizeUser(data.user),
      assignee: data.assignee ? this.normalizeUser(data.assignee) : null,
      assignees: data.assignees.map((u: any) => this.normalizeUser(u)),
      labels: data.labels.map((l: any) => ({
        id: l.id,
        nodeId: l.node_id,
        url: l.url,
        name: l.name,
        color: l.color,
        default: l.default,
        description: l.description,
      })),
      milestone: data.milestone
        ? {
            id: data.milestone.id,
            number: data.milestone.number,
            state: data.milestone.state,
            title: data.milestone.title,
            description: data.milestone.description,
            creator: this.normalizeUser(data.milestone.creator),
            openIssues: data.milestone.open_issues,
            closedIssues: data.milestone.closed_issues,
            createdAt: new Date(data.milestone.created_at),
            updatedAt: new Date(data.milestone.updated_at),
            closedAt: data.milestone.closed_at ? new Date(data.milestone.closed_at) : null,
            dueOn: data.milestone.due_on ? new Date(data.milestone.due_on) : null,
          }
        : null,
      comments: data.comments,
      pullRequest: data.pull_request
        ? {
            url: data.pull_request.url,
            htmlUrl: data.pull_request.html_url,
            diffUrl: data.pull_request.diff_url,
            patchUrl: data.pull_request.patch_url,
          }
        : undefined,
      url: data.url,
      repositoryUrl: data.repository_url,
    };
  }

  private normalizePullRequest(data: any): GitHubPullRequest {
    const baseIssue = this.normalizeIssue(data);
    return {
      ...baseIssue,
      draft: data.draft,
      merged: data.merged,
      mergeable: data.mergeable,
      mergedAt: data.merged_at ? new Date(data.merged_at) : null,
      mergeCommitSha: data.merge_commit_sha,
      head: {
        label: data.head.label,
        ref: data.head.ref,
        sha: data.head.sha,
        repo: this.normalizeRepository(data.head.repo),
      },
      base: {
        label: data.base.label,
        ref: data.base.ref,
        sha: data.base.sha,
        repo: this.normalizeRepository(data.base.repo),
      },
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
      reviewComments: data.review_comments,
      commits: data.commits,
    };
  }

  private normalizeUser(data: any): GitHubUser {
    return {
      login: data.login,
      id: data.id,
      avatarUrl: data.avatar_url,
      gravatarId: data.gravatar_id,
      type: data.type,
      siteAdmin: data.site_admin,
      name: data.name,
      email: data.email,
      bio: data.bio,
      location: data.location,
      blog: data.blog,
      followers: data.followers,
      following: data.following,
      publicRepos: data.public_repos,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private normalizeComment(data: any): GitHubComment {
    return {
      id: data.id,
      body: data.body,
      user: this.normalizeUser(data.user),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      htmlUrl: data.html_url,
    };
  }
}

/**
 * 导出工厂函数
 */
export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  return new GitHubClient(config);
}
