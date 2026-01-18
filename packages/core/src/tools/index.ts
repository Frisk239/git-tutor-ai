// 工具系统主入口
export * from "./types.js";
export * from "./registry.js";
export * from "./executor.js";

// 导出增强组件
export * from "./validation.js";
export * from "./lifecycle.js";
export * from "./stats.js";

// 导出内置工具
export * from "./builtins/git-tools.js";
export * from "./builtins/github-tools.js";
export * from "./builtins/filesystem-tools.js";
export * from "./builtins/patch-tools.js";
export * from "./builtins/web-tools.js";
export * from "./builtins/web-fetch-tools.js";
export * from "./builtins/code-explanation-tools.js";
export * from "./builtins/interaction-tools.js";
export * from "./builtins/browser.js";
export * from "./builtins/task.js";
export * from "./builtins/completion.js";
export * from "./builtins/planning.js";

// 导出补丁系统
export * from "./patch.js";

// 导出 Web 搜索系统
export * from "./web.js";

// 导出便捷函数
import { toolRegistry } from "./registry.js";
import { toolExecutor } from "./executor.js";
import { registerGitTools } from "./builtins/git-tools.js";
import { registerGitHubTools } from "./builtins/github-tools.js";
import { registerFilesystemTools } from "./builtins/filesystem-tools.js";
import { registerPatchTools } from "./builtins/patch-tools.js";
import { registerWebTools } from "./builtins/web-tools.js";
import { registerWebFetchTools } from "./builtins/web-fetch-tools.js";
import { registerCodeExplanationTools } from "./builtins/code-explanation-tools.js";
import { registerInteractionTools } from "./builtins/interaction-tools.js";
import { registerBrowserTools } from "./builtins/browser.js";
import { registerTaskTools } from "./builtins/task.js";
import { registerAttemptCompletionTool } from "./builtins/completion.js";
import { registerPlanModeRespondTool } from "./builtins/planning.js";

/**
 * 初始化工具系统
 * 注册所有内置工具
 */
export function initializeTools(): void {
  // 注册 Git 工具
  registerGitTools();

  // 注册 GitHub 工具
  registerGitHubTools();

  // 注册文件系统工具
  registerFilesystemTools();

  // 注册补丁工具
  registerPatchTools();

  // 注册 Web 工具
  registerWebTools();

  // 注册 Web 获取工具
  registerWebFetchTools();

  // 注册代码解释生成工具
  registerCodeExplanationTools();

  // 注册交互工具
  registerInteractionTools();

  // 注册浏览器工具
  registerBrowserTools();

  // 注册任务工具
  registerTaskTools();

  // 注册完成工具
  registerAttemptCompletionTool();

  // 注册计划工具
  registerPlanModeRespondTool();

  // 未来可以注册更多工具：
  // registerTerminalTools();
  // registerCodeAnalysisTools();
  // registerMCPTools();
}

/**
 * 获取工具定义（用于 AI 提示词）
 */
export function getToolsDefinition(options?: {
  includeDisabled?: boolean;
  categories?: string[];
}): string {
  const tools = toolRegistry.getAll();

  let filteredTools = tools;

  // 过滤禁用的工具
  if (!options?.includeDisabled) {
    filteredTools = filteredTools.filter((t) => t.enabled);
  }

  // 过滤类别
  if (options?.categories && options.categories.length > 0) {
    filteredTools = filteredTools.filter((t) =>
      options.categories!.includes(t.category)
    );
  }

  // 生成工具定义文本
  const lines: string[] = [];

  // 按类别分组
  const byCategory = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    (acc[tool.category] as typeof filteredTools).push(tool);
    return acc;
  }, {} as Record<string, typeof filteredTools>);

  // 生成每个类别的定义
  for (const [category, toolsInCategory] of Object.entries(byCategory)) {
    if (!toolsInCategory) continue;
    lines.push(`## ${category.toUpperCase()}`);
    lines.push("");

    for (const tool of toolsInCategory) {
      lines.push(`### ${tool.name}`);
      lines.push(`**${tool.displayName}**`);
      lines.push(tool.description);
      lines.push("");

      // 参数
      if (tool.parameters.length > 0) {
        lines.push("**参数:**");
        for (const param of tool.parameters) {
          const required = param.required ? "（必需）" : "（可选）";
          lines.push(`- \`${param.name}\` (${param.type})${required}: ${param.description}`);
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 为 AI 生成工具调用提示词
 */
export function generateToolPrompt(): string {
  const tools = toolRegistry.getAll().filter((t) => t.enabled);

  const sections: string[] = [
    "# 可用工具",
    "",
    "你可以使用以下工具来完成任务：",
    "",
  ];

  // 按类别分组
  const byCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    (acc[tool.category] as typeof tools).push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  for (const [category, toolsInCategory] of Object.entries(byCategory)) {
    if (!toolsInCategory) continue;
    sections.push(`## ${category}`);
    sections.push("");

    for (const tool of toolsInCategory) {
      sections.push(`### ${tool.name}`);
      sections.push(`${tool.description}`);
      sections.push("");

      if (tool.parameters.length > 0) {
        sections.push("参数:");
        for (const param of tool.parameters) {
          const required = param.required ? "*" : "";
          sections.push(`- ${param.name}${required}: ${param.description} (${param.type})`);
        }
        sections.push("");
      }
    }
  }

  sections.push("");
  sections.push("(* 表示必需参数)");

  return sections.join("\n");
}

// 导出工具系统 API
export const toolsAPI = {
  registry: toolRegistry,
  executor: toolExecutor,
  initialize: initializeTools,
  getDefinition: getToolsDefinition,
  generatePrompt: generateToolPrompt,
};
