// Git 工具集
import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from "../types.js";
import { ToolPermission } from "@git-tutor/shared";
import { toolRegistry } from "../registry.js";

/**
 * Git 状态工具
 */
const gitStatusTool: ToolDefinition = {
  name: "git_status",
  displayName: "查看 Git 状态",
  description: "查看 Git 仓库的当前状态，包括已修改、已暂存、未跟踪的文件",
  category: "git",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "Git 仓库路径（可选，默认使用当前项目路径）",
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    try {
      const path = params.path || context.projectPath;
      if (path && path !== context.projectPath) {
        // 如果提供了不同的路径，创建新的 git 实例
        const { createGitManager } = await import("../../git/manager");
        const gitManager = createGitManager(path);
        const status = await gitManager.getStatus();
        return {
          success: true,
          data: status,
        };
      }

      const status = await git.getStatus();
      return {
        success: true,
        data: status,
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
 * Git 提交工具
 */
const gitCommitTool: ToolDefinition = {
  name: "git_commit",
  displayName: "提交代码更改",
  description: "将更改提交到 Git 仓库",
  category: "git",
  parameters: [
    {
      name: "message",
      type: "string",
      description: "提交消息",
      required: true,
    },
    {
      name: "files",
      type: "array",
      description: "要提交的文件列表（可选，不提供则提交所有更改）",
      required: false,
    },
    {
      name: "amend",
      type: "boolean",
      description: "是否修改上一次提交（可选）",
      required: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    try {
      // 添加文件
      if (params.files && params.files.length > 0) {
        await git.add(params.files);
      } else {
        await git.addAll();
      }

      // 提交
      const commit = await git.commit({
        message: params.message,
        amend: params.amend || false,
      });

      return {
        success: true,
        data: {
          commit,
          message: "代码已成功提交",
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
 * Git 创建分支工具
 */
const gitCreateBranchTool: ToolDefinition = {
  name: "git_create_branch",
  displayName: "创建并切换分支",
  description: "创建新分支并切换到该分支",
  category: "git",
  parameters: [
    {
      name: "name",
      type: "string",
      description: "分支名称",
      required: true,
    },
    {
      name: "startPoint",
      type: "string",
      description: "起始点（可选，默认为当前 HEAD）",
      required: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    try {
      await git.createBranch(params.name, params.startPoint);
      await git.checkout(params.name);

      return {
        success: true,
        data: {
          branch: params.name,
          message: `已创建并切换到分支 ${params.name}`,
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
 * Git 智能提交工具
 */
const gitSmartCommitTool: ToolDefinition = {
  name: "git_smart_commit",
  displayName: "智能提交代码",
  description: "使用 AI 分析代码更改并生成提交消息，然后执行提交",
  category: "git",
  parameters: [
    {
      name: "files",
      type: "array",
      description: "要提交的文件列表（可选）",
      required: false,
    },
    {
      name: "style",
      type: "string",
      description: "提交消息风格: conventional, simple, detailed",
      required: false,
      enum: ["conventional", "simple", "detailed"],
      default: "conventional",
    },
    {
      name: "language",
      type: "string",
      description: "提交消息语言: zh-CN, en-US",
      required: false,
      enum: ["zh-CN", "en-US"],
      default: "zh-CN",
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    const ai = context.services.ai;

    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    if (!ai) {
      return {
        success: false,
        error: "AI service not available in context",
      };
    }

    try {
      // 使用智能提交服务
      const { createSmartCommitService } = await import("../../git/smart-commit");
      const { AIProvider } = await import("@git-tutor/shared");

      const smartCommit = createSmartCommitService(git, AIProvider.ANTHROPIC);
      const result = await smartCommit.smartCommit(params.files, {
        style: params.style,
        language: params.language,
      });

      return {
        success: true,
        data: {
          commit: result.commit,
          message: result.message,
          formattedMessage: result.commit.message,
          summary: `已提交代码，使用 AI 生成的消息: ${result.message.title}`,
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
 * Git 日志工具
 */
const gitLogTool: ToolDefinition = {
  name: "git_log",
  displayName: "查看提交历史",
  description: "查看 Git 仓库的提交历史",
  category: "git",
  parameters: [
    {
      name: "maxCount",
      type: "number",
      description: "返回的最大提交数量（默认 10）",
      required: false,
      default: 10,
    },
    {
      name: "file",
      type: "string",
      description: "特定文件的历史记录（可选）",
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    try {
      const log = await git.getLog(params.maxCount || 10, params.file);

      return {
        success: true,
        data: {
          commits: log,
          count: log.length,
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
 * Git 差异工具
 */
const gitDiffTool: ToolDefinition = {
  name: "git_diff",
  displayName: "查看代码差异",
  description: "查看文件或工作区的代码差异",
  category: "git",
  parameters: [
    {
      name: "file",
      type: "string",
      description: "特定文件的差异（可选，不提供则显示所有差异）",
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const git = context.services.git;
    if (!git) {
      return {
        success: false,
        error: "Git service not available in context",
      };
    }

    try {
      const diff = await git.getDiff(params.file);

      return {
        success: true,
        data: {
          diff,
          summary: `找到 ${diff.length} 个文件的更改`,
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
 * 注册所有 Git 工具
 */
export function registerGitTools(): void {
  toolRegistry.register(gitStatusTool);
  toolRegistry.register(gitCommitTool);
  toolRegistry.register(gitCreateBranchTool);
  toolRegistry.register(gitSmartCommitTool);
  toolRegistry.register(gitLogTool);
  toolRegistry.register(gitDiffTool);
}

// 导出工具列表
export const gitTools = [
  gitStatusTool,
  gitCommitTool,
  gitCreateBranchTool,
  gitSmartCommitTool,
  gitLogTool,
  gitDiffTool,
];
