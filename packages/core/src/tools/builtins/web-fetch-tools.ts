// Web 获取工具实现
// 抓取和清理网页内容

import { ToolDefinition, ToolResult, ToolContext } from '../types.js';
import { toolRegistry } from '../registry.js';
import { Logger } from '../../logging/logger.js';
import { getWebFetcher } from '../web/fetcher.js';
import { WebFetchOptions, WebPageContent, WebFetchError } from '../web/fetch-types.js';

/**
 * Web 获取工具
 */
export async function webFetchTool(
  context: ToolContext,
  params: {
    url: string;
    timeout?: number;
    maxContentLength?: number;
    retainImages?: boolean;
    extractLinks?: boolean;
    withImagesSummary?: boolean;
    withLinksSummary?: boolean;
    returnFormat?: 'markdown' | 'text' | 'html';
  }
): Promise<ToolResult> {
  const logger = new Logger('web_fetch');

  try {
    const {
      url,
      timeout = 30000,
      maxContentLength = 50000,
      retainImages = false,
      extractLinks = false,
      withImagesSummary = true,
      withLinksSummary = true,
      returnFormat = 'markdown',
    } = params;

    logger.info('Executing web fetch', {
      url,
      returnFormat,
      maxContentLength,
    });

    // 构建获取选项
    const options: WebFetchOptions = {
      url,
      timeout,
      maxContentLength,
      retainImages,
      extractLinks,
      withImagesSummary,
      withLinksSummary,
      returnFormat,
    };

    // 执行获取
    const fetcher = getWebFetcher();
    const content = await fetcher.fetch(options);

    // 格式化结果
    const formatted = formatWebContent(content);

    logger.info('Web fetch completed', {
      url: content.url,
      title: content.title,
      contentLength: content.content.length,
      fetchTime: content.fetchTime,
    });

    return {
      success: true,
      data: {
        ...content,
        formatted,
      },
    };
  } catch (error: any) {
    logger.error('Web fetch failed', { error });

    return {
      success: false,
      error: error.message || 'Failed to fetch webpage',
      metadata: {
        code: error.code,
        statusCode: error.statusCode,
        url: error.url,
      },
    };
  }
}

/**
 * 格式化网页内容
 */
function formatWebContent(content: WebPageContent): string {
  const lines: string[] = [];

  // 标题
  if (content.title) {
    lines.push(`# ${content.title}\n`);
  }

  // URL
  lines.push(`**来源**: ${content.url}\n`);

  // 统计信息
  const stats: string[] = [];
  if (content.wordCount) {
    stats.push(`${content.wordCount} 字`);
  }
  if (content.fetchTime) {
    stats.push(`耗时 ${content.fetchTime}ms`);
  }
  if (stats.length > 0) {
    lines.push(`**统计**: ${stats.join(' | ')}\n`);
  }

  lines.push('---\n');

  // 图片摘要
  if (content.imagesSummary) {
    lines.push(`**图片**: ${content.imagesSummary}\n`);
  }

  // 链接摘要
  if (content.linksSummary) {
    lines.push(`**链接**: ${content.linksSummary}\n`);
  }

  lines.push('---\n');

  // 主要内容
  lines.push(content.content);

  // 链接列表
  if (content.links && content.links.length > 0) {
    lines.push('\n---\n');
    lines.push('## 页面链接\n');
    content.links.forEach((link, index) => {
      lines.push(`${index + 1}. ${link}`);
    });
  }

  return lines.join('\n');
}

/**
 * 注册 Web 获取工具
 */
export function registerWebFetchTools(): void {
  const webFetchDefinition: ToolDefinition = {
    name: 'web_fetch',
    displayName: 'Web 获取',
    description: `抓取和清理网页内容

功能特点:
- **智能内容清理**: 移除导航、页脚、广告等无关内容
- **多种输出格式**: Markdown, 纯文本, HTML
- **链接提取**: 自动提取页面所有链接
- **图片提取**: 自动提取页面所有图片
- **内容截断**: 防止超大内容导致 Token 超限
- **错误处理**: 详细的错误信息和状态码

支持的格式:
- **markdown**: 默认格式,适合 AI 处理
- **text**: 纯文本格式
- **html**: 原始 HTML (已清理)

使用示例:
\`\`\`typescript
// 基本使用
web_fetch({ url: "https://example.com" })

// 限制内容长度
web_fetch({
  url: "https://example.com",
  maxContentLength: 10000,
  returnFormat: "markdown"
})

// 提取链接和图片
web_fetch({
  url: "https://example.com",
  extractLinks: true,
  withImagesSummary: true,
  withLinksSummary: true
})

// 返回纯文本
web_fetch({
  url: "https://example.com",
  returnFormat: "text"
})
\`\`\`

清理的内容:
- 移除脚本和样式
- 移除导航栏和页脚
- 移除广告和侧边栏
- 移除隐藏元素
- 保留主要内容和链接`,

    category: 'web',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: '要获取的网页 URL',
        required: true,
        format: 'url',
      },
      {
        name: 'timeout',
        type: 'number',
        description: '超时时间(毫秒,默认 30000)',
        required: false,
        minimum: 1000,
        maximum: 120000,
      },
      {
        name: 'maxContentLength',
        type: 'number',
        description: '最大内容长度(字符,默认 50000)',
        required: false,
        minimum: 100,
        maximum: 200000,
      },
      {
        name: 'returnFormat',
        type: 'string',
        enum: ['markdown', 'text', 'html'],
        description: '返回格式 (默认: markdown)',
        required: false,
      },
      {
        name: 'extractLinks',
        type: 'boolean',
        description: '是否提取页面链接',
        required: false,
      },
      {
        name: 'retainImages',
        type: 'boolean',
        description: '是否在内容中保留图片',
        required: false,
      },
      {
        name: 'withImagesSummary',
        type: 'boolean',
        description: '是否包含图片摘要',
        required: false,
      },
      {
        name: 'withLinksSummary',
        type: 'boolean',
        description: '是否包含链接摘要',
        required: false,
      },
    ],
    permissions: [],
    enabled: true,
    handler: webFetchTool,
  };

  toolRegistry.register(webFetchDefinition);
}
