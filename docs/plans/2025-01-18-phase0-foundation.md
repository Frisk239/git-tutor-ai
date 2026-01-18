# Phase 0: Foundation Fixes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复现有项目配置问题，建立坚实的开发基础，确保项目可以正常构建和测试。

**Architecture:** 修复 TypeScript 配置错误（moduleResolution 不兼容），验证测试套件可运行，设置 CI/CD 流水线，为后续开发做好准备。

**Tech Stack:** TypeScript, PNPM, Turborepo, Vitest, GitHub Actions, Biome

**Prerequisites:**
- Node.js >= 20
- PNPM >= 9
- Git

---

## Task 1: Fix TypeScript Configuration Error

**Problem:** `tsconfig.base.json` 中 `module: "NodeNext"` 与 `moduleResolution: "Bundler"` 不兼容，导致构建失败。

**Files:**
- Modify: `tsconfig.base.json`

**Step 1: Read current TypeScript configuration**

Run: `cat tsconfig.base.json`

Expected output:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "Bundler",  // ❌ 错误
    ...
  }
}
```

**Step 2: Fix moduleResolution to match module**

Edit `tsconfig.base.json`, line 6:

Change:
```json
"moduleResolution": "Bundler",
```

To:
```json
"moduleResolution": "NodeNext",
```

**Step 3: Verify the fix**

Run: `pnpm build`

Expected output: Build completes successfully without TypeScript errors

**Step 4: Commit**

```bash
git add tsconfig.base.json
git commit -m "fix: correct moduleResolution to NodeNext for compatibility

- Changed moduleResolution from 'Bundler' to 'NodeNext'
- Fixes build error with module: 'NodeNext'
- Resolves TypeScript compilation issues in packages/shared"
```

---

## Task 2: Fix Shared Package Build

**Problem:** `packages/shared` 构建失败，需要确保它正确导出类型。

**Files:**
- Modify: `packages/shared/tsconfig.json`
- Modify: `packages/shared/src/index.ts`

**Step 1: Check shared package tsconfig**

Run: `cat packages/shared/tsconfig.json`

Expected: Extends `../../tsconfig.base.json`

**Step 2: Ensure index.ts exports all types**

Run: `cat packages/shared/src/index.ts`

If empty or incomplete, add:

```typescript
// Re-export all types
export * from './types';
export * from './enums';
export * from './constants';

// Re-export utilities
export * from './utils';
```

**Step 3: Test shared package build**

Run: `cd packages/shared && pnpm build`

Expected: Build completes, `dist/` directory created with type definitions

**Step 4: Verify no TypeScript errors**

Run: `pnpm -F @git-tutor/shared run check-types`

Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "fix: ensure shared package exports all types and builds correctly

- Added proper exports to index.ts
- Verified build output in dist/
- Fixed type checking for shared package"
```

---

## Task 3: Verify Core Package Builds

**Problem:** 确保 `packages/core` 可以正确构建，这是核心业务逻辑包。

**Files:**
- Create: `packages/core/dist/` (build output)

**Step 1: Build core package**

Run: `cd packages/core && pnpm build`

Expected: Build completes without errors

**Step 2: Check build output**

Run: `ls -la packages/core/dist/`

Expected: Directory exists with compiled JS and `.d.ts` files

**Step 3: Verify exports**

Run: `cat packages/core/package.json | grep -A 5 '"exports"'`

Expected:
```json
"exports": {
  ".": "./src/index.ts",
  "./package.json": "./package.json"
}
```

**Step 4: Commit if any changes needed**

If build works, skip commit. If changes were made:

```bash
git add packages/core/
git commit -m "fix: core package build configuration"
```

---

## Task 4: Run and Fix Test Suite

**Problem:** 测试套件需要可以运行，验证当前 87.5% 的覆盖率。

**Files:**
- Run: `tests/run-all-tests.js`

**Step 1: Install all dependencies**

Run: `pnpm install`

Expected: All packages installed successfully

**Step 2: Run comprehensive tool tests**

Run: `node tests/comprehensive/test-all-25-tools.js`

Expected: All 25 tools tests pass (100% pass rate)

**Step 3: Run infrastructure tests**

Run: `node tests/infrastructure/run-all-infrastructure-tests.js`

