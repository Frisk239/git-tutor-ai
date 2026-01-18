# Git Tutor AI Web 应用完整设计方案

**日期：** 2025-01-18
**版本：** v1.0
**状态：** ✅ 已确认

---

## 📋 需求总结

### 产品定位
**项目管理协作平台 + Cline Web 版克隆**

### 核心需求
1. **交互方式：** 以 Chat UI 为中心
2. **代码编辑：** 仅展示 Diff，不提供编辑
3. **部署架构：** 单体应用（All-in-One）
4. **用户系统：** 单用户起步，预留扩展
5. **核心能力：**
   - 文件操作和终端工具
   - Git 操作和版本控制
   - GitHub 集成
   - 浏览器自动化
6. **实时通信：** 必需（Streaming 响应）
7. **架构方案：** 后端主导（后端管理 Agent）
8. **文件系统：** 客户端本地存储（File System Access API）
9. **界面布局：** 三栏布局（文件树 + 代码 + 聊天）
10. **GitHub 浏览：** 独立浏览页面

---

## 🏗️ 整体架构

### 三层单体架构

```
┌─────────────────────────────────────────┐
│         前端层 (apps/web)                │
│  React + Vite + shadcn/ui + Monaco      │
│  - 聊天界面（Chat UI）                   │
│  - 代码阅读器（Monaco Editor）           │
│  - GitHub 浏览器                         │
│  - 设置页面                              │
└─────────────┬───────────────────────────┘
              │ WebSocket + REST API
┌─────────────▼───────────────────────────┐
│         后端层 (services/api)            │
│  Fastify + WebSocket + TypeScript       │
│  - Agent 执行引擎                        │
│  - 工具管理                              │
│  - 会话管理                              │
│  - WebSocket 服务                        │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         核心层 (packages)                │
│  - core: Agent, Tools, AI, Git/GitHub   │
│  - db: Prisma + PostgreSQL              │
│  - shared: Types, Utils                 │
└─────────────────────────────────────────┘
```

### 通信流程

1. 用户在 Chat UI 输入消息
2. 前端通过 WebSocket 发送到后端
3. 后端 Agent 执行（调用 AI、执行工具）
4. 后端通过 WebSocket 流式返回结果
5. 前端实时更新 UI

---

## 🎨 前端架构

### 技术栈
- **React 18 + Vite + TypeScript**
- **shadcn/ui + TailwindCSS**（美观且快速开发）
- **React Router v6**（路由管理）
- **TanStack Query**（数据获取和缓存）
- **Zustand**（轻量级状态管理）
- **Monaco Editor**（代码阅读和 Diff 显示）
- **File System Access API**（本地文件系统访问）

### 页面结构

```
apps/web/
├── /                          # 首页（重定向到 /chat）
├── /chat                      # 主聊天页面（三栏布局）
│   ├── 左侧：文件树面板
│   ├── 中间：代码阅读面板
│   └── 右侧：聊天面板
├── /github                    # GitHub 浏览页面
├── /settings                  # 设置页面
└── /history                   # 历史记录
```

### 核心组件

1. **ChatPanel（聊天面板）**
   - 消息列表（支持 Markdown、代码高亮）
   - 流式输出（打字机效果）
   - 工具调用状态显示
   - 输入框（支持多行、文件拖拽）

2. **FileTreePanel（文件树面板）**
   - 可展开/折叠的文件树
   - 切换本地/GitHub 模式
   - 点击文件打开代码阅读器

3. **CodeReaderPanel（代码阅读面板）**
   - Monaco Editor（只读模式）
   - Diff 显示（split/inline）
   - 语法高亮、行号
   - 文件标签页（支持多文件）

4. **GitHubBrowser（GitHub 浏览器）**
   - 搜索仓库（按名称/语言/星标）
   - 仓库卡片（显示 star/fork/描述）
   - 仓库详情页（README、文件列表）
   - 一键克隆（保存到本地）

5. **SettingsPage（设置页面）**
   - AI Provider 选择和 API Key
   - GitHub Token 配置
   - 模型参数（temperature、max_tokens）
   - 本地存储目录配置

---

## ⚙️ 后端架构

### 技术栈
- **Fastify + TypeScript**（高性能 Web 框架）
- **WebSocket**（实时双向通信，使用 `fastify-websocket`）
- **Zod**（请求/响应验证）
- **Prisma ORM**（数据库访问）
- **PostgreSQL**（数据持久化）

