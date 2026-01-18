# Git 集成架构说明

## 📋 目录

1. [整体设计](#整体设计)
2. [核心组件](#核心组件)
3. [AI + Git 集成](#ai--git-集成)
4. [使用场景](#使用场景)
5. [API 设计](#api-设计)
6. [未来扩展](#未来扩展)

---

## 整体设计

### 设计理念

Git 集成采用**三层架构**：

1. **基础层 (GitManager)**: 封装所有 Git 操作
2. **智能层 (SmartCommitService)**: AI + Git 协作服务
3. **工具层 (Git Tools)**: AI 可调用的工具接口

### 架构图

```text
┌──────────────────────────────────────────────────────────┐
│                      用户界面层                            │
│  - 前端 Git 操作面板                                       │
│  - AI 对话界面                                            │
│  - 代码浏览器                                             │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│                      API 路由层                           │
│  POST /api/git/commit    - 执行提交                       │
│  POST /api/git/branch    - 分支操作                       │
│  POST /api/git/merge     - 合并操作                       │
│  POST /api/git/status    - 查看状态                       │
│  POST /api/smart-commit  - 智能提交                       │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│                   核心业务逻辑层                          │
│                                                           │
│  ┌──────────────────┐        ┌─────────────────┐        │
│  │   GitManager     │        │ SmartCommitSvc  │        │
│  │  - clone()       │ ←────→ │ - generateMsg() │        │
│  │  - commit()      │        │ - smartCommit() │        │
│  │  - branch()      │        └─────────────────┘        │
│  │  - merge()       │               ↓                   │
│  │  - status()      │        ┌─────────────────┐        │
│  └──────────────────┘        │  AIManager      │        │
│             ↓                │ - chat()        │        │
│  ┌──────────────────┐        │ - chatStream()  │        │
│  │   Git Tools      │        └─────────────────┘        │
│  │ (AI可调用)       │                                     │
│  │ - git_status     │                                     │
│  │ - git_commit     │                                     │
│  │ - git_branch     │                                     │
│  └──────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│                    基础设施层                              │
│  - simple-git (Git 操作)                                  │
│  - AI SDKs (21+ 提供商)                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. GitManager (基础 Git 操作)

**职责**: 封装所有 Git 命令，提供类型安全的 API

**核心方法**:

```typescript
class GitManager {
  // 仓库操作
  clone(url, targetPath, options?)  // 克隆仓库
  getRepositoryInfo()               // 获取仓库信息
  isGitRepo()                       // 检查是否是 Git 仓库

  // 分支操作
  getBranches()                     // 获取所有分支
  getCurrentBranch()                // 获取当前分支
  createBranch(name, startPoint?)   // 创建分支
  checkout(branch)                  // 切换分支
  deleteBranch(name, force?)        // 删除分支

  // 提交操作
  getStatus()                       // 获取状态
  add(files)                        // 添加文件
  addAll()                          // 添加所有文件
  commit(options)                   // 提交更改
  getLog(maxCount?)                 // 获取提交历史

  // 同步操作
  pull(remote?, branch?)            // 拉取更改
  push(remote?, branch?)            // 推送更改

  // 高级操作
  merge(branch, options?)           // 合并分支
  rebase(options?)                  // 变基操作
  getDiff(file?)                    // 获取差异

  // 远程操作
  getRemotes()                      // 获取远程仓库
  addRemote(name, url)              // 添加远程仓库
  removeRemote(name)                // 删除远程仓库
}
```

**特点**:
- ✅ 完整的 TypeScript 类型支持
- ✅ Promise-based API
- ✅ 错误处理和异常捕获
- ✅ 支持所有常见 Git 操作

---

### 2. SmartCommitService (智能提交服务)

**职责**: 集成 AI 生成智能提交消息

**工作流程**:

```text
1. 分析更改
   ├─ 获取 Git 状态 (staged/unstaged 文件)
   ├─ 获取代码差异 (insertions/deletions)
   └─ 获取最近提交历史 (作为参考)

2. 构建上下文
   ├─ 文件列表和状态
   ├─ 代码更改统计
   └─ 提交历史参考

3. AI 生成消息
   ├─ 选择提供商 (Anthropic/OpenAI/Gemini...)
   ├─ 构建 Prompt (包含上下文)
   ├─ 调用 AI API
   └─ 解析响应

4. 执行提交
   ├─ 格式化消息 (Conventional Commits)
   ├─ 调用 git.commit()
   └─ 返回结果
```

**核心方法**:

```typescript
class SmartCommitService {
  // 生成智能提交消息
  generateCommitMessage(options?)
    → Promise<GeneratedCommitMessage>

  // 执行智能提交
  smartCommit(files?, options?)
    → Promise<{ commit, message }>
}
```

**支持的提交风格**:

1. **Conventional Commits** (推荐)
   ```
   feat(auth): add OAuth2 login support

   - Implement Google OAuth2 flow
   - Add token refresh mechanism
   - Update user profile endpoint
   ```

2. **Simple** (简洁)
   ```
   Add OAuth2 login
   ```

3. **Detailed** (详细)
   ```
   Add OAuth2 login support

   This commit adds OAuth2 authentication using Google provider.
   It includes token management and user profile synchronization.
   ```

**支持的提交类型**:
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `test` - 测试相关
- `chore` - 构建/工具链相关
- `build` - 构建系统

---

### 3. Git Tools (AI 工具接口)

**职责**: 暴露给 AI 调用的 Git 工具

**工具定义** (基于 Cline 工具架构):

```typescript
const gitTools = [
  {
    name: "git_status",
    description: "查看 Git 仓库当前状态",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async (git: GitManager) => {
      return await git.getStatus();
    }
  },

  {
    name: "git_commit",
    description: "提交代码更改",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "提交消息"
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "要提交的文件列表（可选）"
        }
      }
    },
    handler: async (git: GitManager, params) => {
      if (params.files) {
        await git.add(params.files);
      } else {
        await git.addAll();
      }
      return await git.commit({ message: params.message });
    }
  },

  {
    name: "git_create_branch",
    description: "创建并切换到新分支",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "分支名称"
        },
        startPoint: {
          type: "string",
          description: "起始点（可选）"
        }
      }
    },
    handler: async (git: GitManager, params) => {
      await git.createBranch(params.name, params.startPoint);
      await git.checkout(params.name);
      return { success: true, branch: params.name };
    }
  },

  {
    name: "git_smart_commit",
    description: "使用 AI 生成提交消息并提交",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "要提交的文件列表（可选）"
        },
        style: {
          type: "string",
          enum: ["conventional", "simple", "detailed"],
          description: "提交消息风格"
        }
      }
    },
    handler: async (git: GitManager, smartCommit: SmartCommitService, params) => {
      return await smartCommit.smartCommit(params.files, { style: params.style });
    }
  }
];
```

---

## AI + Git 集成

### 使用场景 1: AI 对话中的 Git 操作

**用户输入**:
```
帮我创建一个 feature-user-auth 分支
```

**AI 处理流程**:
```text
1. 识别意图
   └─ 用户想创建新分支

