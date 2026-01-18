/**
 * SUMMARIZE_TASK 工具 - 任务总结工具
 *
 * 基于 Cline 的 summarize_task 实现
 * 当对话历史接近上下文窗口限制时,生成压缩的任务摘要
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 ContextManager 管理复杂的文件读取和上下文截断
 * - Git Tutor AI: Web 应用,通过文件系统服务读取文件,简化版本
 */

import type { ToolDefinition, ToolContext, ToolResult } from "../../types.js";

// ============================================================================
// 常量定义
// ============================================================================

/** 最多读取的文件数量 */
const MAX_FILES_LOADED = 8;

/** 最多处理的文件数量 */
const MAX_FILES_PROCESSED = 10;

/** 文件内容最大字符数 */
const MAX_CHARS = 100_000;

// ============================================================================
// 类型定义
// ============================================================================

export interface SummarizeTaskParams {
  /** 压缩后的任务上下文 */
  context: string;
}

export interface FileContent {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 字符数 */
  chars: number;
}

export interface SummarizeTaskResult {
  /** 格式化后的摘要内容 */
  summary: string;
  /** 读取的文件数量 */
  filesRead: number;
  /** 文件内容详情 */
  fileContents: FileContent[];
  /** 总字符数 */
  totalChars: number;
  /** 时间戳 */
  timestamp: string;
}

// ============================================================================
// 工具处理器
// ============================================================================

class SummarizeTaskHandler {
  /**
   * 文件读取回调
   * 格式: (filePath: string) => Promise<{ content: string; error?: string }>
   */
  private onReadFile?: (
    filePath: string
  ) => Promise<{ content: string; error?: string }>;

  /**
   * 设置文件读取回调
   */
  setFileReaderCallback(
    callback: (filePath: string) => Promise<{ content: string; error?: string }>
  ): void {
    this.onReadFile = callback;
  }

  async execute(_context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { context: taskContext } = params as SummarizeTaskParams;

      // 验证必需参数存在
      if (taskContext === undefined || taskContext === null) {
        return {
          success: false,
          error: "缺少必需参数: context",
        };
      }

      // 验证参数类型和内容
      if (typeof taskContext !== "string" || taskContext.trim().length === 0) {
        return {
          success: false,
          error: "context 参数不能为空",
        };
      }

      // 解析并读取 Required Files
      const fileContents = await this.readRequiredFiles(taskContext);

      // 格式化最终结果
      const formattedSummary = this.formatSummary(taskContext, fileContents);

      // 计算总字符数
      const totalChars = fileContents.reduce((sum, file) => sum + file.chars, 0);

      return {
        success: true,
        data: {
          summary: formattedSummary,
          filesRead: fileContents.length,
          fileContents,
          totalChars,
          timestamp: new Date().toISOString(),
        } as SummarizeTaskResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 解析并读取 Required Files
   */
  private async readRequiredFiles(context: string): Promise<FileContent[]> {
    const fileContents: FileContent[] = [];

    // 解析 "Required Files" 部分
    // 格式: "9. Required Files:\n  - file1.ts\n  - file2.ts"
    const requiredFilesRegex = /9\.\s*(?:Optional\s+)?Required\s+Files:\s*((?:\n\s*-\s*.+)+)/m;
    const match = context.match(requiredFilesRegex);

    if (!match) {
      return fileContents;
    }

    // 提取文件路径列表
    const filePaths = this.parseFilePaths(match[1]);

    let filesProcessed = 0;
    let totalChars = 0;

    for (const filePath of filePaths) {
      // 检查处理数量限制
      if (filesProcessed >= MAX_FILES_PROCESSED) {
        break;
      }

      // 检查已加载文件数量限制
      if (fileContents.length >= MAX_FILES_LOADED) {
        break;
      }

      filesProcessed++;

      // 读取文件内容
      const result = await this.readFileWithCallback(filePath);
      if (result.error || result.content.length === 0) {
        // 文件读取失败或为空,跳过
        continue;
      }

      // 检查字符数限制(在添加前检查)
      const wouldExceedLimit = totalChars + result.content.length > MAX_CHARS;
      if (wouldExceedLimit && fileContents.length > 0) {
        // 已经有文件了,且这个文件会超出限制,跳过
        continue;
      }

      let finalContent = result.content;

      // 如果会超出限制但这是第一个文件,截断它
      if (wouldExceedLimit && fileContents.length === 0) {
        const suffix = "\n... (内容被截断)";
        const remainingChars = MAX_CHARS - totalChars - suffix.length;
        finalContent = result.content.slice(0, Math.max(0, remainingChars)) + suffix;
      }

      fileContents.push({
        path: filePath,
        content: finalContent,
        chars: finalContent.length,
      });

      totalChars += finalContent.length;

      // 如果达到字符数限制,停止
      if (totalChars >= MAX_CHARS) {
        break;
      }
    }

    return fileContents;
  }

  /**
   * 从文本中解析文件路径列表
   */
  private parseFilePaths(text: string): string[] {
    // 每行一个文件路径,格式: "  - file/path.ts"
    const lines = text.split("\n");
    const filePaths: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-")) {
        const path = trimmed.replace(/^-\s*/, "").trim();
        if (path) {
          filePaths.push(path);
        }
      }
    }

    return filePaths;
  }

