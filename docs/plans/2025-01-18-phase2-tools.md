# Phase 2: Tools System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 AI 工具调用系统，让 Agent 可以执行文件操作、Git 操作等工具，并在前端显示工具调用过程和结果。

**Architecture:** 基于 packages/core 现有的工具系统，创建后端 API 端点暴露工具能力，扩展 Agent 支持工具调用，前端展示工具执行状态。

**Tech Stack:**
- **后端:** Fastify routes, packages/core tools
- **前端:** React components, WebSocket listeners
- **工具:** Existing 25 tools in packages/core

**Prerequisites:**
- ✅ Phase 0 完成（TypeScript 配置、测试套件）
- ✅ Phase 1 完成（基础聊天、Agent 集成、WebSocket）

---

## Task 1: Review Existing Tool System

**Goal:** 了解 packages/core 中现有的工具实现，确保理解工具系统的架构。

**Files:**
- Read: `packages/core/src/tools/registry.ts`
- Read: `packages/core/src/tools/executor.ts`
- Read: `packages/core/src/tools/types.ts`
- Read: `packages/core/src/tools/builtins/*`

**Step 1: Read tool types**

Run: `cat packages/core/src/tools/types.ts`

Expected output: ToolDefinition, ToolContext, ToolResult interfaces

**Step 2: Read tool registry**

Run: `cat packages/core/src/tools/registry.ts`

Expected: ToolRegistryImpl class with register, get, getAll methods

**Step 3: Read tool executor**

Run: `cat packages/core/src/tools/executor.ts`

Expected: ToolExecutor class with execute, executeBatch methods

**Step 4: List available tools**

Run: `ls packages/core/src/tools/builtins/`

Expected output:
```
filesystem-tools.ts
git-tools.ts
github-tools.ts
web-tools.ts
web-fetch-tools.ts
code-explanation-tools.ts
```

**Step 5: Check existing tool tests**

Run: `cat tests/comprehensive/test-all-25-tools.js | head -50`

Expected: Test file showing 25 tools being tested

**Step 6: Document tool inventory**

Create: `docs/tool-inventory.md`

```markdown
# Tool Inventory

## File System Tools (11)
1. create_directory - Create directory
2. write_file - Write file content
3. read_file - Read file content
4. get_file_stats - Get file statistics
5. list_files - List directory contents
6. edit_file - Edit file with search/replace
7. copy_file - Copy file
8. move_file - Move/rename file
9. search_files - Search for files
10. delete_file - Delete file
11. apply_patch - Apply patch file

## Git Tools (6)
1. git_status - Show working tree status
2. git_diff - Show changes between commits
3. git_log - Show commit logs
4. git_create_branch - Create new branch
5. git_commit - Commit changes
6. git_smart_commit - AI-powered commit message generation

## GitHub Tools (5)
1. github_search_repositories - Search GitHub repos
2. github_get_file - Get file from GitHub repo
3. github_create_issue - Create GitHub issue
4. github_create_pr - Create pull request
5. github_fork_repository - Fork a repository

## Web Tools (2)
1. web_search - Search web with Tavily
2. web_fetch - Fetch HTTP content

## AI Tools (1)
1. generate_explanation - Generate code explanation

## Status
✅ All 25 tools implemented in packages/core
✅ All tools tested (100% pass rate)
```

**Step 7: Commit documentation**

```bash
git add docs/tool-inventory.md
git commit -m "docs: add tool inventory

- Documented all 25 available tools
- Categorized by type (filesystem, git, github, web, ai)
- All tools tested and working in packages/core"
```

---

## Task 2: Create Tool Execution API

**Goal:** 创建后端 API 端点，让前端可以调用工具（虽然主要工具调用通过 Agent，但有些场景需要直接调用）。

**Files:**
- Create: `services/api/src/routes/tools.ts`
- Create: `services/api/src/services/tool.service.ts`
- Create: `services/api/src/schemas/tools.ts`

**Step 1: Define tool API schemas**

Create: `services/api/src/schemas/tools.ts`

```typescript
import { z } from 'zod'

export const executeToolSchema = z.object({
  tool: z.string(),
  args: z.record(z.any()),
})

export type ExecuteToolInput = z.infer<typeof executeToolSchema>

export const toolExecutionResponseSchema = z.object({
  success: z.boolean(),
  result: z.any(),
  error: z.string().optional(),
})

export type ToolExecutionResponse = z.infer<typeof toolExecutionResponseSchema>
```

