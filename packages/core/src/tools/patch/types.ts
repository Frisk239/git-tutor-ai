// 补丁系统类型定义
// 参考 Cline 的 apply_patch 实现

/**
 * 补丁操作类型
 */
export enum PatchActionType {
  ADD = "add",
  DELETE = "delete",
  UPDATE = "update",
}

/**
 * 补丁块
 */
export interface PatchChunk {
  origIndex: number; // 原始文件中变更开始的行索引
  delLines: string[]; // 要删除的行（不带"-"前缀）
  insLines: string[]; // 要插入的行（不带"+"前缀）
}

/**
 * 补丁操作
 */
export interface PatchAction {
  type: PatchActionType;
  newFile?: string; // 仅用于 ADD 操作
  chunks: PatchChunk[]; // 用于 UPDATE 操作
  movePath?: string; // 可选的移动目标路径
}

/**
 * 补丁警告
 */
export interface PatchWarning {
  file: string;
  message: string;
}

/**
 * 补丁
 */
export interface Patch {
  actions: Record<string, PatchAction>; // 文件路径到操作的映射
  warnings?: PatchWarning[];
}

/**
 * 文件操作结果
 */
export interface FileOpsResult {
  finalContent?: string;
  newProblemsMessage?: string;
  userEdits?: string;
  autoFormattingEdits?: string;
  deleted?: boolean;
}

/**
 * 文件变更
 */
export interface FileChange {
  newContent?: string;
  movePath?: string;
  deleted?: boolean;
}

/**
 * 提交
 */
export interface Commit {
  changes: Record<string, FileChange>;
}

/**
 * 补丁标记
 */
export const PATCH_MARKERS = {
  BEGIN: "*** Begin Patch",
  END: "*** End Patch",
  ADD: "*** Add File: ",
  UPDATE: "*** Update File: ",
  DELETE: "*** Delete File: ",
  MOVE: "*** Move to: ",
  SECTION: "@@",
  END_FILE: "*** End of File",
} as const;

/**
 * 补丁错误
 */
export class PatchError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "PatchError";
  }
}

/**
 * Peek 结果（上下文提取）
 */
export interface PeekResult {
  old: string[];
  chunks: PatchChunk[];
}
