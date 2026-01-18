import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Message, ServerMessage } from '../types/chat';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

  const { connected, sendMessage, messages: wsMessages } = useWebSocket(
    'ws://localhost:3000/ws'
  );

  // 处理 WebSocket 消息
  useEffect(() => {
    for (const msg of wsMessages) {
      if (msg.type === 'chat.delta') {
        setStreamingContent((prev) => prev + msg.content);
      } else if (msg.type === 'chat.complete') {
        setMessages((prev) => [...prev, {
          id: msg.message.id || Date.now().toString(),
          role: msg.message.role as 'user' | 'assistant',
          content: msg.message.content,
          createdAt: msg.message.createdAt,
        }]);
        setStreamingContent('');
      } else if (msg.type === 'chat.error') {
        alert('Error: ' + msg.error);
      }
    }
  }, [wsMessages]);

  // 创建会话
  const createSession = async () => {
    const response = await fetch('http://localhost:3000/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新对话' }),
    });
    const session = await response.json();
    setCurrentSessionId(session.id);
    return session.id;
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createSession();
    }

    // 添加用户消息
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    }]);

    // 发送到 WebSocket
    sendMessage({
      type: 'chat.send',
      sessionId,
      content: input,
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat</h2>
        <div className="flex items-center gap-2 mt-1">
          <div className={'w-2 h-2 rounded-full ' + (connected ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-sm text-gray-500">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            开始一个新的对话...
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={
                'max-w-[80%] rounded-lg p-3 ' +
                (msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900')
              }
            >
              <div className="text-sm font-semibold mb-1">
                {msg.role === 'user' ? 'You' : 'AI'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
              <div className="text-sm font-semibold mb-1">AI</div>
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息... (Shift+Enter 换行)"
            className="flex-1 border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