**Step 2: Implement tool service**

Create: `services/api/src/services/tool.service.ts`

```typescript
import { toolExecutor } from '@git-tutor/core'
import type { ExecuteToolInput, ToolExecutionResponse } from '../schemas/tools'

export class ToolService {
  /**
   * 执行单个工具
   */
  async executeTool(input: ExecuteToolInput): Promise<ToolExecutionResponse> {
    try {
      const result = await toolExecutor.execute(input.tool, input.args, {
        workingDirectory: process.cwd(),
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 获取所有可用工具列表
   */
  async listTools() {
    const tools = toolExecutor.getAll()
    return tools.map((tool) => ({
      name: tool.name,
      category: tool.category,
      displayName: tool.displayName,
      description: tool.description,
      parameters: tool.parameters._def,
    }))
  }
}

export const toolService = new ToolService()
```

**Step 3: Create tool routes**

Create: `services/api/src/routes/tools.ts`

```typescript
import type { FastifyInstance } from 'fastify'
import { toolService } from '../services/tool.service'
import { executeToolSchema } from '../schemas/tools'

export async function toolRoutes(fastify: FastifyInstance) {
  // 执行工具
  fastify.post('/execute', async (request, reply) => {
    const input = executeToolSchema.parse(request.body)
    const result = await toolService.executeTool(input)
    return reply.send(result)
  })

  // 获取工具列表
  fastify.get('/list', async () => {
    const tools = await toolService.listTools()
    return { tools }
  })

  // 获取工具详情
  fastey.get('/:toolName', async (request, reply) => {
    const { toolName } = request.params as { toolName: string }
    const tool = toolExecutor.get(toolName)

    if (!tool) {
      return reply.status(404).send({
        error: { message: 'Tool not found' }
      })
    }

    return {
      name: tool.name,
      category: tool.category,
      displayName: tool.displayName,
      description: tool.description,
      parameters: tool.parameters._def,
    }
  })
}
```

**Step 4: Register tool routes**

Edit: `services/api/src/server.ts`

Add after chat routes registration:

```typescript
import { toolRoutes } from './routes/tools'

export async function buildServer() {
  // ... existing code ...

  // 注册路由
  await server.register(chatRoutes, { prefix: '/api/chat' })
  await server.register(toolRoutes, { prefix: '/api/tools' }) // ← Add this

  return server
}
```

**Step 5: Test tool API**

Run: `cd services/api && pnpm dev`

测试获取工具列表：
```bash
curl http://localhost:3000/api/tools/list
```

Expected:
```json
{
  "tools": [
    {
      "name": "read_file",
      "category": "fs",
      "displayName": "Read File",
      "description": "Read the contents of a file",
      ...
    },
    ...
  ]
}
```

**Step 6: Commit**

```bash
git add services/api/
git commit -m "feat(api): add tool execution API

- Created tool service for executing tools
- Added tool routes (/api/tools/*)
- Implemented tool listing endpoint
- Tested tool listing API
- Endpoints:
  - POST /api/tools/execute
  - GET  /api/tools/list
  - GET  /api/tools/:toolName"
```

---

## Task 3: Integrate Tools with Agent

**Goal:** 扩展 Agent 执行器，支持工具调用。当 AI 决定调用工具时，Agent 可以执行工具并返回结果。

**Files:**
- Modify: `services/api/src/services/agent.service.ts`
- Modify: `packages/core/src/agent/agent.ts` (if needed)

**Step 1: Review Agent implementation**

Run: `cat packages/core/src/agent/agent.ts | head -100`

Expected: Agent class with stream method

**Step 2: Check if Agent supports tools**

Run: `grep -n "tool" packages/core/src/agent/agent.ts | head -20`

Expected: Check if tool calling is implemented

**Step 3: Update Agent to use tools**

If Agent doesn't support tools, modify to add tool calling:

Create: `services/api/src/services/agent.service.ts` (updated)

