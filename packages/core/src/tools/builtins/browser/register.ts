/**
 * 浏览器工具注册
 */

import { toolRegistry } from '../../registry.js';
import { browserActionTool } from './browser-action.js';

/**
 * 注册浏览器工具
 */
export function registerBrowserTools(): void {
  toolRegistry.register(browserActionTool);
}
