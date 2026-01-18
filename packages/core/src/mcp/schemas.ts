/**
 * MCP 配置 Schema 验证
 * 使用 Zod 进行运行时类型检查
 */

import { z } from 'zod';

/**
 * 自动批准工具列表 Schema
 */
export const AutoApproveSchema = z.array(z.string()).default([]);

/**
 * 基础配置 Schema
 */
export const BaseConfigSchema = z.object({
  autoApprove: AutoApproveSchema.optional(),
  disabled: z.boolean().optional(),
  timeout: z.number().min(1).optional().default(60),
});

/**
 * stdio 传输层配置 Schema
 */
export const StdioConfigSchema = BaseConfigSchema.extend({
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

/**
 * SSE 传输层配置 Schema
 */
export const SseConfigSchema = BaseConfigSchema.extend({
  type: z.literal('sse'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

/**
 * Streamable HTTP 传输层配置 Schema
 */
export const HttpConfigSchema = BaseConfigSchema.extend({
  type: z.literal('streamableHttp'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

/**
 * MCP 服务器配置 Schema (联合类型)
 */
export const McpServerConfigSchema = z.union([
  StdioConfigSchema,
  SseConfigSchema,
  HttpConfigSchema,
]);

/**
 * MCP 设置 Schema
 */
export const McpSettingsSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema).optional().default({}),
});

/**
 * 导出类型推断
 */
export type StdioConfig = z.infer<typeof StdioConfigSchema>;
export type SseConfig = z.infer<typeof SseConfigSchema>;
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type McpServerConfigValidate = z.infer<typeof McpServerConfigSchema>;
export type McpSettingsValidate = z.infer<typeof McpSettingsSchema>;
