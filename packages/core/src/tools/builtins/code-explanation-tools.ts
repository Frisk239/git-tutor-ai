// 代码解释生成工具
// 基于 Git diff 生成 AI 驱动的代码变更解释

import { ToolDefinition, ToolResult, ToolContext } from '../types.js';
import { toolRegistry } from '../registry.js';
import { Logger } from '../../logging/logger.js';
import { aiManager } from '../../ai/manager.js';
import { AIProvider } from '@git-tutor/shared';
import { GitManager } from '../../git/manager.js';

/**
 * 代码解释生成选项
 */
export interface GenerateExplanationOptions {
  filePath?: string; // 文件路径(可选,默认为所有更改)
  language?: string; // 编程语言(可选,自动检测)
  style?: 'summary' | 'detailed' | 'inline'; // 解释风格
  includeDiff?: boolean; // 是否在解释中包含 diff
  maxLength?: number; // 最大解释长度
}

/**
 * 生成的代码解释
 */
export interface CodeExplanation {
  summary: string; // 总体摘要
  changes: Array<{
    file: string; // 文件路径
    explanation: string; // 该文件的变更解释
    linesChanged?: number; // 变更行数
  }>;
  diff?: string; // diff 内容(如果请求)
  language?: string; // 检测到的编程语言
}

/**
 * 代码解释生成工具
 */
export async function generateExplanationTool(
  _context: ToolContext,
  params: GenerateExplanationOptions
): Promise<ToolResult> {
  const logger = new Logger('generate_explanation');

  try {
    const {
      filePath,
      language,
      style = 'detailed',
      includeDiff = false,
      maxLength = 2000,
    } = params;

    logger.info('Generating code explanation', {
      filePath,
      style,
      maxLength,
    });

    // 1. 获取 Git 仓库
    const git = new GitManager(process.cwd());

    // 2. 获取状态
    const status = await git.getStatus();
    if (status.files.length === 0) {
      return {
        success: false,
        error: '没有需要解释的代码变更',
      };
    }

    // 3. 获取 diff
    const diff = await git.getDiff();
    if (!diff || diff.length === 0) {
      return {
        success: false,
        error: '无法获取代码差异',
      };
    }

    // 4. 过滤文件(如果指定了 filePath)
    let filteredDiff = diff;
    if (filePath) {
      filteredDiff = diff.filter((d) => d.file === filePath);
      if (filteredDiff.length === 0) {
        return {
          success: false,
          error: `文件 ${filePath} 没有变更`,
        };
      }
    }

    // 5. 检测编程语言
    const detectedLanguage = language || detectLanguage(filteredDiff);

    // 6. 构建提示词
    const prompt = buildExplanationPrompt(filteredDiff, {
      language: detectedLanguage,
      style,
      includeDiff,
    });

    // 7. 调用 AI 生成解释
    const response = await aiManager.chat(
      AIProvider.ANTHROPIC,
      {
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.3,
        maxTokens: Math.min(maxLength, 4000),
        systemPrompt: getSystemPrompt(detectedLanguage),
      },
      [{ role: 'user', content: prompt }]
    );

    // 8. 解析 AI 响应
    const explanation = parseExplanation(response.content, filteredDiff);

    logger.info('Code explanation generated', {
      filesCount: explanation.changes.length,
      language: explanation.language,
    });

    return {
      success: true,
      data: {
        explanation,
        formatted: formatExplanation(explanation),
      },
    };
  } catch (error: any) {
    logger.error('Failed to generate explanation', { error });

    return {
      success: false,
      error: error.message || 'Failed to generate code explanation',
    };
  }
}

/**
 * 检测编程语言
 */
function detectLanguage(diff: any[]): string {
  const filePath = diff[0]?.file || '';

  // 基于文件扩展名检测
  const extMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.sh': 'Shell',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.xml': 'XML',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.md': 'Markdown',
  };

  for (const [ext, lang] of Object.entries(extMap)) {
    if (filePath.endsWith(ext)) {
      return lang;
    }
  }

  // 默认返回未知
  return 'Unknown';
}

/**
 * 构建解释提示词
 */
function buildExplanationPrompt(
  diff: any[],
  options: {
    language?: string;
    style?: string;
    includeDiff?: boolean;
  }
): string {
  const { language, style, includeDiff } = options;

  // 构建 diff 文本
  const diffText = diff
    .map((d) => {
      let text = `## 文件: ${d.file}\n\n`;
      if (d.patch) {
        text += d.patch;
      }
      return text;
    })
    .join('\n\n');

  const styleInstructions: Record<string, string> = {
    summary: '请提供一个简洁的摘要(2-3句话),说明这些变更的主要目的。',
    detailed: '请提供详细的解释,包括:\n- 变更的目的\n- 主要修改点\n- 技术细节\n- 潜在影响',
    inline: '请为每个代码块添加行内注释,解释变更的逻辑。',
  };

  const languageHint = language ? `\n编程语言: ${language}` : '';

  return `
请分析以下代码变更,并生成清晰的解释。

${styleInstructions[style || 'detailed']}${languageHint}

## 代码差异

${diffText}

${includeDiff ? '' : '\n请基于以上差异生成解释。'}
`;
}

