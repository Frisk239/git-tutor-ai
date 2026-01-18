import type { FastifyInstance } from 'fastify';
import { sessionService } from '../services/session.service.js';
import { createSessionSchema } from '../schemas/chat.js';
import { prisma } from '@git-tutor/db';

export async function chatRoutes(fastify: FastifyInstance) {
  // 创建会话
  fastify.post('/sessions', async (request, reply) => {
    const input = createSessionSchema.parse(request.body);

    // TODO: 从 JWT token 或 session 中获取 userId
    // 现在暂时使用第一个用户
    const user = await prisma.user.findFirst();
    if (!user) {
      return reply.status(400).send({
        error: { message: 'No user found. Please run database seed.' }
      });
    }

    const session = await sessionService.createSession({
      ...input,
      userId: user.id,
    });

    return reply.status(201).send(session);
  });

  // 获取会话列表
  fastify.get('/sessions', async (request, reply) => {
    // TODO: 从 JWT token 获取 userId
    const user = await prisma.user.findFirst();
    if (!user) {
      return reply.status(400).send({
        error: { message: 'No user found.' }
      });
    }

    const sessions = await sessionService.listSessions(user.id);
    return { sessions };
  });

  // 获取会话详情
  fastify.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: 从 JWT token 获取 userId
    const user = await prisma.user.findFirst();
    if (!user) {
      return reply.status(400).send({
        error: { message: 'No user found.' }
      });
    }

    const session = await sessionService.getSession(id, user.id);
    if (!session) {
      return reply.status(404).send({
        error: { message: 'Session not found' }
      });
    }

    return session;
  });

  // 删除会话
  fastify.delete('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: 从 JWT token 获取 userId
    const user = await prisma.user.findFirst();
    if (!user) {
      return reply.status(400).send({
        error: { message: 'No user found.' }
      });
    }

    const deleted = await sessionService.deleteSession(id, user.id);
    if (!deleted) {
      return reply.status(404).send({
        error: { message: 'Session not found' }
      });
    }

    return reply.status(204).send();
  });
}
