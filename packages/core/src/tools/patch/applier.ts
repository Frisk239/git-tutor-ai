// 补丁应用器
// 参考 Cline 的补丁应用逻辑

import { Logger } from '../../logging/logger.js';
import { readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import {
  Patch,
  PatchAction,
  PatchActionType,
  PatchError,
  FileOpsResult,
  FileChange,
  Commit,
  PATCH_MARKERS,
} from './types.js';
import {
  findContext,
  preserveEscaping,
  normalizeNewlines,
  splitLines,
  joinLines,
} from './utils.js';
import { existsSync } from 'fs';

/**
 * 补丁应用器
 * 负责将补丁应用到文件系统
 */
export class PatchApplier {
  private logger: Logger;
  private workspaceRoot: string;
  private originalFiles: Record<string, string> = {};
  private fuzz: number = 0;

  constructor(workspaceRoot: string) {
    this.logger = new Logger('PatchApplier');
    this.workspaceRoot = resolve(workspaceRoot);
  }

  /**
   * 应用补丁
   */
  async applyPatch(patch: Patch): Promise<Record<string, FileOpsResult>> {
    this.logger.info('Applying patch', {
      files: Object.keys(patch.actions).length,
    });

    const results: Record<string, FileOpsResult> = {};
    const commit = this.patchToCommit(patch);

    // 加载所有需要修改的文件
    await this.loadFiles(Object.keys(commit.changes));

    // 应用每个文件的变更
    for (const [path, change] of Object.entries(commit.changes)) {
      try {
        const result = await this.applyFileChange(path, change);
        results[path] = result;
      } catch (error) {
        this.logger.error(`Failed to apply change to ${path}`, { error });
        throw error;
      }
    }

    return results;
  }

  /**
   * 加载文件内容
   */
  private async loadFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      const absolutePath = this.resolvePath(filePath);

      if (!existsSync(absolutePath)) {
        throw new PatchError(`File not found: ${filePath}`, 'FILE_NOT_FOUND');
      }

      try {
        const content = await readFile(absolutePath, 'utf-8');
        const normalized = normalizeNewlines(content);
        this.originalFiles[filePath] = normalized;
      } catch (error) {
        this.logger.error(`Failed to read file: ${filePath}`, { error });
        throw new PatchError(`Failed to read file: ${filePath}`, 'READ_ERROR');
      }
    }
  }

  /**
   * 解析文件路径
   */
  private resolvePath(filePath: string): string {
    // 防止路径遍历攻击
    const resolved = resolve(this.workspaceRoot, filePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new PatchError(`Invalid path: ${filePath}`, 'INVALID_PATH');
    }
    return resolved;
  }

  /**
   * 将补丁转换为提交对象
   */
  private patchToCommit(patch: Patch): Commit {
    const changes: Record<string, FileChange> = {};

    for (const [path, action] of Object.entries(patch.actions)) {
      if (action.type === PatchActionType.ADD) {
        changes[path] = {
          newContent: action.newFile,
        };
      } else if (action.type === PatchActionType.DELETE) {
        changes[path] = {
          deleted: true,
        };
      } else if (action.type === PatchActionType.UPDATE) {
        const originalContent = this.originalFiles[path];
        if (!originalContent) {
          throw new PatchError(`Original file not loaded: ${path}`, 'FILE_NOT_LOADED');
        }

        const newContent = this.applyChunks(originalContent, action.chunks, path, false);

        changes[path] = {
          newContent,
          movePath: action.movePath,
        };
      }
    }

    return { changes };
  }

  /**
   * 应用补丁块到文件内容
   */
  private applyChunks(
    content: string,
    chunks: any[],
    path: string,
    tryPreserveEscaping: boolean = false
  ): string {
    const lines = splitLines(content);
    let result = [...lines];
    let offset = 0;

    for (const chunk of chunks) {
      const { origIndex, delLines, insLines } = chunk;

      // 构建上下文
      const contextBefore: string[] = [];
      for (let i = Math.max(0, origIndex - 3); i < origIndex; i++) {
        if (result[i + offset]) {
          contextBefore.push(result[i + offset]!);
        }
      }

      const contextAfter: string[] = [];
      for (
        let i = origIndex + delLines.length;
        i < Math.min(result.length, origIndex + delLines.length + 3);
        i++
      ) {
        if (result[i + offset]) {
          contextAfter.push(result[i + offset]!);
        }
      }

      // 查找上下文位置
      const context = [...contextBefore, ...delLines, ...contextAfter];
      const [foundIndex, fuzz] = findContext(
        result,
        context,
        Math.max(0, origIndex + offset - 3),
        false
      );

      if (foundIndex === -1) {
        this.logger.warn(`Could not find context for chunk in ${path}`, {
          origIndex,
          context,
        });
        continue;
      }

      // 累加模糊因子
      this.fuzz += fuzz;

      // 计算实际插入位置
      const insertIndex = foundIndex + contextBefore.length;

      // 删除旧行
      const deleteEnd = insertIndex + delLines.length;
      result.splice(insertIndex, delLines.length);

      // 插入新行
      if (tryPreserveEscaping) {
        const originalText = delLines.join('\n');
        const newText = joinLines(insLines);
        const preservedText = preserveEscaping(originalText, newText);
        result.splice(insertIndex, 0, ...splitLines(preservedText));
      } else {
        result.splice(insertIndex, 0, ...insLines);
      }

      // 更新偏移量
      offset += insLines.length - delLines.length;
    }

    return joinLines(result);
  }

  /**
   * 应用单个文件变更
   */
  private async applyFileChange(path: string, change: FileChange): Promise<FileOpsResult> {
    const absolutePath = this.resolvePath(path);

    if (change.deleted) {
      // 删除文件
      // TODO: 实现文件删除逻辑
      this.logger.info(`Deleting file: ${path}`);
      return { deleted: true };
    }

    if (change.newContent !== undefined) {
      // 写入新内容
      await writeFile(absolutePath, change.newContent, 'utf-8');
      this.logger.info(`Updated file: ${path}`);
    }

    if (change.movePath) {
      // 移动文件
      const moveAbsolutePath = this.resolvePath(change.movePath);
      // TODO: 实现文件移动逻辑
      this.logger.info(`Moving file from ${path} to ${change.movePath}`);
    }

    return {
      finalContent: change.newContent,
    };
  }

  /**
   * 获取模糊因子
   */
  getFuzz(): number {
    return this.fuzz;
  }

  /**
   * 回滚更改
   */
  async revertChanges(): Promise<void> {
    this.logger.warn('Reverting changes');

    for (const [path, originalContent] of Object.entries(this.originalFiles)) {
      try {
        const absolutePath = this.resolvePath(path);
        await writeFile(absolutePath, originalContent, 'utf-8');
        this.logger.info(`Reverted file: ${path}`);
      } catch (error) {
        this.logger.error(`Failed to revert file: ${path}`, { error });
      }
    }
  }
}

/**
 * 应用补丁到文件系统
 */
export async function applyPatch(
  patchText: string,
  workspaceRoot: string
): Promise<{ results: Record<string, FileOpsResult>; fuzz: number }> {
  // 解析补丁
  const { parsePatch } = await import('./parser');
  const { patch } = parsePatch(patchText);

  // 应用补丁
  const applier = new PatchApplier(workspaceRoot);
  const results = await applier.applyPatch(patch);
  const fuzz = applier.getFuzz();

  return { results, fuzz };
}
