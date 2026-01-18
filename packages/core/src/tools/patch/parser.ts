// 补丁解析器
// 参考 Cline 的 PatchParser 实现

import { Logger } from '../../logging/logger.js';
import { Patch, PatchAction, PatchActionType, PATCH_MARKERS, PatchError } from './types.js';
import { peek, normalizeNewlines, splitLines } from './utils.js';

/**
 * 补丁解析器
 * 负责解析补丁文本并生成 Patch 对象
 */
export class PatchParser {
  private logger: Logger;
  private lines: string[];
  private index: number = 0;
  private patch: Patch;
  private currentFiles: Record<string, boolean> = {};
  private fuzz: number = 0;

  constructor(text: string, existingFiles: Record<string, boolean> = {}) {
    this.logger = new Logger('PatchParser');
    // 预处理：规范化换行符，分割为行
    const normalized = normalizeNewlines(text);
    this.lines = splitLines(normalized);
    this.patch = { actions: {} };
    this.currentFiles = { ...existingFiles };
  }

  /**
   * 解析补丁
   */
  parse(): { patch: Patch; fuzz: number } {
    // 跳过开始标记
    this.skipBeginSentinel();

    // 解析每个操作
    while (this.hasMoreLines() && !this.isEndMarker()) {
      this.parseNextAction();
    }

    return { patch: this.patch, fuzz: this.fuzz };
  }

  /**
   * 跳过开始标记
   */
  private skipBeginSentinel(): void {
    if (this.hasMoreLines() && this.lines[this.index] === PATCH_MARKERS.BEGIN) {
      this.index++;
    }
  }

  /**
   * 检查是否还有更多行
   */
  private hasMoreLines(): boolean {
    return this.index < this.lines.length;
  }

  /**
   * 检查是否到达结束标记
   */
  private isEndMarker(): boolean {
    return this.lines[this.index] === PATCH_MARKERS.END;
  }

  /**
   * 解析下一个操作
   */
  private parseNextAction(): void {
    const line = this.lines[this.index]!;

    if (line.startsWith(PATCH_MARKERS.UPDATE)) {
      const path = line.substring(PATCH_MARKERS.UPDATE.length).trim();
      this.parseUpdate(path);
    } else if (line.startsWith(PATCH_MARKERS.DELETE)) {
      const path = line.substring(PATCH_MARKERS.DELETE.length).trim();
      this.parseDelete(path);
    } else if (line.startsWith(PATCH_MARKERS.ADD)) {
      const path = line.substring(PATCH_MARKERS.ADD.length).trim();
      this.parseAdd(path);
    } else {
      this.logger.warn(`Unknown patch line: ${line}`);
      this.index++;
    }
  }

  /**
   * 解析 ADD 操作
   */
  private parseAdd(path: string): void {
    this.logger.debug(`Parsing ADD for: ${path}`);

    // 检查重复
    this.checkDuplicate(path, 'add');

    // 检查文件是否已存在
    if (path in this.currentFiles) {
      throw new PatchError(`Add File Error: File already exists: ${path}`, 'FILE_EXISTS');
    }

    this.index++;

    // 提取新文件内容
    const newLines: string[] = [];
    while (
      this.hasMoreLines() &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.END) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.ADD) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.UPDATE) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.DELETE)
    ) {
      const line = this.lines[this.index]!;
      // 移除 + 前缀
      if (line.startsWith('+')) {
        newLines.push(line.substring(1));
      } else if (line.startsWith(' ')) {
        newLines.push(line.substring(1));
      } else {
        // 没有前缀的行，直接添加
        newLines.push(line);
      }
      this.index++;
    }

    // 创建 ADD 操作
    this.patch.actions[path] = {
      type: PatchActionType.ADD,
      newFile: newLines.join('\n'),
      chunks: [],
    };

    this.currentFiles[path] = true;
  }

  /**
   * 解析 DELETE 操作
   */
  private parseDelete(path: string): void {
    this.logger.debug(`Parsing DELETE for: ${path}`);

    // 检查重复
    this.checkDuplicate(path, 'delete');

    // 检查文件是否存在
    if (!(path in this.currentFiles)) {
      throw new PatchError(`Delete File Error: Missing File: ${path}`, 'FILE_NOT_FOUND');
    }

    this.index++;

    // 创建 DELETE 操作
    this.patch.actions[path] = {
      type: PatchActionType.DELETE,
      chunks: [],
    };

    // 跳过可能的文件内容（有些补丁格式会包含被删除文件的内容）
    while (
      this.hasMoreLines() &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.END) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.ADD) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.UPDATE) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.DELETE)
    ) {
      this.index++;
    }
  }

  /**
   * 解析 UPDATE 操作
   */
  private parseUpdate(path: string): void {
    this.logger.debug(`Parsing UPDATE for: ${path}`);

    // 检查重复
    this.checkDuplicate(path, 'update');

    // 检查文件是否存在
    if (!(path in this.currentFiles)) {
      throw new PatchError(`Update File Error: Missing File: ${path}`, 'FILE_NOT_FOUND');
    }

    this.index++;

    // 检查是否有移动标记
    let movePath: string | undefined;
    if (this.lines[this.index]?.startsWith(PATCH_MARKERS.MOVE)) {
      movePath = this.lines[this.index]!.substring(PATCH_MARKERS.MOVE.length).trim();
      this.index++;
    }

    // 解析补丁块
    const chunks: any[] = [];
    const contentLines: string[] = [];

    while (
      this.hasMoreLines() &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.END) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.ADD) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.UPDATE) &&
      !this.lines[this.index]!.startsWith(PATCH_MARKERS.DELETE)
    ) {
      const line = this.lines[this.index]!;

      // 检查是否为上下文标记
      if (line.startsWith(PATCH_MARKERS.SECTION)) {
        // 如果有待处理的内容，先处理
        if (contentLines.length > 0) {
          const { old, chunks: newChunks } = peek(contentLines, 0);
          chunks.push(...newChunks);
          contentLines.length = 0; // 清空
        }
      } else {
        contentLines.push(line);
      }

      this.index++;
    }

    // 处理剩余的内容
    if (contentLines.length > 0) {
      const { old, chunks: newChunks } = peek(contentLines, 0);
      chunks.push(...newChunks);
    }

    // 创建 UPDATE 操作
    this.patch.actions[path] = {
      type: PatchActionType.UPDATE,
      chunks,
      movePath,
    };
  }

  /**
   * 检查重复操作
   */
  private checkDuplicate(path: string, operation: string): void {
    if (path in this.patch.actions) {
      throw new PatchError(`Duplicate ${operation} for file: ${path}`, 'DUPLICATE_OPERATION');
    }
  }
}

/**
 * 解析补丁文本
 */
export function parsePatch(
  text: string,
  existingFiles: Record<string, boolean> = {}
): { patch: Patch; fuzz: number } {
  const parser = new PatchParser(text, existingFiles);
  return parser.parse();
}