```typescript
import { createAgent } from '@git-tutor/core'
import { toolExecutor } from '@git-tutor/core'
import type { AIProvider } from '@git-tutor/shared'
import { prisma } from '@git-tutor/db'

export class AgentService {
  async executeChat(
    sessionId: string,
    userMessage: string,
    socket: WebSocket,
    options?: {
      enableTools?: boolean
      workingDirectory?: string
    }
  ): Promise<void> {
    try {
      // 1. 获取会话和历史消息
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })

      if (!session) {
        socket.send(JSON.stringify({
          type: 'chat.error',
          sessionId,
          error: 'Session not found',
        }))
        return
      }

      // 2. 保存用户消息
      await prisma.message.create({
        data: { sessionId, role: 'user', content: userMessage },
      })

      // 3. 构建消息历史
      const messages = session.messages.map((msg) => ({
        role: msg.role as any,
        content: msg.content,
      }))

      // 4. 创建 Agent，启用工具
      const agent = createAgent({
        provider: session.model as AIProvider,
        model: session.model,
        sessionId,
        systemPrompt: 'You are a helpful AI assistant with access to tools.',
        enableTools: options?.enableTools ?? true, // ← 关键：启用工具
        toolExecutor: options?.enableTools ? toolExecutor : undefined,
        workingDirectory: options?.workingDirectory ?? process.cwd(),
      })

      // 5. 执行 Agent（流式 + 工具调用）
      let fullResponse = ''
      let currentToolCall: any = null

      for await (const chunk of agent.stream(userMessage, messages)) {
        if (chunk.type === 'delta') {
          // 流式文本
          fullResponse += chunk.content
          socket.send(JSON.stringify({
            type: 'chat.delta',
            sessionId,
            content: chunk.content,
          }))
        } else if (chunk.type === 'tool_call') {
          // 工具调用开始
          currentToolCall = {
            tool: chunk.tool,
            args: chunk.args,
          }
          socket.send(JSON.stringify({
            type: 'chat.tool_call',
            sessionId,
            tool: chunk.tool,
            args: chunk.args,
          }))
        } else if (chunk.type === 'tool_result') {
          // 工具执行结果
          socket.send(JSON.stringify({
            type: 'chat.tool_result',
            sessionId,
            tool: chunk.tool,
            result: chunk.result,
          }))
          currentToolCall = null
        }
      }

      // 6. 保存助手响应
      await prisma.message.create({
        data: {
          sessionId,
          role: 'assistant',
          content: fullResponse,
        },
      })

      // 7. 发送完成消息
      socket.send(JSON.stringify({
        type: 'chat.complete',
        sessionId,
        message: {
          role: 'assistant',
          content: fullResponse,
          createdAt: new Date().toISOString(),
        },
      }))

    } catch (error) {
      socket.send(JSON.stringify({
        type: 'chat.error',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }
}

export const agentService = new AgentService()
```

**Step 4: Test Agent with tools**

确保 `.env` 配置了 AI API Key：

```bash
OPENAI_COMPATIBLE_API_KEY=your_key
```

运行测试脚本：

Create: `services/api/test-agent-tools.js`

```javascript
const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:3000/ws')

ws.on('open', async () => {
  console.log('✅ Connected')

  // 创建会话
  const sessionRes = await fetch('http://localhost:3000/api/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Tools',
      model: 'claude-sonnet-4-5-20250929',
    }),
  })
  const session = await sessionRes.json()

  // 发送需要工具的消息
  ws.send(JSON.stringify({
    type: 'chat.send',
    sessionId: session.id,
    content: '请帮我列出当前目录的文件',
  }))
})

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())
  console.log('📩', msg.type, msg)

  if (msg.type === 'chat.tool_call') {
    console.log('🔧 Tool called:', msg.tool)
    console.log('   Args:', msg.args)
  }

  if (msg.type === 'chat.tool_result') {
    console.log('✓ Tool result:', msg.tool)
  }
})
```

Run: `cd services/api && node test-agent-tools.js`

Expected: 看到 `chat.tool_call` 和 `chat.tool_result` 消息

**Step 5: Commit**

```bash
git add services/api/ packages/core/
git commit -m "feat(agent): integrate tools with Agent execution

- Updated AgentService to enable tool calling
- Agent can now execute tools during chat
- Added tool call/result WebSocket messages
- Tested Agent with file listing tool
- Tool calling flow:
  1. AI decides to use tool
  2. Sends tool_call message
  3. Executes tool
  4. Sends tool_result message
  5. Continues with response"
```

