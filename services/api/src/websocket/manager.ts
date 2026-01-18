import { WebSocket } from '@fastify/websocket';
import type { ServerMessage } from './types.js';

/**
 * WebSocket 连接管理器
 */
export class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();

  /**
   * 注册连接
   */
  register(sessionId: string, socket: WebSocket) {
    this.connections.set(sessionId, socket);
  }

  /**
   * 取消注册连接
   */
  unregister(sessionId: string) {
    this.connections.delete(sessionId);
  }

  /**
   * 发送消息到指定会话
   */
  send(sessionId: string, message: ServerMessage) {
    const socket = this.connections.get(sessionId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到所有连接
   */
  broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    for (const socket of this.connections.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }

  /**
   * 检查会话是否连接
   */
  isConnected(sessionId: string): boolean {
    const socket = this.connections.get(sessionId);
    return socket?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
