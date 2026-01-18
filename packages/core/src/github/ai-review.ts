// GitHub AI 代码审查服务
import { GitHubClient } from "./client.js";
import { aiManager, AIProvider } from "../ai.js";
import type { AIReviewResult } from "./client.js";

/**
 * AI 代码审查选项
 */
export interface AIReviewOptions {
  provider?: AIProvider;
  model?: string;
  language?: "zh-CN" | "en-US";
  focus?: "security" | "performance" | "style" | "all";
  maxIssues?: number;
}

/**
 * AI PR 审查服务
 * 集成 GitHub API 和 AI 能力
 */
export class GitHubAIReviewService {
  private github: GitHubClient;
  private defaultProvider: AIProvider;

  constructor(
    github: GitHubClient,
    defaultProvider: AIProvider = AIProvider.ANTHROPIC
  ) {
    this.github = github;
    this.defaultProvider = defaultProvider;
  }

  /**
   * 审查 Pull Request
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: AIReviewOptions
  ): Promise<AIReviewResult> {
    // 1. 获取 PR 信息
    const pr = await this.github.getPullRequest(owner, repo, prNumber);

    // 2. 获取文件更改
    const files = await this.github.getPullRequestFiles(owner, repo, prNumber);

    // 3. 构建上下文
    const context = await this.buildReviewContext(pr, files);

    // 4. 调用 AI 审查
    const review = await this.performAIReview(context, options);

    // 5. 返回结果
    return review;
  }

  /**
   * 审查并自动发布评论
   */
  async reviewAndComment(
    owner: string,
    repo: string,
    prNumber: number,
    options?: AIReviewOptions
  ): Promise<{ review: AIReviewResult; commentUrl?: string }> {
    // 执行审查
    const review = await this.reviewPullRequest(owner, repo, prNumber, options);

    // 构建评论内容
    const commentBody = this.formatReviewComment(review);

    // 发布评论
    if (!review.approved || review.issues.length > 0) {
      const comment = await this.github.createComment(
        owner,
        repo,
        prNumber,
        commentBody
      );

      return {
        review,
        commentUrl: comment.htmlUrl,
      };
    }

    return { review };
  }

  /**
   * 智能审查并自动批准或请求更改
   */
  async reviewAndApprove(
    owner: string,
    repo: string,
    prNumber: number,
    options?: AIReviewOptions
  ): Promise<{ approved: boolean; review: AIReviewResult }> {
    const review = await this.reviewPullRequest(owner, repo, prNumber, options);

    // 如果评分 >= 7，自动批准
    if (review.rating >= 7) {
      return {
        approved: true,
        review,
      };
    }

    // 如果有严重问题，请求更改
    if (review.issues.some((i) => i.severity === "error")) {
      return {
        approved: false,
        review,
      };
    }

    // 评分中等，留待人工决定
    return {
      approved: false,
      review,
    };
  }

  /**
   * 构建审查上下文
   */
  private async buildReviewContext(pr: any, files: any[]): Promise<string> {
    const parts: string[] = [];

    // PR 基本信息
    parts.push("## Pull Request 信息");
    parts.push(`标题: ${pr.title}`);
    parts.push(`描述: ${pr.body || "无"}`);
    parts.push(`分支: ${pr.head.ref} -> ${pr.base.ref}`);
    parts.push(`更改: +${pr.additions} -${pr.deletions} (${pr.changedFiles} 文件)\n`);

    // 文件列表
    parts.push("## 更改的文件");
    files.forEach((file) => {
      parts.push(`- ${file.filename} (+${file.additions} -${file.deletions})`);
    });
    parts.push("");

    // 获取补丁（差异内容）
    parts.push("## 代码差异");
    // 限制文件数量，避免 token 过多
    const maxFiles = 10;
    const filesToShow = files.slice(0, maxFiles);

    for (const file of filesToShow) {
      if (file.patch) {
        // 限制每个文件的差异长度
        const maxPatchLength = 2000;
        const truncatedPatch =
          file.patch.length > maxPatchLength
            ? file.patch.substring(0, maxPatchLength) + "\n... (差异过长，已截断)"
            : file.patch;

        parts.push(`### ${file.filename}`);
        parts.push("```diff");
        parts.push(truncatedPatch);
        parts.push("```\n");
      }
    }

    if (files.length > maxFiles) {
      parts.push(`... 还有 ${files.length - maxFiles} 个文件未显示`);
    }

    return parts.join("\n");
  }

