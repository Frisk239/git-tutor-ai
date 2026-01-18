// Tavily AI Search API 提供商
// 参考: https://docs.tavily.com/docs/tavily-api/rest/search

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../../logging/logger.js';
import {
  SearchProvider,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchError,
  SearchRecency,
  SearchLocation,
} from '../types.js';

/**
 * Tavily Search API 配置
 */
export interface TavilySearchConfig {
  apiKey: string;
  endpoint?: string;
  timeout?: number;
}

/**
 * Tavily API 响应
 */
interface TavilyApiResponse {
  answer?: string; // AI 生成的答案
  query: string; // 搜索查询
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
    raw_content?: string;
  }>;
}

/**
 * Tavily Search 提供商
 */
export class TavilySearchProvider implements SearchProvider {
  name = 'Tavily';
  private client: AxiosInstance;
  private logger: Logger;
  private config: Required<TavilySearchConfig>;

  constructor(config: TavilySearchConfig) {
    this.logger = new Logger('TavilySearchProvider');
    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint || 'https://api.tavily.com/search',
      timeout: config.timeout || 30000, // Tavily 推荐更长超时
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 检查提供商是否可用
   */
  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * 执行搜索
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // 参数验证
      this.validateOptions(options);

      // 构建 Tavily 查询参数
      const requestBody = this.buildQueryParams(options);

      this.logger.debug('Executing Tavily search', { requestBody });

      // 调用 API (POST 请求)
      const response = await this.client.post<TavilyApiResponse>('', requestBody);

      // 解析响应
      const results = this.parseResponse(response.data);

      const searchTime = Date.now() - startTime;

      this.logger.info('Tavily search completed', {
        resultCount: results.length,
        searchTime,
        hasAnswer: !!response.data.answer,
      });

      return {
        results,
        totalResults: results.length,
        query: options.query,
        searchTime,
      };
    } catch (error: any) {
      this.logger.error('Tavily search failed', { error });
      throw this.handleError(error);
    }
  }

  /**
   * 验证搜索选项
   */
  private validateOptions(options: SearchOptions): void {
    if (!options.query || options.query.trim().length < 2) {
      throw new SearchError('Search query must be at least 2 characters', 'INVALID_QUERY');
    }

    if (options.allowedDomains && options.blocked_domains) {
      throw new SearchError(
        'Cannot specify both allowedDomains and blocked_domains',
        'CONFLICTING_PARAMS'
      );
    }

    if (!this.config.apiKey) {
      throw new SearchError('Tavily API key is not configured', 'API_KEY_MISSING');
    }
  }

  /**
   * 构建 Tavily 查询参数
   */
  private buildQueryParams(options: SearchOptions): Record<string, any> {
    const params: Record<string, any> = {
      api_key: this.config.apiKey,
      query: options.query,
      max_results: options.limit || 10,
      search_depth: 'basic', // basic 或 advanced
      include_answer: true, // 包含 AI 生成的答案
      include_raw_content: false, // 不包含原始 HTML
      include_images: false, // 不包含图片
      include_image_descriptions: false,
    };

    // 域名过滤 (Tavily 支持 include_domains 和 exclude_domains)
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      params.include_domains = options.allowedDomains;
    }

    if (options.blocked_domains && options.blocked_domains.length > 0) {
      params.exclude_domains = options.blocked_domains;
    }

    // 时间范围 (Tavily 使用 days 参数)
    if (options.recency && options.recency !== SearchRecency.NO_LIMIT) {
      const daysMap: Record<SearchRecency, number> = {
        [SearchRecency.ONE_DAY]: 1,
        [SearchRecency.ONE_WEEK]: 7,
        [SearchRecency.ONE_MONTH]: 30,
        [SearchRecency.ONE_YEAR]: 365,
        [SearchRecency.NO_LIMIT]: 0,
      };
      params.days = daysMap[options.recency];
    }

    // 内容详细程度 (使用 search_depth)
    if (options.contentSize === 'high') {
      params.search_depth = 'advanced';
    }

    // 区域设置
    if (options.location === SearchLocation.CN) {
      // Tavily 默认支持中文,无需特殊设置
      // 可以通过 topic 参数优化搜索类型
      params.topic = 'general';
    } else if (options.location === SearchLocation.US) {
      params.topic = 'general';
    }

    return params;
  }

  /**
   * 解析 Tavily API 响应
   */
  private parseResponse(data: TavilyApiResponse): SearchResult[] {
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((item) => {
      const result: SearchResult = {
        title: item.title,
        url: item.url,
        snippet: item.content?.substring(0, 500), // 截取前 500 字符作为摘要
        relevanceScore: item.score,
      };

      // 提取域名
      try {
        const urlObj = new URL(item.url);
        result.domain = urlObj.hostname;
      } catch {
        // 忽略无效 URL
      }

      return result;
    });
  }

  /**
   * 处理错误
   */
  private handleError(error: any): SearchError {
    if (error.response) {
      const statusCode = error.response.status;
      const message =
        error.response.data?.error?.message || error.response.data?.message || error.message;

      switch (statusCode) {
        case 401:
          return new SearchError('Invalid Tavily API key', 'INVALID_API_KEY', statusCode);
        case 429:
          return new SearchError('Tavily API rate limit exceeded', 'RATE_LIMITED', statusCode);
        case 400:
          return new SearchError(`Invalid request: ${message}`, 'BAD_REQUEST', statusCode);
        case 402:
          return new SearchError('Tavily API credit exhausted', 'CREDIT_EXHAUSTED', statusCode);
        default:
          return new SearchError(
            `Tavily API error (${statusCode}): ${message}`,
            'API_ERROR',
            statusCode
          );
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new SearchError('Search request timeout', 'TIMEOUT');
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new SearchError('Cannot connect to Tavily API', 'CONNECTION_ERROR');
    }

    return new SearchError(error.message || 'Unknown search error', 'UNKNOWN_ERROR');
  }
}
