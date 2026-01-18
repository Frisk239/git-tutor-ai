# Git Tutor AI - 测试指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd git-tutor-ai
pnpm install
```

### 2. 配置环境变量

已创建 `.env` 文件,配置如下:

```bash
# OpenAI Compatible API (智谱 GLM-4.7)
OPENAI_COMPATIBLE_API_KEY=ab56f44321834f2eb99ee2c3689620e8.XyPYnm3IsJExlb4C
OPENAI_COMPATIBLE_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_COMPATIBLE_MODEL=glm-4.7

DEFAULT_AI_PROVIDER=openai_compatible
DEFAULT_SEARCH_PROVIDER=duckduckgo
LOG_LEVEL=debug
```

### 3. 运行测试

#### 快速测试 (AI 工具)

```bash
pnpm ts-node tests/tools/quick-test.ts
```

这会测试:
- ✅ GLM-4.7 API 连接
- ✅ 基本的对话功能
- ✅ Token 使用统计

#### 完整测试 (所有工具)

```bash
pnpm ts-node tests/tools/test-all-tools.ts
```

这会测试:
- ✅ Git 工具 (6 个)
- ✅ 文件系统工具 (11 个)
- ✅ 补丁工具 (1 个)
- ✅ Web 工具 (2 个)
- ✅ AI 工具 (1 个)
- ⚠️ GitHub 工具 (需要 GITHUB_TOKEN)

---

## 📋 测试工具列表

### Git 工具 (6 个)
1. `git_status` - 查看仓库状态
2. `git_diff` - 查看差异
3. `git_log` - 查看历史
4. `git_commit` - 提交代码 (跳过)
5. `git_smart_commit` - AI 智能提交 (跳过)
6. `git_create_branch` - 创建分支 (跳过)

### 文件系统工具 (11 个)
1. `create_directory` - 创建目录
2. `write_file` - 写入文件
3. `read_file` - 读取文件
4. `get_file_stats` - 文件统计
5. `list_files` - 列出文件
6. `edit_file` - 编辑文件
7. `copy_file` - 复制文件
8. `move_file` - 移动文件
9. `search_files` - 搜索文件
10. `delete_file` - 删除文件
11. `delete_file` - 删除文件 (清理)

### 补丁工具 (1 个)
1. `apply_patch` - 应用补丁

### Web 工具 (2 个)
1. `web_search` - Web 搜索 (DuckDuckGo)
2. `web_fetch` - Web 获取

### AI 工具 (1 个)
1. `generate_explanation` - 代码解释生成

### GitHub 工具 (5 个)
- 需要 GITHUB_TOKEN 环境变量
- 测试脚本中已跳过

---

## 🔧 手动测试

### 测试 Git 工具

```typescript
import { toolExecutor } from '@git-tutor/core/tools';

const result = await toolExecutor.execute(
  "git_status",
  {},
  context
);
```

### 测试 Web 搜索

```typescript
const result = await toolExecutor.execute(
  "web_search",
  {
    query: "TypeScript tutorial",
    provider: "duckduckgo",
    limit: 5
  },
  context
);
```

### 测试 AI 工具

```typescript
const result = await toolExecutor.execute(
  "generate_explanation",
  {
    style: "summary",
    maxLength: 500
  },
  context
);
```

---

## 📊 测试报告

测试完成后会输出:

```
📊 测试总结

总测试数: 25
✅ 成功: 23
❌ 失败: 2
📈 成功率: 92.0%

❌ 失败的工具:
  - github_search_repos: Missing GITHUB_TOKEN
  - github_create_issue: Missing GITHUB_TOKEN

⏱️  平均耗时: 245ms
🐌 最慢工具: web_fetch (1234ms)
⚡ 最快工具: git_status (12ms)
```

---

## 🐛 故障排除

### 问题 1: 找不到模块

```
错误: Cannot find module '@git-tutor/core/tools'
```

**解决方案**:
```bash
pnpm install
pnpm build
```

### 问题 2: API 连接失败

```
错误: Failed to connect to API
```

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 检查 API Key 是否正确
3. 检查 Base URL 是否正确
4. 检查网络连接

### 问题 3: Git 仓库错误

```
错误: Not a git repository
```

**解决方案**:
```bash
cd git-tutor-ai
git init
```

---

## 📝 测试检查清单

- [ ] 快速测试通过 (AI 工具)
- [ ] Git 工具测试通过
- [ ] 文件系统工具测试通过
- [ ] 补丁工具测试通过
- [ ] Web 搜索测试通过
- [ ] Web 获取测试通过
- [ ] 代码解释生成测试通过
- [ ] GitHub 工具测试 (可选)

---

## 🎯 下一步

测试通过后,可以:

1. **实现浏览器自动化** - 添加 `browser_action` 工具
2. **实现对话精简** - 添加 `condense` 工具
3. **完善文档** - 创建使用指南和示例
4. **性能优化** - 添加缓存和监控
5. **用户界面** - 创建 CLI 界面

---

**最后更新**: 2025-01-07
