// 补丁工具
// 参考 Cline 的 apply_patch 工具实现

import { ToolDefinition, ToolResult, ToolContext } from "../types.js";
import { toolRegistry } from "../registry.js";
import { parsePatch, applyPatch, PATCH_MARKERS, PatchError } from "../patch.js";
import { Logger } from "../../logging/logger.js";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";

/**
 * 应用补丁工具
 */
export async function applyPatchTool(
  context: ToolContext,
  params: {
    patch: string; // 补丁文本
    workspace?: string; // 工作区路径(可选,默认使用当前工作目录)
  }
): Promise<ToolResult> {
  const logger = new Logger("apply_patch");

  try {
    const { patch, workspace = process.cwd() } = params;

    logger.info("Applying patch", {
      workspace,
      patchLength: patch.length,
    });

    // 预处理补丁文本
    const preprocessed = preprocessPatch(patch);

    // 解析补丁
    const existingFiles: Record<string, boolean> = {};
    const filePaths = extractFilePaths(preprocessed);

    // 检查现有文件
    for (const filePath of filePaths) {
      const absolutePath = resolve(workspace, filePath);
      if (existsSync(absolutePath)) {
        existingFiles[filePath] = true;
      }
    }

    // 解析补丁
    const { patch: parsedPatch, fuzz } = parsePatch(preprocessed, existingFiles);

    logger.info("Patch parsed", {
      actions: Object.keys(parsedPatch.actions).length,
      fuzz,
    });

    // 应用补丁
    const { results } = await applyPatch(preprocessed, workspace);

    // 生成摘要
    const summary = generateChangeSummary(results, fuzz);

    return {
      success: true,
      data: {
        summary,
        fuzz,
        results,
      },
    };
  } catch (error: any) {
    logger.error("Failed to apply patch", { error });

    return {
      success: false,
      error: error.message || "Failed to apply patch",
      metadata: {
        code: error.code,
      },
    };
  }
}

/**
 * 预处理补丁文本
 */
function preprocessPatch(patch: string): string {
  const lines = patch.split("\n");

  // 移除可能的 Bash 包装器
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(PATCH_MARKERS.BEGIN)) {
      startIndex = i;
      break;
    }
  }

  // 移除 bash heredoc 标记
  const cleaned = lines
    .slice(startIndex)
    .filter((line) => {
      // 移除 heredoc 相关行
      return (
        !line.includes("apply_patch <<") &&
        !line.includes('<<"EOF"') &&
        !line.trim() === "EOF"
      );
    })
    .join("\n");

  return cleaned;
}

/**
 * 从补丁中提取文件路径
 */
function extractFilePaths(patch: string): string[] {
  const paths: string[] = [];
  const lines = patch.split("\n");

  for (const line of lines) {
    if (line.startsWith(PATCH_MARKERS.ADD)) {
      const path = line.substring(PATCH_MARKERS.ADD.length).trim();
      paths.push(path);
    } else if (line.startsWith(PATCH_MARKERS.UPDATE)) {
      const path = line.substring(PATCH_MARKERS.UPDATE.length).trim();
      paths.push(path);
    } else if (line.startsWith(PATCH_MARKERS.DELETE)) {
      const path = line.substring(PATCH_MARKERS.DELETE.length).trim();
      paths.push(path);
    }
  }

  return paths;
}

/**
 * 生成变更摘要
 */
function generateChangeSummary(
  results: Record<string, any>,
  fuzz: number
): string {
  const lines: string[] = [];

  lines.push("# 补丁应用摘要\n");

  if (fuzz > 0) {
    lines.push(`**注意**: 补丁使用了模糊匹配 (fuzz factor: ${fuzz})\n`);
  }

  const files = Object.keys(results);
  lines.push(`**修改的文件**: ${files.length}\n`);

  for (const [path, result] of Object.entries(results)) {
    if (result.deleted) {
      lines.push(`- 删除: ${path}`);
    } else if (result.finalContent !== undefined) {
      const linesCount = result.finalContent.split("\n").length;
      lines.push(`- 更新: ${path} (${linesCount} 行)`);
    }
  }

  return lines.join("\n");
}

/**
 * 注册补丁工具
 */
export function registerPatchTools(): void {
  const applyPatchDefinition: ToolDefinition = {
    name: "apply_patch",
    displayName: "应用补丁",
    description: `应用统一的补丁文件来修改代码

支持三种操作:
1. **ADD** - 创建新文件
2. **UPDATE** - 更新现有文件(支持模糊匹配)
3. **DELETE** - 删除文件

补丁格式:
*** Begin Patch
*** Add File: new_file.js
+ function hello() {
+   console.log("Hello!");
+ }
*** End Patch

特点:
- 四层模糊匹配算法
- 自动处理格式差异
- 支持文件移动
- Unicode 和转义字符支持`,

    category: "filesystem",
    parameters: [
      {
        name: "patch",
        type: "string",
        description: "补丁文本,遵循 Cline 补丁格式",
        required: true,
      },
      {
        name: "workspace",
        type: "string",
        description: "工作区路径(可选,默认使用当前工作目录)",
        required: false,
      },
    ],
    permissions: [],
    enabled: true,
    handler: applyPatchTool,
  };

  toolRegistry.register(applyPatchDefinition);
}
