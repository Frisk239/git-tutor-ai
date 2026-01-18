import type { SocketStream } from '@fastify/websocket';
import type { ClientMessage } from './types.js';

/**
 * WebSocket 连接处理器
 */
export async function wsHandler(connection: SocketStream) {
  const socket = connection.socket;

  socket.on('message', async (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      await handleMessage(message, socket);
    } catch (error) {
      socket.send(JSON.stringify({
        type: 'chat.error',
        error: 'Invalid message format',
      }));
    }
  });

  socket.on('close', () => {
    // 清理连接
    // TODO: 需要在连接时存储 sessionId，在这里清理
  });
}

/**
 * 处理客户端消息
 */
async function handleMessage(message: ClientMessage, socket: any) {
  switch (message.type) {
    case 'chat.send':
      // TODO: 在下一个任务中实现
      socket.send(JSON.stringify({
        type: 'chat.error',
        sessionId: message.sessionId,
        error: 'Agent execution not yet implemented',
      }));
      break;

    case 'chat.cancel':
      // TODO: 实现取消逻辑
      break;

    default:
      const msg = message as any;
      socket.send(JSON.stringify({
        type: 'chat.error',
        error: 'Unknown message type: ' + msg.type,
      }));
  }
}