### 服务结构

```
services/api/
├── src/
│   ├── server.ts              # Fastify 服务器入口
│   ├── websocket/             # WebSocket 处理
│   ├── routes/                # REST API 路由
│   │   ├── chat.ts            # 聊天相关
│   │   ├── projects.ts        # 项目管理
│   │   ├── files.ts           # 文件操作
│   │   ├── git.ts             # Git 操作
│   │   ├── github.ts          # GitHub API
│   │   ├── settings.ts        # 设置管理
│   │   └── browser.ts         # 浏览器自动化
│   ├── services/              # 业务逻辑层
│   │   ├── agent.service.ts   # Agent 执行服务
│   │   ├── session.service.ts # 会话管理
│   │   ├── file.service.ts    # 文件服务
│   │   └── github.service.ts  # GitHub API 服务
│   └── middleware/            # 中间件
│       ├── auth.ts            # 认证
│       ├── error.ts           # 错误处理
│       └── validation.ts      # 请求验证
```

### API 端点设计

```typescript
// REST API
POST   /api/chat/sessions          # 创建新会话
GET    /api/chat/sessions          # 获取会话列表
GET    /api/chat/sessions/:id      # 获取会话详情
DELETE /api/chat/sessions/:id      # 删除会话

POST   /api/projects               # 创建项目
GET    /api/projects               # 获取项目列表
GET    /api/projects/:id           # 获取项目详情

POST   /api/files/read             # 读取文件
POST   /api/files/list             # 列出目录
POST   /api/files/diff             # 显示文件差异

POST   /api/git/status             # Git 状态
POST   /api/git/commit             # Git 提交
POST   /api/git/branch             # 分支管理
POST   /api/git/smart-commit       # AI 智能提交

POST   /api/github/search          # 搜索仓库
POST   /api/github/clone           # 克隆仓库
GET    /api/github/repos/:owner/:name  # 获取仓库详情

POST   /api/browser/launch         # 启动浏览器
POST   /api/browser/action         # 浏览器操作

GET    /api/settings               # 获取设置
PUT    /api/settings               # 更新设置
```

### WebSocket 协议

```typescript
// 客户端 → 服务器
type ClientMessage =
  | { type: 'chat.send', sessionId: string, content: string }
  | { type: 'chat.cancel', sessionId: string }
  | { type: 'file.open', projectId: string, path: string }

// 服务器 → 客户端
type ServerMessage =
  | { type: 'chat.delta', sessionId: string, content: string }
  | { type: 'chat.tool_call', sessionId: string, tool: string }
  | { type: 'chat.tool_result', sessionId: string, result: object }
  | { type: 'chat.complete', sessionId: string, message: Message }
  | { type: 'chat.error', sessionId: string, error: string }
```

### Agent 执行流程

1. 接收用户消息（WebSocket）
2. 创建/恢复会话（数据库）
3. 执行 Agent（packages/core）
4. 流式返回结果（WebSocket）
5. 持久化会话和消息

---

## 🗄️ 数据模型

### Prisma Schema

```prisma
// 用户表（单用户模式）
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  projects      Project[]
  settings      UserSettings?
}

// 用户设置
model UserSettings {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])

  // AI 配置（加密存储）
  aiProvider    String    @default("anthropic")
  aiApiKey      String?
  aiModel       String    @default("claude-sonnet-4-5-20250929")
  aiTemperature Float?    @default(0.7)
  aiMaxTokens   Int?      @default(8192)

  // GitHub 配置（加密存储）
  githubToken   String?
  githubUsername String?

  // 系统设置
  localWorkDir  String?
  theme         String    @default("light")
  language      String    @default("zh-CN")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// 聊天会话
model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  title         String
  model         String
  status        String    @default("active")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  messages      Message[]
  projectId     String?
  project       Project?  @relation(fields: [projectId], references: [id])
}

// 消息
model Message {
  id            String    @id @default(cuid())
  sessionId     String
  session       Session   @relation(fields: [sessionId], references: [id])

  role          String    // user, assistant, system, tool
  content       String    @db.Text
  toolCalls     Json?
  toolCallId    String?

  createdAt     DateTime  @default(now())

  @@index([sessionId])
}

// 项目
model Project {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  name          String
  type          String    // local, github

  // 本地项目
  localPath     String?

  // GitHub 项目
  githubOwner   String?
  githubRepo    String?
  githubBranch  String?   @default("main")

  status        String    @default("active")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
}

// GitHub 仓库缓存
model GitHubRepoCache {
  id            String    @id @default(cuid())

  owner         String
  repo          String
  fullName      String

  description   String?
  language      String?
  stars         Int       @default(0)
  forks         Int       @default(0)

  lastFetchedAt DateTime  @default(now())

  @@unique([owner, repo])
}
```