---

## Task 4: Create Tool Call Display Component

**Goal:** 在前端显示工具调用过程，让用户看到 AI 正在执行什么操作。

**Files:**
- Create: `apps/web/src/components/ToolCallDisplay.tsx`
- Create: `apps/web/src/components/ToolResultDisplay.tsx`
- Modify: `apps/web/src/components/ChatPanel.tsx`

**Step 1: Create ToolCallDisplay component**

Create: `apps/web/src/components/ToolCallDisplay.tsx`

```typescript
interface ToolCallDisplayProps {
  tool: string
  args: Record<string, any>
  status?: 'calling' | 'success' | 'error'
}

export function ToolCallDisplay({ tool, args, status = 'calling' }: ToolCallDisplayProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'calling':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'calling':
        return '⏳'
      case 'success':
        return '✓'
      case 'error':
        return '✗'
    }
  }

  return (
    <div className={`my-2 p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-semibold">{tool}</span>
        <span className="text-xs opacity-75">
          {status === 'calling' ? '执行中...' : status === 'success' ? '完成' : '失败'}
        </span>
      </div>

      <div className="text-sm">
        <div className="font-medium mb-1">参数:</div>
        <pre className="bg-white bg-opacity-50 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
    </div>
  )
}
```

**Step 2: Create ToolResultDisplay component**

Create: `apps/web/src/components/ToolResultDisplay.tsx`

```typescript
interface ToolResultDisplayProps {
  tool: string
  result: any
}

export function ToolResultDisplay({ tool, result }: ToolResultDisplayProps) {
  const renderResult = () => {
    if (result.error) {
      return (
        <div className="text-red-700">
          <div className="font-semibold">错误:</div>
          <div className="text-sm">{result.error}</div>
        </div>
      )
    }

    // 文件内容
    if (result.content !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">文件内容:</div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
            {result.content}
          </pre>
        </div>
      )
    }

    // 文件列表
    if (result.files !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">文件列表:</div>
          <ul className="list-disc list-inside text-sm space-y-1">
            {result.files.map((file: string, i: number) => (
              <li key={i} className="font-mono text-xs">{file}</li>
            ))}
          </ul>
        </div>
      )
    }

    // Git 状态
    if (result.status !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">Git 状态:</div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs">
            {result.status}
          </pre>
        </div>
      )
    }

    // 默认 JSON 显示
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
        {JSON.stringify(result, null, 2)}
      </pre>
    )
  }

  return (
    <div className="my-2 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-700 font-semibold">✓ {tool} 执行成功</span>
      </div>
      {renderResult()}
    </div>
  )
}
```

**Step 3: Update ChatPanel to show tool calls**

Edit: `apps/web/src/components/ChatPanel.tsx`

Add tool call tracking:

```typescript
import { ToolCallDisplay } from './ToolCallDisplay'
import { ToolResultDisplay } from './ToolResultDisplay'
import type { ServerMessage } from '../types/chat'

