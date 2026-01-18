/**
 * 交互工具注册
 *
 * 注册需要与用户交互的工具
 */

import { toolRegistry } from "../registry.js";
import { askTool } from "./interaction/ask.js";
import { actModeRespondTool } from "./interaction/act-mode-respond.js";

/**
 * 注册交互工具
 */
export function registerInteractionTools(): void {
  // 注册 ASK 工具
  toolRegistry.register(askTool);

  // 注册 ACT_MODE_RESPOND 工具
  toolRegistry.register(actModeRespondTool);
}
