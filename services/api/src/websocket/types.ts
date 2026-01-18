/**
 * 客户端 → 服务器消息类型
 */
export type ClientMessage =
  | ChatSendMessage
  | ChatCancelMessage

/**
 * 聊天发送消息
 */
export interface ChatSendMessage {
  type: 'chat.send'
  sessionId: string
  content: string
}

/**
 * 聊天取消消息
 */
export interface ChatCancelMessage {
  type: 'chat.cancel'
  sessionId: string
}

/**
 * 服务器 → 客户端消息类型
 */
export type ServerMessage =
  | ChatDeltaMessage
  | ChatToolCallMessage
  | ChatToolResultMessage
  | ChatCompleteMessage
  | ChatErrorMessage

/**
 * 流式文本增量
 */
export interface ChatDeltaMessage {
  type: 'chat.delta'
  sessionId: string
  content: string
}

/**
 * 工具调用
 */
export interface ChatToolCallMessage {
  type: 'chat.tool_call'
  sessionId: string
  tool: string
  args: Record<string, any>
}

/**
 * 工具结果
 */
export interface ChatToolResultMessage {
  type: 'chat.tool_result'
  sessionId: string
  tool: string
  result: Record<string, any>
}

/**
 * 聊天完成
 */
export interface ChatCompleteMessage {
  type: 'chat.complete'
  sessionId: string
  message: {
    role: string
    content: string
    createdAt: string
  }
}

/**
 * 聊天错误
 */
export interface ChatErrorMessage {
  type: 'chat.error'
  sessionId: string
  error: string
  code?: number
}
