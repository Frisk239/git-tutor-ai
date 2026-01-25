# File Content API Documentation

## Overview

This API provides file operations for the Git Tutor AI project, including reading files, listing directories, and generating diffs.

## Endpoints

### Base URL: `http://localhost:3001/api/files`

### 1. Read File
- **Method**: GET
- **Path**: `/read`
- **Query Parameters**:
  - `path` (required): File path to read
- **Response**:
  ```json
  {
    "success": true,
    "data": "file content",
    "error": null
  }
  ```
- **Error Responses**:
  - 400: Missing path parameter
  - 404: File not found

### 2. List Directory
- **Method**: GET
- **Path**: `/list`
- **Query Parameters**:
  - `path` (optional): Directory path to list (defaults to current directory)
- **Response**:
  ```json
  {
    "success": true,
    "data": ["file1.txt", "file2.js", "dir/"],
    "error": null
  }
  ```
- **Error Responses**:
  - 500: Directory listing failed

### 3. Generate Diff
- **Method**: GET
- **Path**: `/diff`
- **Query Parameters**:
  - `path` (required): File path to generate diff for
- **Response**:
  ```json
  {
    "success": true,
    "data": "diff output",
    "error": null
  }
  ```
- **Error Responses**:
  - 400: Missing path parameter
  - 500: Diff generation failed

## Security Features

The API includes security measures to prevent:
- Path traversal attacks (e.g., `../../etc/passwd`)
- Absolute path access
- Invalid characters in file paths
- Directory names that could be used for confusion (e.g., `...`)

## Usage Examples

### Read a file
```bash
curl "http://localhost:3001/api/files/read?path=package.json"
```

### List current directory
```bash
curl "http://localhost:3001/api/files/list"
```

### List specific directory
```bash
curl "http://localhost:3001/api/files/list?path=src"
```

### Generate diff for a file
```bash
curl "http://localhost:3001/api/files/diff?path=src/App.tsx"
```

## Implementation Details

### File Structure
```
services/api/src/
├── routes/
│   ├── files.ts          # File API routes
│   └── index.ts          # Route registration
├── services/
│   └── file.service.ts   # File service implementation
└── tsconfig.json         # TypeScript configuration
```

### Key Components

1. **fileRoutes**: Fastify route definitions for file operations
2. **fileService**: Business logic for file operations with security validation
3. **Security Validation**: Path validation to prevent attacks

### Dependencies
- Fastify: Web framework
- @git-tutor/core/tools: Tool execution for file operations
- path: Node.js path utilities

## Testing

The API has been implemented according to the Task 6 requirements:
- ✓ Created fileRoutes with 3 endpoints
- ✓ Registered routes in server.ts (routes/index.ts)
- ✓ Implemented error handling
- ✓ Added TypeScript support
- ✓ Included security measures

## Notes

- The API uses the existing fileService from Phase 2
- Routes are registered with prefix `/api/files`
- All file operations are validated for security
- The API integrates with the tool execution system from @git-tutor/core/tools
