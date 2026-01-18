/**
 * 通信工具注册
 */

import { toolRegistry } from '../../registry.js';
import { askTool } from './ask.js';
import { sayTool } from './say.js';

/**
 * 注册通信工具
 */
export function registerCommunicationTools(): void {
  toolRegistry.register(askTool);
  toolRegistry.register(sayTool);
}
