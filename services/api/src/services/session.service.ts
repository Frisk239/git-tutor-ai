import { prisma } from '@git-tutor/db';
import type { CreateSessionInput, SessionResponse } from '../schemas/chat.js';

export class SessionService {
  /**
   * 创建新会话
   */
  async createSession(input: CreateSessionInput & { userId: string }): Promise<SessionResponse> {
    const session = await prisma.session.create({
      data: {
        userId: input.userId,
        title: input.title || '新对话',
        model: input.model || 'claude-sonnet-4-5-20250929',
        status: 'active',
      },
      include: {
        messages: true,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      model: session.model,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messages.length,
    };
  }

  /**
   * 获取用户的所有会话
   */
  async listSessions(userId: string): Promise<SessionResponse[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: true,
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      title: session.title,
      model: session.model,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messages.length,
    }));
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string, userId: string): Promise<SessionResponse | null> {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      model: session.model,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messages.length,
    };
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return false;
    }

    // Prisma 会级联删除相关的消息（ onDelete: Cascade）
    await prisma.session.delete({
      where: { id: sessionId },
    });

    return true;
  }
}

export const sessionService = new SessionService();