  /**
   * 使用回调读取文件
   */
  private async readFileWithCallback(
    filePath: string
  ): Promise<{ content: string; error?: string }> {
    if (!this.onReadFile) {
      return { content: "", error: "未设置文件读取回调" };
    }

    try {
      const result = await this.onReadFile(filePath);
      return result;
    } catch (error) {
      // 不要捕获异常,让调用者处理
      throw error;
    }
  }

  /**
   * 格式化最终摘要
   */
  private formatSummary(context: string, fileContents: FileContent[]): string {
    let formatted = context;

    // 追加文件内容
    if (fileContents.length > 0) {
      formatted += "\n\n## 文件内容";

      for (const file of fileContents) {
        formatted += `\n\n<file_content path="${file.path}">`;
        formatted += `\n${file.content}`;
        formatted += `\n</file_content>`;
      }
    }

    return formatted;
  }
}

// ============================================================================
// 工具定义
// ============================================================================

export const summarizeTaskTool: ToolDefinition = {
  name: "summarize_task",
  displayName: "任务总结",
  description:
    "任务总结工具:当对话历史接近上下文窗口限制时,生成压缩的任务摘要以保持任务连续性。使用此工具时,你需要创建一个详细的对话摘要,捕捉关键信息以便继续任务。" +
    "\n\n**摘要内容应包含**:" +
    "\n1. **主要请求和意图**: 用户的具体请求和目标" +
    "\n2. **关键技术概念**: 重要的技术概念、框架和编码约定" +
    "\n3. **文件和代码片段**: 检查、修改或创建的特定文件和代码部分" +
    "\n4. **问题解决**: 解决的问题和故障排除工作" +
    "\n5. **待处理任务**: 待处理任务列表" +
    "\n6. **任务演变**: 原始任务、任务修改、当前活动任务" +
    "\n7. **当前工作**: 当前正在进行的详细工作" +
    "\n8. **下一步**: 下一步行动计划" +
    "\n9. **Required Files**: (可选) 继续工作所需的文件列表,格式为:" +
    '\n   ```' +
    "\n   9. Required Files:" +
    "\n     - src/file1.ts" +
    "\n     - src/file2.ts" +
    '\n   ```' +
    "\n\n**工具会自动**:" +
    "\n- 读取 Required Files 中列出的文件(最多 8 个,总字符数限制 100,000)" +
    "\n- 将文件内容追加到摘要中" +
    "\n- 生成格式化的摘要供后续使用" +
    "\n\n**使用时机**:" +
    "\n- 对话历史长度达到上下文窗口限制的 80-90%" +
    "\n- 需要保持任务连续性但减少 token 消耗时" +
    "\n- 长时间开发会话中的内存管理",
  category: "task",
  parameters: [
    {
      name: "context",
      type: "string",
      required: true,
      description:
        "压缩后的任务上下文。应包含:" +
        "\n1. 主要请求和意图: 用户的具体请求" +
        "\n2. 关键技术概念: 重要的技术和框架" +
        "\n3. 文件和代码片段: 检查、修改或创建的文件" +
        "\n4. 问题解决: 解决的问题和故障排除" +
        "\n5. 待处理任务: 待处理任务列表" +
        "\n6. 任务演变: 原始任务、修改、当前任务" +
        "\n7. 当前工作: 当前正在进行的详细工作" +
        "\n8. 下一步: 下一步行动计划" +
        "\n9. Required Files: (可选) 所需文件列表",
    },
  ],
  permissions: [], // summarize_task 不需要特殊权限(文件读取通过回调处理)
  enabled: true,
  handler: new SummarizeTaskHandler(),
};

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建带有自定义文件读取回调的 summarize_task 工具
 */
export function createSummarizeTaskTool(
  onReadFile: (filePath: string) => Promise<{ content: string; error?: string }>
): ToolDefinition {
  const handler = new SummarizeTaskHandler();
  handler.setFileReaderCallback(onReadFile);

  return {
    ...summarizeTaskTool,
    handler,
  };
}

// 默认导出
export default summarizeTaskTool;
