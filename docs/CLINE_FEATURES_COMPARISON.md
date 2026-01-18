# Cline 功能完整对照与实施计划

本文档详细列出 Git Tutor AI 需要实现的所有 Cline 核心功能,确保我们的后端**完全具备 Cline 的能力**。

---

## 📊 功能模块对照表

### ✅ 已完成 (Phase 0-1)

| 模块 | Cline 功能 | Git Tutor AI 实现 | 状态 |
|------|-----------|------------------|------|
| **AI 提供商** | 21+ AI 提供商支持 | ✅ 21 个提供商完整实现 | 完成 |
| **Git 集成** | simple-git 包装 | ✅ GitManager + SmartCommit | 完成 |
| **GitHub 集成** | @octokit/rest | ✅ GitHubClient + AIReview | 完成 |
| **工具系统基础** | 工具注册/执行器 | ✅ ToolRegistry + ToolExecutor | 完成 |
| **Git 工具** | status/commit/branch/log/diff | ✅ 6 个 Git 工具 | 完成 |
| **GitHub 工具** | search/create_issue/create_pr/review | ✅ 5 个 GitHub 工具 | 完成 |
| **Monorepo** | Turborepo + pnpm | ✅ 完整配置 | 完成 |
| **数据库** | SQLite | ✅ Prisma + PostgreSQL | 完成 |
| **共享类型** | TypeScript 类型 | ✅ @git-tutor/shared | 完成 |

---

## 🎯 待实施核心功能 (Phase 2-3)

### 1. 错误处理和重试机制 ⭐⭐⭐

**Cline 实现:**
- `src/core/controller/` 中的统一错误处理
- 指数退避重试策略
- 可重试错误分类 (ECONNREFUSED, ETIMEDOUT, 5xx)
- 装饰器模式 `@withRetry()`

**我们需要的实现:**
```typescript
// packages/core/src/utils/retry.ts
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export function withRetry<T extends (...args: any[]) => any>(
  options: RetryOptions = {}
): MethodDecorator;
```

**应用场景:**
- AI API 调用 (所有提供商)
- GitHub API 请求
- Git 操作 (网络相关)
- MCP 服务器通信

---

### 2. 多级缓存策略 ⭐⭐⭐

**Cline 实现:**
- 模型信息缓存
- API 客户端实例缓存
- 配置缓存
- 响应缓存 (智能)

**我们需要的实现:**
```typescript
// packages/core/src/cache/cache-manager.ts
export class CacheManager<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

// 全局缓存实例
export const modelInfoCache = new CacheManager<ModelInfo>(10 * 60 * 1000);
export const providerCache = new CacheManager<any>(30 * 60 * 1000);
export const responseCache = new CacheManager<AIResponse>(5 * 60 * 1000);
```

**缓存层级:**
1. **模型信息缓存** (10分钟): 避免重复获取模型列表
2. **提供商客户端缓存** (30分钟): 复用 HTTP 客户端
3. **响应缓存** (5分钟): 相同请求的响应复用
4. **配置缓存** (Session): 环境变量和配置文件

---

### 3. 配置管理系统 ⭐⭐⭐

**Cline 实现:**
- `src/shared/ExtensionMessage.ts` 中的配置接口
- 多层配置覆盖 (默认 → 用户设置 → 工作区设置)
- 配置验证和迁移

**我们需要的实现:**
```typescript
// packages/core/src/config/configuration.ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  // ... 21 个提供商的 API key
  GITHUB_TOKEN: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  CACHE_TTL: z.coerce.number().default(300000),
});

export class ConfigurationManager {
  private env: Env;

  constructor() {
    this.load();
  }

  private load() {
    this.env = EnvSchema.parse(process.env);
    this.validateRequiredConfig();
  }

  get(key: keyof Env): any {
    return this.env[key];
  }
}
```

**配置来源优先级:**
1. 环境变量
2. `.env` 文件
3. 配置文件 (`config.json`)
4. 默认值

---

### 4. 结构化日志系统 ⭐⭐⭐

**Cline 实现:**
- `src/core/` 中的 console.log 输出
- 按模块分类的日志
- 错误堆栈跟踪

**我们需要的实现:**
```typescript
// packages/core/src/logging/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel;
  private context: string;

  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;

  private log(level: LogLevel, message: string, meta?: any): void;
}
```

