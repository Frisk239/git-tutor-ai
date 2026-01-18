// 文件系统工具集
// 参考 Cline 的文件系统工具实现 (ReadFileToolHandler, WriteToFileToolHandler)
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { ToolPermission } from '@git-tutor/shared';
import { toolRegistry } from '../registry.js';
import { promises as fs } from 'fs';
import { join, resolve, isAbsolute, relative } from 'path';
import { glob } from 'glob';
import { checkPathAccess } from '../../utils/clineignore.js';
import { retryAsync, RetryPresets } from '../../utils/retry.js';

/**
 * 检查路径是否在项目目录内
 * 安全检查,防止访问项目外的文件
 */
function ensurePathInProject(path: string, projectPath?: string): string {
  const resolvedPath = resolve(path);

  if (projectPath) {
    const resolvedProjectPath = resolve(projectPath);
    const relativePath = relative(resolvedProjectPath, resolvedPath);

    // 如果相对路径以 .. 开头,说明在项目外
    if (relativePath.startsWith('..')) {
      throw new Error(`Access denied: path "${path}" is outside the project directory`);
    }
  }

  return resolvedPath;
}

/**
 * 综合路径安全检查
 * 结合了项目目录检查和 .clineignore 检查
 */
function validatePathAccess(
  path: string,
  projectPath?: string,
  checkIgnore: boolean = true
): string {
  // 1. 基础路径检查
  const safePath = ensurePathInProject(path, projectPath);

  // 2. .clineignore 检查 (如果需要)
  if (checkIgnore && projectPath) {
    const access = checkPathAccess(safePath, projectPath);
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }
  }

  return safePath;
}

/**
 * 读取文件工具
 * 对应 Cline 的 read_file
 */
