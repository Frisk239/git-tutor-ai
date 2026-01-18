/**
 * 任务工具
 * 提供任务管理功能
 */

export { newTaskTool, createNewTaskTool } from "./new-task.js";
export type { NewTaskParams, NewTaskResult } from "./new-task.js";
export { focusChainTool } from "./focus-chain.js";
export type {
  TaskProgressItem,
  FocusChainState,
  CreateFocusChainParams,
  UpdateFocusChainParams,
  AddProgressItemParams,
  FocusChainResult,
} from "./focus-chain.js";
export { FocusChainManager, FocusChainToolHandler } from "./focus-chain.js";
export { condenseTool, createCondenseTool } from "./condense.js";
export type { CondenseParams, CondenseResult } from "./condense.js";
export { summarizeTaskTool, createSummarizeTaskTool } from "./summarize-task.js";
export type { SummarizeTaskParams, SummarizeTaskResult, FileContent } from "./summarize-task.js";
export { registerTaskTools } from "./register.js";
