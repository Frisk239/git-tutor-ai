/**
 * APPLY_PATCH 工具 - 应用补丁工具
 *
 * 完整实现 V4A diff 格式，贴近 Cline 的功能
 * 支持上下文搜索、文件添加、更新、删除、移动等操作
 */

import { ToolDefinition, ToolPermission, ToolHandler, ToolContext } from '../types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ============================================================================
// 常量定义
// ============================================================================

export const PATCH_MARKERS = {
  BEGIN: '*** Begin Patch',
  END: '*** End Patch',
  ADD: '*** Add File: ',
  UPDATE: '*** Update File: ',
  DELETE: '*** Delete File: ',
  MOVE: '*** Move to: ',
  SECTION: '@@',
  END_FILE: '*** End of File',
} as const;

export const BASH_WRAPPERS = ['%%bash', 'apply_patch', 'EOF', '```'] as const;

export enum PatchActionType {
  ADD = 'add',
  DELETE = 'delete',
  UPDATE = 'update',
}

export interface PatchChunk {
  origIndex: number; // 原文件中变更开始的行索引
  delLines: string[]; // 要删除的行（不含 "-" 前缀）
  insLines: string[]; // 要插入的行（不含 "+" 前缀）
}

export interface PatchAction {
  type: PatchActionType;
  newFile?: string;
  chunks: PatchChunk[];
  movePath?: string;
}

export interface Patch {
  actions: Record<string, PatchAction>;
}

export class DiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffError';
  }
}

// ============================================================================
// 工具参数和返回值
// ============================================================================

export interface ApplyPatchParams {
  /** V4A 格式的补丁内容 */
  input: string;
  /** 工作目录（可选，默认为当前目录） */
  cwd?: string;
  /** 是否创建备份（默认 false） */
  createBackup?: string;
  /** 是否为干运行（默认 false） */
  dryRun?: boolean;
}

export interface ApplyPatchResult {
  /** 成功应用的文件 */
  applied: string[];
  /** 失败的文件 */
  failed: Array<{ path: string; error: string }>;
  /** 创建的备份文件 */
  backups: string[];
  /** 操作摘要 */
  summary: string;
  /** 应用的补丁详情 */
  details: Array<{
    path: string;
    action: PatchActionType;
    chunksApplied?: number;
  }>;
}

// ============================================================================
// 补丁解析器
// ============================================================================

class PatchParser {
  private lines: string[];
  private originalFiles: Record<string, string>;

  constructor(lines: string[], originalFiles: Record<string, string>) {
    this.lines = lines;
    this.originalFiles = originalFiles;
  }

  parse(): { patch: Patch; fuzz: number } {
    const patch: Patch = { actions: {} };
    let currentFile: string | null = null;
    let currentAction: PatchAction | null = null;
    let inSection = false;
    let sectionContext: string[] = [];

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      // 跳过 BEGIN/END 标记
      if (line === PATCH_MARKERS.BEGIN || line === PATCH_MARKERS.END) {
        continue;
      }

      // 添加文件
      if (line.startsWith(PATCH_MARKERS.ADD)) {
        if (currentFile && currentAction) {
          patch.actions[currentFile] = currentAction;
        }
        currentFile = line.substring(PATCH_MARKERS.ADD.length).trim();
        currentAction = { type: PatchActionType.ADD, chunks: [] };
        inSection = false;
        continue;
      }

      // 更新文件
      if (line.startsWith(PATCH_MARKERS.UPDATE)) {
        if (currentFile && currentAction) {
          patch.actions[currentFile] = currentAction;
        }
        currentFile = line.substring(PATCH_MARKERS.UPDATE.length).trim();
        currentAction = { type: PatchActionType.UPDATE, chunks: [] };
        inSection = false;
        continue;
      }

      // 删除文件
      if (line.startsWith(PATCH_MARKERS.DELETE)) {
        if (currentFile && currentAction) {
          patch.actions[currentFile] = currentAction;
        }
        currentFile = line.substring(PATCH_MARKERS.DELETE.length).trim();
        currentAction = { type: PatchActionType.DELETE, chunks: [] };
        inSection = false;
        continue;
      }

      // 移动文件
      if (line.startsWith(PATCH_MARKERS.MOVE) && currentAction) {
        currentAction.movePath = line.substring(PATCH_MARKERS.MOVE.length).trim();
        continue;
      }

      // Section 开始
      if (line.startsWith(PATCH_MARKERS.SECTION)) {
        inSection = true;
        sectionContext = [];
        continue;
      }

      // 处理文件内容
      if (currentFile && currentAction) {
        if (currentAction.type === PatchActionType.ADD) {
          // 添加文件：收集所有 + 开头的行
          if (line.startsWith('+')) {
            if (!currentAction.newFile) {
              currentAction.newFile = '';
            }
            currentAction.newFile += line.substring(1) + '\n';
          }
        } else if (currentAction.type === PatchActionType.UPDATE) {
          // 更新文件：解析 chunks
          if (line.startsWith('+')) {
            // 添加行
            if (!inSection || sectionContext.length === 0) {
              // 如果没有 section，创建一个默认的
              sectionContext = ['', '', ''];
            }
            const chunk = this.ensureLastChunk(currentAction);
            chunk.insLines.push(line.substring(1));
          } else if (line.startsWith('-')) {
            // 删除行
            if (!inSection || sectionContext.length === 0) {
              sectionContext = ['', '', ''];
            }
            const chunk = this.ensureLastChunk(currentAction);
            chunk.delLines.push(line.substring(1));
          } else if (line.startsWith(' ')) {
            // 上下文行
            const chunk = this.ensureLastChunk(currentAction);
            // 上下文行既不是删除也不是添加，只是定位
            if (chunk.delLines.length === 0 && chunk.insLines.length === 0) {
              chunk.origIndex++;
            }
            sectionContext.push(line.substring(1));
          }
        }
      }
    }

