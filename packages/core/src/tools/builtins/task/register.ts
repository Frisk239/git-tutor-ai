/**
 * 任务工具注册
 */

import { toolRegistry } from "../../registry.js";
import { newTaskTool } from "./new-task.js";
import { focusChainTool } from "./focus-chain.js";
import { condenseTool } from "./condense.js";
import { summarizeTaskTool } from "./summarize-task.js";

/**
 * 注册任务工具
 */
export function registerTaskTools(): void {
  toolRegistry.register(newTaskTool);
  toolRegistry.register(focusChainTool);
  toolRegistry.register(condenseTool);
  toolRegistry.register(summarizeTaskTool);
}
