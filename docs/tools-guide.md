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

Response:
```json
{
  "tools": [
    {
      "name": "read_file",
      "category": "filesystem",
      "displayName": "Read File",
      "description": "Read the contents of a file",
      "enabled": true,
      "experimental": false
    }
  ]
}
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

Response:
```json
{
  "success": true,
  "result": {
    "content": "..."
  }
}
```

### Get Tool Details
```bash
GET /api/tools/:toolName
```

## Error Handling

The system provides detailed error messages and suggestions:

- **File not found**: 检查文件路径是否正确
- **Permission denied**: 检查文件权限，确保有读写权限
- **Not a Git repository**: 先初始化 Git 仓库 (git init)
- **Tool not found**: 该工具可能未注册或名称错误

## WebSocket Events

When AI uses tools during chat, you'll receive these events:

```typescript
// Tool call started
{
  type: 'chat.tool_call',
  sessionId: string,
  tool: string,
  args: any
}

// Tool result received
{
  type: 'chat.tool_result',
  sessionId: string,
  tool: string,
  result: any
}
```

## See Also

- [Complete Tool List](./tool-inventory.md)
- [Tool Tests](../tests/comprehensive/)
