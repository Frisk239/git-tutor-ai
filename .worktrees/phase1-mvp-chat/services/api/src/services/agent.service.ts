import { createAgent } from '@git-tutor/core';
import type { AIProvider } from '@git-tutor/shared';
import { prisma } from '@git-tutor/db';
import type { Session } from '@prisma/client';
import type { WebSocket } from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { ServerMessage } from '../websocket/types.js';
import { wsManager } from '../websocket/manager.js';
import { AppError, ErrorCode } from '../middleware/error.js';

export class AgentService {
  /**
   * 执行 Agent 对话
   */
  async executeChat(
    fastify: FastifyInstance,
    sessionId: string,
    userMessage: string,
    socket: WebSocket
  ): Promise<void> {
    try {
      // 1. 获取会话和历史消息
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        fastify.log.warn(`Session ${sessionId} not found`);
        socket.send(JSON.stringify({
          type: 'chat.error',
          sessionId,
          error: 'Session not found',
          code: ErrorCode.NOT_FOUND,
        } satisfies ServerMessage));
        return;
      }

      // ✅ 添加：更新会话状态为 active
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'active' },
      });

      // 2. 保存用户消息
      await prisma.message.create({
        data: {
          sessionId,
          role: 'user',
          content: userMessage,
        },
      });

      // 3. 构建消息历史
      const messages = session.messages.map((msg) => ({
        role: msg.role as any,
        content: msg.content,
      }));

      // 4. 创建 Agent 实例
      const agent = createAgent({
        provider: session.model as AIProvider,
        model: session.model,
        sessionId,
        systemPrompt: 'You are a helpful AI assistant.',
      });

      // 5. 执行 Agent（流式）
      let fullResponse = '';
      for await (const chunk of agent.stream(userMessage, messages)) {
        if (chunk.type === 'delta') {
          // 流式文本增量
          fullResponse += chunk.content;
          socket.send(JSON.stringify({
            type: 'chat.delta',
            sessionId,
            content: chunk.content,
          } satisfies ServerMessage));
        } else if (chunk.type === 'tool_call') {
          // 工具调用
          socket.send(JSON.stringify({
            type: 'chat.tool_call',
            sessionId,
            tool: chunk.tool,
            args: chunk.args,
          } satisfies ServerMessage));
        } else if (chunk.type === 'tool_result') {
          // 工具结果
          socket.send(JSON.stringify({
            type: 'chat.tool_result',
            sessionId,
            tool: chunk.tool,
            result: chunk.result,
          } satisfies ServerMessage));
        }
      }

      // 6. 保存助手响应
      await prisma.message.create({
        data: {
          sessionId,
          role: 'assistant',
          content: fullResponse,
        },
      });

      // 7. 发送完成消息
      socket.send(JSON.stringify({
        type: 'chat.complete',
        sessionId,
        message: {
          role: 'assistant',
          content: fullResponse,
          createdAt: new Date().toISOString(),
        },
      } satisfies ServerMessage));

      // 8. ✅ 修改：更新会话状态为 completed
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });

    } catch (error) {
      // ✅ 添加：记录详细错误
      fastify.log.error(error, `Agent execution failed for session ${sessionId}`);

      // ✅ 修复：区分错误类型
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error occurred';

      const errorCode = error instanceof AppError
        ? error.code
        : ErrorCode.AI_ERROR;

      // ✅ 添加：更新会话状态为错误
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'error' },
        });
        fastify.log.info(`Session ${sessionId} status updated to 'error'`);
      } catch (updateError) {
        fastify.log.error(updateError, `Failed to update session ${sessionId} status`);
      }

      // ✅ 修复：发送包含错误代码的消息
      socket.send(JSON.stringify({
        type: 'chat.error',
        sessionId,
        error: errorMessage,
        code: errorCode,
      } satisfies ServerMessage));
    }
  }
}

export const agentService = new AgentService();