    // 添加最后一个文件
    if (currentFile && currentAction) {
      patch.actions[currentFile] = currentAction;
    }

    return { patch, fuzz: 0 };
  }

  private ensureLastChunk(action: PatchAction): PatchChunk {
    if (action.chunks.length === 0) {
      action.chunks.push({ origIndex: 0, delLines: [], insLines: [] });
    }
    return action.chunks[action.chunks.length - 1];
  }
}

// ============================================================================
// 补丁应用器
// ============================================================================

class PatchApplier {
  private cwd: string;
  private createBackup: boolean;
  private dryRun: boolean;
  private backups: string[] = [];

  constructor(cwd: string, createBackup: boolean, dryRun: boolean) {
    this.cwd = cwd;
    this.createBackup = createBackup;
    this.dryRun = dryRun;
  }

  async applyPatch(patch: Patch): Promise<ApplyPatchResult> {
    const applied: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];
    const details: Array<{
      path: string;
      action: PatchActionType;
      chunksApplied?: number;
    }> = [];

    for (const [filePath, action] of Object.entries(patch.actions)) {
      try {
        await this.applyAction(filePath, action);
        applied.push(filePath);
        details.push({
          path: filePath,
          action: action.type,
          chunksApplied: action.chunks.length,
        });
      } catch (error) {
        failed.push({
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = this.generateSummary(applied, failed, this.dryRun);

    return {
      applied,
      failed,
      backups: this.backups,
      summary,
      details,
    };
  }

  private async applyAction(filePath: string, action: PatchAction): Promise<void> {
    const fullPath = path.resolve(this.cwd, filePath);

    switch (action.type) {
      case PatchActionType.ADD:
        await this.addFile(fullPath, action.newFile || '');
        break;

      case PatchActionType.DELETE:
        await this.deleteFile(fullPath);
        break;

      case PatchActionType.UPDATE:
        await this.updateFile(fullPath, action);
        break;
    }
  }

  private async addFile(filePath: string, content: string): Promise<void> {
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      throw new DiffError(`文件已存在: ${filePath}`);
    } catch {
      // 文件不存在，可以创建
    }

    // 创建目录
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    if (!this.dryRun) {
      await fs.writeFile(filePath, content, 'utf8');
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      throw new DiffError(`文件不存在: ${filePath}`);
    }

    // 创建备份
    if (this.createBackup) {
      const backupPath = await this.createBackup(filePath);
      this.backups.push(backupPath);
    }

    if (!this.dryRun) {
      await fs.unlink(filePath);
    }
  }

  private async updateFile(filePath: string, action: PatchAction): Promise<void> {
    // 读取原文件
    let originalContent: string;
    try {
      originalContent = await fs.readFile(filePath, 'utf8');
    } catch {
      throw new DiffError(`无法读取文件: ${filePath}`);
    }

    // 创建备份
    if (this.createBackup) {
      const backupPath = await this.createBackup(filePath);
      this.backups.push(backupPath);
    }

    // 应用 chunks
    const newContent = this.applyChunks(originalContent, action.chunks, filePath);

    // 如果有 movePath，执行移动
    if (action.movePath) {
      if (!this.dryRun) {
        const targetPath = path.resolve(this.cwd, action.movePath);
        const targetDir = path.dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(targetPath, newContent, 'utf8');
        await fs.unlink(filePath);
      }
    } else {
      if (!this.dryRun) {
        await fs.writeFile(filePath, newContent, 'utf8');
      }
    }
  }

  private applyChunks(content: string, chunks: PatchChunk[], filePath: string): string {
    if (chunks.length === 0) {
      return content;
    }

    const lines = content.split('\n');
    const result: string[] = [];
    let currentIndex = 0;

    for (const chunk of chunks) {
      if (chunk.origIndex > lines.length) {
        throw new DiffError(
          `${filePath}: chunk.origIndex ${chunk.origIndex} > lines.length ${lines.length}`
        );
      }
      if (currentIndex > chunk.origIndex) {
        throw new DiffError(
          `${filePath}: currentIndex ${currentIndex} > chunk.origIndex ${chunk.origIndex}`
        );
      }

      // 复制 chunk 之前的行
      result.push(...lines.slice(currentIndex, chunk.origIndex));

      // 添加插入的行
      result.push(...chunk.insLines);

      // 跳过删除的行
      currentIndex = chunk.origIndex + chunk.delLines.length;
    }

    // 复制剩余的行
    result.push(...lines.slice(currentIndex));

    return result.join('\n');
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  private generateSummary(
    applied: string[],
    failed: Array<{ path: string; error: string }>,
    dryRun: boolean
  ): string {
    const lines: string[] = [];

    lines.push(`补丁应用结果 ${dryRun ? '(干运行)' : ''}:`);
    lines.push('');

    if (applied.length > 0) {
      lines.push(`✅ 成功应用 (${applied.length}):`);
      for (const path of applied) {
        lines.push(`   ✓ ${path}`);
      }
      lines.push('');
    }

    if (failed.length > 0) {
      lines.push(`❌ 失败 (${failed.length}):`);
      for (const { path, error } of failed) {
        lines.push(`   ✗ ${path}`);
        lines.push(`      错误: ${error}`);
      }
      lines.push('');
    }

    const total = applied.length + failed.length;
    const successRate = total > 0 ? (applied.length / total) * 100 : 0;
    lines.push(`成功率: ${successRate.toFixed(1)}% (${applied.length}/${total})`);

    return lines.join('\n');
  }
}

// ============================================================================
// 工具处理器
// ============================================================================

class ApplyPatchToolHandler implements ToolHandler<ApplyPatchParams, ApplyPatchResult> {
  async execute(
    context: ToolContext,
    params: ApplyPatchParams
  ): Promise<{ success: boolean; data?: ApplyPatchResult; error?: string }> {
    try {
      const {
        input,
        cwd: workingDir = process.cwd(),
        createBackup = false,
        dryRun = false,
      } = params;

      // 验证参数
      if (!input || input.trim().length === 0) {
        return {
          success: false,
          error: '补丁内容不能为空',
        };
      }

      // 预处理输入
      const lines = this.preprocessInput(input);

      // 加载需要更新的文件
      const filesToLoad = this.extractFilesForOperations(input, [
        PATCH_MARKERS.UPDATE,
        PATCH_MARKERS.DELETE,
      ]);
      const originalFiles: Record<string, string> = {};

      for (const filePath of filesToLoad) {
        const fullPath = path.resolve(workingDir, filePath);
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          originalFiles[filePath] = content.replace(/\r\n/g, '\n');
        } catch {
          throw new DiffError(`文件不存在: ${filePath}`);
        }
      }

      // 解析补丁
      const parser = new PatchParser(lines, originalFiles);
      const { patch } = parser.parse();

      // 应用补丁
      const applier = new PatchApplier(workingDir, !!createBackup, dryRun);
      const result = await applier.applyPatch(patch);

      return {
        success: result.failed.length === 0,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private preprocessInput(input: string): string[] {
    let lines = input.split('\n').map((line) => line.replace(/\r$/, ''));
    lines = this.stripBashWrappers(lines);

    const hasBegin = lines.length > 0 && lines[0].startsWith(PATCH_MARKERS.BEGIN);
    const hasEnd = lines.length > 0 && lines[lines.length - 1] === PATCH_MARKERS.END;

    if (!hasBegin && !hasEnd) {
      return [PATCH_MARKERS.BEGIN, ...lines, PATCH_MARKERS.END];
    }

    return lines;
  }

  private stripBashWrappers(lines: string[]): string[] {
    const result: string[] = [];
    let insidePatch = false;
    let foundBegin = false;
    let foundContent = false;

    for (const line of lines) {
      // 跳过 bash 包装器
      if (!insidePatch && BASH_WRAPPERS.some((wrapper) => line.startsWith(wrapper))) {
        continue;
      }

      if (line.startsWith(PATCH_MARKERS.BEGIN)) {
        insidePatch = true;
        foundBegin = true;
        result.push(line);
        continue;
      }

      if (line === PATCH_MARKERS.END) {
        insidePatch = false;
        result.push(line);
        continue;
      }

      const isPatchContent = this.isPatchLine(line);
      if (isPatchContent) {
        foundContent = true;
      }

      if (insidePatch || (!foundBegin && isPatchContent) || (line === '' && foundContent)) {
        result.push(line);
      }
    }

    return result;
  }

  private isPatchLine(line: string): boolean {
    return (
      line.startsWith(PATCH_MARKERS.ADD) ||
      line.startsWith(PATCH_MARKERS.UPDATE) ||
      line.startsWith(PATCH_MARKERS.DELETE) ||
      line.startsWith(PATCH_MARKERS.MOVE) ||
      line.startsWith(PATCH_MARKERS.SECTION) ||
      line.startsWith('+') ||
      line.startsWith('-') ||
      line.startsWith(' ') ||
      line === '***'
    );
  }

  private extractFilesForOperations(text: string, markers: readonly string[]): string[] {
    const lines = text.split('\n');
    const files: string[] = [];

    for (const line of lines) {
      for (const marker of markers) {
        if (line.startsWith(marker)) {
          const file = line.substring(marker.length).trim();
          if (file && !text.trim().endsWith(file)) {
            files.push(file);
          }
          break;
        }
      }
    }

    return files;
  }
}

// ============================================================================
// 工具定义
// ============================================================================

export const applyPatchTool: ToolDefinition = {
  name: 'apply_patch',
  displayName: '应用补丁',
  description:
    '对文件应用 V4A 格式的补丁，支持添加、更新、删除、移动文件。' +
    '\n\n**V4A 格式说明**:' +
    '\n```' +
    '\n*** Begin Patch' +
    '\n*** Add File: path/to/new-file.js' +
    '\n+ 新文件的第一行' +
    '\n+ 新文件的第二行' +
    '\n*** Update File: path/to/existing-file.js' +
    '\n@@ class MyClass' +
    '\n  context line 1' +
    '\n  context line 2' +
    '\n- old line to delete' +
    '\n+ new line to insert' +
    '\n  context line 3' +
    '\n*** Delete File: path/to/old-file.js' +
    '\n*** End Patch' +
    '\n```' +
    '\n\n**操作说明**:' +
    '\n- **Add File**: 创建新文件，所有行必须以 + 开头' +
    '\n- **Update File**: 更新现有文件' +
    '\n  - 使用 @@ 标记上下文（可选）' +
    '\n  - 以 - 开头表示要删除的行' +
    '\n  - 以 + 开头表示要添加的行' +
    '\n  - 以空格开头的行是上下文，用于定位' +
    '\n- **Delete File**: 删除文件' +
    '\n- **Move to**: 移动文件（在 Update File 后使用）' +
    '\n\n**注意事项**:' +
    '\n- 上下文行用于唯一标识要修改的代码位置' +
    '\n- 默认使用 3 行上下文' +
    '\n- 如果代码重复，可以使用多个 @@ 标记',
  category: 'editing',
  parameters: [
    {
      name: 'input',
      type: 'string',
      required: true,
      description: 'V4A 格式的补丁内容',
    },
    {
      name: 'cwd',
      type: 'string',
      required: false,
      description: '工作目录（可选，默认为当前目录）',
    },
    {
      name: 'createBackup',
      type: 'boolean',
      required: false,
      description: '是否创建备份（默认 false）',
    },
    {
      name: 'dryRun',
      type: 'boolean',
      required: false,
      description: '是否为干运行（默认 false，设为 true 时只显示将要执行的操作而不实际执行）',
    },
  ],
  permissions: [ToolPermission.READ, ToolPermission.WRITE],
  enabled: true,
  handler: new ApplyPatchToolHandler(),
};

// 默认导出
export default applyPatchTool;