**日志输出格式:**
```json
{
  "timestamp": "2025-01-07T10:30:00.000Z",
  "level": "INFO",
  "context": "AIManager",
  "message": "API call successful",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "tokens": 1234,
  "duration": 1234
}
```

---

### 5. 完整的工具系统 ⭐⭐⭐

**Cline 工具分类:**
1. **文件系统工具** (12+)
   - read_file, write_file, list_files, create_directory
   - delete_file, move_file, copy_file
   - search_files, directory_tree

2. **终端/Shell 工具** (8+)
   - run_command, execute_script
   - list_processes, kill_process
   - environment variables

3. **浏览器工具** (6+)
   - browser_search, browser_open
   - browser_navigate, browser_screenshot
   - browser_click, browser_fill

4. **Git 工具** (6) ✅ 已完成
   - git_status, git_commit, git_create_branch
   - git_smart_commit, git_log, git_diff

5. **GitHub 工具** (5) ✅ 已完成
   - github_search_repos, github_create_issue
   - github_create_pr, github_review_pr
   - github_list_issues

6. **编辑器工具** (4+)
   - apply_diff, insert_lines
   - replace_lines, delete_lines

7. **MCP 工具** (动态)
   - 通过 MCP 协议动态发现和调用

8. **诊断工具** (4+)
   - test_url, list_code_definitions
   - parse_file, get_code_context

**我们需要新增的工具:**

#### 文件系统工具
```typescript
// packages/core/src/tools/builtins/filesystem-tools.ts

const readFileTool: ToolDefinition = {
  name: "read_file",
  displayName: "读取文件内容",
  description: "读取文件的内容",
  category: "filesystem",
  parameters: [
    { name: "path", type: "string", required: true, description: "文件路径" },
    { name: "encoding", type: "string", required: false, default: "utf-8" },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const fs = await import('fs/promises');
    const content = await fs.readFile(params.path, params.encoding || 'utf-8');
    return { success: true, data: { content } };
  },
};

const writeFileTool: ToolDefinition = {
  name: "write_file",
  displayName: "写入文件",
  description: "创建新文件或覆盖现有文件",
  category: "filesystem",
  parameters: [
    { name: "path", type: "string", required: true },
    { name: "content", type: "string", required: true },
  ],
  permissions: [ToolPermission.WRITE],
  handler: async (context, params) => {
    const fs = await import('fs/promises');
    await fs.writeFile(params.path, params.content, 'utf-8');
    return { success: true, data: { message: "File written successfully" } };
  },
};

const listFilesTool: ToolDefinition = {
  name: "list_files",
  displayName: "列出目录文件",
  description: "列出目录中的文件和子目录",
  category: "filesystem",
  parameters: [
    { name: "path", type: "string", required: true },
    { name: "recursive", type: "boolean", required: false, default: false },
    { name: "pattern", type: "string", required: false },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { glob } = await import('glob');

    const files = await glob(params.pattern || '*', {
      cwd: params.path,
      recursive: params.recursive || false,
    });

    return { success: true, data: { files } };
  },
};

const searchFilesTool: ToolDefinition = {
  name: "search_files",
  displayName: "搜索文件内容",
  description: "在文件中搜索文本模式",
  category: "filesystem",
  parameters: [
    { name: "path", type: "string", required: true },
    { name: "pattern", type: "string", required: true },
    { name: "excludePatterns", type: "array", required: false },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const { grep } = await import('grep-regex');
    const results = await grep(params.pattern, params.path, {
      exclude: params.excludePatterns,
    });

    return { success: true, data: { results } };
  },
};
```

#### 终端/Shell 工具
```typescript
// packages/core/src/tools/builtins/terminal-tools.ts

const runCommandTool: ToolDefinition = {
  name: "run_command",
  displayName: "执行终端命令",
  description: "在终端执行命令并返回输出",
  category: "terminal",
  parameters: [
    { name: "command", type: "string", required: true },
    { name: "cwd", type: "string", required: false },
    { name: "env", type: "object", required: false },
    { name: "timeout", type: "number", required: false, default: 30000 },
  ],
  permissions: [ToolPermission.EXECUTE],
  handler: async (context, params) => {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const proc = spawn(params.command, [], {
        cwd: params.cwd || context.projectPath,
        shell: true,
        env: { ...process.env, ...params.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => stdout += data);
      proc.stderr.on('data', (data) => stderr += data);

      setTimeout(() => proc.kill(), params.timeout || 30000);

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          data: { stdout, stderr, exitCode: code },
        });
      });
    });
  },
};
```