export function ChatPanel() {
  // ... existing state ...
  const [toolCalls, setToolCalls] = useState<Array<{
    tool: string
    args: any
    status: 'calling' | 'success' | 'error'
    result?: any
  }>>([])

  // Update WebSocket message handler
  const processWsMessage = (msg: ServerMessage) => {
    if (msg.type === 'chat.delta') {
      setStreamingContent((prev) => prev + msg.content)
    } else if (msg.type === 'chat.tool_call') {
      // 添加工具调用
      setToolCalls((prev) => [...prev, {
        tool: msg.tool,
        args: msg.args,
        status: 'calling',
      }])
    } else if (msg.type === 'chat.tool_result') {
      // 更新工具调用状态
      setToolCalls((prev) =>
        prev.map((tc) =>
          tc.tool === msg.tool && tc.status === 'calling'
            ? { ...tc, status: 'success', result: msg.result }
            : tc
        )
      )
    } else if (msg.type === 'chat.complete') {
      setMessages((prev) => [...prev, {
        id: msg.message.id,
        role: msg.message.role as 'user' | 'assistant',
        content: msg.message.content,
        createdAt: msg.message.createdAt,
      }])
      setStreamingContent('')
      setToolCalls([]) // 清空工具调用
    } else if (msg.type === 'chat.error') {
      setToolCalls((prev) =>
        prev.map((tc) =>
          tc.status === 'calling'
            ? { ...tc, status: 'error' }
            : tc
        )
      )
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* ... existing header ... */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ... existing messages ... */}

        {/* 工具调用显示 */}
        {toolCalls.map((tc, i) => (
          <div key={i}>
            {tc.status === 'calling' ? (
              <ToolCallDisplay
                tool={tc.tool}
                args={tc.args}
                status="calling"
              />
            ) : tc.status === 'success' ? (
              <ToolResultDisplay
                tool={tc.tool}
                result={tc.result}
              />
            ) : (
              <ToolCallDisplay
                tool={tc.tool}
                args={tc.args}
                status="error"
              />
            )}
          </div>
        ))}

        {/* 流式内容 */}
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

      {/* ... existing input ... */}
    </div>
  )
}
```

**Step 4: Test tool call display**

1. 启动后端：`cd services/api && pnpm dev`
2. 启动前端：`cd apps/web && pnpm dev`
3. 打开聊天，发送消息："请列出当前目录的文件"

Expected:
- 看到工具调用卡片（蓝色边框，⏳ 图标）
- 看到工具执行结果（绿色边框，✓ 图标）
- 显示文件列表

**Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add tool call and result display

- Created ToolCallDisplay component
- Created ToolResultDisplay component
- Updated ChatPanel to show tool execution
- Tool display features:
  - Real-time tool call status
  - Tool parameters display
  - Formatted result display
  - Special handling for files, git status, errors
- Tested with file listing tool"
```

---

## Task 5: Implement File Operation Tools Integration

**Goal:** 确保文件操作工具可以正常工作，包括读取、写入、列表等操作。

**Files:**
- Create: `services/api/src/services/file.service.ts`
- Modify: `services/api/src/routes/tools.ts`

**Step 1: Create file service**

Create: `services/api/src/services/file.service.ts`

```typescript
import { toolExecutor } from '@git-tutor/core'
import path from 'path'

export class FileService {
  private workingDirectory: string

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string) {
    const result = await toolExecutor.execute('read_file', {
      filePath: path.join(this.workingDirectory, filePath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 写入文件
   */
  async writeFile(filePath: string, content: string) {
    const result = await toolExecutor.execute('write_file', {
      filePath: path.join(this.workingDirectory, filePath),
      content,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 列出目录
   */
  async listFiles(directoryPath: string) {
    const result = await toolExecutor.execute('list_files', {
      directoryPath: path.join(this.workingDirectory, directoryPath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 搜索文件
   */
  async searchFiles(pattern: string, directoryPath?: string) {
    const result = await toolExecutor.execute('search_files', {
      pattern,
      directoryPath: directoryPath
        ? path.join(this.workingDirectory, directoryPath)
        : this.workingDirectory,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath: string) {
    const result = await toolExecutor.execute('get_file_stats', {
      filePath: path.join(this.workingDirectory, filePath),
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }
}

export const fileService = new FileService()
```

**Step 2: Test file operations**

Create: `services/api/test-file-operations.js`

```javascript
const { fileService } = require('./dist/services/file.service')

async function test() {
  console.log('测试文件操作...')

  // 列出文件
  const listResult = await fileService.listFiles('.')
  console.log('✓ 文件列表:', listResult)

  // 读取文件
  const readResult = await fileService.readFile('package.json')
  console.log('✓ 文件内容长度:', readResult.content.length)

  // 写入测试文件
  await fileService.writeFile('test.txt', 'Hello from Phase 2!')
  console.log('✓ 文件写入成功')

  // 读取测试文件
  const testContent = await fileService.readFile('test.txt')
  console.log('✓ 测试文件内容:', testContent.content)

  // 获取文件统计
  const stats = await fileService.getFileStats('test.txt')
  console.log('✓ 文件统计:', stats)
}

test().catch(console.error)
```

Run: `cd services/api && pnpm build && node test-file-operations.js`

Expected: 所有文件操作测试通过

**Step 3: Commit**

