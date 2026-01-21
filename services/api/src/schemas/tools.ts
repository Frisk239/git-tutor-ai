import { z } from 'zod'

export const executeToolSchema = z.object({
  tool: z.string(),
  args: z.record(z.any()),
})

export type ExecuteToolInput = z.infer<typeof executeToolSchema>

export const toolExecutionResponseSchema = z.object({
  success: z.boolean(),
  result: z.any(),
  error: z.string().optional(),
})

export type ToolExecutionResponse = z.infer<typeof toolExecutionResponseSchema>