#### 浏览器自动化工具
```typescript
// packages/core/src/tools/builtins/browser-tools.ts

const browserSearchTool: ToolDefinition = {
  name: "browser_search",
  displayName: "浏览器搜索",
  description: "在浏览器中执行搜索并获取结果",
  category: "browser",
  parameters: [
    { name: "query", type: "string", required: true },
    { name: "numResults", type: "number", required: false, default: 10 },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(params.query)}`);

    const results = await page.evaluate(() => {
      // 提取搜索结果
    });

    await browser.close();

    return { success: true, data: { results } };
  },
};
```

---

### 6. MCP (Model Context Protocol) 支持 ⭐⭐⭐

**Cline 实现:**
- `src/core/controller/mcp/` 完整的 MCP 服务器和客户端
- 动态工具发现和调用
- MCP 资源管理
- MCP Prompt 模板

**我们需要的实现:**

#### MCP 服务器
```typescript
// packages/core/src/mcp/server.ts
export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  // 注册工具
  registerTool(tool: MCPTool): void;

  // 注册资源
  registerResource(resource: MCPResource): void;

  // 处理请求
  async handleRequest(request: MCPRequest): Promise<MCPResponse>;

  // 启动服务器
  async start(options?: { port?: number; transport?: 'stdio' | 'sse' }): Promise<void>;

  // 停止服务器
  async stop(): Promise<void;
}
```

#### MCP 客户端
```typescript
// packages/core/src/mcp/client.ts
export class MCPClient {
  private connection: MCPConnection;

  // 连接到服务器
  async connect(serverUrl: string): Promise<void>;

  // 发现工具
  async discoverTools(): Promise<MCPTool[]>;

  // 调用工具
  async callTool(name: string, params: any): Promise<any>;

  // 获取资源
  async getResource(uri: string): Promise<MCPResource>;

  // 列出资源
  async listResources(): Promise<MCPResource[]>;
}
```

#### 内置 MCP 服务器

1. **文件系统服务器**
   - 工具: read_file, write_file, list_directory, search_files
   - 资源: file:// 协议访问本地文件

2. **Git 服务器**
   - 工具: git_status, git_log, git_diff
   - 资源: git:// 协议访问 Git 仓库

3. **GitHub 服务器**
   - 工具: search_repos, create_issue, create_pr
   - 资源: github:// 协议访问 GitHub 数据

4. **浏览器服务器**
   - 工具: browser_search, browser_navigate, browser_screenshot
   - 资源: 无

---

### 7. 流式响应和 SSE 支持 ⭐⭐

**Cline 实现:**
- `src/core/task/task.ts` 中的流式 API 调用
- gRPC streaming 消息
- 实时进度反馈

**我们需要的实现:**
```typescript
// packages/core/src/streaming/sse-manager.ts
export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();

  createConnection(id: string, response: FastifyReply): SSEConnection;
  broadcast(event: string, data: any): void;
  send(connectionId: string, event: string, data: any): void;
  close(connectionId: string): void;
  closeAll(): void;
}

// 使用示例
export async function chatStreamRoute(request: FastifyRequest) {
  const { sessionId } = request.params;
  const connection = sseManager.createConnection(sessionId, reply);

  const stream = await aiManager.chatStream(provider, messages, options);

  for await (const chunk of stream) {
    connection.send("message", {
      text: chunk.text,
      done: chunk.done,
    });
  }

  connection.send("done", {});
}
```

---

### 8. 上下文管理系统 ⭐⭐⭐

**Cline 实现:**
- `src/core/context/` 完整的上下文管理
- 消息压缩和 Token 优化
- 上下文窗口管理
- 智能上下文选择

**我们需要的实现:**
```typescript
// packages/core/src/context/context-manager.ts
export class ContextManager {
  private messages: Message[] = [];
  private maxTokens: number = 200000;
  private compressionThreshold: number = 0.8;

  // 添加消息
  addMessage(message: Message): void;

  // 压缩上下文
  async compress(options?: {
    retainSystem?: boolean;
    retainLatest?: number;
    summarize?: boolean;
  }): Promise<Message[]>;

  // 获取上下文
  getContext(): Message[];

  // 估算 Token
  estimateTokens(messages: Message[]): number;

  // 清理旧消息
  cleanup(): void;
}