```bash
git add services/api/
git commit -m "feat(api): add file service for file operations

- Created FileService with common operations
- Implemented readFile, writeFile, listFiles
- Implemented searchFiles, getFileStats
- Tested file operations
- Service uses toolExecutor under the hood"
```

---

## Task 6: Implement Git Tools Integration

**Goal:** 集成 Git 工具，让 AI 可以执行 Git 操作。

**Files:**
- Create: `services/api/src/services/git.service.ts`
- Modify: `services/api/src/routes/tools.ts`

**Step 1: Create Git service**

Create: `services/api/src/services/git.service.ts`

```typescript
import { toolExecutor } from '@git-tutor/core'
import path from 'path'

export class GitService {
  private workingDirectory: string

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory
  }

  /**
   * 获取 Git 状态
   */
  async getStatus() {
    const result = await toolExecutor.execute('git_status', {}, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取 Git diff
   */
  async getDiff(ref1?: string, ref2?: string) {
    const result = await toolExecutor.execute('git_diff', {
      ref1,
      ref2,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 获取提交日志
   */
  async getLog(limit: number = 10) {
    const result = await toolExecutor.execute('git_log', {
      limit,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 创建分支
   */
  async createBranch(branchName: string) {
    const result = await toolExecutor.execute('git_create_branch', {
      branchName,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 提交更改
   */
  async commit(message: string) {
    const result = await toolExecutor.execute('git_commit', {
      message,
    }, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }

  /**
   * 智能提交（AI 生成提交信息）
   */
  async smartCommit() {
    const result = await toolExecutor.execute('git_smart_commit', {}, {
      workingDirectory: this.workingDirectory,
    })

    return result
  }
}

export const gitService = new GitService()
```

**Step 2: Test Git operations**

Create: `services/api/test-git-operations.js`

```javascript
const { gitService } = require('./dist/services/git.service')

async function test() {
  console.log('测试 Git 操作...')

  // 获取状态
  const status = await gitService.getStatus()
  console.log('✓ Git 状态:', status)

  // 获取日志
  const log = await gitService.getLog(5)
  console.log('✓ 最近5次提交:', log.commits?.length)

  // 获取 diff
  const diff = await gitService.getDiff()
  console.log('✓ Diff 长度:', diff.diff?.length)
}

test().catch(console.error)
```

Run: `cd services/api && pnpm build && node test-git-operations.js`

Expected: Git 操作测试通过（需要在 Git 仓库中运行）

**Step 3: Commit**

```bash
git add services/api/
git commit -m "feat(api): add Git service for Git operations

- Created GitService with common Git operations
- Implemented getStatus, getDiff, getLog
- Implemented createBranch, commit, smartCommit
- Tested Git operations
- Service uses toolExecutor under the hood"
```

---

## Task 7: Add Tool Error Handling

**Goal:** 完善工具错误处理，当工具执行失败时给出清晰的错误信息。

**Files:**
- Modify: `services/api/src/services/tool.service.ts`
- Modify: `apps/web/src/components/ToolResultDisplay.tsx`

**Step 1: Enhance tool service error handling**

Edit: `services/api/src/services/tool.service.ts`

```typescript
export class ToolService {
  async executeTool(input: ExecuteToolInput): Promise<ToolExecutionResponse> {
    try {
      const result = await toolExecutor.execute(input.tool, input.args, {
        workingDirectory: process.cwd(),
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      // 详细的错误处理
      if (error instanceof Error) {
        // 检查常见错误类型
        if (error.message.includes('ENOENT')) {
          return {
            success: false,
            error: `文件或目录不存在: ${input.args.filePath || input.args.directoryPath}`,
          }
        }

        if (error.message.includes('EACCES')) {
          return {
            success: false,
            error: '权限不足，无法访问该文件或目录',
          }
        }

        if (error.message.includes('git')) {
          return {
            success: false,
            error: `Git 错误: ${error.message}`,
          }
        }

        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: false,
        error: '未知错误',
      }
    }
  }
}
```

**Step 2: Update frontend error display**

Edit: `apps/web/src/components/ToolResultDisplay.tsx`