---

## 🔒 安全性设计

### API Key 加密存储

```typescript
// AES-256-GCM 加密
export class EncryptionService {
  static encrypt(text: string): string
  static decrypt(encrypted: string): string
}
```

### File System Access API 安全性

- 用户授权机制
- 权限验证
- IndexedDB 安全存储

### 请求验证

- Zod Schema 验证
- 错误处理中间件
- CORS 和 CSP 配置

---

## 🧪 测试策略

### 测试金字塔

```
           E2E 测试 (15%)
          ┌─────────────┐
         │  集成测试 (35%) │
        │               │
       │   单元测试 (50%)  │
      │                   │
     └─────────────────────┘
```

### 测试目标

- **单元测试：** 核心逻辑覆盖率 ≥ 80%
- **集成测试：** API 覆盖率 ≥ 70%
- **E2E 测试：** 关键流程覆盖率 ≥ 60%

### 测试工具

- **Vitest**（单元测试）
- **Supertest**（API 测试）
- **Playwright**（E2E 测试）
- **k6**（性能测试）

---

## 📅 实施计划

### 阶段 0：基础修复（Week 0）
- 修复 TypeScript 配置
- 验证测试套件
- 设置 CI/CD

### 阶段 1：MVP - 聊天基础（Week 1-2）
- 实现基本聊天功能
- WebSocket 流式响应
- 会话管理

### 阶段 2：工具系统（Week 3-4）
- 文件操作工具
- Git 工具
- 工具调用状态显示

### 阶段 3：代码阅读和 Diff（Week 5-6）
- Monaco Editor 集成
- 文件树组件
- Diff 显示

### 阶段 4：GitHub 集成（Week 7-8）
- GitHub 浏览页面
- 仓库搜索和克隆
- File System Access API

### 阶段 5：设置和配置（Week 9-10）
- 设置页面
- API Key 管理
- 配置验证

### 阶段 6：浏览器自动化（Week 11-12）
- Puppeteer 集成
- 浏览器控制
- 实时截图

### 阶段 7：完善和优化（Week 13-14）
- UI/UX 优化
- 性能优化
- 测试补充

### 阶段 8：部署和文档（Week 15-16）
- 生产部署
- 文档编写
- 演示视频

---

## ⚠️ 风险和挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| File System Access API 兼容性 | 高 | 提供 Server 端存储作为备选 |
| WebSocket 连接稳定性 | 中 | 实现重连机制和心跳检测 |
| AI API 成本 | 中 | 实现请求缓存和使用限制 |
| 浏览器自动化性能 | 低 | 使用无头模式，限制并发 |
| 数据库性能 | 低 | 添加索引，使用连接池 |

---

## ✅ 验收标准

### 功能完整性
- ✅ 支持多种 AI Provider（20+）
- ✅ 完整的 Git 操作工具
- ✅ GitHub 浏览和克隆
- ✅ 文件操作和终端工具
- ✅ 浏览器自动化
- ✅ 流式响应
- ✅ 代码阅读和 Diff 显示

### 性能指标
- WebSocket 延迟 < 100ms
- 页面首次加载 < 2s
- AI 响应首字 < 1s
- 文件读取 < 500ms

### 质量指标
- 单元测试覆盖率 ≥ 80%
- 集成测试覆盖率 ≥ 70%
- E2E 测试覆盖率 ≥ 60%
- 无 P0/P1 级别的 Bug

---

## 📚 参考资料

- [Cline VS Code 扩展](https://github.com/alludeadvsdcline)
- [Fastify 文档](https://fastify.dev/)
- [React 文档](https://react.dev/)
- [Monaco Editor 文档](https://microsoft.github.io/monaco-editor/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

---

**设计确认：** ✅ 2025-01-18
**下一步：** 创建详细实施计划