// 智能上下文选择
export class ContextSelector {
  // 根据任务选择相关上下文
  selectRelevantContext(
    task: string,
    availableContext: ContextItem[]
  ): ContextItem[];

  // 根据文件选择相关代码
  selectRelevantFiles(
    task: string,
    files: FileNode[]
  ): FileNode[];
}
```

---

### 9. 状态管理和持久化 ⭐⭐

**Cline 实现:**
- `src/core/state/` 多级状态管理
- `workspaceStorage` 持久化到 VS Code storage
- `stateManager` 全局状态管理

**我们需要的实现:**
```typescript
// packages/core/src/state/state-manager.ts
export class StateManager {
  private state: Map<string, any> = new Map();
  private persistence: StatePersistence;

  // 设置状态
  set(key: string, value: any): void;

  // 获取状态
  get(key: string): any;

  // 批量更新
  update(updates: Record<string, any>): void;

  // 持久化
  async persist(): Promise<void>;

  // 恢复
  async restore(): Promise<void>;

  // 清除
  clear(): void;
}

// 持久化层
export class StatePersistence {
  async save(key: string, value: any): Promise<void>;
  async load(key: string): Promise<any>;
  async delete(key: string): Promise<void>;
  async list(): Promise<string[]>;
}
```

---

### 10. 依赖注入容器 ⭐⭐

**Cline 实现:**
- 构造函数注入
- 单例模式
- 服务定位器

**我们需要的实现:**
```typescript
// packages/core/src/di/container.ts
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  register<T>(name: string, factory: () => T): void;
  registerSingleton<T>(name: string, instance: T): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;

  // 作用域
  createScope(): ServiceScope;
}

export class ServiceScope {
  private services: Map<string, any> = new Map();

  register<T>(name: string, factory: () => T): void;
  resolve<T>(name: string): T;
  dispose(): void;
}

// 全局容器
export const container = new ServiceContainer();

// 初始化服务
export function initializeServices() {
  container.registerSingleton("aiManager", aiManager);
  container.registerSingleton("gitManager", gitManager);
  container.registerSingleton("githubClient", githubClient);
  container.registerSingleton("toolExecutor", toolExecutor);
  container.registerSingleton("cacheManager", cacheManager);
  container.registerSingleton("logger", logger);
  container.registerSingleton("stateManager", stateManager);
  container.registerSingleton("mcpServer", mcpServer);
}
```

---

### 11. 任务执行引擎 ⭐⭐⭐

**Cline 实现:**
- `src/core/task/` 完整的任务执行系统
- `Task` 类管理整个任务生命周期
- 工具调用和结果处理
- 错误恢复和重试

**我们需要的实现:**
```typescript
// packages/core/src/task/task.ts
export class Task {
  private id: string;
  private type: TaskType;
  private status: TaskStatus;
  private messages: Message[] = [];

  // 执行任务
  async execute(options?: TaskOptions): Promise<TaskResult>;

  // 暂停任务
  pause(): void;

  // 恢复任务
  resume(): void;

  // 取消任务
  cancel(): void;

  // 获取进度
  getProgress(): TaskProgress;
}

// 任务管理器
export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  // 创建任务
  createTask(type: TaskType, options: TaskOptions): Task;

  // 获取任务
  getTask(id: string): Task | undefined;

  // 列出任务
  listTasks(): Task[];

  // 清理完成的任务
  cleanup(): void;
}
```

---

### 12. 代码分析工具 ⭐⭐

**Cline 实现:**
- `src/core/tools/code-analysis.ts`
- Tree-sitter AST 解析
- 代码定义提取
- 语法高亮

**我们需要的实现:**
```typescript
// packages/core/src/tools/builtins/code-analysis-tools.ts

const listCodeDefinitionsTool: ToolDefinition = {
  name: "list_code_definitions",
  displayName: "列出代码定义",
  description: "列出文件中的函数、类、方法等代码定义",
  category: "code-analysis",
  parameters: [
    { name: "path", type: "string", required: true },
    { name: "language", type: "string", required: false },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const { parseCode } = await import('tree-sitter-wasms');
    const definitions = await parseCode(params.path, params.language);

    return { success: true, data: { definitions } };
  },
};