Expected: Configuration and retry mechanism tests pass

**Step 4: Run Git tools test (optional, requires Git repo)**

Run: `node tests/git/test-git-tools-on-cline.js`

Expected: Git tools pass on Cline project

**Step 5: Document test results**

Create: `docs/test-results-phase0.md`

```markdown
# Test Results - Phase 0 Foundation

**Date:** 2025-01-18

## Tool Tests
- Status: ✅ PASS
- Coverage: 25/25 tools (100%)
- Details: See tests/comprehensive/test-all-25-tools.js

## Infrastructure Tests
- Status: ✅ PASS
- Coverage: Configuration + Retry mechanisms
- Details: See tests/infrastructure/run-all-infrastructure-tests.js

## Git Integration Tests
- Status: ✅ PASS
- Tested on: Cline project (4,398 commits)
- Details: See tests/git/test-git-tools-on-cline.js

## Overall Coverage
- **87.5%** (35/40 features)
- All critical features tested
```

**Step 6: Commit test results**

```bash
git add docs/test-results-phase0.md
git commit -m "test: document phase 0 test results

- Tool tests: 25/25 pass (100%)
- Infrastructure tests: pass
- Git integration tests: pass
- Overall coverage: 87.5%"
```

---

## Task 5: Create Development Documentation

**Problem:** 开发者需要清晰的设置和运行指南。

**Files:**
- Create: `docs/DEVELOPMENT.md`
- Update: `README.md`

**Step 1: Create development guide**

Create: `docs/DEVELOPMENT.md`

```markdown
# Git Tutor AI - Development Guide

## Prerequisites

- Node.js >= 20
- PNPM >= 9.15.0
- Git
- PostgreSQL (for local development)

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Initialize database:
   ```bash
   cd packages/db
   pnpm prisma migrate dev
   ```

## Development Commands

### Build all packages
```bash
pnpm build
```

### Watch mode (development)
```bash
pnpm dev
```

### Run tests
```bash
# All tests
pnpm test

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Comprehensive tool tests
node tests/comprehensive/test-all-25-tools.js
```

### Code quality
```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm typecheck
```

## Project Structure

```
git-tutor-ai/
├── apps/
│   ├── web/           # Web application (Phase 1+)
│   └── desktop/       # Desktop application (Future)
├── packages/
│   ├── core/          # Core business logic
│   ├── db/            # Database (Prisma)
│   ├── shared/        # Shared types
│   └── api/           # API definitions
├── services/
│   └── api/           # API server (Phase 1+)
└── tests/             # Test suites
```

## Troubleshooting

### TypeScript build errors
- Ensure `moduleResolution` is set to `NodeNext` in `tsconfig.base.json`
- Run `pnpm clean && pnpm build`

### Test failures
- Check `.env` is configured correctly
- Ensure API keys are valid
- Run `node tests/run-all-tests.js` for detailed output

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
```

**Step 2: Update README with quick start**

Update: `README.md`

Add to "快速开始" section:

```markdown
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
# 编辑 .env 文件，添加你的 API keys

# 初始化数据库
cd packages/db && pnpm prisma migrate dev

# 运行测试（验证环境）
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
```

**Step 3: Commit documentation**

```bash
git add docs/DEVELOPMENT.md README.md
git commit -m "docs: add comprehensive development guide

- Added DEVELOPMENT.md with setup and commands
- Updated README.md with quick start guide
- Added troubleshooting section"
```

---

## Task 6: Setup CI/CD Pipeline

**Problem:** 自动化测试和代码质量检查，确保每次提交都通过测试。

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/code-quality.yml`

**Step 1: Create main CI workflow**

Create: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    name: Build and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v2
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Run tests
        run: node tests/run-all-tests.js
        env:
          # Add test API keys here (use GitHub Secrets)
          OPENAI_COMPATIBLE_API_KEY: ${{ secrets.TEST_API_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

**Step 2: Create code quality workflow**

Create: `.github/workflows/code-quality.yml`

```yaml
name: Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v2
        with:
          version: 9.15.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Biome check
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck
```

**Step 3: Create PR template**

Create: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Description
<!-- 描述这个 PR 的目的和改动 -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] All tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No new warnings generated
```

**Step 4: Commit CI/CD configuration**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows for CI/CD

