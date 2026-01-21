import { useState, useEffect, useCallback } from 'react';

interface DiffResult {
  oldValue: string;
  newValue: string;
  language: string;
}

interface UseDiffReturn {
  diff: DiffResult | null;
  loading: boolean;
  error: string | null;
  loadDiff: (filePath: string) => Promise<void>;
}

// 从文件扩展名映射到语言
const getLanguageFromExtension = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    // 常见编程语言
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    vue: 'vue',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    clj: 'clojure',
    ex: 'elixir',
    elixir: 'elixir',

    // 标记语言
    md: 'markdown',
    mdx: 'markdown',
    txt: 'text',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',

    // 样式语言
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    stylus: 'stylus',
    postcss: 'postcss',

    // 脚本语言
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    ps1: 'powershell',
    bat: 'batch',
    cmd: 'batch',

    // 配置文件
    env: 'ini',
    conf: 'ini',
    config: 'ini',
    ini: 'ini',

    // 数据库
    sql: 'sql',
    prql: 'prql',

    // 其他
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    caddyfile: 'caddyfile',
    wasm: 'wasm',
    proto: 'protobuf',
  };

  return languageMap[extension] || 'text';
};

// Mock data for development when API is not available
const getMockDiffData = (filePath: string): DiffResult => {
  const language = getLanguageFromExtension(filePath);

  const mockFiles: Record<string, { old: string; new: string }> = {
    'index.js': {
      old: `function greet(name) {
  console.log("Hello, " + name);
  return "Hello, " + name;
}

const result = greet("World");
console.log(result);`,
      new: `function greet(name) {
  const greeting = \`Hello, \${name}\`;
  console.log(greeting);
  return greeting;
}

const result = greet("World");
console.log(result);`
    },
    'styles.css': {
      old: `.container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background-color: #f0f0f0;
}

.header {
  font-size: 24px;
  color: #333;
}`,
      new: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header {
  font-size: 28px;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 16px;
}`
    },
    'package.json': {
      old: `{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "build": "webpack"
  }
}`,
      new: `{
  "name": "my-project",
  "version": "1.0.1",
  "scripts": {
    "start": "node index.js",
    "build": "webpack",
    "test": "jest",
    "lint": "eslint src/**"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}`
    },
    'README.md': {
      old: `# My Project

This is my awesome project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const myProject = new MyProject();
\`\`\``,
      new: `# My Project

This is my awesome project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
import MyProject from './my-project';

const myProject = new MyProject();
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request`
    }
  };

  const mockData = mockFiles[filePath.split('/').pop() || ''] || {
    old: '// Original code\nconsole.log("Hello");',
    new: '// Modified code\nconsole.log("Hello, World!");'
  };

  return {
    oldValue: mockData.old,
    newValue: mockData.new,
    language,
  };
};

export const useDiff = (filePath: string): UseDiffReturn => {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDiff = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      // 如果提供了 filePath，使用它，否则使用参数
      const targetPath = filePath || path;

      // 模拟 API 请求延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      // TODO: 实际 API 调用将在 Task 6 中实现
      // const response = await fetch(`/api/files/diff?path=${encodeURIComponent(targetPath)}`);
      // if (!response.ok) {
      //   throw new Error('Failed to fetch diff data');
      // }
      // const data = await response.json();
      // setDiff(data);

      // 使用 mock 数据
      const mockData = getMockDiffData(targetPath);
      setDiff(mockData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // 即使出错，也提供 mock 数据
      const mockData = getMockDiffData(filePath || path);
      setDiff(mockData);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  // 如果提供了 filePath，在组件挂载时自动加载
  useEffect(() => {
    if (filePath) {
      loadDiff(filePath);
    }
  }, [filePath, loadDiff]);

  return {
    diff,
    loading,
    error,
    loadDiff,
  };
};

export default useDiff;