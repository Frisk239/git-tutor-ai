// 智能 Commit 消息生成
import { GitManager } from './manager.js';
import { aiManager } from '../ai/manager.js';
import { AIProvider } from '@git-tutor/shared';
import type { GitStatus } from './types.js';

/**
 * 生成智能提交消息的选项
 */
export interface SmartCommitOptions {
  provider?: AIProvider;
  model?: string;
  language?: 'zh-CN' | 'en-US';
  style?: 'conventional' | 'simple' | 'detailed';
  maxLength?: number;
  preview?: boolean; // ⭐ 新增: 是否只预览不提交
  stagedOnly?: boolean; // ⭐ 新增: 是否只分析已暂存的文件
  maxDiffLength?: number; // ⭐ 新增: 最大差异长度(防止 Token 超限)
}

/**
 * 生成的提交消息
 */
export interface GeneratedCommitMessage {
  title: string;
  body?: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'build';
  scope?: string;
  breaking?: boolean;
}

/**
 * 智能提交结果(包含预览信息)
 */
export interface SmartCommitResult {
  success: boolean;
  commit?: any;
  message: GeneratedCommitMessage;
  changes?: {
    files: number;
    insertions: number;
    deletions: number;
  };
  preview?: boolean; // ⭐ 新增: 是否为预览模式
}

/**
 * 智能 Commit 服务
 * 集成 AI 和 Git 操作
 */
export class SmartCommitService {
  private git: GitManager;
  private defaultProvider: AIProvider;

  constructor(git: GitManager, defaultProvider: AIProvider = AIProvider.ANTHROPIC) {
    this.git = git;
    this.defaultProvider = defaultProvider;
  }

  /**
   * 生成智能提交消息
   */
  async generateCommitMessage(options?: SmartCommitOptions): Promise<GeneratedCommitMessage> {
    // 1. 获取当前状态
    const status = await this.git.getStatus();
    const diff = await this.git.getDiff();

    if (status.files.length === 0) {
      throw new Error('没有需要提交的更改');
    }

    // 2. 准备上下文信息
    const context = await this.buildContext(status, diff, options);

    // 3. 调用 AI 生成提交消息
    const provider = options?.provider || this.defaultProvider;
    const model = options?.model || 'claude-sonnet-4-5-20250929';

    const prompt = this.buildPrompt(context, options);

    const response = await aiManager.chat(
      provider,
      {
        model,
        temperature: 0.3, // 降低温度以获得更一致的结果
        maxTokens: 500,
        systemPrompt: this.getSystemPrompt(options),
      },
      [{ role: 'user', content: prompt }]
    );

    // 4. 解析 AI 响应
    return this.parseCommitMessage(response.content, options);
  }

  /**
   * 执行智能提交(增强版:支持预览和更改统计)
   */
  async smartCommit(files?: string[], options?: SmartCommitOptions): Promise<SmartCommitResult> {
    // 1. 检查是否为预览模式
    if (options?.preview) {
      return this.generatePreview(files, options);
    }

    // 2. 生成提交消息
    const message = await this.generateCommitMessage(options);

    // 3. 构建完整的提交消息
    const fullMessage = this.formatCommitMessage(message);

    // 4. 执行提交前添加文件
    if (files && files.length > 0) {
      await this.git.add(files);
    } else if (options?.stagedOnly) {
      // 如果只提交已暂存的文件,不需要额外操作
    } else {
      // 添加所有更改
      await this.git.addAll();
    }

    // 5. 获取更改统计
    const diffs = await this.git.getDiff();
    const changes = this.calculateChanges(diffs);

    // 6. 执行提交
    const commit = await this.git.commit({
      message: fullMessage,
      allowEmpty: false,
    });

    return {
      success: true,
      commit,
      message,
      changes,
    };
  }

  /**
   * 生成预览(不实际提交)
   */
  private async generatePreview(
    files?: string[],
    options?: SmartCommitOptions
  ): Promise<SmartCommitResult> {
    // 1. 生成提交消息
    const message = await this.generateCommitMessage(options);

    // 2. 获取更改统计
    const diffs = await this.git.getDiff();
    const changes = this.calculateChanges(diffs);

    return {
      success: true,
      message,
      changes,
      preview: true,
    };
  }

  /**
   * 计算更改统计
   */
  private calculateChanges(diffs: any[]): {
    files: number;
    insertions: number;
    deletions: number;
  } {
    return diffs.reduce(
      (acc, diff) => ({
        files: acc.files + 1,
        insertions: acc.insertions + (diff.insertions || 0),
        deletions: acc.deletions + (diff.deletions || 0),
      }),
      { files: 0, insertions: 0, deletions: 0 }
    );
  }

