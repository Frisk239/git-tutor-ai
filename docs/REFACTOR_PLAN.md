# Git Tutor AI - 项目重构计划

> **项目目标**: 打造一个 Web 版或 Windows 桌面版的智能开发平台，集成 Git/GitHub 操作、AI 对话助手、代码分析等核心功能，并支持本地项目导入分析。

> **基于项目**:
> - 功能参考: git-ai-core (早期实现，架构不成熟，Python 性能瓶颈)
> - 架构参考: Cline (业内优秀编程 Agent，VS Code 扩展)

---

## 📋 目录

- [一、项目愿景](#一项目愿景)
- [二、技术栈选型](#二技术栈选型)
- [三、功能需求分析](#三功能需求分析)
- [四、架构设计](#四架构设计)
- [五、核心模块重构方案](#五核心模块重构方案)
- [六、开发路线图](#六开发路线图)
- [七、技术挑战与解决方案](#七技术挑战与解决方案)
- [八、Cline 深度分析技术细节](#八cline-深度分析技术细节) ⭐ **新增**

---

## 一、项目愿景

### 1.1 核心价值主张

打造一个**全栈 AI 驱动的开发助手平台**，融合以下能力：

- **Git/GitHub 深度集成**: 仓库管理、代码审查、智能提交、协作分析
- **AI 对话助手**: 类似 Cline 的智能编程助手，支持多模型切换
- **代码分析引擎**: 支持 AST 解析、依赖分析、架构理解
- **本地项目导入**: 无需 .git 目录即可分析任意代码项目
- **跨平台部署**: Web 应用 + 桌面客户端 (Electron/Tauri)

### 1.2 与参考项目的关系

| 特性 | git-ai-core | Cline | Git Tutor AI (目标) |
|------|-------------|-------|---------------------|
| **部署形态** | Web 应用 | VS Code 扩展 | Web + 桌面应用 |
| **技术栈** | Python + React | TypeScript (Node.js) | TypeScript (全栈) |
| **Git 集成** | ✅ 基础操作 | ✅ 深度集成 | ✅ 完整 Git 工作流 |
| **AI 能力** | ✅ 对话分析 | ✅ 强大工具生态 | ✅ 增强版工具系统 |
| **代码分析** | ⚠️ 基础 | ✅ AST + Tree-sitter | ✅ 增强版分析引擎 |
| **GitHub 集成** | ✅ 搜索推荐 | ❌ 无 | ✅ 完整 GitHub API |
| **本地项目导入** | ❌ 仅 Git 仓库 | ✅ 工作区分析 | ✅ 任意目录分析 |
| **性能** | ⚠️ Python 异步瓶颈 | ✅ Node.js 高性能 | ✅ 优化后的 Node.js |

---

## 二、技术栈选型

### 2.1 整体架构原则

基于以下原则选择技术栈：

1. **统一技术栈**: 全栈 TypeScript，减少上下文切换
2. **高性能优先**: 避免 Python 异步性能瓶颈，使用 Node.js
3. **可移植性**: 支持 Web 和桌面端双部署
4. **现代化**: 采用最新的框架和工具链

### 2.2 技术栈对比

#### 方案 A: TypeScript 全栈 (推荐 ⭐⭐⭐⭐⭐)

**前端**:
- React 18 + TypeScript
- Zustand (轻量状态管理) 或 Redux Toolkit
- React Query (服务端状态)
- TailwindCSS 4 + HeroUI / shadcn/ui
- Monaco Editor (代码编辑器)

**后端**:
- Node.js 20+ + TypeScript
- Fastify (高性能 Web 框架) 或 Hono (轻量级)
- tRPC (端到端类型安全) 或 GraphQL
- Prisma (类型安全 ORM)
- PostgreSQL (生产) / SQLite (开发)

**核心库**:
- simple-git (Git 操作)
- tree-sitter-wasms (AST 解析)
- zod (运行时类型验证)
- ws (WebSocket 通信)
- bull (任务队列)

**优势**:
- ✅ 全栈类型安全
- ✅ 代码复用率高 (前后端共享类型)
- ✅ 高性能 (V8 引擎)
- ✅ 生态成熟
- ✅ 易于维护

**劣势**:
- ⚠️ Python AI 库需通过 API 或子进程调用

#### 方案 B: Bun 全栈 (激进选择 ⭐⭐⭐⭐)

**优势**:
- ✅ 更快的性能 (比 Node.js 快 3-4 倍)
- ✅ 原生 TypeScript 支持
- ✅ 内置测试、打包、热重载
- ✅ 兼容 Node.js 生态

**劣势**:
- ⚠️ 生态相对较新
- ⚠️ 部分原生模块兼容性问题

#### 方案 C: 混合架构 Python + Node.js (保守方案 ⭐⭐)

**后端**:
- Python FastAPI (AI 分析服务)
- Node.js (Git 操作、文件处理、WebSocket)

**优势**:
- ✅ 可复用 Python AI 生态

**劣势**:
- ❌ 架构复杂度增加
- ❌ 跨语言通信开销
- ❌ 部署复杂度提升

### 2.3 最终选型: TypeScript 全栈

```
┌─────────────────────────────────────────────────────────┐
│                   Git Tutor AI                          │
├─────────────────────────────────────────────────────────┤
│  前端 (Web + Electron/Tauri)                            │
│  ├─ React 18 + TypeScript                               │
│  ├─ Zustand + React Query                               │
│  ├─ TailwindCSS + shadcn/ui                             │
│  └─ Monaco Editor                                        │
├─────────────────────────────────────────────────────────┤
│  通信层                                                  │
│  ├─ REST API (tRPC/GraphQL)                             │
│  ├─ WebSocket (实时通信)                                │
│  └─ Server-Sent Events (流式响应)                        │
├─────────────────────────────────────────────────────────┤
│  后端 (Node.js + TypeScript)                            │
│  ├─ Fastify/Hono (Web 框架)                             │
│  ├─ Prisma + PostgreSQL                                 │
│  ├─ simple-git (Git 操作)                               │
│  ├─ tree-sitter (代码分析)                              │
│  ├─ MCP Client/Server                                   │
│  ├─ AI Provider Manager                                 │
│  └─ Bull (任务队列)                                      │
├─────────────────────────────────────────────────────────┤
│  外部服务                                                │
│  ├─ OpenAI / Anthropic / Gemini (AI 模型)              │
│  ├─ GitHub API                                          │
│  ├─ MCP Servers (工具扩展)                              │
│  └─ File System / Git Repositories                      │
└─────────────────────────────────────────────────────────┘
```

---

## 三、功能需求分析

### 3.1 核心功能模块

#### 模块 1: AI 对话助手 ⭐⭐⭐⭐⭐

**功能描述**:
类似 Cline 的智能编程对话系统，支持多模型、工具调用、流式响应。

**核心能力**:
- 多 AI 提供商支持 (OpenAI, Anthropic, Gemini, DeepSeek, 等)
- 流式响应 (SSE / WebSocket)
- 多轮对话上下文管理
- 智能工具调用
- 任务中断与恢复
- 系统提示词管理

**参考实现**:
- `cline/src/core/task/` - 任务执行引擎
- `cline/src/core/prompts/` - 系统提示词
- `cline/src/integrations/ai/` - AI 提供商

**新增需求**:
- 支持本地 LLM (Ollama, LM Studio)
- 多会话并发支持
- 对话历史持久化与搜索

#### 模块 2: Git 深度集成 ⭐⭐⭐⭐⭐

**功能描述**:
完整的 Git 工作流支持，超越简单的命令封装。

**核心能力**:
- 仓库管理 (克隆、初始化、删除)
- 分支管理 (创建、切换、合并、对比)
- 提交管理 (查看、创建、 Amend、 Cherry-pick)
- 差异分析 (文件对比、暂存区对比)
- 历史查询 (提交日志、Blame、Bisect)
- 远程操作 (Fetch, Pull, Push)
- 冲突解决辅助

**参考实现**:
- `cline/src/utils/git.ts` - Git 工具函数
- `git-ai-core/backend/app/core/git_manager.py` - Git 管理器

**新增需求**:
- 智能提交消息生成 (AI 驱动)
- 可视化分支图
- 交互式 Rebase
- Submodule 管理
- LFS 支持
- 性能优化 (大型仓库处理)

#### 模块 3: GitHub 集成 ⭐⭐⭐⭐

**功能描述**:
与 GitHub 平台的深度集成，支持完整的社交化开发流程。

**核心能力**:
- 仓库搜索与发现
- Issue / PR 管理 (查看、创建、评论)
- 代码审查 (PR Review)
- Actions 工作流监控
- Release 管理
- Gist 管理
- 组织与团队管理
- Webhook 处理

**参考实现**:
- `git-ai-core/backend/app/api/routes/github.py` - GitHub API 集成
- `git-ai-core/backend/app/services/github_service.py` - GitHub 服务

**新增需求**:
- 多账号支持
- 实时通知 (WebSocket Webhook)
- PR 模板支持
- GitHub Actions 日志查看
- Dependabot 集成

#### 模块 4: 代码分析引擎 ⭐⭐⭐⭐

**功能描述**:
深度代码分析，支持多语言 AST 解析、依赖分析、架构理解。

**核心能力**:
- 多语言 AST 解析 (基于 Tree-sitter)
- 定义/引用跳转
- 依赖关系分析
- 代码复杂度计算
- 架构可视化
- 代码 smell 检测
- 安全漏洞扫描

**参考实现**:
- `cline/src/services/tree-sitter/` - AST 解析
- `cline/src/integrations/code-map/` - 代码映射

**新增需求**:
- 增量分析 (仅分析变更文件)
- 并行解析 (多文件并发)
- 缓存机制 (分析结果缓存)
- 自定义规则引擎
- 报告生成 (HTML/PDF/Markdown)

#### 模块 5: 本地项目导入 ⭐⭐⭐⭐⭐ (新功能)

**功能描述**:
无需 .git 目录即可分析任意本地代码项目。

**核心能力**:
- 目录扫描与索引
- 文件类型识别
- 项目结构分析
- 配置文件检测 (package.json, requirements.txt, 等)
- 依赖解析
- 元数据提取

**技术方案**:
```typescript
// 项目扫描器
class ProjectScanner {
  async scanProject(path: string): Promise<ProjectInfo> {
    // 1. 识别项目类型 (通过配置文件)
    // 2. 扫描文件结构
    // 3. 提取元数据
    // 4. 建立索引
  }
}
```

**优势**:
- 支持分析任意代码库
- 快速原型探索
- 代码学习工具

#### 模块 6: MCP 协议支持 ⭐⭐⭐⭐

**功能描述**:
Model Context Protocol 支持，动态扩展工具能力。

**核心能力**:
- MCP Server 发现与加载
- 工具自动注册
- 资源管理
- 提示词模板
- 生命周期管理

**参考实现**:
- `cline/src/integrations/mcp/` - MCP 集成

**新增需求**:
- HTTP/WebSocket 传输 (替代 stdio)
- Server Marketplace (工具商店)
- 自定义 Server 配置
- 权限管理

#### 模块 7: 任务调度系统 ⭐⭐⭐

**功能描述**:
异步任务处理，支持长时间运行的任务。

**核心能力**:
- 任务队列 (基于 Bull)
- 定时任务
- 任务优先级
- 失败重试
- 进度追踪
- 任务取消

**使用场景**:
- 大型仓库克隆
- 代码全量分析
- 批量操作
- 定期同步

#### 模块 8: 用户与权限管理 ⭐⭐⭐

**功能描述**:
多用户支持，权限控制，团队协作。

**核心能力**:
- 用户认证 (JWT / OAuth)
- 角色权限管理
- 项目访问控制
- 审计日志
- 团队协作

---

## 四、架构设计

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web 应用     │  │ Electron 应用│  │ 移动端 (未来) │          │
│  │ (React)      │  │ (桌面端)     │  │ (React Native)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket + REST
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         API 网关层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 认证中间件   │  │ 限流中间件   │  │ 日志中间件   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         业务服务层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI 对话服务  │  │ Git 服务     │  │ GitHub 服务  │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ 代码分析服务 │  │ 项目管理服务 │  │ 用户服务     │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ MCP 服务     │  │ 任务调度服务 │  │ 通知服务     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         核心引擎层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI Provider  │  │ Tool Executor│  │ Git Engine   │          │
│  │ Manager      │  │              │  │              │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ Prompt       │  │ MCP Client   │  │ Tree-sitter  │          │
│  │ Builder      │  │              │  │ Engine       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         数据层                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │ Redis        │  │ 文件系统     │          │
│  │ (主数据)     │  │ (缓存)       │  │ (项目文件)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         外部服务集成                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ OpenAI API   │  │ GitHub API   │  │ MCP Servers  │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ Anthropic API│  │ Git Repos    │  │ 本地 LLM     │          │
│  ├──────────────┤  ├──────────────┤  └──────────────┘          │
│  │ Gemini API   │  │ File System  │                                 │
│  └──────────────┘  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 目录结构设计

```
git-tutor-ai/
├── apps/
│   ├── web/                      # Web 应用 (React)
│   │   ├── src/
│   │   │   ├── components/       # UI 组件
│   │   │   │   ├── chat/         # 对话界面
│   │   │   │   ├── git/          # Git 操作界面
│   │   │   │   ├── github/       # GitHub 界面
│   │   │   │   ├── project/      # 项目管理界面
│   │   │   │   └── analysis/     # 代码分析界面
│   │   │   ├── hooks/            # React Hooks
│   │   │   ├── stores/           # Zustand 状态管理
│   │   │   ├── services/         # API 客户端
│   │   │   └── utils/            # 工具函数
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── desktop/                  # 桌面应用 (Electron/Tauri)
│       ├── src/
│       │   ├── main/             # 主进程
│       │   └── renderer/         # 渲染进程 (复用 web/)
│       └── package.json
│
├── packages/
│   ├── api/                      # API 定义与客户端
│   │   ├── src/
│   │   │   ├── routers/          # API 路由定义
│   │   │   ├── validators/       # Zod 验证器
│   │   │   └── client/           # 自动生成客户端
│   │   └── package.json
│   │
│   ├── db/                       # 数据库层 (Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 数据库模型
│   │   │   └── migrations/       # 迁移文件
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── core/                     # 核心业务逻辑
│   │   ├── src/
│   │   │   ├── ai/               # AI 引擎
│   │   │   │   ├── providers/    # AI 提供商
│   │   │   │   ├── prompts/      # 系统提示词
│   │   │   │   └── task/         # 任务执行
│   │   │   ├── git/              # Git 引擎
│   │   │   │   ├── git-manager.ts
│   │   │   │   ├── operations/   # Git 操作
│   │   │   │   └── utils.ts
│   │   │   ├── tools/            # 工具系统
│   │   │   │   ├── executor.ts
│   │   │   │   ├── registry.ts
│   │   │   │   └── definitions/
│   │   │   ├── analysis/         # 代码分析
│   │   │   │   ├── tree-sitter/
│   │   │   │   ├── dependency-parser/
│   │   │   │   └── complexity-analyzer/
│   │   │   ├── mcp/              # MCP 协议
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── transport/
│   │   │   └── github/           # GitHub 集成
│   │   │       ├── api.ts
│   │   │       ├── webhook.ts
│   │   │       └── search/
│   │   └── package.json
│   │
│   ├── shared/                   # 共享代码
│   │   ├── src/
│   │   │   ├── types/            # TypeScript 类型
│   │   │   ├── constants/        # 常量
│   │   │   ├── utils/            # 工具函数
│   │   │   └── schemas/          # Zod schemas
│   │   └── package.json
│   │
│   └── config/                   # 配置管理
│       ├── src/
│       │   ├── app.config.ts     # 应用配置
│       │   ├── ai.config.ts      # AI 配置
│       │   └── mcp.config.ts     # MCP 配置
│       └── package.json
│
├── services/
│   └── api/                      # 后端 API 服务
│       ├── src/
│       │   ├── server.ts         # 服务器入口
│       │   ├── middlewares/      # 中间件
│       │   ├── routes/           # 路由处理器
│       │   ├── services/         # 业务服务
│       │   ├── jobs/             # 后台任务
│       │   └── workers/          # 任务队列 Worker
│       ├── package.json
│       └── tsconfig.json
│
├── docker/                       # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── postgresql/
│
├── scripts/                      # 脚本
│   ├── setup.sh
│   ├── dev.sh
│   └── build.sh
│
├── docs/                         # 文档
│   ├── api.md
│   ├── architecture.md
│   └── development.md
│
├── package.json                  # Monorepo 根配置
├── pnpm-workspace.yaml          # pnpm workspace
├── turbo.json                   # Turborepo 配置
└── tsconfig.base.json           # 基础 TypeScript 配置
```

### 4.3 数据模型设计

#### 核心实体

```typescript
// 用户
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  avatar        String?
  githubToken   String?        @encrypted
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  projects      Project[]
  conversations Conversation[]
  settings      UserSettings?
}

// 项目
model Project {
  id            String         @id @default(cuid())
  name          String
  description   String?
  path          String         @unique  // 本地路径或远程 URL
  type          ProjectType    // LOCAL, GIT, GITHUB
  isPublic      Boolean        @default(false)

  ownerId       String
  owner         User           @relation(fields: [ownerId], references: [id])

  analyses      Analysis[]
  conversations Conversation[]

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([ownerId])
  @@index([type])
}

// 分析结果
model Analysis {
  id            String         @id @default(cuid())
  projectId     String
  project       Project        @relation(fields: [projectId], references: [id])

  type          AnalysisType   // STRUCTURE, DEPENDENCY, COMPLEXITY, SECURITY
  status        AnalysisStatus // PENDING, RUNNING, COMPLETED, FAILED

  result        Json?          // 分析结果 (灵活存储)
  summary       String?        // 结果摘要

  startedAt     DateTime       @default(now())
  completedAt   DateTime?

  @@index([projectId])
  @@index([status])
}

// 对话
model Conversation {
  id            String         @id @default(cuid())
  title         String

  userId        String
  user          User           @relation(fields: [userId], references: [id])

  projectId     String?
  project       Project?       @relation(fields: [projectId], references: [id])

  aiProvider    String         // 'openai', 'anthropic', 'gemini'
  model         String         // 'gpt-4', 'claude-3-opus', etc.
  systemPrompt  String?

  messages      Message[]

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([userId])
  @@index([projectId])
}

// 消息
model Message {
  id            String         @id @default(cuid())

  conversationId String
  conversation  Conversation   @relation(fields: [conversationId], references: [id])

  role          MessageRole    // USER, ASSISTANT, SYSTEM
  content       String         @db.Text
  toolCalls     Json?          // 工具调用记录

  tokens        Int?           // Token 计数

  createdAt     DateTime       @default(now())

  @@index([conversationId])
}

// MCP 服务器配置
model McpServer {
  id            String         @id @default(cuid())
  name          String         @unique
  type          McpTransport   // STDIO, HTTP, WEBSOCKET
  command       String?        // STDIO 命令
  url           String?        // HTTP/WebSocket URL
  enabled       Boolean        @default(true)

  tools         Json           // 可用工具列表
  resources     Json           // 可用资源列表

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

enum ProjectType {
  LOCAL
  GIT
  GITHUB
}

enum AnalysisType {
  STRUCTURE
  DEPENDENCY
  COMPLEXITY
  SECURITY
  CUSTOM
}

enum AnalysisStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum McpTransport {
  STDIO
  HTTP
  WEBSOCKET
}
```

---

## 五、核心模块重构方案

### 5.1 AI 提供商系统

#### 迁移策略

**从 Cline 迁移**:
- 复用 `cline/src/integrations/ai/` 的核心抽象
- 保留多提供商接口设计
- 增强配置管理（支持动态切换）

**架构设计**:

```typescript
// packages/core/src/ai/providers/base.ts
export interface AIProvider {
  readonly id: string
  readonly name: string
  readonly models: AIModel[]

  completePrompt(request: CompletionRequest): Promise<CompletionResponse>
  streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>
  countTokens(text: string): number
}

// packages/core/src/ai/manager.ts
export class AIProviderManager {
  private providers: Map<string, AIProvider>

  register(provider: AIProvider): void
  getProvider(id: string): AIProvider
  getProvider(modelId: string): AIProvider

  // 从配置文件加载
  async loadFromConfig(configPath: string): Promise<void>
}
```

**支持的提供商**:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3 Opus/Sonnet/Haiku)
- Google (Gemini Pro/Ultra)
- Mistral (Mistral Large/Medium)
- DeepSeek (DeepSeek-V3)
- 本地 LLM (Ollama, LM Studio)

#### 改进点

1. **统一的错误处理**:
```typescript
class AIProviderError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string
  ) {
    super(message)
  }
}
```

2. **重试与降级**:
```typescript
interface RetryConfig {
  maxRetries: number
  backoffMultiplier: number
  fallbackProviders?: string[]
}
```

3. **Token 计数缓存**:
```typescript
class TokenCounter {
  private cache = new LRUCache<string, number>({ max: 1000 })

  count(text: string): number {
    const cached = this.cache.get(text)
    if (cached) return cached

    const count = this.actualCount(text)
    this.cache.set(text, count)
    return count
  }
}
```

### 5.2 工具系统

#### 迁移策略

**从 Cline 迁移**:
- 复用工具定义模式
- 复用执行器逻辑
- 增强工具注册系统

**架构设计**:

```typescript
// packages/core/src/tools/definition.ts
export interface ToolDefinition {
  id: string
  name: string
  description: string
  parameters: JSONSchema
  handler: ToolHandler
  permissions?: Permission[]
}

export type ToolHandler = (params: unknown, context: ToolContext) => Promise<ToolResult>

export interface ToolContext {
  userId: string
  projectId?: string
  cwd?: string
  env: Record<string, string>
}

// packages/core/src/tools/registry.ts
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition): void
  unregister(id: string): void
  get(id: string): ToolDefinition | undefined
  list(category?: ToolCategory): ToolDefinition[]

  // 权限检查
  canExecute(userId: string, toolId: string): boolean
}

// packages/core/src/tools/executor.ts
export class ToolExecutor {
  async execute(
    toolId: string,
    params: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolId)
    if (!tool) throw new ToolNotFoundError(toolId)

    // 参数验证
    const validated = await this.validateParams(tool.parameters, params)

    // 权限检查
    if (!this.registry.canExecute(context.userId, toolId)) {
      throw new PermissionDeniedError(toolId)
    }

    // 执行
    return await tool.handler(validated, context)
  }
}
```

#### 工具分类

**文件工具**:
- `read_file` - 读取文件
- `write_file` - 写入文件
- `search_files` - 搜索文件
- `list_directory` - 列出目录

**Git 工具**:
- `git_status` - 查看 Git 状态
- `git_diff` - 查看差异
- `git_commit` - 提交变更
- `git_branch` - 分支操作
- `git_log` - 查看历史

**GitHub 工具**:
- `github_search_repos` - 搜索仓库
- `github_create_pr` - 创建 PR
- `github_list_issues` - 列出 Issues
- `github_add_comment` - 添加评论

**代码分析工具**:
- `analyze_structure` - 分析项目结构
- `find_definitions` - 查找定义
- `find_references` - 查找引用
- `calculate_complexity` - 计算复杂度

**浏览器工具** (可选):
- `browser_navigate` - 导航到页面
- `browser_screenshot` - 截图
- `browser_click` - 点击元素

#### 改进点

1. **工具版本管理**:
```typescript
interface ToolDefinition {
  id: string
  version: string  // 语义化版本
  deprecated?: boolean
  migrationGuide?: string
}
```

2. **工具组合**:
```typescript
// 组合多个工具为宏工具
interface MacroTool extends ToolDefinition {
  type: 'macro'
  steps: Array<{
    toolId: string
    paramsMapping: (macroParams: any) => any
  }>
}
```

3. **沙箱执行**:
```typescript
// 使用 VM2 或 worker_threads 隔离工具执行
class SandboxToolExecutor {
  async execute(tool: Tool, params: any): Promise<any> {
    return await this.vm.run(`(${tool.handler.toString()})(${JSON.stringify(params)})`)
  }
}
```

### 5.3 系统提示词架构

#### 迁移策略

**从 Cline 迁移**:
- 完全复用模块化提示词系统
- 保留模板引擎设计
- 增强自定义能力

**架构设计**:

```
packages/core/src/prompts/
├── templates/           # 模板
│   ├── base.tmpl       # 基础模板
│   ├── coding.tmpl     # 编程任务模板
│   └── analysis.tmpl   # 分析任务模板
├── components/         # 组件
│   ├── role.txt       # 角色定义
│   ├── constraints.txt # 约束条件
│   ├── tools.txt      # 工具描述
│   └── format.txt     # 输出格式
├── variants/          # 模型变体
│   ├── claude/
│   ├── gpt4/
│   └── gemini/
└── builder.ts         # 提示词构建器
```

```typescript
// packages/core/src/prompts/builder.ts
export class PromptBuilder {
  private template: string
  private components: Map<string, string>
  private placeholders: Map<string, any>

  useTemplate(templateName: string): this
  setComponent(name: string, content: string): this
  setPlaceholder(key: string, value: any): this

  build(): string {
    let result = this.template

    // 替换组件
    for (const [name, content] of this.components) {
      result = result.replace(`{{${name}}}`, content)
    }

    // 替换占位符
    for (const [key, value] of this.placeholders) {
      result = result.replace(`{{${key}}}`, JSON.stringify(value))
    }

    return result
  }
}

// 使用示例
const prompt = new PromptBuilder()
  .useTemplate('coding')
  .setComponent('tools', this.registry.list().map(t => t.description).join('\n'))
  .setPlaceholder('cwd', process.cwd())
  .setPlaceholder('date', new Date().toISOString())
  .build()
```

#### 改进点

1. **提示词版本控制**:
```typescript
interface PromptTemplate {
  id: string
  version: string
  template: string
  changelog: string[]

  // A/B 测试
  variants?: PromptVariant[]
}
```

2. **动态提示词优化**:
```typescript
// 根据任务历史优化提示词
class PromptOptimizer {
  async optimize(
    basePrompt: string,
    taskHistory: Task[]
  ): Promise<string> {
    // 使用 AI 分析历史任务，生成改进建议
  }
}
```

3. **提示词模板市场**:
```typescript
// 允许用户分享和下载提示词模板
interface PromptMarketplace {
  list(): Promise<PromptTemplate[]>
  download(id: string): Promise<PromptTemplate>
  upload(template: PromptTemplate): Promise<void>
}
```

### 5.4 Git 引擎

#### 迁移策略

**从 Cline 迁移**:
- 复用 simple-git 封装
- 增强错误处理和性能优化
- 添加高级操作支持

**从 git-ai-core 迁移**:
- 保留仓库管理逻辑
- 改进异步处理

**架构设计**:

```typescript
// packages/core/src/git/manager.ts
export class GitManager {
  private repos = new Map<string, GitRepo>()

  async getRepo(path: string): Promise<GitRepo> {
    if (this.repos.has(path)) {
      return this.repos.get(path)!
    }

    const repo = new GitRepo(path)
    await repo.init()
    this.repos.set(path, repo)
    return repo
  }

  // 释放仓库资源
  release(path: string): void {
    const repo = this.repos.get(path)
    if (repo) {
      repo.cleanup()
      this.repos.delete(path)
    }
  }
}

// packages/core/src/git/repo.ts
export class GitRepo {
  constructor(private path: string) {}

  // 基础操作
  async status(): Promise<GitStatus>
  async add(files: string[]): Promise<void>
  async commit(message: string, options?: CommitOptions): Promise<string>
  async log(options?: LogOptions): Promise<GitCommit[]>
  async diff(ref?: string): Promise<GitDiff>

  // 分支操作
  async branches(): Promise<GitBranch[]>
  async createBranch(name: string, base?: string): Promise<void>
  async checkout(branch: string): Promise<void>
  async merge(branch: string): Promise<MergeResult>

  // 远程操作
  async fetch(remote?: string): Promise<void>
  async pull(remote?: string, branch?: string): Promise<PullResult>
  async push(remote?: string, branch?: string): Promise<PushResult>

  // 高级操作
  async rebase(branch: string, options?: RebaseOptions): Promise<RebaseResult>
  async cherryPick(commit: string): Promise<void>
  async revert(commit: string): Promise<void>

  // 性能优化：资源清理
  cleanup(): void {
    // 清理临时文件、释放文件句柄
  }
}
```

#### 改进点

1. **智能提交消息生成**:
```typescript
class CommitMessageGenerator {
  async generate(diff: GitDiff): Promise<string> {
    const prompt = `
      根据以下 Git 变更生成简洁的提交消息:
      ${diff.format()}

      请生成遵循 Conventional Commits 规范的提交消息。
    `

    return await this.ai.complete(prompt)
  }
}
```

2. **大型仓库优化**:
```typescript
class GitPerformanceOptimizer {
  // 浅克隆
  async shallowClone(url: string, depth: number = 1): Promise<void>

  // 部分克隆
  async partialClone(url: string, filters: FilterPattern[]): Promise<void>

  // 并行操作
  async parallelLog(refs: string[]): Promise<GitCommit[][]>
}
```

3. **冲突检测与解决辅助**:
```typescript
class ConflictResolver {
  detectConflicts(): ConflictMarker[]
  suggestResolution(conflict: ConflictMarker): ResolutionStrategy[]
  applyResolution(conflict: ConflictMarker, strategy: ResolutionStrategy): void
}
```

### 5.5 代码分析引擎

#### 迁移策略

**从 Cline 迁移**:
- 复用 tree-sitter WASM 实现
- 增强并发解析能力
- 添加增量分析

**架构设计**:

```typescript
// packages/core/src/analysis/tree-sitter/parser.ts
export class TreeSitterParser {
  private parsers = new Map<string, LanguageParser>()

  async loadLanguage(language: string): Promise<Parser> {
    if (this.parsers.has(language)) {
      return this.parsers.get(language)!.parser
    }

    const parser = new Parser()
    const lang = await loadLanguageWasm(language)
    parser.setLanguage(lang)

    this.parsers.set(language, { parser, lang })
    return parser
  }

  async parseFile(filePath: string): Promise<ParseResult> {
    const language = this.detectLanguage(filePath)
    const parser = await this.loadLanguage(language)
    const source = await fs.readFile(filePath, 'utf-8')

    const tree = parser.parse(source)
    return {
      tree,
      root: tree.rootNode,
      source
    }
  }

  // 查询 AST
  async query(filePath: string, pattern: string): Promise<QueryResult[]> {
    const { parser, lang } = await this.loadLanguage(this.detectLanguage(filePath))
    const query = lang.query(pattern)
    const { tree, source } = await this.parseFile(filePath)

    const matches = query.matches(tree.rootNode)
    return matches.map(match => ({
      captures: match.captures,
      text: this.extractText(source, match)
    }))
  }
}

// packages/core/src/analysis/dependency-parser.ts
export class DependencyParser {
  // 解析 package.json
  parseNpmDependencies(packageJson: any): DependencyGraph

  // 解析 requirements.txt
  parsePythonDependencies(requirementsTxt: string): DependencyGraph

  // 解析 go.mod
  parseGoDependencies(goMod: string): DependencyGraph

  // 生成依赖图
  buildGraph(project: Project): DependencyGraph
}

// packages/core/src/analysis/complexity-analyzer.ts
export class ComplexityAnalyzer {
  // 圈复杂度
  cyclomaticComplexity(functionNode: FunctionNode): number

  // 认知复杂度
  cognitiveComplexity(functionNode: FunctionNode): number

  // 文件复杂度
  fileComplexity(filePath: string): FileComplexityReport
}
```

#### 改进点

1. **增量分析**:
```typescript
class IncrementalAnalyzer {
  private analysisCache = new Map<string, AnalysisResult>()

  async analyzeProject(project: Project, changes?: FileChange[]): Promise<ProjectAnalysis> {
    if (!changes) {
      // 全量分析
      return this.fullAnalyze(project)
    }

    // 仅分析变更文件
    const cached = this.analysisCache.get(project.id)
    const updated = await this.analyzeChanges(changes)

    return this.mergeAnalysis(cached, updated)
  }
}
```

2. **并行解析**:
```typescript
class ParallelParser {
  async parseFiles(files: string[]): Promise<ParseResult[]> {
    const workers = Math.min(os.cpus().length, files.length)
    const chunks = this.chunkArray(files, workers)

    return await Promise.all(
      chunks.map(chunk => this.parseChunk(chunk))
    )
  }

  private async parseChunk(files: string[]): Promise<ParseResult[]> {
    return await Promise.all(
      files.map(file => this.parser.parseFile(file))
    )
  }
}
```

3. **智能缓存**:
```typescript
class AnalysisCache {
  // 基于 content hash 的缓存
  async get(filePath: string, content: string): Promise<AnalysisResult | null> {
    const hash = this.hashContent(content)
    const key = `${filePath}:${hash}`
    return await this.cacheStore.get(key)
  }

  async set(filePath: string, content: string, result: AnalysisResult): Promise<void> {
    const hash = this.hashContent(content)
    const key = `${filePath}:${hash}`
    await this.cacheStore.set(key, result)
  }
}
```

### 5.6 GitHub 集成

#### 迁移策略

**从 git-ai-core 迁移**:
- 保留 API 封装
- 改进错误处理和限流
- 增强 Webhook 支持

**架构设计**:

```typescript
// packages/core/src/github/api.ts
export class GitHubClient {
  constructor(private token: string) {}

  // 仓库操作
  async getRepo(owner: string, repo: string): Promise<Repository>
  async searchRepos(query: string, options?: SearchOptions): Promise<Repository[]>
  async createRepo(params: CreateRepoParams): Promise<Repository>
  async forkRepo(owner: string, repo: string): Promise<Repository>

  // Issue 操作
  async listIssues(owner: string, repo: string, options?: ListIssuesOptions): Promise<Issue[]>
  async getIssue(owner: string, repo: string, number: number): Promise<Issue>
  async createIssue(owner: string, repo: string, params: CreateIssueParams): Promise<Issue>
  async updateIssue(owner: string, repo: string, number: number, params: UpdateIssueParams): Promise<Issue>

  // PR 操作
  async listPRs(owner: string, repo: string, options?: ListPROptions): Promise<PullRequest[]>
  async getPR(owner: string, repo: string, number: number): Promise<PullRequest>
  async createPR(owner: string, repo: string, params: CreatePRParams): Promise<PullRequest>
  async reviewPR(owner: string, repo: string, number: number, review: ReviewParams): Promise<Review>

  // 限流处理
  private async handleRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const rateLimit = await this.getRateLimit()
    if (rateLimit.remaining < 10) {
      const waitTime = rateLimit.reset - Date.now()
      await this.sleep(waitTime)
    }
    return await fn()
  }
}

// packages/core/src/github/webhook.ts
export class GitHubWebhookServer {
  private app: FastifyInstance

  async start(port: number): Promise<void> {
    this.app.post('/webhook/github', async (req, reply) => {
      const signature = req.headers['x-hub-signature-256']
      if (!this.verifySignature(req.rawBody, signature)) {
        reply.code(401).send({ error: 'Invalid signature' })
        return
      }

      const event = req.headers['x-github-event']
      const payload = req.body

      await this.handleEvent(event, payload)

      reply.code(200).send({ received: true })
    })

    await this.app.listen({ port })
  }

  private async handleEvent(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'push':
        await this.handlePush(payload)
        break
      case 'pull_request':
        await this.handlePullRequest(payload)
        break
      case 'issues':
        await this.handleIssues(payload)
        break
      // ... 更多事件
    }
  }
}
```

#### 改进点

1. **智能推荐算法**:
```typescript
class GitHubRecommendationEngine {
  async recommendRepos(user: User, context: Context): Promise<Repository[]> {
    // 基于用户历史
    const historyRepos = await this.getUserHistory(user.id)

    // 基于当前项目
    const similarRepos = await this.findSimilarRepos(context.project)

    // 基于趋势
    const trendingRepos = await this.getTrendingRepos()

    // 综合评分
    return this.scoreAndRank([
      ...historyRepos,
      ...similarRepos,
      ...trendingRepos
    ], user.preferences)
  }
}
```

2. **AI 辅助代码审查**:
```typescript
class AIReviewAssistant {
  async reviewPR(pr: PullRequest): Promise<ReviewComment[]> {
    const diff = await this.getPRDiff(pr)
    const files = diff.files.map(f => f.patch)

    const comments = []
    for (const file of files) {
      const review = await this.ai.complete(`
        审查以下代码变更，指出潜在问题:
        ${file}

        请关注:
        1. Bug 风险
        2. 性能问题
        3. 代码风格
        4. 安全漏洞
      `)

      comments.push({
        file: file.filename,
        line: file.line,
        body: review
      })
    }

    return comments
  }
}
```

### 5.7 MCP 协议支持

#### 迁移策略

**从 Cline 迁移**:
- 复用 MCP 客户端实现
- 修改传输层 (stdio → HTTP/WebSocket)
- 增强管理功能

**架构设计**:

```typescript
// packages/core/src/mcp/transport/http.ts
export class HttpMcpTransport implements McpTransport {
  async send(message: McpMessage): Promise<McpResponse> {
    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(message)
    })

    return await response.json()
  }
}

// packages/core/src/mcp/transport/websocket.ts
export class WebSocketMcpTransport implements McpTransport {
  private ws?: WebSocket

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.serverUrl)

    this.ws.onmessage = (event) => {
      const response = JSON.parse(event.data)
      this.pendingRequests.get(response.id)?.resolve(response)
    }
  }

  async send(message: McpMessage): Promise<McpResponse> {
    if (!this.ws) await this.connect()

    this.ws.send(JSON.stringify(message))

    return await new Promise((resolve) => {
      this.pendingRequests.set(message.id, { resolve })
    })
  }
}

// packages/core/src/mcp/client.ts
export class McpClient {
  private transport: McpTransport
  private tools = new Map<string, McpTool>()
  private resources = new Map<string, McpResource>()

  async connect(server: McpServerConfig): Promise<void> {
    // 根据配置选择传输方式
    this.transport = this.createTransport(server)
    await this.transport.connect()

    // 初始化握手
    await this.initialize()

    // 加载工具和资源
    await this.loadTools()
    await this.loadResources()
  }

  async callTool(toolId: string, params: any): Promise<any> {
    const request: McpMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/call',
      params: { name: toolId, arguments: params }
    }

    return await this.transport.send(request)
  }

  async getResource(uri: string): Promise<any> {
    const request: McpMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/read',
      params: { uri }
    }

    return await this.transport.send(request)
  }
}
```

#### 改进点

1. **工具商店**:
```typescript
interface McpServerManifest {
  id: string
  name: string
  description: string
  version: string
  author: string
  tools: ToolDefinition[]
  resources: ResourceDefinition[]
  homepage: string
  repository: string
}

class McpMarketplace {
  async search(query: string): Promise<McpServerManifest[]>
  async install(serverId: string): Promise<void>
  async uninstall(serverId: string): Promise<void>
  async update(serverId: string): Promise<void>
}
```

2. **权限管理**:
```typescript
interface McpPermission {
  tool: string
  action: 'read' | 'write' | 'execute'
  scope?: string
}

class McpPermissionManager {
  async checkPermission(
    userId: string,
    serverId: string,
    permission: McpPermission
  ): Promise<boolean> {
    const userPerms = await this.getUserPermissions(userId)
    const serverPerms = await this.getServerPermissions(serverId)

    return this.hasPermission(userPerms, serverPerms, permission)
  }
}
```

### 5.8 本地项目导入 (新功能)

#### 架构设计

```typescript
// packages/core/src/project/scanner.ts
export class ProjectScanner {
  async scanProject(path: string): Promise<ProjectScanResult> {
    // 1. 检测项目类型
    const type = await this.detectProjectType(path)

    // 2. 扫描文件结构
    const structure = await this.scanStructure(path)

    // 3. 提取元数据
    const metadata = await this.extractMetadata(path, type)

    // 4. 分析依赖
    const dependencies = await this.analyzeDependencies(path, type)

    return {
      path,
      type,
      structure,
      metadata,
      dependencies
    }
  }

  private async detectProjectType(path: string): Promise<ProjectType> {
    const files = await fs.readdir(path)

    if (files.includes('package.json')) return 'node'
    if (files.includes('requirements.txt')) return 'python'
    if (files.includes('go.mod')) return 'go'
    if (files.includes('Cargo.toml')) return 'rust'
    if (files.includes('pom.xml')) return 'java'
    if (files.includes('.csproj')) return 'csharp'

    return 'unknown'
  }

  private async scanStructure(path: string): Promise<ProjectStructure> {
    const tree = await this.buildFileTree(path, {
      ignore: [
        'node_modules',
        '.git',
        'dist',
        'build',
        '__pycache__',
        'target',
        'bin',
        'obj'
      ]
    })

    const stats = await this.calculateStats(tree)

    return { tree, stats }
  }

  private async extractMetadata(
    path: string,
    type: ProjectType
  ): Promise<ProjectMetadata> {
    switch (type) {
      case 'node':
        return this.extractNpmMetadata(path)
      case 'python':
        return this.extractPythonMetadata(path)
      case 'go':
        return this.extractGoMetadata(path)
      // ... 更多类型
    }
  }
}
```

#### 项目索引

```typescript
// packages/core/src/project/indexer.ts
export class ProjectIndexer {
  async indexProject(project: Project): Promise<ProjectIndex> {
    // 1. 扫描所有文件
    const files = await this.scanFiles(project.path)

    // 2. 解析可解析的文件
    const parsedFiles = await this.parseFiles(files)

    // 3. 构建定义索引
    const definitions = this.buildDefinitionIndex(parsedFiles)

    // 4. 构建引用索引
    const references = this.buildReferenceIndex(parsedFiles)

    // 5. 构建符号表
    const symbols = this.buildSymbolTable(parsedFiles)

    return {
      projectId: project.id,
      files,
      definitions,
      references,
      symbols,
      indexedAt: new Date()
    }
  }

  private buildDefinitionIndex(files: ParsedFile[]): DefinitionIndex {
    const index = new Map<string, Definition[]>()

    for (const file of files) {
      for (const def of file.definitions) {
        const key = `${def.kind}:${def.name}`
        if (!index.has(key)) index.set(key, [])
        index.get(key)!.push({
          ...def,
          file: file.path,
          line: def.line
        })
      }
    }

    return index
  }
}
```

#### 使用示例

```typescript
// 用户选择任意目录
const projectPath = await selectDirectory()

// 扫描项目
const scanner = new ProjectScanner()
const result = await scanner.scanProject(projectPath)

// 显示项目概览
displayProjectInfo({
  name: result.metadata.name,
  type: result.type,
  files: result.structure.stats.fileCount,
  lines: result.structure.stats.linesOfCode,
  dependencies: result.dependencies.length
})

// 建立索引
const indexer = new ProjectIndexer()
const index = await indexer.indexProject(result)

// 现在可以使用 AI 对话分析项目
const chat = new AIConversation(chatId, {
  context: {
    project: result,
    index
  }
})

await chat.ask('这个项目的主要功能是什么?')
await chat.ask('分析项目架构并生成架构图')
```

---

## 六、开发路线图

### 6.1 Phase 0: 基础设施 (2 周)

**目标**: 搭建开发环境和基础架构

- [x] Monorepo 结构设计
- [x] Turborepo/pnpm 配置
- [x] TypeScript 配置
- [x] ESLint/Biome 配置
- [x] Docker 开发环境
- [x] CI/CD 管道
- [x] 数据库设计 (Prisma)
- [x] API 框架选型与配置

**交付物**:
- 可运行的开发环境
- 基础项目结构
- 开发规范文档

### 6.2 Phase 1: 核心 AI 引擎 (3 周)

**目标**: 实现多提供商 AI 引擎和基础对话系统

- [x] AI Provider Manager
  - OpenAI 集成
  - Anthropic 集成
  - Gemini 集成
- [x] 系统提示词架构
  - 模板引擎
  - 模型变体
  - 组件系统
- [x] 任务执行引擎
  - 流式响应
  - 上下文管理
  - 工具调用
- [x] 基础工具集
  - 文件工具
  - 搜索工具
- [x] 对话 UI
  - 聊天界面
  - 消息展示
  - 流式渲染

**交付物**:
- 可用的 AI 对话系统
- 基础工具执行能力
- 对话历史管理

### 6.3 Phase 2: Git 深度集成 (3 周)

**目标**: 实现完整的 Git 操作能力

- [x] Git Manager
  - 仓库管理 (克隆、删除)
  - 分支操作
  - 提交管理
  - 差异分析
  - 历史查询
- [x] Git UI
  - 仓库浏览器
  - 文件对比视图
  - 提交历史图
  - 分支可视化
- [x] AI 辅助 Git
  - 智能提交消息生成
  - 冲突解决建议
- [x] Git Hooks 集成

**交付物**:
- 完整的 Git 操作界面
- AI 驱动的 Git 辅助功能

### 6.4 Phase 3: GitHub 集成 (2 周)

**目标**: 集成 GitHub API 和社交化开发功能

- [x] GitHub Client
  - 仓库搜索
  - Issue/PR 管理
  - Webhook 处理
- [x] GitHub UI
  - 仓库搜索界面
  - PR 管理界面
  - Issue 跟踪界面
- [x] 智能推荐
  - 个性化仓库推荐
  - 相关项目发现
- [x] AI 代码审查
  - PR 自动审查
  - 智能评论生成

**交付物**:
- GitHub 集成功能
- 代码审查助手

### 6.5 Phase 4: 代码分析引擎 (3 周)

**目标**: 实现深度代码分析能力

- [x] Tree-sitter 集成
  - 多语言解析器
  - AST 查询
  - 并行解析
- [x] 依赖分析
  - NPM 依赖解析
  - Python 依赖解析
  - Go 依赖解析
  - 依赖图生成
- [x] 复杂度分析
  - 圈复杂度
  - 认知复杂度
  - 文件复杂度
- [x] 架构分析
  - 模块依赖图
  - 调用图生成
  - 架构可视化
- [x] 分析 UI
  - 项目结构视图
  - 依赖关系图
  - 复杂度热力图
  - 定义跳转
  - 引用查找

**交付物**:
- 代码分析引擎
- 可视化分析界面

### 6.6 Phase 5: 本地项目导入 (2 周)

**目标**: 实现无 Git 仓库的项目分析

- [x] 项目扫描器
  - 项目类型检测
  - 文件结构扫描
  - 元数据提取
- [x] 项目索引
  - 定义索引
  - 引用索引
  - 符号表
  - 增量更新
- [x] 导入 UI
  - 目录选择器
  - 项目预览
  - 导入向导
- [x] 项目管理
  - 项目列表
  - 项目设置
  - 项目删除

**交付物**:
- 本地项目导入功能
- 项目管理系统

### 6.7 Phase 6: MCP 协议支持 (2 周)

**目标**: 实现 MCP 协议和工具扩展

- [x] MCP Client
  - HTTP 传输
  - WebSocket 传输
  - 工具调用
  - 资源管理
- [x] MCP Server
  - 内置工具服务器
  - 自定义工具 API
- [x] MCP 管理 UI
  - 服务器配置
  - 工具列表
  - 权限管理
- [x] 工具商店
  - 服务器浏览
  - 一键安装
  - 配置模板

**交付物**:
- MCP 协议支持
- 工具扩展系统

### 6.8 Phase 7: 任务调度与性能优化 (2 周)

**目标**: 实现异步任务处理和性能优化

- [x] 任务队列
  - Bull 集成
  - 任务优先级
  - 失败重试
- [x] 后台任务
  - 仓库克隆任务
  - 代码分析任务
  - 定期同步任务
- [x] 性能优化
  - 大型仓库优化
  - 并行解析优化
  - 缓存策略
  - 数据库查询优化
- [x] 监控
  - 任务监控
  - 性能指标
  - 错误追踪

**交付物**:
- 任务调度系统
- 性能优化报告

### 6.9 Phase 8: 桌面应用 (2 周)

**目标**: 开发桌面客户端

- [x] Electron/Tauri 集成
  - 主进程通信
  - 原生菜单
  - 系统托盘
  - 文件系统访问
- [x] 桌面特有功能
  - 全局快捷键
  - 本地通知
  - 拖拽导入
  - 离线模式
- [x] 打包与分发
  - 安装包生成
  - 自动更新
  - 多平台支持

**交付物**:
- Windows 桌面应用
- 安装包和更新系统

### 6.10 Phase 9: 测试与文档 (2 周)

**目标**: 完善测试覆盖和文档

- [x] 单元测试
  - 核心模块测试
  - 工具测试
  - AI 集成测试
- [x] 集成测试
  - API 测试
  - E2E 测试
- [x] 文档
  - API 文档
  - 用户手册
  - 开发指南
  - 部署指南

**交付物**:
- 完整测试套件
- 完善的文档

### 6.11 Phase 10: 部署与发布 (1 周)

**目标**: 部署到生产环境

- [x] 生产环境配置
- [x] 数据库迁移
- [x] 性能测试
- [x] 安全审计
- [x] 用户验收测试
- [x] 正式发布

**交付物**:
- 生产环境
- 发布公告

---

## 七、技术挑战与解决方案

### 7.1 性能优化

#### 挑战 1: 大型代码库分析性能

**问题**:
分析大型代码库 (如 monorepo) 时，解析所有文件耗时过长。

**解决方案**:
1. **并行解析**: 使用 Worker Threads 并行处理多个文件
2. **增量分析**: 仅分析变更的文件
3. **智能缓存**: 缓存解析结果，基于 content hash
4. **惰性加载**: 按需加载文件解析器
5. **分级索引**: 先建立快速索引，再深度分析

**实现**:
```typescript
class ParallelAnalyzer {
  private workers: Worker[]

  async analyzeProject(project: Project): Promise<AnalysisResult> {
    const files = await this.scanFiles(project.path)
    const chunks = this.chunkFiles(files, this.workers.length)

    // 并行解析
    const results = await Promise.all(
      chunks.map(chunk => this.analyzeChunk(chunk))
    )

    return this.mergeResults(results)
  }
}
```

#### 挑战 2: AI 流式响应延迟

**问题**:
AI 流式响应在网络较差时体验不佳。

**解决方案**:
1. **本地 LLM 备选**: 使用 Ollama 等本地模型
2. **响应缓存**: 缓存常见问题的响应
3. **增量渲染**: 优化前端渲染性能
4. **重连机制**: WebSocket 断线自动重连
5. **超时控制**: 设置合理的超时时间

### 7.2 可扩展性

#### 挑战 3: 工具系统扩展

**问题**:
如何让用户轻松添加自定义工具？

**解决方案**:
1. **插件系统**: 支持用户编写插件
2. **脚本工具**: 支持自定义脚本作为工具
3. **MCP 市场**: 提供工具市场
4. **Webhook 工具**: 通过 Webhook 调用外部服务
5. **工具组合**: 支持组合多个工具为宏工具

**实现**:
```typescript
// 用户自定义工具
interface CustomTool {
  name: string
  description: string
  script: string  // JavaScript/TypeScript 脚本
  permissions: string[]
}

// 加载用户工具
class ToolPluginLoader {
  async loadCustomTools(userId: string): Promise<ToolDefinition[]> {
    const userTools = await db.tools.findMany({ where: { userId } })

    return userTools.map(tool => ({
      id: `custom:${tool.id}`,
      name: tool.name,
      description: tool.description,
      handler: this.createSandboxedHandler(tool.script)
    }))
  }
}
```

### 7.3 安全性

#### 挑战 4: 代码执行安全

**问题**:
工具执行涉及文件操作、命令执行，存在安全风险。

**解决方案**:
1. **沙箱执行**: 使用 VM2 或 worker_threads 隔离执行
2. **权限系统**: 细粒度权限控制
3. **输入验证**: 严格验证所有输入
4. **资源限制**: 限制 CPU、内存、文件访问
5. **审计日志**: 记录所有敏感操作

**实现**:
```typescript
class SecureToolExecutor {
  async execute(tool: Tool, params: any, context: Context): Promise<any> {
    // 权限检查
    await this.permissionService.check(context.userId, tool.requiredPermissions)

    // 参数验证
    const validated = await this.validator.validate(tool.schema, params)

    // 沙箱执行
    const result = await this.sandbox.run(async () => {
      return await tool.handler(validated, {
        ...context,
        fs: this.createRestrictedFS(context.cwd),
        exec: this.createRestrictedExec(context.cwd)
      })
    })

    // 审计日志
    await this.auditLog.log({
      userId: context.userId,
      tool: tool.id,
      params: this.sanitizeParams(validated),
      result: this.sanitizeResult(result)
    })

    return result
  }
}
```

#### 挑战 5: API 密钥安全

**问题**:
存储和使用多个 AI 提供商的 API 密钥存在安全风险。

**解决方案**:
1. **加密存储**: 使用数据库加密字段
2. **密钥轮换**: 支持定期轮换密钥
3. **访问控制**: 限制密钥访问权限
4. **审计追踪**: 记录密钥使用情况
5. **密钥代理**: 通过代理服务器使用密钥

### 7.4 用户体验

#### 挑战 6: 复杂操作简化

**问题**:
Git 操作、代码分析等功能复杂，普通用户难以掌握。

**解决方案**:
1. **智能向导**: 引导用户完成复杂操作
2. **AI 辅助**: 使用 AI 解释和推荐操作
3. **可视化**: 图形化展示复杂概念
4. **预设模板**: 提供常用操作模板
5. **交互式教程**: 内置教程引导

**实现**:
```typescript
// Git Rebase 向导
class RebaseWizard {
  async startWizard(branch: string): Promise<void> {
    // Step 1: 解释 Rebase
    await this.showExplanation(`
      Rebase 会将当前分支的提交移动到目标分支顶部。
      这有助于保持线性历史记录。
    `)

    // Step 2: 展示预览
    const preview = await this.showPreview(branch)
    const confirmed = await this.askUser('确认要 Rebase 吗?')

    if (!confirmed) return

    // Step 3: 执行 Rebase
    await this.executeRebase(branch)

    // Step 4: 处理冲突
    if (await this.hasConflicts()) {
      await this.helpResolveConflicts()
    }

    // Step 5: 完成
    await this.showSuccess('Rebase 完成!')
  }
}
```

### 7.5 多租户与协作

#### 挑战 7: 团队协作支持

**问题**:
如何支持多用户协作和团队项目?

**解决方案**:
1. **多租户架构**: 数据隔离和权限控制
2. **实时协作**: WebSocket 实时同步
3. **项目共享**: 项目访问控制
4. **协作工具**: 评论、标注、任务分配
5. **审计日志**: 完整操作记录

**实现**:
```typescript
// 实时协作
class CollaborationService {
  async shareProject(projectId: string, users: string[]): Promise<void> {
    // 授予权限
    await this.db.projectPermissions.createMany({
      data: users.map(userId => ({
        projectId,
        userId,
        permission: 'read_write'
      }))
    })

    // 通知用户
    for (const userId of users) {
      await this.ws.sendToUser(userId, {
        type: 'project_shared',
        projectId
      })
    }
  }

  async broadcastChange(projectId: string, change: any): Promise<void> {
    // 广播变更给所有协作者
    const collaborators = await this.db.projectPermissions.findMany({
      where: { projectId },
      include: { user: true }
    })

    for (const collaborator of collaborators) {
      await this.ws.sendToUser(collaborator.userId, {
        type: 'project_change',
        projectId,
        change
      })
    }
  }
}
```

---

## 八、成功指标

### 8.1 技术指标

- **性能**:
  - AI 响应延迟 < 2s
  - 代码分析速度: 10K LOC/s
  - 大型仓库克隆: < 30s

- **可靠性**:
  - 系统可用性 > 99.5%
  - 错误率 < 0.1%
  - 任务成功率 > 95%

- **可扩展性**:
  - 支持项目大小: > 1M LOC
  - 并发用户: > 100
  - 工具数量: > 50

### 8.2 用户指标

- **采用率**:
  - 注册用户: 目标 1000+
  - 活跃用户: 目标 300+/月
  - 用户留存: 30 天留存 > 40%

- **满意度**:
  - NPS 分数: > 50
  - 用户评分: > 4.5/5
  - 完成任务成功率: > 80%

### 8.3 功能完成度

- ✅ AI 对话助手: 100%
- ✅ Git 深度集成: 100%
- ✅ GitHub 集成: 90%
- ✅ 代码分析: 85%
- ✅ 本地项目导入: 100%
- ✅ MCP 支持: 90%
- ✅ 桌面应用: 100%

---

## 九、总结

本重构计划详细描述了如何基于 **git-ai-core** 的功能设计和 **Cline** 的架构设计，打造一个全新的 **Git Tutor AI** 平台。

### 核心优势

1. **统一技术栈**: 全栈 TypeScript，性能优异，易于维护
2. **模块化架构**: 高度解耦，易于扩展和定制
3. **AI 原生**: 深度集成多 AI 模型，智能辅助开发
4. **Git 深度集成**: 超越简单的命令封装，提供智能 Git 工作流
5. **代码分析**: 基于 AST 的深度分析，理解代码结构
6. **本地项目**: 无需 Git 仓库即可分析，支持任意代码项目
7. **跨平台**: Web + 桌面双端，适应不同使用场景

### 与参考项目对比

| 特性 | git-ai-core | Cline | Git Tutor AI |
|------|-------------|-------|--------------|
| 架构成熟度 | ⚠️ 较弱 | ✅ 优秀 | ✅ 优秀 |
| 性能 | ⚠️ Python 瓶颈 | ✅ 高性能 | ✅ 高性能 |
| Git 集成 | ✅ 基础 | ✅ 深度 | ✅ 深度 + AI |
| GitHub 集成 | ✅ 完整 | ❌ 无 | ✅ 完整 + AI 审查 |
| 代码分析 | ⚠️ 基础 | ✅ AST | ✅ AST + 增量 |
| 本地项目 | ❌ 仅 Git | ✅ 任意 | ✅ 任意 + 索引 |
| 可扩展性 | ⚠️ 有限 | ✅ MCP | ✅ MCP + 插件 |

### 下一步行动

1. **立即开始**: Phase 0 基础设施搭建
2. **原型验证**: 快速构建核心功能原型
3. **用户反馈**: 早期用户测试和反馈收集
4. **迭代优化**: 根据反馈持续改进

---

## 八、Cline 深度分析技术细节

> 📌 **详细补充**: 本章节内容已详细整理在独立文档 [CLINE_DEEP_DIVE.md](./CLINE_DEEP_DIVE.md) 中
>
> 以下为核心技术要点概览,请查看详细文档获取完整代码示例和实现细节。

### 8.1 AI 模型差异化处理系统

#### 模型家族识别

**核心设计**: 分层匹配系统
```
精确匹配 → 家族匹配 → 能力匹配 → 通用降级
```

**关键文件映射**:
- `cline/src/utils/model-utils.ts` → `packages/core/src/ai/model-utils.ts`
- `cline/src/shared/prompts.ts` → `packages/shared/src/enums.ts`

**主要功能**:
- ✅ 模型 ID 标准化 (`normalize()`)
- ✅ 模型家族判断 (`isNextGenModelFamily()`, `isGPT5ModelFamily()`)
- ✅ 能力检测 (`supportsVision()`, `supportsFunctionCalling()`)

#### 系统提示词变体

**变体优先级**:
1. **Next-gen**: Claude 4, GPT-5, Gemini 2.5 (智能代理能力)
2. **Native Next-gen**: 原生工具调用模式
3. **Specialized**: GLM, Hermes 等特定模型优化
4. **Generic**: 通用回退变体
5. **XS**: 紧凑模式(小上下文窗口)

**组件级差异示例**:
```typescript
// 不同模型的任务进度说明差异
const UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN = "详细说明 + 智能特性"
const UPDATING_TASK_PROGRESS_NATIVE_GPT5 = "详细说明 + 严格格式约束"
const UPDATING_TASK_PROGRESS_XS = "简化说明"
```

#### API 调用差异化

**OpenAI 深度适配**:
- DeepSeek R1 格式转换
- 推理模型 (`o1`, `o3`, `gpt-5`) 特殊处理
- `reasoning_content` 字段处理

**Anthropic 深度适配**:
- 1M 上下文窗口 beta 头
- `thinking` 和 `redacted_thinking` 块处理
- 缓存控制 (`cache_control: { type: "ephemeral" }`)

**流式响应处理差异**:

| 特性 | OpenAI | Anthropic |
|------|--------|-----------|
| 推理内容 | `reasoning_content` | `thinking` 块 |
| 工具调用 | `tool_calls` 数组 | `tool_use` 块 + `input_json_delta` |
| 缓存支持 | `prompt_tokens_details.cached_tokens` | `cache_read_input_tokens` |

### 8.2 状态管理与错误处理

#### 任务状态机

**核心状态**:
```typescript
interface TaskState {
  abort: boolean                    // 中断标志
  paused: boolean                   // 暂停标志
  didRejectTool: boolean            // 用户拒绝工具
  didAlreadyUseTool: boolean        // 已使用工具标志
  consecutiveMistakeCount: number   // 连续错误计数
  conversationHistoryDeletedRange: [number, number] | undefined
  activeHookExecution: HookExecution | undefined
}
```

**原子操作保证**:
```typescript
private stateMutex = new Mutex()

private async withStateLock<T>(fn: () => T | Promise<T>): Promise<T> {
  return await this.stateMutex.withLock(fn)
}
```

#### 错误分类系统

```typescript
enum ClineErrorType {
  Auth = "auth",           // 认证错误
  Network = "network",      // 网络错误
  RateLimit = "rateLimit",  // 速率限制
  Balance = "balance",      // 余额不足
}

class ClineError extends Error {
  isErrorType(type: ClineErrorType): boolean {
    return this._error.type === type
  }
}
```

#### 自动重试机制

**重试策略**:
- **速率限制**: 读取 `retry-after` 头,精确等待
- **指数退避**: 每次重试延迟翻倍
- **最大限制**: 最多重试 3 次
- **不可重试错误**: 4xx 错误(除 429)不重试

### 8.3 工具执行系统细节

#### 工具定义标准化

**多变体支持**:
```typescript
const generic: ClineToolSpec = {
  variant: ModelFamily.GENERIC,
  id: ClineDefaultTool.FILE_READ,
  name: "read_file",
  description: "详细功能描述...",
  parameters: [
    {
      name: "path",
      required: true,
      instruction: `路径说明模板{{CWD}}{{MULTI_ROOT_HINT}}`,
      usage: "使用示例"
    }
  ]
}
```

**关键特性**:
- 模板变量 (`{{CWD}}`, `{{MULTI_ROOT_HINT}}`) 动态替换
- 上下文要求 (`contextRequirements`) 根据环境动态显示

#### 工具执行生命周期

**执行流程**:
1. **预检查**: 工具存在性、用户权限、模式限制
2. **资源管理**: 自动关闭不需要的浏览器会话
3. **执行分发**: 部分块 vs 完整块
4. **错误处理**: 统一的错误处理和日志记录

#### 参数验证与安全

**安全机制**:
1. **参数验证**: 必需参数检查
2. **路径控制**: `.clineignore` 规则阻止敏感路径访问
3. **权限系统**: 只读工具 vs 写入工具

```typescript
class ToolValidator {
  assertRequiredParams(block: ToolUse, ...params: ToolParamName[]): ValidationResult
  checkClineIgnorePath(relPath: string): ValidationResult
}
```

#### MCP 工具集成

**MCP 集成特性**:
1. **JSON 参数解析**: 自动转换 JSON 字符串
2. **自动批准**: 支持 MCP 工具的自动批准配置
3. **多媒体支持**: 处理文本、图片、资源等多种返回类型
4. **错误处理**: 保留 MCP 工具的错误信息

### 8.4 上下文与提示词管理

#### 上下文窗口管理

**安全边际策略**:
- **64k 上下文**: 27k 安全边际 (42%)
- **128k 上下文**: 30k 安全边际 (23%)
- **200k 上下文**: 40k 安全边际 (20%)
- **其他**: 80% 使用率上限

#### 消息历史压缩

**压缩层次**:
1. **文件内容优化**: 移除重复文件读取,截断长文件
2. **消息截断**: `half` (保留 1/2) → `quarter` (保留 1/4)
3. **任务摘要**: AI 生成对话摘要

**压缩策略**:
- 总是保留第一个用户-助手对话对
- 优先删除中间消息,保留首尾
- 渐进式:温和 → 激进

#### 系统提示词构建器

**构建流程**:
1. **组件构建**: 按顺序执行所有组件函数
2. **占位符准备**: 收集动态变量值
3. **模板解析**: `{{PLACEHOLDER}}` 替换
4. **后处理**: 清理和格式化

**模板引擎特性**:
- 嵌套对象支持 (`user.name` 点记法)
- 函数模板 (支持模板作为函数传入)
- 部分解析 (未找到的占位符保留原样)
- 验证功能 (可验证模板是否包含所有必需占位符)

### 8.5 用户交互与 UI 细节

#### 消息状态处理

**取消/中断状态处理**:
```typescript
const wasCancelled =
  message.status === "generating" &&
  (!isLast ||
   lastModifiedMessage?.ask === "resume_task" ||
   lastModifiedMessage?.ask === "resume_completed_task")

const isGenerating = message.status === "generating" && !wasCancelled
```

**关键逻辑**: 状态 + 位置双重验证,确保准确检测取消状态

#### 多模态输入处理

**验证规则**:
- **尺寸限制**: 最大 7500px × 7500px
- **数量限制**: 最多 5 个文件
- **格式支持**: 图片、文件混合上传

#### 工具调用可视化

**三种展示模式**:
1. **plain**: 纯文本
2. **markdown**: Markdown 格式
3. **rich**: 富媒体(图片、链接预览)

**智能识别**: 自动识别日志路径、链接等,提供交互元素

#### 可访问性支持

**可访问性**:
- **ARIA 标签**: 完整的屏幕阅读器支持
- **键盘导航**: 所有功能都可通过键盘访问
- **焦点管理**: 清晰的焦点顺序和指示

### 8.6 关键技术总结

#### 架构设计模式

1. **策略模式**: AI 提供商差异化处理
2. **工厂模式**: 工具处理器创建
3. **观察者模式**: 消息状态更新
4. **装饰器模式**: 工具能力扩展

#### 性能优化技术

1. **流式处理**: SSE/WebSocket 实时流式响应
2. **缓存策略**: 基于 content hash 的缓存
3. **并发控制**: 并行工具调用、任务队列

#### 可扩展性设计

1. **插件系统**: MCP 协议动态工具加载
2. **配置驱动**: 外部配置文件
3. **版本控制**: API 版本向后兼容

### 8.7 迁移到 Git Tutor AI

#### 可直接复用的组件

- ✅ **AI 提供商系统** (100% 可复用)
  - `cline/src/core/api/providers/` → `packages/core/src/ai/providers/`

- ✅ **工具系统** (95% 可复用)
  - `cline/src/core/task/tools/` → `packages/core/src/tools/`

- ✅ **上下文管理** (90% 可复用)
  - `cline/src/core/context/` → `packages/core/src/context/`

- ✅ **提示词系统** (100% 可复用)
  - `cline/src/core/prompts/` → `packages/core/src/prompts/`

#### 需要适配的组件

1. **gRPC 通信 → WebSocket/REST**
   ```typescript
   // 原 Cline (gRPC)
   await TaskServiceClient.cancelTask(EmptyRequest.create({}))

   // Git Tutor AI (WebSocket)
   await ws.send({ type: 'cancel_task', taskId })
   ```

2. **VSCode API → Web API**
   ```typescript
   // 原 Cline (VSCode)
   vscode.env.openExternal(Uri.file(filePath))

   // Git Tutor AI (Web)
   window.open(`file://${filePath}`)
   ```

3. **文件系统访问**
   ```typescript
   // 原 Cline (Node.js fs)
   await fs.readFile(filePath, 'utf-8')

   // Git Tutor AI (Web + Tauri)
   if (isTauri) {
     await invoke('read_file', { path: filePath })
   } else {
     await api.readFile({ path: filePath })
   }
   ```

### 8.8 开发检查清单

#### 核心功能

**AI 提供商系统**:
- [ ] OpenAI 集成
- [ ] Anthropic 集成
- [ ] Gemini 集成
- [ ] 模型差异化处理
- [ ] 流式响应
- [ ] 重试机制

**工具系统**:
- [ ] 工具定义和注册
- [ ] 参数验证
- [ ] 执行器
- [ ] MCP 集成
- [ ] 并发工具调用

**Git 集成**:
- [ ] 仓库管理
- [ ] 分支操作
- [ ] 提交管理
- [ ] 差异分析
- [ ] AI 辅助提交

**GitHub 集成**:
- [ ] 仓库搜索
- [ ] Issue/PR 管理
- [ ] Webhook 处理
- [ ] AI 代码审查

**代码分析**:
- [ ] Tree-sitter 集成
- [ ] 依赖分析
- [ ] 复杂度分析
- [ ] 架构可视化

**本地项目导入**:
- [ ] 项目扫描
- [ ] 类型检测
- [ ] 索引建立
- [ ] 项目管理

#### 技术细节

**状态管理**:
- [ ] 任务状态机
- [ ] Mutex 并发控制
- [ ] 状态持久化
- [ ] 断点恢复

**错误处理**:
- [ ] 错误分类系统
- [ ] 自动重试
- [ ] 降级策略
- [ ] 用户友好错误

**上下文管理**:
- [ ] 上下文窗口管理
- [ ] 消息压缩
- [ ] 文件优化
- [ ] 智能缓存

**提示词系统**:
- [ ] 模块化组件
- [ ] 模型变体
- [ ] 模板引擎
- [ ] 动态生成

**UI/UX**:
- [ ] 响应式设计
- [ ] 实时反馈
- [ ] 错误提示
- [ ] 可访问性

---

**📖 查看完整文档**: [CLINE_DEEP_DIVE.md](./CLINE_DEEP_DIVE.md) 包含所有代码示例、实现细节和最佳实践。

---

**文档版本**: v1.1
**创建日期**: 2025-01-07
**最后更新**: 2025-01-07
**维护者**: Git Tutor AI 团队