2. 选择工具
   └─ git_create_branch

3. 执行操作
   ├─ 调用 git.createBranch("feature-user-auth")
   ├─ 调用 git.checkout("feature-user-auth")
   └─ 获取结果

4. 返回回复
   └─ "✅ 已创建并切换到 feature-user-auth 分支"
```

---

### 使用场景 2: 智能 Commit

**用户输入**:
```
帮我提交这些更改
```

**AI 处理流程**:
```text
1. 识别意图
   └─ 用户想提交代码

2. 选择工具
   └─ git_smart_commit

3. 执行操作
   ├─ 获取 Git 状态
   ├─ 获取代码差异
   ├─ 构建上下文
   ├─ 调用 AI 生成消息
   │   └─ "feat(auth): add OAuth2 login support"
   ├─ 执行 git.commit()
   └─ 返回结果

4. 返回回复
   └─ "✅ 已提交代码！
       类型: feat
       描述: add OAuth2 login support
       Commit: abc123"
```

---

### 使用场景 3: 代码审查 + Git

**用户输入**:
```
帮我审查这个 PR 的更改，如果没问题就合并
```

**AI 处理流程**:
```text
1. 获取 PR 信息
   ├─ 调用 GitHub API
   └─ 获取文件差异

2. AI 代码审查
   ├─ 分析代码质量
   ├─ 检查潜在问题
   └─ 生成审查报告

3. 如果通过
   ├─ git.merge(pr.branch)
   ├─ git.push()
   └─ 返回成功消息
```

---

## API 设计

### REST API 端点

```typescript
// Git 基础操作
POST   /api/git/status          // 获取状态
POST   /api/git/clone           // 克隆仓库
POST   /api/git/pull            // 拉取
POST   /api/git/push            // 推送

// 分支操作
GET    /api/git/branches        // 获取所有分支
POST   /api/git/branch/create   // 创建分支
POST   /api/git/branch/checkout // 切换分支
DELETE /api/git/branch/:name    // 删除分支

// 提交操作
POST   /api/git/stage           // 添加文件
POST   /api/git/unstage         // 取消暂存
POST   /api/git/commit          // 普通提交
POST   /api/git/smart-commit    // 智能提交 ⭐

// 合并操作
POST   /api/git/merge           // 合并分支
POST   /api/git/rebase          // 变基
POST   /api/git/resolve         // 解决冲突

// AI 增强
POST   /api/git/review          // AI 代码审查
POST   /api/git/resolve-conflict // AI 冲突解决
```

### 请求/响应示例

#### 智能提交

**请求**:
```json
POST /api/git/smart-commit

{
  "files": ["src/auth.ts", "src/auth.test.ts"],
  "options": {
    "style": "conventional",
    "language": "zh-CN",
    "provider": "anthropic"
  }
}
```

**响应**:
```json
{
  "success": true,
  "commit": {
    "hash": "abc123...",
    "author": "John Doe",
    "date": "2025-01-07T10:30:00Z",
    "message": "feat(auth): add OAuth2 login support"
  },
  "generatedMessage": {
    "type": "feat",
    "scope": "auth",
    "title": "add OAuth2 login support",
    "body": "Implement Google OAuth2 authentication flow..."
  }
}
```

---

## 未来扩展

### 短期计划

1. **Git 冲突解决辅助**
   - AI 分析冲突
   - 提供解决建议
   - 自动合并简单冲突

2. **Commit 历史分析**
   - 分析代码演进
   - 识别问题模式
   - 生成可视化报告

3. **多仓库管理**
   - Monorepo 支持
   - Submodule 管理
   - 依赖分析

### 长期计划

1. **智能分支策略**
   - 基于 GitFlow 的自动化
   - 自动创建 release 分支
   - 自动合并 hotfix

2. **AI 代码审查**
   - 集成 GitHub PR
   - 自动代码审查
   - 建议改进

3. **可视化 Git**
   - 提交历史图谱
   - 分支关系图
   - 代码热度图

---

## 总结

Git 集成的核心价值：

✅ **双重体验**
- 用户可以直接调用 Git 操作
- AI 也可以通过工具调用 Git

✅ **智能增强**
- AI 生成提交消息
- AI 辅助冲突解决
- AI 代码审查

✅ **无缝集成**
- 与 21 个 AI 提供商集成
- 支持自定义工作流
- 完整的 TypeScript 类型

这就是我们的 Git 集成架构！🚀
