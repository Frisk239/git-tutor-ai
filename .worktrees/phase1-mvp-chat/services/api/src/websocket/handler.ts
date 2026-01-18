import type { SocketStream } from '@fastify/websocket';
import type { FastifyRequest } from 'fastify';
import type { ClientMessage } from './types.js';
import type { ServerMessage } from './types.js';
import { wsManager } from './manager.js';
import { agentService } from '../services/agent.service.js';

/**
 * WebSocket 连接处理器
 */
export async function wsHandler(connection: SocketStream, request: FastifyRequest) {
  const socket = connection.socket;
  let currentSessionId: string | null = null;

  socket.on('message', async (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      if (message.type === 'chat.send') {
        currentSessionId = message.sessionId;
        wsManager.register(message.sessionId, socket);

        // 执行 Agent
        await agentService.executeChat(
          message.sessionId,
          message.content,
          socket
        );
      } else if (message.type === 'chat.cancel') {
        // TODO: 实现取消逻辑
      } else {
        // ✅ 添加：记录未知消息类型
        request.log.warn({ messageType: (message as any).type }, 'Unknown WebSocket message type');
      }
    } catch (error) {
      // ✅ 修复：添加详细错误日志用于调试
      request.log.error(error, 'WebSocket message processing failed');

      // ✅ 修复：只发送安全的错误消息，移除 details
      socket.send(JSON.stringify({
        type: 'chat.error',
        error: 'Message processing failed',
      } satisfies ServerMessage));
    }
  });

  socket.on('close', () => {
    if (currentSessionId) {
      wsManager.unregister(currentSessionId);
    }
  });
}
