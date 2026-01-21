import { useEffect, useRef, useState } from 'react';
import type { ServerMessage } from '../types/chat';

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.current.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { connected, messages, sendMessage };
}
