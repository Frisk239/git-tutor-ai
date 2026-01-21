export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface Session {
  id: string
  title: string
  model: string
  status: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type ServerMessage =
  | { type: 'chat.delta'; sessionId: string; content: string }
  | { type: 'chat.tool_call'; sessionId: string; tool: string; args: any }
  | { type: 'chat.tool_result'; sessionId: string; tool: string; result: any }
  | { type: 'chat.complete'; sessionId: string; message: Message }
  | { type: 'chat.error'; sessionId: string; error: string }