  /**
   * 执行 AI 审查
   */
  private async performAIReview(
    context: string,
    options?: AIReviewOptions
  ): Promise<AIReviewResult> {
    const provider = options?.provider || this.defaultProvider;
    const model = options?.model || "claude-sonnet-4-5-20250929";
    const language = options?.language || "zh-CN";
    const focus = options?.focus || "all";

    const prompt = this.buildReviewPrompt(context, language, focus);
    const systemPrompt = this.getReviewSystemPrompt(language);

    const response = await aiManager.chat(
      provider,
      {
        model,
        temperature: 0.2, // 低温度以获得一致的结果
        maxTokens: 4000,
        systemPrompt,
      },
      [{ role: "user", content: prompt }]
    );

    return this.parseReviewResponse(response.content);
  }

  /**
   * 构建审查提示词
   */
  private buildReviewPrompt(
    context: string,
    language: string,
    focus: string
  ): string {
    const focusInstruction = {
      security: "重点关注安全性问题：SQL 注入、XSS、权限检查等",
      performance: "重点关注性能问题：算法复杂度、内存泄漏、不必要的计算等",
      style: "重点关注代码风格：命名规范、代码结构、注释等",
      all: "全面审查代码质量、安全性、性能、可维护性等方面",
    };

    const instruction =
      language === "zh-CN"
        ? `请仔细审查这个 Pull Request。

${focusInstruction[focus]}

请以 JSON 格式返回审查结果：
{
  "summary": "整体评价摘要",
  "rating": 1-10,
  "approved": true/false,
  "issues": [
    {
      "file": "文件路径",
      "line": 行号,
      "severity": "error|warning|info",
      "message": "问题描述",
      "suggestion": "修改建议（可选）"
    }
  ]
}

评分标准：
- 9-10 分：代码质量优秀，可以直接合并
- 7-8 分：代码质量良好，有小问题但不影响合并
- 5-6 分：代码质量一般，建议修改后再合并
- 1-4 分：代码存在严重问题，必须修改后才能合并`
        : `Please carefully review this Pull Request.

${focusInstruction[focus]}

Return the review result in JSON format:
{
  "summary": "Overall assessment summary",
  "rating": 1-10,
  "approved": true/false,
  "issues": [
    {
      "file": "file path",
      "line": line number,
      "severity": "error|warning|info",
      "message": "issue description",
      "suggestion": "suggested fix (optional)"
    }
  ]
}

Rating criteria:
- 9-10: Excellent code quality, safe to merge
- 7-8: Good code quality, minor issues but safe to merge
- 5-6: Average code quality, suggest fixes before merging
- 1-4: Serious issues, must fix before merging`;

    return `${instruction}\n\n${context}`;
  }

  /**
   * 获取审查系统提示词
   */
  private getReviewSystemPrompt(language: string): string {
    return language === "zh-CN"
      ? `你是一个专业的代码审查助手。你的职责是：
1. 仔细分析代码更改
2. 识别潜在的问题和改进建议
3. 提供具体、可操作的反馈
4. 给出公正的评分和合并建议

审查要点：
- ✅ 正确性：代码是否正确实现预期功能
- 🔒 安全性：是否存在安全漏洞或风险
- ⚡ 性能：是否存在性能问题
- 🎨 可读性：代码是否清晰易懂
- 🔧 可维护性：代码是否易于维护和扩展
- 🧪 测试：是否包含适当的测试
- 📝 文档：是否需要更新文档

输出格式要求：
- 使用 JSON 格式
- 问题按严重程度排序（error -> warning -> info）
- 提供具体的行号和文件路径
- 给出建设性的修改建议`
      : `You are a professional code review assistant. Your responsibilities are:
1. Carefully analyze code changes
2. Identify potential issues and improvements
3. Provide specific, actionable feedback
4. Give fair ratings and merge recommendations

Review points:
- ✅ Correctness: Does the code correctly implement the intended functionality
- 🔒 Security: Are there security vulnerabilities or risks
- ⚡ Performance: Are there performance issues
- 🎨 Readability: Is the code clear and understandable
- 🔧 Maintainability: Is the code easy to maintain and extend
- 🧪 Testing: Does it include appropriate tests
- 📝 Documentation: Does documentation need updates

Output format requirements:
- Use JSON format
- Sort issues by severity (error -> warning -> info)
- Provide specific line numbers and file paths
- Give constructive suggestions for fixes`;
  }

