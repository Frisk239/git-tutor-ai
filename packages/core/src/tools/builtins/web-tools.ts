// Web 搜索工具实现
// 支持多个搜索提供商: Bing, Google, DuckDuckGo

import { ToolDefinition, ToolResult, ToolContext } from '../types.js';
import { toolRegistry } from '../registry.js';
import { Logger } from '../../logging/logger.js';
import { getSearchManager } from '../web/manager.js';
import { SearchOptions, SearchRecency, SearchLocation, SearchProviderType } from '../web/types.js';

/**
 * Web 搜索工具
 */
export async function webSearchTool(
  context: ToolContext,
  params: {
    query: string;
    allowedDomains?: string[];
    blockedDomains?: string[];
    recency?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear' | 'noLimit';
    location?: 'cn' | 'us';
    limit?: number;
    provider?: 'bing' | 'google' | 'duckduckgo';
  }
): Promise<ToolResult> {
  const logger = new Logger('web_search');

  try {
    const {
      query,
      allowedDomains,
      blocked_domains,
      recency,
      location,
      limit = 10,
      provider,
    } = params;

    logger.info('Executing web search', {
      query,
      provider,
      limit,
    });

    // 构建搜索选项
    const options: SearchOptions = {
      query,
      allowedDomains,
      blocked_domains,
      recency: recency as SearchRecency,
      location: location as SearchLocation,
      limit,
    };

    // 执行搜索
    const searchManager = getSearchManager();
    const response = await searchManager.search(options, provider as SearchProviderType);

    // 格式化结果
    const formatted = formatSearchResults(response);

    logger.info('Web search completed', {
      resultCount: response.results.length,
      searchTime: response.searchTime,
    });

    return {
      success: true,
      data: {
        results: response.results,
        formatted,
        totalResults: response.totalResults,
        query: response.query,
        searchTime: response.searchTime,
      },
    };
  } catch (error: any) {
    logger.error('Web search failed', { error });

    return {
      success: false,
      error: error.message || 'Failed to perform web search',
      metadata: {
        code: error.code,
      },
    };
  }
}

/**
 * 格式化搜索结果
 */
function formatSearchResults(response: {
  results: any[];
  totalResults?: number;
  query?: string;
  searchTime?: number;
}): string {
  const lines: string[] = [];

  lines.push('# 搜索结果\n');

  if (response.query) {
    lines.push(`**查询**: ${response.query}\n`);
  }

  lines.push(
    `**找到 ${response.results.length} 个结果` +
      (response.totalResults ? ` (共 ${response.totalResults} 个)` : '') +
      (response.searchTime ? ` - 耗时 ${response.searchTime}ms` : '') +
      '\n'
  );

  lines.push('---\n');

  response.results.forEach((result, index) => {
    lines.push(`${index + 1}. **${result.title}**`);
    lines.push(`   ${result.url}`);

    if (result.domain) {
      lines.push(`   域名: ${result.domain}`);
    }

    if (result.snippet) {
      lines.push(`   ${result.snippet}`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 注册 Web 搜索工具
 */
export function registerWebTools(): void {
  const webSearchDefinition: ToolDefinition = {
    name: 'web_search',
    displayName: 'Web 搜索',
    description: `在互联网上搜索信息

支持多个搜索提供商:
- **Bing** - 需要 API key (推荐)
- **Google** - 需要 API key 和 Custom Search Engine ID
- **DuckDuckGo** - 不需要 API key (免费,但功能有限)

搜索选项:
- 域名过滤: 限制或排除特定域名
- 时间范围: 一天内/一周内/一月内/一年内
- 区域设置: 中国/美国
- 结果数量: 默认 10 个

环境变量配置:
\`\`\`bash
# Bing Search API (推荐)
BING_SEARCH_API_KEY=your_api_key

# Google Custom Search API
GOOGLE_SEARCH_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
\`\`\`

使用示例:
\`\`\`typescript
// 基本搜索
web_search({ query: "TypeScript 教程" })

// 域名过滤
web_search({
  query: "React hooks",
  allowedDomains: ["react.dev", "github.com"]
})

// 时间范围和区域
web_search({
  query: "AI 新闻",
  recency: "oneWeek",
  location: "cn",
  limit: 20
})
\`\`\``,

    category: 'web',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: '搜索查询字符串 (至少 2 个字符)',
        required: true,
      },
      {
        name: 'allowedDomains',
        type: 'array',
        description: "允许的域名白名单 (例如: ['github.com', 'stackoverflow.com'])",
        required: false,
      },
      {
        name: 'blocked_domains',
        type: 'array',
        description: '阻止的域名黑名单',
        required: false,
      },
      {
        name: 'recency',
        type: 'string',
        enum: ['oneDay', 'oneWeek', 'oneMonth', 'oneYear', 'noLimit'],
        description: '时间范围筛选',
        required: false,
      },
      {
        name: 'location',
        type: 'string',
        enum: ['cn', 'us'],
        description: '搜索区域 (cn=中国, us=美国)',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: '返回结果数量 (默认 10,最大 50)',
        required: false,
        minimum: 1,
        maximum: 50,
      },
      {
        name: 'provider',
        type: 'string',
        enum: ['bing', 'google', 'duckduckgo'],
        description: '搜索提供商 (不指定则使用默认提供商)',
        required: false,
      },
    ],
    permissions: [],
    enabled: true,
    handler: webSearchTool,
  };

  toolRegistry.register(webSearchDefinition);
}