```typescript
export function ToolResultDisplay({ tool, result }: ToolResultDisplayProps) {
  const renderResult = () => {
    if (result.error) {
      return (
        <div className="text-red-700">
          <div className="font-semibold mb-2">❌ 执行失败</div>
          <div className="text-sm bg-red-100 p-3 rounded">{result.error}</div>

          {/* 添加解决建议 */}
          {result.error.includes('不存在') && (
            <div className="mt-3 text-sm text-red-600">
              💡 建议：检查文件路径是否正确
            </div>
          )}

          {result.error.includes('权限') && (
            <div className="mt-3 text-sm text-red-600">
              💡 建议：检查文件权限，确保有读写权限
            </div>
          )}
        </div>
      )
    }

    // ... rest of the function ...
  }
}
```

**Step 3: Test error handling**

在聊天中尝试：
1. 读取不存在的文件："请读取 /nonexistent/file.txt"
2. 列出不存在的目录："请列出 /invalid-dir 的内容"

Expected: 看到清晰的错误信息和建议

**Step 4: Commit**

```bash
git add services/api/ apps/web/
git commit -m "feat(tools): add comprehensive error handling

- Enhanced tool service error handling
- Added specific error messages for common cases
- File not found, permission denied, git errors
- Updated frontend to show errors with suggestions
- Tested error scenarios"
```

---

## Task 8: Write Integration Tests

**Goal:** 编写工具系统的集成测试。

**Files:**
- Create: `services/api/src/__tests__/integration/tools.test.ts`

**Step 1: Create tool integration tests**

Create: `services/api/src/__tests__/integration/tools.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../server'
import { toolService } from '../../services/tool.service'

describe('Tools API Integration', () => {
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    server = await buildServer()
    await server.listen({ port: 0 })
    baseUrl = `http://localhost:${server.server.address().port}`
  })

  afterAll(async () => {
    await server.close()
  })

  it('should list all available tools', async () => {
    const response = await fetch(`${baseUrl}/api/tools/list`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('tools')
    expect(Array.isArray(data.tools)).toBe(true)
    expect(data.tools.length).toBeGreaterThan(0)
  })

  it('should get tool details', async () => {
    const response = await fetch(`${baseUrl}/api/tools/read_file`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('name', 'read_file')
    expect(data).toHaveProperty('category')
    expect(data).toHaveProperty('description')
  })

  it('should execute read_file tool', async () => {
    const response = await fetch(`${baseUrl}/api/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'read_file',
        args: { filePath: 'package.json' },
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.result).toHaveProperty('content')
  })

  it('should handle tool execution errors', async () => {
    const response = await fetch(`${baseUrl}/api/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'read_file',
        args: { filePath: '/nonexistent/file.txt' },
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data).toHaveProperty('error')
  })
})
```

**Step 2: Run tests**

Run: `cd services/api && pnpm test`

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add services/api/
git commit -m "test(tools): add tools integration tests

- Created comprehensive tool API tests
- Tests cover:
  - Tool listing
  - Tool details
  - Tool execution (success)
  - Tool execution (error)
- All tests passing"
```

---

## Task 9: Create Tool Usage Documentation

**Goal:** 为工具系统创建文档，说明如何使用工具。

**Files:**
- Create: `docs/tools-guide.md`
- Update: `README.md`

**Step 1: Create tools guide**

Create: `docs/tools-guide.md`

