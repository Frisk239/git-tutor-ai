/**
 * 通信工具
 * 提供用户交互功能
 */

export { askTool, createAskTool } from './ask.js';
export type { AskParams, AskResult } from './ask.js';
export { sayTool, createSayTool } from './say.js';
export type { SayParams, SayResult } from './say.js';
export { registerCommunicationTools } from './register.js';