const readFileTool: ToolDefinition = {
  name: 'read_file',
  displayName: '读取文件内容',
  description: '读取文件的内容。支持文本、代码等文件。对于大型文件,可以指定读取行数范围。',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '文件路径,可以是相对路径或绝对路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'encoding',
      type: 'string',
      description: '文件编码格式',
      required: false,
      default: 'utf-8',
      enum: ['utf-8', 'utf-16le', 'latin1'],
    },
    {
      name: 'startLine',
      type: 'number',
      description: '起始行号(从1开始,可选)',
      required: false,
    },
    {
      name: 'endLine',
      type: 'number',
      description: '结束行号(可选)',
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const filePath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(filePath, context.projectPath, true);

      // 3. 读取文件
      const content = await fs.readFile(safePath, params.encoding || 'utf-8');

      // 4. 处理行数范围
      let resultContent = content;
      let lineInfo = '';

      if (params.startLine || params.endLine) {
        const lines = content.split('\n');
        const start = params.startLine || 1;
        const end = params.endLine || lines.length;

        if (start > lines.length || end > lines.length) {
          return {
            success: false,
            error: `Line range out of bounds: file has ${lines.length} lines`,
          };
        }

        resultContent = lines.slice(start - 1, end).join('\n');
        lineInfo = ` (lines ${start}-${end} of ${lines.length})`;
      }

      // 5. 获取文件统计信息
      const stats = await fs.stat(safePath);
      const lines = resultContent.split('\n').length;

      return {
        success: true,
        data: {
          content: resultContent,
          path: safePath,
          size: stats.size,
          lines: lines,
          encoding: params.encoding || 'utf-8',
          lineInfo,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 写入文件工具
 * 对应 Cline 的 write_to_file
 */
const writeFileTool: ToolDefinition = {
  name: 'write_file',
  displayName: '写入文件',
  description: '创建新文件或覆盖现有文件。如果文件不存在会自动创建。如果目录不存在会自动创建。',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'content',
      type: 'string',
      description: '要写入的文件内容',
      required: true,
    },
    {
      name: 'encoding',
      type: 'string',
      description: '文件编码格式',
      required: false,
      default: 'utf-8',
      enum: ['utf-8', 'utf-16le', 'latin1'],
    },
    {
      name: 'createDirs',
      type: 'boolean',
      description: '是否自动创建目录',
      required: false,
      default: true,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const filePath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(filePath, context.projectPath, true);

      // 3. 创建目录(如果需要)
      if (params.createDirs !== false) {
        const dir = join(safePath, '..');
        await fs.mkdir(dir, { recursive: true });
      }

      // 4. 检查文件是否已存在
      let existingContent = '';
      let isOverwrite = false;
      try {
        existingContent = await fs.readFile(safePath, 'utf-8');
        isOverwrite = true;
      } catch {
        // 文件不存在,这是新文件
      }

      // 5. 写入文件
      await fs.writeFile(safePath, params.content, params.encoding || 'utf-8');

      // 6. 获取文件统计信息
      const stats = await fs.stat(safePath);
      const lines = params.content.split('\n').length;

      return {
        success: true,
        data: {
          path: safePath,
          size: stats.size,
          lines: lines,
          isOverwrite,
          message: isOverwrite ? 'File overwritten successfully' : 'File created successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 编辑文件工具
 * 对应 Cline 的 replace_in_file
 */
const editFileTool: ToolDefinition = {
  name: 'edit_file',
  displayName: '编辑文件',
  description: '通过精确匹配旧内容来替换文件中的部分内容。适用于小范围修改。',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'oldContent',
      type: 'string',
      description: '要替换的旧内容(必须精确匹配)',
      required: true,
    },
    {
      name: 'newContent',
      type: 'string',
      description: '新内容',
      required: true,
    },
    {
      name: 'replaceAll',
      type: 'boolean',
      description: '是否替换所有匹配项(默认只替换第一个)',
      required: false,
      default: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const filePath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(filePath, context.projectPath, true);

      // 3. 读取文件
      const content = await fs.readFile(safePath, 'utf-8');

      // 4. 执行替换
      let newContent = '';
      let replaceCount = 0;

      if (params.replaceAll) {
        // 替换所有匹配项
        const matches = content.split(params.oldContent);
        replaceCount = matches.length - 1;
        if (replaceCount === 0) {
          return {
            success: false,
            error: 'Old content not found in file',
            metadata: { path: safePath },
          };
        }
        newContent = matches.join(params.newContent);
      } else {
        // 只替换第一个匹配项
        if (!content.includes(params.oldContent)) {
          return {
            success: false,
            error: 'Old content not found in file',
            metadata: { path: safePath },
          };
        }
        newContent = content.replace(params.oldContent, params.newContent);
        replaceCount = 1;
      }

      // 5. 写入文件
      await fs.writeFile(safePath, newContent, 'utf-8');

      return {
        success: true,
        data: {
          path: safePath,
          replaceCount,
          message: `Replaced ${replaceCount} occurrence(s)`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to edit file: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 列出目录文件工具
 * 对应 Cline 的 list_files
 */
const listFilesTool: ToolDefinition = {
  name: 'list_files',
  displayName: '列出目录文件',
  description: '列出目录中的文件和子目录。支持递归列出和模式匹配。',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '目录路径,默认为当前项目根目录',
      required: false,
      format: 'file-path',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: '是否递归列出子目录',
      required: false,
      default: false,
    },
    {
      name: 'pattern',
      type: 'string',
      description: '文件匹配模式(例如 *.ts, **/*.js)',
      required: false,
      default: '*',
    },
    {
      name: 'excludePatterns',
      type: 'array',
      description: '排除模式列表',
      required: false,
      default: [],
    },
    {
      name: 'includeStats',
      type: 'boolean',
      description: '是否包含文件统计信息',
      required: false,
      default: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const dirPath = params.path
        ? isAbsolute(params.path)
          ? params.path
          : join(context.projectPath || process.cwd(), params.path)
        : context.projectPath || process.cwd();

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(dirPath, context.projectPath, true);

      // 3. 使用 glob 匹配文件
      const files = await glob(params.pattern || '*', {
        cwd: safePath,
        recursive: params.recursive || false,
        ignore: params.excludePatterns || [],
        nodir: true, // 不包含目录本身
        absolute: true,
      });

      // 4. 收集文件信息
      const fileInfo = [];
      for (const file of files) {
        // 安全检查
        const safeFile = validatePathAccess(file, context.projectPath, true);

        if (params.includeStats) {
          const stats = await fs.stat(safeFile);
          fileInfo.push({
            path: safeFile,
            relativePath: relative(safePath, safeFile),
            size: stats.size,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
          });
        } else {
          fileInfo.push({
            path: safeFile,
            relativePath: relative(safePath, safeFile),
          });
        }
      }

      return {
        success: true,
        data: {
          path: safePath,
          files: fileInfo,
          count: fileInfo.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list files: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 搜索文件内容工具
 * 对应 Cline 的 search_files
 */
const searchFilesTool: ToolDefinition = {
  name: 'search_files',
  displayName: '搜索文件内容',
  description: '在文件中搜索文本模式。支持正则表达式和多个文件。',
  category: 'filesystem',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: '搜索模式(支持正则表达式)',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: '搜索目录,默认为项目根目录',
      required: false,
      format: 'file-path',
    },
    {
      name: 'excludePatterns',
      type: 'array',
      description: '排除的文件模式列表',
      required: false,
      default: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    },
    {
      name: 'caseSensitive',
      type: 'boolean',
      description: '是否区分大小写',
      required: false,
      default: false,
    },
    {
      name: 'maxResults',
      type: 'number',
      description: '最大结果数',
      required: false,
      default: 100,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      const { readFile } = await import('fs/promises');

      // 1. 解析路径
      const searchPath = params.path
        ? isAbsolute(params.path)
          ? params.path
          : join(context.projectPath || process.cwd(), params.path)
        : context.projectPath || process.cwd();

      // 2. 安全检查
      const safePath = ensurePathInProject(searchPath, context.projectPath);

      // 3. 构建正则表达式
      const flags = params.caseSensitive ? 'g' : 'gi';
      let regex: RegExp;
      try {
        regex = new RegExp(params.pattern, flags);
      } catch (error: any) {
        return {
          success: false,
          error: `Invalid regex pattern: ${error.message}`,
        };
      }

      // 4. 使用 glob 查找所有文件
      const files = await glob('**/*', {
        cwd: safePath,
        ignore: params.excludePatterns || ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        nodir: true,
        absolute: true,
      });

      // 5. 搜索文件内容
      const results: Array<{
        path: string;
        matches: Array<{
          line: number;
          content: string;
        }>;
      }> = [];

      let totalMatches = 0;
      const maxResults = params.maxResults || 100;

      for (const file of files) {
        // 安全检查
        const safeFile = validatePathAccess(file, context.projectPath, true);

        if (totalMatches >= maxResults) break;

        try {
          const content = await readFile(safeFile, 'utf-8');
          const lines = content.split('\n');
          const matches: Array<{ line: number; content: string }> = [];

          for (let i = 0; i < lines.length; i++) {
            if (totalMatches >= maxResults) break;

            const line = lines[i];
            if (regex.test(line)) {
              matches.push({
                line: i + 1,
                content: line.trim(),
              });
              totalMatches++;
            }
          }

          if (matches.length > 0) {
            results.push({
              path: safeFile,
              relativePath: relative(safePath, safeFile),
              matches,
            });
          }
        } catch {
          // 忽略无法读取的文件
        }
      }

      return {
        success: true,
        data: {
          pattern: params.pattern,
          path: safePath,
          results,
          totalFiles: results.length,
          totalMatches,
          truncated: totalMatches >= maxResults,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to search files: ${error.message}`,
      };
    }
  },
};

/**
 * 删除文件工具
 */
const deleteFileTool: ToolDefinition = {
  name: 'delete_file',
  displayName: '删除文件',
  description: '删除指定的文件或目录。注意:此操作不可撤销!',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '要删除的文件或目录路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: '是否递归删除目录及其内容',
      required: false,
      default: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const filePath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(filePath, context.projectPath, true);

      // 3. 检查是否存在
      const stats = await fs.stat(safePath);

      // 4. 删除
      if (stats.isDirectory()) {
        if (params.recursive) {
          await fs.rm(safePath, { recursive: true, force: true });
        } else {
          // 只删除空目录
          await fs.rmdir(safePath);
        }
      } else {
        await fs.unlink(safePath);
      }

      return {
        success: true,
        data: {
          path: safePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          message: 'Deleted successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to delete: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 移动文件工具
 */
const moveFileTool: ToolDefinition = {
  name: 'move_file',
  displayName: '移动文件',
  description: '移动或重命名文件或目录',
  category: 'filesystem',
  parameters: [
    {
      name: 'source',
      type: 'string',
      description: '源文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'destination',
      type: 'string',
      description: '目标文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'overwrite',
      type: 'boolean',
      description: '是否覆盖已存在的文件',
      required: false,
      default: false,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const sourcePath = isAbsolute(params.source)
        ? params.source
        : join(context.projectPath || process.cwd(), params.source);

      const destPath = isAbsolute(params.destination)
        ? params.destination
        : join(context.projectPath || process.cwd(), params.destination);

      // 2. 综合安全检查 (包括 .clineignore)
      const safeSource = validatePathAccess(sourcePath, context.projectPath, true);
      const safeDest = validatePathAccess(destPath, context.projectPath, true);

      // 3. 检查源文件是否存在
      await fs.access(safeSource);

      // 4. 检查目标文件是否存在
      try {
        await fs.access(safeDest);
        if (!params.overwrite) {
          return {
            success: false,
            error: 'Destination file already exists. Set overwrite=true to replace it.',
          };
        }
      } catch {
        // 目标文件不存在,可以继续
      }

      // 5. 移动文件
      await fs.rename(safeSource, safeDest);

      return {
        success: true,
        data: {
          source: safeSource,
          destination: safeDest,
          message: 'Moved successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to move file: ${error.message}`,
        metadata: {
          code: error.code,
          source: params.source,
          destination: params.destination,
        },
      };
    }
  },
};

/**
 * 复制文件工具
 */
const copyFileTool: ToolDefinition = {
  name: 'copy_file',
  displayName: '复制文件',
  description: '复制文件或目录',
  category: 'filesystem',
  parameters: [
    {
      name: 'source',
      type: 'string',
      description: '源文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'destination',
      type: 'string',
      description: '目标文件路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'overwrite',
      type: 'boolean',
      description: '是否覆盖已存在的文件',
      required: false,
      default: false,
    },
  ],
  permissions: [ToolPermission.READ, ToolPermission.WRITE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const sourcePath = isAbsolute(params.source)
        ? params.source
        : join(context.projectPath || process.cwd(), params.source);

      const destPath = isAbsolute(params.destination)
        ? params.destination
        : join(context.projectPath || process.cwd(), params.destination);

      // 2. 综合安全检查 (包括 .clineignore)
      const safeSource = validatePathAccess(sourcePath, context.projectPath, true);
      const safeDest = validatePathAccess(destPath, context.projectPath, true);

      // 3. 检查源文件是否存在
      const stats = await fs.stat(safeSource);

      // 4. 检查目标文件是否存在
      try {
        await fs.access(safeDest);
        if (!params.overwrite) {
          return {
            success: false,
            error: 'Destination file already exists. Set overwrite=true to replace it.',
          };
        }
      } catch {
        // 目标文件不存在,可以继续
      }

      // 5. 复制文件
      if (stats.isDirectory()) {
        await fs.cp(safeSource, safeDest, {
          recursive: true,
          force: params.overwrite || false,
        });
      } else {
        await fs.copyFile(safeSource, safeDest, params.overwrite ? 0 : fs.constants.COPYFILE_EXCL);
      }

      return {
        success: true,
        data: {
          source: safeSource,
          destination: safeDest,
          type: stats.isDirectory() ? 'directory' : 'file',
          message: 'Copied successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to copy file: ${error.message}`,
        metadata: {
          code: error.code,
          source: params.source,
          destination: params.destination,
        },
      };
    }
  },
};

/**
 * 创建目录工具
 */
const createDirectoryTool: ToolDefinition = {
  name: 'create_directory',
  displayName: '创建目录',
  description: '创建新目录,可选择递归创建父目录',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '目录路径',
      required: true,
      format: 'file-path',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: '是否递归创建父目录',
      required: false,
      default: true,
    },
  ],
  permissions: [ToolPermission.WRITE, ToolPermission.EXECUTE],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const dirPath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(dirPath, context.projectPath, true);

      // 3. 创建目录
      await fs.mkdir(safePath, { recursive: params.recursive !== false });

      return {
        success: true,
        data: {
          path: safePath,
          message: 'Directory created successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create directory: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 获取文件统计信息工具
 */
const getFileStatsTool: ToolDefinition = {
  name: 'get_file_stats',
  displayName: '获取文件统计信息',
  description: '获取文件的详细统计信息,包括大小、创建时间、修改时间等',
  category: 'filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: '文件或目录路径',
      required: true,
      format: 'file-path',
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // 1. 解析路径
      const filePath = isAbsolute(params.path)
        ? params.path
        : join(context.projectPath || process.cwd(), params.path);

      // 2. 综合安全检查 (包括 .clineignore)
      const safePath = validatePathAccess(filePath, context.projectPath, true);

      // 3. 获取统计信息
      const stats = await fs.stat(safePath);

      return {
        success: true,
        data: {
          path: safePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          mode: stats.mode,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          isSymbolicLink: stats.isSymbolicLink(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get file stats: ${error.message}`,
        metadata: {
          code: error.code,
          path: params.path,
        },
      };
    }
  },
};

/**
 * 注册所有文件系统工具
 */
export function registerFilesystemTools(): void {
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(editFileTool);
  toolRegistry.register(listFilesTool);
  toolRegistry.register(searchFilesTool);
  toolRegistry.register(deleteFileTool);
  toolRegistry.register(moveFileTool);
  toolRegistry.register(copyFileTool);
  toolRegistry.register(createDirectoryTool);
  toolRegistry.register(getFileStatsTool);
}

// 导出工具列表
export const filesystemTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
  searchFilesTool,
  deleteFileTool,
  moveFileTool,
  copyFileTool,
  createDirectoryTool,
  getFileStatsTool,
];