/**
 * 获取系统提示词
 */
function getSystemPrompt(language?: string): string {
  const basePrompt = `你是一个专业的代码审查员和技术写作专家。你的职责是:
1. 分析代码差异,理解变更的意图
2. 生成清晰、准确、易懂的解释
3. 使用简洁专业的语言
4. 突出关键的技术细节和设计决策

好的代码解释特征:
- 简洁但信息丰富
- 既有技术深度又易于理解
- 说明"为什么"而不只是"是什么"
- 使用一致的格式和术语`;

  if (language && language !== 'Unknown') {
    return `${basePrompt}\n\n你正在分析 ${language} 代码,请使用该语言的最佳实践和术语。`;
  }

  return basePrompt;
}

/**
 * 解析 AI 响应
 */
function parseExplanation(content: string, diff: any[]): CodeExplanation {
  // 尝试解析结构化响应
  const lines = content.split('\n').filter((l) => l.trim());

  // 提取摘要(第一段或前几行)
  let summary = '';
  let summaryEnd = false;

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('##')) {
      continue; // 跳过标题
    }
    if (line.trim() === '') {
      if (summary) {
        summaryEnd = true;
      }
      continue;
    }
    if (!summaryEnd) {
      summary += (summary ? ' ' : '') + line.trim();
    }
    if (summary.length > 200) {
      break; // 限制摘要长度
    }
  }

  // 为每个文件生成解释
  const changes = diff.map((d) => {
    // 简单实现:为每个文件使用整个解释
    // 更好的实现是让 AI 生成结构化的 JSON 响应
    return {
      file: d.file,
      explanation: content.substring(0, 500), // 截取前 500 字符
      linesChanged: d.changes ? d.changes.insertions + d.changes.deletions : undefined,
    };
  });

  // 检测语言
  const language = detectLanguage(diff);

  return {
    summary: summary || '代码变更已生成',
    changes,
    language,
  };
}

/**
 * 格式化解释
 */
function formatExplanation(explanation: CodeExplanation): string {
  const lines: string[] = [];

  // 标题和摘要
  lines.push('# 代码变更解释\n');
  lines.push(`**摘要**: ${explanation.summary}\n`);

  // 编程语言
  if (explanation.language) {
    lines.push(`**编程语言**: ${explanation.language}\n`);
  }

  lines.push('---\n');

  // 每个文件的解释
  explanation.changes.forEach((change, index) => {
    lines.push(`## ${index + 1}. ${change.file}\n`);
    lines.push(`${change.explanation}\n`);

    if (change.linesChanged !== undefined) {
      lines.push(`**变更行数**: ${change.linesChanged}\n`);
    }

    lines.push('---\n');
  });

  return lines.join('\n');
}

/**
 * 注册代码解释生成工具
 */
export function registerCodeExplanationTools(): void {
  const generateExplanationDefinition: ToolDefinition = {
    name: 'generate_explanation',
    displayName: '代码解释生成',
    description: `基于 Git diff 生成 AI 驱动的代码变更解释

功能特点:
- **智能语言检测**: 自动识别编程语言
- **多种解释风格**: 摘要、详细、行内注释
- **上下文感知**: 理解代码变更的意图和影响
- **技术深度**: 提供专业级别的代码审查

使用场景:
- 代码审查: 快速理解 PR 的变更
- 文档生成: 自动生成变更说明
- 学习辅助: 理解他人的代码修改
- 合并决策: 评估代码变更的影响

解释风格:
- **summary**: 简洁摘要(2-3句话)
- **detailed**: 详细解释(默认,包含目的、细节、影响)
- **inline**: 行内注释(为代码添加注释)

使用示例:
\`\`\`typescript
// 基本使用(详细解释)
generate_explanation({})

// 特定文件
generate_explanation({
  filePath: "src/index.ts"
})

// 简洁摘要
generate_explanation({
  style: "summary",
  maxLength: 500
})

// 指定编程语言
generate_explanation({
  language: "TypeScript",
  style: "detailed"
})

// 包含 diff
generate_explanation({
  includeDiff: true,
  style: "detailed"
})
\`\`\`

注意:
- 需要在 Git 仓库中运行
- 需要有暂存或未暂存的变更
- 使用 AI 生成,需要配置 AI Provider`,

    category: 'ai',
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: '要解释的文件路径(可选,默认解释所有变更)',
        required: false,
      },
      {
        name: 'language',
        type: 'string',
        description: '编程语言(可选,自动检测)',
        required: false,
      },
      {
        name: 'style',
        type: 'string',
        enum: ['summary', 'detailed', 'inline'],
        description: '解释风格 (默认: detailed)',
        required: false,
      },
      {
        name: 'includeDiff',
        type: 'boolean',
        description: '是否在解释中包含 diff',
        required: false,
      },
      {
        name: 'maxLength',
        type: 'number',
        description: '最大解释长度(字符,默认 2000,最小 100,最大 10000)',
        required: false,
      },
    ],
    permissions: [],
    enabled: true,
    handler: generateExplanationTool,
  };

  toolRegistry.register(generateExplanationDefinition);
}