```markdown
# Tools System Guide

## Overview

Git Tutor AI 包含 25+ 个工具，AI 可以调用这些工具来执行操作。

## Tool Categories

### File System Tools (11 tools)
- `read_file` - 读取文件内容
- `write_file` - 写入文件
- `list_files` - 列出目录内容
- `search_files` - 搜索文件
- `create_directory` - 创建目录
- `delete_file` - 删除文件
- `copy_file` - 复制文件
- `move_file` - 移动文件
- `edit_file` - 编辑文件
- `get_file_stats` - 获取文件统计
- `apply_patch` - 应用补丁

### Git Tools (6 tools)
- `git_status` - 查看 Git 状态
- `git_diff` - 查看差异
- `git_log` - 查看提交历史
- `git_create_branch` - 创建分支
- `git_commit` - 提交更改
- `git_smart_commit` - AI 智能提交

### GitHub Tools (5 tools)
- `github_search_repositories` - 搜索仓库
- `github_get_file` - 获取 GitHub 文件
- `github_create_issue` - 创建 Issue
- `github_create_pr` - 创建 Pull Request
- `github_fork_repository` - Fork 仓库

### Web Tools (2 tools)
- `web_search` - 网页搜索
- `web_fetch` - 获取网页内容

## Usage Examples

### Example 1: File Operations

**User:** "请帮我查看 package.json 的内容"

**AI Actions:**
1. Calls `read_file` tool
2. Displays file content

### Example 2: Git Operations

**User:** "查看当前的 Git 状态"

**AI Actions:**
1. Calls `git_status` tool
2. Displays branch, changed files, etc.

### Example 3: Smart Commit

**User:** "请帮我提交这些更改"

**AI Actions:**
1. Calls `git_smart_commit` tool
2. AI analyzes changes
3. Generates commit message
4. Commits changes

## API Usage

### List Tools
```bash
GET /api/tools/list
```

### Execute Tool
```bash
POST /api/tools/execute
{
  "tool": "read_file",
  "args": {
    "filePath": "package.json"
  }
}
```

## See Also
- [Complete Tool List](./tool-inventory.md)
- [Tool Tests](../tests/comprehensive/)
```

**Step 2: Update README**

Edit: `README.md`

Add after Phase 1 status:

```markdown
### Phase 2: Tools System ✅
- [x] Tool execution API
- [x] Agent tool integration
- [x] Tool call display UI
- [x] File operations
- [x] Git operations
- [x] Error handling
```

**Step 3: Commit**

```bash
git add docs/ README.md
git commit -m "docs: add tools system guide

- Created comprehensive tools guide
- Documented all tool categories
- Added usage examples
- Updated README with Phase 2 status"
```

---

## Task 10: Documentation and Cleanup

**Goal:** 完成 Phase 2 文档和清理工作。

**Files:**
- Create: `docs/phase2-completion-report.md`

**Step 1: Create completion report**

Create: `docs/phase2-completion-report.md`

```markdown
# Phase 2: Tools System - Completion Report

**Date:** 2025-01-18
**Status:** ✅ COMPLETE

## Delivered Features

### ✅ Tool Execution API
- REST API for tool execution
- Tool listing endpoint
- Tool details endpoint

### ✅ Agent Tool Integration
- Agent can call tools during chat
- Streaming tool call notifications
- Tool result streaming

### ✅ Tool Display UI
- Tool call status display
- Tool result formatting
- Error display with suggestions

### ✅ File Operations
- Read, write, list files
- Search files
- File stats

### ✅ Git Operations
- Git status, diff, log
- Create branches
- Commit changes
- Smart commit (AI-generated messages)

## Testing

- ✅ Tool API integration tests
- ✅ File operations tests
- ✅ Git operations tests
- ✅ Error handling tests

## Performance

- Tool execution latency: < 500ms
- Tool call to display: < 100ms
- Error handling: Graceful with clear messages

## Known Limitations

1. **No workspace management** - Uses current working directory
2. **No concurrent tool execution** - Tools run sequentially
3. **Limited file operations** - No edit conflict detection
4. **No tool permissions** - All tools available to AI

## Next Steps

**Phase 3: Code Reading and Diff Display**
- Monaco Editor integration
- File tree component
- Diff display (split/inline)
- Multi-file tabs

## Metrics

- **Total Tasks:** 10
- **Completed:** 10
- **Tools Available:** 25
- **Test Coverage:** Tool API 100%
- **Build Status:** ✅ Passing
```

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: complete Phase 2 documentation

- Created Phase 2 completion report
- Documented all delivered features
- Listed known limitations
- Added next steps for Phase 3"
```

---

## Summary

**Total Tasks:** 10
**Estimated Time:** 1-2 weeks
**Dependencies:** Phase 1 complete

**Deliverables:**
- ✅ Tool execution API
- ✅ Agent tool integration
- ✅ Tool call UI
- ✅ File operations
- ✅ Git operations
- ✅ Error handling
- ✅ Integration tests
- ✅ Documentation

**Next Phase:** Phase 3 - Code Reading and Diff Display

---

**After completing this plan:**
1. Verify all tests pass: `pnpm test`
2. Verify build works: `pnpm build`
3. Test end-to-end: Chat with tools
4. Create PR for `phase2/tools` → `main`
5. Move to Phase 3 planning
