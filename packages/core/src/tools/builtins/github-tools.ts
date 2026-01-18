// GitHub 工具集
import type { ToolDefinition, ToolContext, ToolResult } from "../types.js";
import { ToolPermission } from "@git-tutor/shared";
import { toolRegistry } from "../registry.js";

/**
 * GitHub 搜索仓库工具
 */
const githubSearchReposTool: ToolDefinition = {
  name: "github_search_repos",
  displayName: "搜索 GitHub 仓库",
  description: "搜索 GitHub 上的仓库",
  category: "github",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "搜索查询，例如: 'react typescript stars:>1000'",
      required: true,
    },
    {
      name: "sort",
      type: "string",
      description: "排序方式: stars, forks, help-wanted-issues, updated",
      required: false,
      enum: ["stars", "forks", "help-wanted-issues", "updated"],
    },
    {
      name: "order",
      type: "string",
      description: "排序顺序: asc, desc",
      required: false,
      enum: ["asc", "desc"],
    },
    {
      name: "limit",
      type: "number",
      description: "返回结果数量（默认 10）",
      required: false,
      default: 10,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const github = context.services.github;
    if (!github) {
      return {
        success: false,
        error: "GitHub service not available in context",
      };
    }

    try {
      const result = await github.searchRepositories({
        query: params.query,
        sort: params.sort,
        order: params.order,
        perPage: params.limit || 10,
      });

      return {
        success: true,
        data: {
          repositories: result.items,
          totalCount: result.totalCount,
          summary: `找到 ${result.totalCount} 个仓库，显示前 ${result.items.length} 个`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * GitHub 创建 Issue 工具
 */
const githubCreateIssueTool: ToolDefinition = {
  name: "github_create_issue",
  displayName: "创建 GitHub Issue",
  description: "在指定的仓库创建一个新 Issue",
  category: "github",
  parameters: [
    {
      name: "owner",
      type: "string",
      description: "仓库所有者",
      required: true,
    },
    {
      name: "repo",
      type: "string",
      description: "仓库名称",
      required: true,
    },
    {
      name: "title",
      type: "string",
      description: "Issue 标题",
      required: true,
    },
    {
      name: "body",
      type: "string",
      description: "Issue 内容（可选，支持 Markdown）",
      required: false,
    },
    {
      name: "labels",
      type: "array",
      description: "Issue 标签列表（可选）",
      required: false,
    },
    {
      name: "assignees",
      type: "array",
      description: "指派给的用户列表（可选）",
      required: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const github = context.services.github;
    if (!github) {
      return {
        success: false,
        error: "GitHub service not available in context",
      };
    }

    try {
      const issue = await github.createIssue(params.owner, params.repo, {
        title: params.title,
        body: params.body,
        labels: params.labels,
        assignees: params.assignees,
      });

      return {
        success: true,
        data: {
          issue,
          url: issue.url,
          summary: `已创建 Issue #${issue.number}: ${issue.title}`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * GitHub 创建 PR 工具
 */
const githubCreatePRTool: ToolDefinition = {
  name: "github_create_pr",
  displayName: "创建 Pull Request",
  description: "创建一个新的 Pull Request",
  category: "github",
  parameters: [
    {
      name: "owner",
      type: "string",
      description: "仓库所有者",
      required: true,
    },
    {
      name: "repo",
      type: "string",
      description: "仓库名称",
      required: true,
    },
    {
      name: "title",
      type: "string",
      description: "PR 标题",
      required: true,
    },
    {
      name: "head",
      type: "string",
      description: "源分支（例如: feature-branch）",
      required: true,
    },
    {
      name: "base",
      type: "string",
      description: "目标分支（例如: main）",
      required: true,
    },
    {
      name: "body",
      type: "string",
      description: "PR 描述（可选，支持 Markdown）",
      required: false,
    },
    {
      name: "draft",
      type: "boolean",
      description: "是否创建为草稿 PR",
      required: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const github = context.services.github;
    if (!github) {
      return {
        success: false,
        error: "GitHub service not available in context",
      };
    }

    try {
      const pr = await github.createPullRequest(params.owner, params.repo, {
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
        draft: params.draft,
      });

      return {
        success: true,
        data: {
          pullRequest: pr,
          url: pr.url,
          htmlUrl: pr.url.replace("api.github.com/repos", "github.com").replace("/pulls/", "/pull/"),
          summary: `已创建 PR #${pr.number}: ${pr.title}`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * GitHub AI 审查 PR 工具
 */
const githubReviewPRTool: ToolDefinition = {
  name: "github_review_pr",
  displayName: "AI 审查 Pull Request",
  description: "使用 AI 审查 Pull Request 并生成报告",
  category: "github",
  parameters: [
    {
      name: "owner",
      type: "string",
      description: "仓库所有者",
      required: true,
    },
    {
      name: "repo",
      type: "string",
      description: "仓库名称",
      required: true,
    },
    {
      name: "prNumber",
      type: "number",
      description: "PR 编号",
      required: true,
    },
    {
      name: "autoComment",
      type: "boolean",
      description: "是否自动发布审查评论",
      required: false,
      default: false,
    },
    {
      name: "focus",
      type: "string",
      description: "审查焦点: security, performance, style, all",
      required: false,
      enum: ["security", "performance", "style", "all"],
      default: "all",
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const github = context.services.github;
    if (!github) {
      return {
        success: false,
        error: "GitHub service not available in context",
      };
    }

    try {
      const { createGitHubAIReviewService } = await import("../../github/ai-review");
      const { AIProvider } = await import("@git-tutor/shared");

      const reviewService = createGitHubAIReviewService(github, AIProvider.ANTHROPIC);

      let review;
      if (params.autoComment) {
        const result = await reviewService.reviewAndComment(
          params.owner,
          params.repo,
          params.prNumber,
          { focus: params.focus }
        );
        review = result.review;
      } else {
        review = await reviewService.reviewPullRequest(
          params.owner,
          params.repo,
          params.prNumber,
          { focus: params.focus }
        );
      }

      return {
        success: true,
        data: {
          review,
          summary: `PR 审查完成，评分: ${review.rating}/10`,
          approved: review.approved,
          issuesCount: review.issues.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * GitHub 获取 Issue 列表工具
 */
const githubListIssuesTool: ToolDefinition = {
  name: "github_list_issues",
  displayName: "获取 Issue 列表",
  description: "获取仓库的 Issue 列表",
  category: "github",
  parameters: [
    {
      name: "owner",
      type: "string",
      description: "仓库所有者",
      required: true,
    },
    {
      name: "repo",
      type: "string",
      description: "仓库名称",
      required: true,
    },
    {
      name: "state",
      type: "string",
      description: "Issue 状态: open, closed, all",
      required: false,
      enum: ["open", "closed", "all"],
      default: "open",
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const github = context.services.github;
    if (!github) {
      return {
        success: false,
        error: "GitHub service not available in context",
      };
    }

    try {
      const issues = await github.getIssues(
        params.owner,
        params.repo,
        params.state
      );

      return {
        success: true,
        data: {
          issues,
          count: issues.length,
          summary: `找到 ${issues.length} 个 ${params.state} issue(s)`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * 注册所有 GitHub 工具
 */
export function registerGitHubTools(): void {
  toolRegistry.register(githubSearchReposTool);
  toolRegistry.register(githubCreateIssueTool);
  toolRegistry.register(githubCreatePRTool);
  toolRegistry.register(githubReviewPRTool);
  toolRegistry.register(githubListIssuesTool);
}

// 导出工具列表
export const githubTools = [
  githubSearchReposTool,
  githubCreateIssueTool,
  githubCreatePRTool,
  githubReviewPRTool,
  githubListIssuesTool,
];
