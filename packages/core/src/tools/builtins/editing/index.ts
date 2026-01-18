/**
 * 编辑类工具模块
 *
 * 包含文件编辑、补丁应用等功能
 */

export { applyPatchTool } from './apply-patch.js';
export type {
  ApplyPatchParams,
  ApplyPatchResult,
  Patch,
  PatchAction,
  PatchChunk,
} from './apply-patch.js';
export { PatchActionType, PATCH_MARKERS, DiffError } from './apply-patch.js';
