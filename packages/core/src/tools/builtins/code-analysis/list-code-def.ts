/**
 * LIST_CODE_DEF 工具
 * 列出文件中的代码定义（函数、类、变量等）
 * 参考 Cline 实现：cline/src/core/task/tools/handlers/listCodeDefinitionNames.ts
 */

import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';
import { ToolPermission } from '@git-tutor/shared';
import { toolRegistry } from '../../registry.js';

/**
 * 代码定义类型
 */
export enum DefinitionType {
  FUNCTION = 'function',
  CLASS = 'class',
  METHOD = 'method',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  INTERFACE = 'interface',
  TYPE_ALIAS = 'type_alias',
  ENUM = 'enum',
  IMPORT = 'import',
  EXPORT = 'export',
}

/**
 * 代码定义信息
 */
export interface CodeDefinition {
  name: string;
  type: DefinitionType;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  parentId?: string;
  signature?: string;
  docstring?: string;
}

/**
 * 工具参数
 */
interface ListCodeDefParams {
  file_path: string;
  limit?: number;
  types?: DefinitionType[];
}

/**
 * 基于正则表达式的代码解析器
 * 作为 tree-sitter 编译完成前的临时实现
 */
class RegexCodeParser {
  /**
   * 语言检测
   */
  detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      json: 'json',
      sh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
    };
    return languageMap[ext || ''] || 'unknown';
  }

  /**
   * 解析 TypeScript/JavaScript 代码
   */
  parseTypeScriptScript(content: string, filePath: string): CodeDefinition[] {
    const definitions: CodeDefinition[] = [];
    const lines = content.split('\n');

    // TypeScript/JavaScript 正则模式
    const patterns = [
      // 函数定义
      {
        regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm,
        type: DefinitionType.FUNCTION,
      },
      // 箭头函数
      {
        regex:
          /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
        type: DefinitionType.FUNCTION,
      },
      // 类定义
      {
        regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm,
        type: DefinitionType.CLASS,
      },
      // 接口定义
      {
        regex: /^(?:export\s+)?interface\s+(\w+)/gm,
        type: DefinitionType.INTERFACE,
      },
      // 类型别名
      {
        regex: /^(?:export\s+)?type\s+(\w+)\s*=/gm,
        type: DefinitionType.TYPE_ALIAS,
      },
      // 枚举定义
      {
        regex: /^(?:export\s+)?enum\s+(\w+)/gm,
        type: DefinitionType.ENUM,
      },
      // 常量
      {
        regex: /^(?:export\s+)?const\s+(\w+)\s*(?::\s*\w+)?\s*=/gm,
        type: DefinitionType.CONSTANT,
      },
      // 导入
      {
        regex: /^import\s+(?:\{([^}]+)\}|\*(?:\s+as\s+(\w+))?|\w+)\s+from\s+['"]([^'"]+)['"]/gm,
        type: DefinitionType.IMPORT,
      },
      // 导出
      {
        regex: /^export\s+(?:\{([^}]+)\}|\*(?:\s+as\s+(\w+))?)/gm,
        type: DefinitionType.EXPORT,
      },
    ];

    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        const matches = [...line.matchAll(pattern.regex)];
        matches.forEach((match) => {
          definitions.push({
            name: match[1] || match[2] || match[3] || 'unknown',
            type: pattern.type,
            line: index + 1,
            column: line.indexOf(match[0]) + 1,
            signature: line.trim(),
          });
        });
      });
    });

    return definitions;
  }

  /**
   * 解析 Python 代码
   */
  parsePython(content: string, filePath: string): CodeDefinition[] {
    const definitions: CodeDefinition[] = [];
    const lines = content.split('\n');

    // Python 正则模式
    const patterns = [
      // 函数定义
      {
        regex: /^(?:async\s+)?def\s+(\w+)\s*\(/gm,
        type: DefinitionType.FUNCTION,
      },
      // 类定义
      {
        regex: /^class\s+(\w+)/gm,
        type: DefinitionType.CLASS,
      },
      // 导入
      {
        regex: /^import\s+(\w+)/gm,
        type: DefinitionType.IMPORT,
      },
      {
        regex: /^from\s+(\w+)\s+import/gm,
        type: DefinitionType.IMPORT,
      },
    ];

    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        const matches = [...line.matchAll(pattern.regex)];
        matches.forEach((match) => {
          definitions.push({
            name: match[1],
            type: pattern.type,
            line: index + 1,
            column: line.indexOf(match[0]) + 1,
            signature: line.trim(),
          });
        });
      });
    });

    return definitions;
  }

  /**
   * 主解析函数
   */
  parse(content: string, filePath: string): CodeDefinition[] {
    const language = this.detectLanguage(filePath);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return this.parseTypeScriptScript(content, filePath);
      case 'python':
        return this.parsePython(content, filePath);
      default:
        return [];
    }
  }
}

/**
 * LIST_CODE_DEF 工具定义
 */
const listCodeDefTool: ToolDefinition = {
  name: 'list_code_def',
  displayName: '列出代码定义',
  description:
    '列出文件中的代码定义，包括函数、类、变量、导入等。支持 TypeScript、JavaScript、Python 等多种语言。',
  category: 'code-analysis',
  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: '要分析的文件路径',
      required: true,
    },
    {
      name: 'limit',
      type: 'number',
      description: '返回的最大定义数量（默认：全部）',
      required: false,
    },
    {
      name: 'types',
      type: 'array',
      description: '筛选特定类型的定义',
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      const { file_path, limit, types } = params as ListCodeDefParams;

      // 1. 读取文件内容
      const fs = await import('node:fs/promises');
      const content = await fs.readFile(file_path, 'utf-8');

      // 2. 解析代码定义
      const parser = new RegexCodeParser();
      let definitions = parser.parse(content, file_path);

      // 3. 按类型筛选
      if (types && types.length > 0) {
        definitions = definitions.filter((def) => types.includes(def.type));
      }

      // 4. 限制数量
      if (limit && limit > 0) {
        definitions = definitions.slice(0, limit);
      }

      // 5. 统计信息
      const stats = {
        total: definitions.length,
        byType: definitions.reduce(
          (acc, def) => {
            acc[def.type] = (acc[def.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      };

      return {
        success: true,
        data: {
          file_path,
          language: parser.detectLanguage(file_path),
          definitions,
          stats,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * 注册 LIST_CODE_DEF 工具
 */
export function registerListCodeDefTool(): void {
  toolRegistry.register(listCodeDefTool);
}

// 自动注册
registerListCodeDefTool();
