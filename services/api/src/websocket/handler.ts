import type { SocketStream } from '@fastify/websocket';
import type { ClientMessage, ChatSendMessage } from './types.js';
import { wsManager } from './manager.js';
import { agentService } from '../services/agent.service.js';

/**
 * WebSocket 连接处理器
 */
export async function wsHandler(connection: SocketStream) {
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
      }
    } catch (error) {
      socket.send(JSON.stringify({
        type: 'chat.error',
        error: 'Message processing failed',
        details: error,
      }));
    }
  });

  socket.on('close', () => {
    if (currentSessionId) {
      wsManager.unregister(currentSessionId);
    }
  });
}