- Added main CI workflow (build, test, coverage)
- Added code quality workflow (lint, typecheck)
- Added PR template
- Ensures all commits pass tests and quality checks"
```

---

## Task 7: Verify Complete Build Pipeline

**Problem:** 验证整个项目可以正确构建、测试和运行。

**Files:**
- Run: Full build and test pipeline

**Step 1: Clean all build artifacts**

Run: `pnpm clean`

Expected: All `dist/` and `build/` directories removed

**Step 2: Fresh build**

Run: `pnpm build`

Expected: All packages build successfully
```
✓ @git-tutor/shared
✓ @git-tutor/db
✓ @git-tutor/core
✓ @git-tutor/api
```

**Step 3: Run all tests**

Run: `node tests/run-all-tests.js`

Expected: All test suites pass
```
✅ 工具测试: 25/25 pass
✅ 基础设施测试: pass
✅ Git 集成测试: pass
Overall: 87.5% coverage
```

**Step 4: Run linting**

Run: `pnpm lint`

Expected: No linting errors

**Step 5: Run type checking**

Run: `pnpm typecheck`

Expected: No TypeScript errors

**Step 6: Create phase 0 completion report**

Create: `docs/phase0-completion-report.md`

```markdown
# Phase 0: Foundation - Completion Report

**Date:** 2025-01-18
**Status:** ✅ COMPLETE

## Completed Tasks

### ✅ Task 1: Fixed TypeScript Configuration
- Changed `moduleResolution` from "Bundler" to "NodeNext"
- All packages now build without TypeScript errors

### ✅ Task 2: Fixed Shared Package Build
- Ensured proper exports in index.ts
- Verified build output

### ✅ Task 3: Verified Core Package Build
- Core package builds successfully
- All types export correctly

### ✅ Task 4: Verified Test Suite
- Tool tests: 25/25 pass (100%)
- Infrastructure tests: pass
- Git integration tests: pass
- Overall coverage: 87.5%

### ✅ Task 5: Created Development Documentation
- DEVELOPMENT.md with setup and commands
- Updated README.md
- Added troubleshooting guide

### ✅ Task 6: Setup CI/CD Pipeline
- GitHub Actions CI workflow
- Code quality workflow
- PR template

### ✅ Task 7: Verified Complete Build Pipeline
- All packages build
- All tests pass
- Linting passes
- Type checking passes

## Metrics

- **Build Success Rate:** 100%
- **Test Pass Rate:** 100% (on tested features)
- **Code Coverage:** 87.5%
- **TypeScript Errors:** 0
- **Linting Errors:** 0

## Next Steps

**Phase 1: MVP - Chat Foundation**
- Implement Fastify server
- Implement WebSocket service
- Create React + Vite web app
- Implement basic chat UI

**Ready to start Phase 1?** → Use `docs/plans/2025-01-18-phase1-mvp-chat.md`

## Contributors

- Planning: Claude (AI Assistant)
- Architecture: Based on Cline + Git/GitHub integration
```

**Step 7: Commit and tag Phase 0 completion**

```bash
git add .
git commit -m "phase0: complete foundation fixes

✅ Fixed TypeScript configuration
✅ Verified all packages build
✅ Verified test suite (87.5% coverage)
✅ Created development documentation
✅ Setup CI/CD pipeline
✅ Verified complete build pipeline

All systems ready for Phase 1 development!"
```

**Step 8: Create git tag**

Run:
```bash
git tag -a v0.0.1-phase0 -m "Phase 0: Foundation Complete
- All build issues resolved
- Test suite verified
- CI/CD setup complete"
git push origin v0.0.1-phase0
```

---

## Summary

**Total Tasks:** 7
**Estimated Time:** 2-4 hours
**Dependencies:** None (can start immediately)

**Deliverables:**
- ✅ Working build system
- ✅ Passing test suite (87.5% coverage)
- ✅ Development documentation
- ✅ CI/CD pipeline
- ✅ Ready for Phase 1

**Next Phase:** Phase 1: MVP - Chat Foundation

---

**After completing this plan:**
1. Verify all tests pass: `node tests/run-all-tests.js`
2. Verify build works: `pnpm build`
3. Check CI/CD runs on GitHub
4. Move to Phase 1 planning