  /**
   * 解析 AI 审查响应
   */
  private parseReviewResponse(content: string): AIReviewResult {
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || "",
          issues: parsed.issues || [],
          rating: parsed.rating || 5,
          approved: parsed.approved || false,
        };
      }
    } catch (error) {
      console.error("Failed to parse review response:", error);
    }

    // 如果解析失败，返回默认结果
    return {
      summary: content.substring(0, 500),
      issues: [],
      rating: 5,
      approved: false,
    };
  }

  /**
   * 格式化审查评论
   */
  private formatReviewComment(review: AIReviewResult): string {
    const language = "zh-CN"; // 可以根据配置调整

    const lines: string[] = [];

    // 标题
    const ratingEmoji = review.rating >= 8 ? "👍" : review.rating >= 5 ? "⚠️" : "🚫";
    lines.push(`# AI 代码审查 ${ratingEmoji} 评分: ${review.rating}/10\n`);

    // 总结
    lines.push(`## ${language === "zh-CN" ? "总结" : "Summary"}`);
    lines.push(review.summary);
    lines.push("");

    // 评级
    const statusText =
      review.rating >= 8
        ? "✅ APPROVED"
        : review.rating >= 5
        ? "⚠️ NEEDS IMPROVEMENT"
        : "🚫 CHANGES REQUESTED";
    lines.push(`## ${language === "zh-CN" ? "状态" : "Status"}: ${statusText}\n`);

    // 问题列表
    if (review.issues.length > 0) {
      lines.push(`## ${language === "zh-CN" ? "发现的问题" : "Issues Found"}\n`);

      const grouped = {
        error: review.issues.filter((i) => i.severity === "error"),
        warning: review.issues.filter((i) => i.severity === "warning"),
        info: review.issues.filter((i) => i.severity === "info"),
      };

      if (grouped.error.length > 0) {
        lines.push("### 🔴 Errors");
        grouped.error.forEach((issue) => {
          lines.push(
            `**${issue.file}:${issue.line}** - ${issue.message}`
          );
          if (issue.suggestion) {
            lines.push(`💡 建议: ${issue.suggestion}`);
          }
          lines.push("");
        });
      }

      if (grouped.warning.length > 0) {
        lines.push("### ⚠️ Warnings");
        grouped.warning.forEach((issue) => {
          lines.push(
            `**${issue.file}:${issue.line}** - ${issue.message}`
          );
          if (issue.suggestion) {
            lines.push(`💡 建议: ${issue.suggestion}`);
          }
          lines.push("");
        });
      }

      if (grouped.info.length > 0) {
        lines.push("### ℹ️ Info");
        grouped.info.forEach((issue) => {
          lines.push(`**${issue.file}** - ${issue.message}`);
          if (issue.suggestion) {
            lines.push(`💡 建议: ${issue.suggestion}`);
          }
          lines.push("");
        });
      }
    }

    lines.push("---\n");
    lines.push(
      `*${language === "zh-CN" ? "由 Git Tutor AI 自动生成" : "Automatically generated by Git Tutor AI"}*`
    );

    return lines.join("\n");
  }
}

/**
 * 导出工厂函数
 */
export function createGitHubAIReviewService(
  github: GitHubClient,
  defaultProvider?: AIProvider
): GitHubAIReviewService {
  return new GitHubAIReviewService(github, defaultProvider);
}