  /**
   * 构建上下文信息(增强版:支持差异截断)
   */
  private async buildContext(
    status: GitStatus,
    diff: any[],
    options?: SmartCommitOptions
  ): Promise<string> {
    const parts: string[] = [];

    // 文件状态
    parts.push('## 更改的文件\n');
    status.files.forEach((file) => {
      parts.push(
        `- ${file.path} (${file.index !== ' ' ? 'staged' : 'unstaged'}: ${
          file.working || file.index
        })`
      );
    });

    // 差异摘要(带截断)
    if (diff.length > 0) {
      parts.push('\n## 代码更改详情\n');

      // 获取完整的差异内容
      const fullDiff = diff
        .map((d) => {
          const diffText = d.text || '';
          return `### ${d.file}\n${diffText}`;
        })
        .join('\n');

      // 应用截断限制(参考 Cline: 5000 字符)
      const maxDiffLength = options?.maxDiffLength || 5000;
      const truncatedDiff =
        fullDiff.length > maxDiffLength
          ? fullDiff.substring(0, maxDiffLength) + '\n\n[差异已截断,因为内容过大]'
          : fullDiff;

      parts.push(truncatedDiff);
    }

    // 获取最近的提交历史作为参考
    parts.push('\n## 最近的提交消息(作为参考)\n');
    const recentCommits = await this.git.getLog(5);
    recentCommits.forEach((commit) => {
      parts.push(`- ${commit.message.substring(0, 80)}`);
    });

    return parts.join('\n');
  }

  /**
   * 构建 AI 提示词
   */
  private buildPrompt(context: string, options?: SmartCommitOptions): string {
    const style = options?.style || 'conventional';
    const language = options?.language || 'zh-CN';

    const styleInstructions = {
      conventional:
        '使用 Conventional Commits 格式：type(scope): description\n\ntype 可以是: feat, fix, docs, style, refactor, test, chore, build',
      simple: '使用简单直接的描述，一行说明即可',
      detailed: '提供详细的标题和正文，包括：\n- 标题：简短描述\n- 正文：详细说明更改的原因和内容',
    };

    const languageInstruction =
      language === 'zh-CN'
        ? '请使用中文编写提交消息'
        : 'Please write the commit message in English';

    return `
${languageInstruction}

当前 Git 仓库的状态和更改：

${context}

${styleInstructions[style]}

请基于这些更改生成一个合适的提交消息。

${
  style === 'conventional'
    ? `
请以 JSON 格式返回：
{
  "type": "feat|fix|docs|style|refactor|test|chore|build",
  "scope": "可选的作用域",
  "title": "简短描述",
  "body": "详细说明（可选）",
  "breaking": true/false
}
`
    : ''
}
`;
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(options?: SmartCommitOptions): string {
    const language = options?.language || 'zh-CN';

    return language === 'zh-CN'
      ? `你是一个专业的代码提交消息生成助手。你的职责是：
1. 分析代码更改的内容和目的
2. 生成清晰、准确、规范的提交消息
3. 遵循项目的提交消息规范
4. 使用简洁明确的语言

好的提交消息特征：
- 简洁但信息丰富
- 使用祈使句（"添加"而不是"添加了"）
- 说明"为什么"而不是"是什么"
- 遵循一致性格式`
      : `You are a professional commit message generator. Your responsibilities are:
1. Analyze code changes to understand their purpose
2. Generate clear, accurate, and standardized commit messages
3. Follow project commit message conventions
4. Use concise and clear language

Good commit messages:
- Are concise but informative
- Use imperative mood ("Add" not "Added")
- Explain "why" not "what"
- Follow consistent formatting`;
  }

  /**
   * 解析 AI 返回的提交消息
   */
  private parseCommitMessage(
    content: string,
    options?: SmartCommitOptions
  ): GeneratedCommitMessage {
    // 尝试解析 JSON
    if (content.includes('{') && content.includes('}')) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            type: parsed.type || 'chore',
            scope: parsed.scope,
            title: parsed.title || parsed.description || 'Update',
            body: parsed.body,
            breaking: parsed.breaking || false,
          };
        }
      } catch {
        // JSON 解析失败，使用文本解析
      }
    }

    // 文本解析
    const lines = content.split('\n').filter((l) => l.trim());
    const title = lines[0] || 'Update';
    const body = lines.slice(1).join('\n').trim() || undefined;

    // 尝试识别 conventional commit 格式
    const conventionalMatch = title.match(/^(\w+)(?:\(([^)]+)\))?: (.+)/);
    if (conventionalMatch) {
      return {
        type: this.normalizeCommitType(conventionalMatch[1]),
        scope: conventionalMatch[2],
        title: conventionalMatch[3],
        body,
      };
    }

    return {
      type: 'chore',
      title,
      body,
    };
  }

  /**
   * 规范化提交类型
   */
  private normalizeCommitType(
    type: string
  ): 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'build' {
    const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'build'];

    if (validTypes.includes(type)) {
      return type as any;
    }

    // 简单的映射
    const mappings: Record<string, any> = {
      feature: 'feat',
      bugfix: 'fix',
      'bug fix': 'fix',
      documentation: 'docs',
      format: 'style',
      tests: 'test',
      ci: 'build',
    };

    return mappings[type.toLowerCase()] || 'chore';
  }

  /**
   * 格式化提交消息
   */
  private formatCommitMessage(message: GeneratedCommitMessage): string {
    let result = '';

    // type(scope): title
    if (message.scope) {
      result = `${message.type}(${message.scope}): ${message.title}`;
    } else {
      result = `${message.type}: ${message.title}`;
    }

    // BREAKING CHANGE 标记
    if (message.breaking) {
      result += '\n\nBREAKING CHANGE: ' + (message.body || message.title);
    }

    // 正文
    if (message.body && !message.breaking) {
      result += '\n\n' + message.body;
    }

    return result;
  }
}

/**
 * 导出工厂函数
 */
export function createSmartCommitService(
  git: GitManager,
  defaultProvider?: AIProvider
): SmartCommitService {
  return new SmartCommitService(git, defaultProvider);
}
