import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1).optional(),
  userId: z.string().optional(), // 可选，默认使用当前用户
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const sessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  model: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().optional(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;
