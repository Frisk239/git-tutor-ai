# 缺失工具实现计划

## 📋 概述

基于对 Cline 项目的深入分析，我们发现 Git Tutor AI 缺少 **11 个关键工具**。这些工具对于提供完整的 AI 编程助手体验至关重要。

## 🔍 工具对比分析

### 当前状态

| 类别 | Cline 工具数 | Git Tutor AI 工具数 | 缺失工具数 |
|------|-------------|-------------------|-----------|
| **文件操作** | 6 | 11 | -5 (我们有更多) |
| **Git 操作** | 0 | 6 | 0 (我们的强项) |
| **GitHub 操作** | 0 | 5 | 0 (我们的强项) |
| **Web 功能** | 3 | 0 | **3** ⚠️ |
| **MCP 协议** | 3 | 0 | **3** ⚠️ |
| **AI 辅助** | 3 | 0 | **3** ⚠️ |
| **任务管理** | 2 | 0 | **2** ⚠️ |
| **其他** | 8 | 0 | 8 |

**总计**: Cline 25 个工具 vs Git Tutor AI 22 个工具，但功能重叠度低

---

## 🎯 优先级实现计划

### 高优先级 (P0) - 核心功能缺失 ⚠️

这些工具是用户期望的基本功能，**必须优先实现**:

#### 1. **统一补丁系统** (apply_patch) 🔥

**功能描述**:
- 统一的文件编辑抽象层
- 支持 ADD、UPDATE、DELETE、MOVE 操作
- 基于差异的模糊匹配
- 错误恢复和回滚机制

**实现复杂度**: ⭐⭐⭐⭐⭐ (5/5)
**预计时间**: 8-12 小时
**依赖**: 无

**实现步骤**:
1. 创建补丁解析器
   - 定义补丁格式规范
   - 解析多种补丁格式 (unified diff, JSON patch)
2. 实现文件操作引擎
   - ADD: 创建新文件
   - UPDATE: 智能替换内容(带模糊匹配)
   - DELETE: 删除文件或内容
   - MOVE: 移动/重命名文件
3. 添加错误处理
   - 语法错误检测
   - 冲突解决机制
   - 回滚功能
4. 集成到工具系统

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/apply_patch.ts`
- `cline/src/core/task/tools/utils/applyDiffUtils.ts`

---

#### 2. **Web 搜索工具** (web_search) 🌐

**功能描述**:
- 执行网络搜索查询
- 域名过滤 (只搜索特定网站)
- 时间范围筛选 (一天内/一周内/一月内/一年内)
- 结果摘要和链接提取

**实现复杂度**: ⭐⭐⭐ (3/5)
**预计时间**: 4-6 小时
**依赖**: 搜索 API (Bing Search API / Google Custom Search API)

**实现步骤**:
1. 选择搜索服务提供商
   - 推荐: Bing Search API (价格更优惠)
   - 备选: Google Custom Search API
2. 实现搜索客户端
   - API 调用封装
   - 结果解析和标准化
   - 错误处理和重试
3. 添加过滤和排序功能
4. 集成到工具系统

**API 配置示例**:
```typescript
// .env
BING_SEARCH_API_KEY=your_api_key
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search
```

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/web_search.ts`

---

#### 3. **Web 获取工具** (web_fetch) 📄

**功能描述**:
- 抓取网页内容
- 智能内容清理 (去除广告、导航等)
- Markdown 格式转换
- 保留图片和链接
- 缓存支持

**实现复杂度**: ⭐⭐⭐ (3/5)
**预计时间**: 4-6 小时
**依赖**: 无 (使用 HTTP 客户端和 HTML 解析库)

**实现步骤**:
1. 实现 HTTP 客户端
   - 支持自定义 User-Agent
   - 处理重定向
   - 超时控制
2. HTML 清理和转换
   - 使用 Readability 或 Turndown
   - 提取主要内容
   - 转换为 Markdown
3. 添加缓存机制
4. 集成到工具系统

**推荐库**:
- `axios`: HTTP 客户端
- `turndown`: HTML 转 Markdown
- `jsdom`: DOM 解析

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/web_fetch.ts`

---

### 中优先级 (P1) - 增强用户体验 💡

这些工具能显著提升用户体验，**建议尽早实现**:

#### 4. **代码解释生成工具** (generate_explanation) 💬

**功能描述**:
- 基于 Git diff 的智能代码解释
- 流式传输解释评论
- 差异视图集成
- 支持多种编程语言

**实现复杂度**: ⭐⭐⭐⭐ (4/5)
**预计时间**: 6-8 小时
**依赖**: AI 提供商系统 (已有)

**实现步骤**:
1. 实现差异分析
   - 解析 Git diff
   - 提取更改的代码块
   - 识别语言类型
2. 集成 AI 生成解释
   - 构建提示词模板
   - 调用 AI 服务
   - 流式返回结果
3. 集成到编辑器/IDE
4. 添加缓存机制

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/generate_explanation.ts`

