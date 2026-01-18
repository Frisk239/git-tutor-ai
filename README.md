# Git Tutor AI

> AI 驱动的开发助手平台 - 集成 Git/GitHub/代码分析的全栈开发工具

## 🚀 快速开始

### 环境要求
- Node.js >= 20
- PNPM >= 9.15.0
- Git

### 安装
```bash
# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 文件,添加你的 API keys

# 初始化数据库
cd packages/db && pnpm prisma migrate dev

# 运行测试(验证环境)
node tests/run-all-tests.js
```

### 开发
```bash
# 启动开发模式
pnpm dev

# 运行测试
pnpm test

# 构建所有包
pnpm build
```

📖 查看 [开发指南](./docs/DEVELOPMENT.md) 了解更多

## ✅ 测试状态

**当前测试覆盖率**: **87.5%** (35/40 功能)

- ✅ 工具测试: 25/25 (100%)
- ✅ Git 集成测试: 在 Cline 项目验证
- ✅ GitHub API 测试: 真实 API 验证
- ✅ AI 集成测试: GLM-4.7 + Tavily
- ✅ 基础设施: 配置系统 + 重试机制

**测试通过率**: **100%** (在已测试功能中)

📖 查看 [测试指南](./README_TESTING.md) 了解详情

## 📁 项目结构

```
git-tutor-ai/
├── apps/                      # 应用层
│   ├── web/                   # Web 前端应用
│   └── desktop/               # 桌面应用 (Electron/Tauri)
├── packages/                  # 共享包
│   ├── api/                   # API 定义和客户端
│   ├── db/                    # 数据库层 (Prisma)
│   ├── core/                  # 核心业务逻辑
│   ├── shared/                # 共享类型和工具
│   └── config/                # 配置管理
├── services/                  # 后端服务
│   └── api/                   # API 服务器
├── turbo.json                 # Turborepo 配置
├── pnpm-workspace.yaml        # PNPM workspace
└── package.json               # 根配置
```

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js 20 + TypeScript + Fastify/Hono
- **数据库**: PostgreSQL + Prisma ORM
- **工具**: Turborepo + pnpm + Biome

## 📖 文档

- [重构计划](./REFACTOR_PLAN.md)
- [Cline 深度分析](./CLINE_DEEP_DIVE.md)

## 📄 许可证

MIT