const parseFileTool: ToolDefinition = {
  name: "parse_file",
  displayName: "解析文件",
  description: "解析文件并提取语法树",
  category: "code-analysis",
  parameters: [
    { name: "path", type: "string", required: true },
  ],
  permissions: [ToolPermission.READ],
  handler: async (context, params) => {
    const Parser = await import('web-tree-sitter');
    await Parser.init();

    const parser = new Parser();
    const { Language } = await import('tree-sitter-wasms');

    const language = await Language.load(params.language);
    parser.setLanguage(language);

    const tree = parser.parse(params.content);

    return { success: true, data: { tree: tree.rootNode } };
  },
};
```

---

### 13. 监控和度量系统 ⭐

**Cline 实现:**
- 基础的性能监控
- Token 使用统计

**我们需要的实现:**
```typescript
// packages/core/src/metrics/metrics-collector.ts
export class MetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();

  // 记录 API 调用
  recordApiCall(provider: string, model: string, tokens: number): void;

  // 记录工具执行
  recordToolExecution(toolName: string, duration: number, success: boolean): void;

  // 记录缓存命中率
  recordCacheHit(cacheName: string, hit: boolean): void;

  // 记录任务执行
  recordTaskExecution(taskType: string, duration: number, success: boolean): void;

  // 获取所有指标
  getMetrics(): Record<string, any>;

  // 重置指标
  reset(): void;
}

// 全局度量收集器
export const metrics = new MetricsCollector();
```

---

### 14. API 路由和中间件 ⭐⭐

**Cline 实现:**
- gRPC 服务和方法
- 请求/响应处理

**我们需要的实现:**
```typescript
// services/api/src/middleware/
export const validationMiddleware = async (request, reply) => {
  // 验证请求体
  if (request.body) {
    await request.json();
  }
};

export const authMiddleware = async (request, reply) => {
  // 验证授权
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    reply.status(401).send({ success: false, error: "Unauthorized" });
    return;
  }
};

export const errorHandlerMiddleware = async (error, request, reply) => {
  // 统一错误处理
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

export const responseFormatterMiddleware = async (request, reply, payload) => {
  // 统一响应格式
  if (payload && typeof payload === "object") {
    if (!("success" in payload)) {
      reply.sent = {
        success: true,
        data: payload,
        timestamp: new Date().toISOString(),
      };
    }
  }
};

// services/api/src/routes/
// - health.ts
// - auth.ts
// - projects.ts
// - conversations.ts
// - tools.ts
// - git.ts
// - github.ts
// - ai.ts
// - websocket.ts (SSE 流式响应)
```

---

## 🎯 实施优先级

### Phase 2: 基础设施完善 (1-2周)
**高优先级 - 必须实现:**
1. ✅ 错误处理和重试机制
2. ✅ 多级缓存策略
3. ✅ 配置管理系统 (Zod)
4. ✅ 结构化日志系统
5. ✅ 依赖注入容器

### Phase 3: 核心功能扩展 (2-3周)
**高优先级 - 核心功能:**
6. ✅ 完整的工具系统 (File/Shell/Browser/Code)
7. ✅ MCP 协议支持 (服务器 + 客户端)
8. ✅ 流式响应和 SSE 支持
9. ✅ 上下文管理系统 (消息压缩)
10. ✅ 状态管理和持久化

### Phase 4: 任务执行和优化 (1-2周)
**中优先级 - 优化体验:**
11. ✅ 任务执行引擎
12. ✅ 监控和度量系统
13. ✅ API 路由重组和中间件

### Phase 5: 前端开发 (3-4周)
14. ⏳ React + Vite 应用框架
15. ⏳ UI 组件和页面
16. ⏳ WebSocket/SSE 集成
17. ⏳ 状态管理 (Zustand)

---

## 📝 总结

要使 Git Tutor AI **完全具备 Cline 的功能**,我们需要:

### 已完成 (Phase 0-1)
- ✅ 21 个 AI 提供商支持
- ✅ Git 和 GitHub 集成
- ✅ 基础工具系统 (11 个工具)

### 待实施 (Phase 2-5)
- ⏳ **基础设施**: 重试/缓存/配置/日志/依赖注入
- ⏳ **核心功能**: 完整工具系统 (50+ 工具)/MCP/流式响应/上下文管理
- ⏳ **任务系统**: 任务执行引擎/状态管理
- ⏳ **监控系统**: 度量收集/性能监控
- ⏳ **前端应用**: React + Vite + WebSocket

**总计需要实现:**
- 13 个主要功能模块
- 50+ 个工具
- 完整的 MCP 协议支持
- 任务执行引擎
- 前端应用

**预计时间:** 8-11 周 (假设每周 40 小时开发时间)