---

#### 5. **浏览器自动化工具** (browser_action) 🌐

**功能描述**:
- 启动和管理浏览器会话
- 点击、输入、滚动等操作
- 截图和页面内容获取
- 多标签页管理

**实现复杂度**: ⭐⭐⭐⭐⭐ (5/5)
**预计时间**: 12-16 小时
**依赖**: Puppeteer / Playwright

**实现步骤**:
1. 选择浏览器自动化框架
   - 推荐: Puppeteer (更成熟)
   - 备选: Playwright (功能更丰富)
2. 实现浏览器会话管理
   - 启动/关闭浏览器
   - 管理多个会话
   - 资源清理
3. 实现页面操作
   - 导航、点击、输入
   - 执行 JavaScript
   - 截图
4. 添加错误处理和超时控制
5. 集成到工具系统

**推荐库**:
- `puppeteer`: Chrome DevTools Protocol
- `playwright`: 跨浏览器支持

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/browser_action.ts`
- `cline/src/core/task/tools/utils/browser.ts`

---

#### 6. **对话精简工具** (condense) 🗜️

**功能描述**:
- 智能对话历史压缩
- 保持上下文连贯性
- 减少令牌使用
- 关键信息提取

**实现复杂度**: ⭐⭐⭐⭐ (4/5)
**预计时间**: 6-8 小时
**依赖**: AI 提供商系统 (已有)

**实现步骤**:
1. 实现对话分析
   - 提取关键信息
   - 识别冗余内容
   - 保留重要上下文
2. 集成 AI 压缩
   - 构建压缩提示词
   - 调用 AI 服务
   - 验证压缩质量
3. 添加触发机制
   - 自动触发 (令牌数超过阈值)
   - 手动触发
4. 缓存压缩结果

**Cline 参考文件**:
- `cline/src/core/task/tools/handlers/condense.ts` (可能在提示词系统中)

---

### 低优先级 (P2) - 高级功能 🚀

这些工具提供高级功能，**可以逐步实现**:

#### 7-9. **MCP 协议集成** (3个工具) 🔌

**功能描述**:
- `use_mcp_tool`: 使用 MCP 服务器提供的工具
- `access_mcp_resource`: 访问 MCP 服务器资源
- `load_mcp_documentation`: 加载 MCP 工具文档

**实现复杂度**: ⭐⭐⭐⭐⭐ (5/5)
**预计时间**: 16-24 小时
**依赖**: MCP SDK

**实现步骤**:
1. 安装 MCP SDK
   - `@modelcontextprotocol/sdk`
2. 实现 MCP 客户端
   - 连接到 MCP 服务器
   - 发现工具和资源
   - 调用工具和访问资源
3. 实现工具包装器
4. 实现资源访问器
5. 实现文档加载器
6. 集成到工具系统

**参考**:
- Model Context Protocol 官方文档
- `git-ai-core` 项目已有 MCP 实现

---

#### 10-11. **任务管理系统** (2个工具) 📋

**功能描述**:
- `plan_mode_respond`: 规划模式响应
- `act_mode_respond`: 执行模式响应

**实现复杂度**: ⭐⭐⭐⭐ (4/5)
**预计时间**: 8-12 小时
**依赖**: 无

**实现步骤**:
1. 实现任务状态机
   - PLANNING (规划中)
   - ACTING (执行中)
   - COMPLETED (已完成)
2. 实现规划模式
   - 任务分解
   - 步骤排序
   - 时间估算
3. 实现执行模式
   - 进度跟踪
   - 障碍处理
   - 状态更新
4. 集成到对话系统

---

## 📊 实施路线图

### 第一阶段 (Week 3): 核心功能 ⚠️

**目标**: 实现最关键的缺失工具

- ✅ Day 1-2: **统一补丁系统** (apply_patch)
- ✅ Day 3-4: **Web 搜索工具** (web_search)
- ✅ Day 5-6: **Web 获取工具** (web_fetch)

**交付物**:
- 3 个核心工具实现
- 单元测试覆盖
- 集成到工具系统
- 文档更新

**成功指标**:
- 所有工具通过单元测试
- 集成测试通过
- 工具系统覆盖度达到 90%

---

### 第二阶段 (Week 4): 用户体验增强 💡

**目标**: 实现提升用户体验的工具

- ✅ Day 1-2: **代码解释生成** (generate_explanation)
- ✅ Day 3-6: **浏览器自动化** (browser_action)
- ✅ Day 7-8: **对话精简** (condense)

**交付物**:
- 3 个增强工具实现
- 性能优化
- 用户体验改进

**成功指标**:
- 代码解释准确率 > 85%
- 浏览器操作稳定性 > 95%
- 对话压缩率 > 50%

---

### 第三阶段 (Week 5-6): 高级功能 🚀

**目标**: 实现高级功能

- ✅ Week 5: **MCP 协议集成** (3个工具)
- ✅ Week 6: **任务管理系统** (2个工具)

**交付物**:
- 5 个高级工具实现
- 完整的工具生态
- 对等 Cline 的功能覆盖

**成功指标**:
- 工具总数达到 30+
- 功能覆盖度达到 95%+
- 与 Cline 差距 < 5%

---

## 🔧 技术栈选择

### Web 功能

| 功能 | 推荐库 | 说明 |
|------|--------|------|
| **HTTP 客户端** | `axios` | Promise based HTTP client |
| **HTML 解析** | `cheerio` | Fast HTML parsing |
| **Markdown 转换** | `turndown` | HTML to Markdown converter |
| **搜索 API** | Bing Search API | 比 Google 更优惠 |

### 浏览器自动化

| 框架 | 优势 | 劣势 |
|------|------|------|
| **Puppeteer** | 更成熟、社区大 | 只支持 Chrome |
| **Playwright** | 跨浏览器、功能丰富 | 相对较新 |

**推荐**: Puppeteer (稳定性优先)

### MCP 协议

| SDK | 说明 |
|-----|------|
| **@modelcontextprotocol/sdk** | 官方 SDK |

---

## 📝 实现注意事项

### 1. 错误处理

所有工具必须:
- ✅ 使用统一错误处理器 (`getErrorHandler()`)
- ✅ 实现重试机制 (最大 3 次)
- ✅ 提供清晰的错误消息
- ✅ 记录详细的错误日志

### 2. 性能优化

- ✅ 使用缓存减少重复计算
- ✅ 实现超时控制 (默认 30s)
- ✅ 支持流式传输 (大文件、长响应)
- ✅ 资源自动清理

### 3. 参数验证

- ✅ 使用 `ToolValidator` 验证参数
- ✅ 提供清晰的验证错误消息
- ✅ 支持参数格式检查

### 4. 统计记录

- ✅ 使用 `ToolStatsManager` 记录执行
- ✅ 记录成功率和性能指标
- ✅ 定期导出统计数据

### 5. 文档

每个工具必须包含:
- ✅ 功能描述
- ✅ 参数说明
- ✅ 使用示例
- ✅ 错误处理说明

---

## 🎯 成功标准

### 定量指标

- ✅ 工具总数: **30+** (vs Cline 25)
- ✅ 功能覆盖度: **95%+**
- ✅ 单元测试覆盖率: **80%+**
- ✅ 工具成功率: **90%+**

### 定性指标

- ✅ 用户体验与 Cline 相当
- ✅ 功能完整性达到 Cline 水平
- ✅ 代码质量和可维护性
- ✅ 文档完善度

---

## 📚 参考资源

### Cline 项目

- **工具处理器**: `cline/src/core/task/tools/handlers/`
- **工具定义**: `cline/src/shared/tools.ts`
- **工具工具**: `cline/src/core/task/tools/utils/`

### 技术文档

- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Puppeteer**: https://pptr.dev/
- **Bing Search API**: https://docs.microsoft.com/azure/cognitive-services/bing-web-search/

---

## 🚀 立即开始

最紧迫的任务是实现 **统一补丁系统 (apply_patch)**，这是 Cline 的核心功能之一。

建议从以下文件开始:
1. 阅读 `cline/src/core/task/tools/handlers/apply_patch.ts`
2. 阅读 `cline/src/core/task/tools/utils/applyDiffUtils.ts`
3. 创建 `packages/core/src/tools/builtins/patch-tools.ts`
4. 实现补丁解析和应用逻辑

**预计完成时间**: 8-12 小时
**优先级**: 🔥 P0 (最高)
