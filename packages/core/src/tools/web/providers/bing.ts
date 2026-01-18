// Bing Search API 提供商
// 参考: https://docs.microsoft.com/azure/cognitive-services/bing-web-search/

import axios, { AxiosInstance } from "axios";
import { Logger } from "../../../logging/logger.js";
import {
  SearchProvider,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchError,
  SearchRecency,
  SearchLocation,
} from "../types.js";

/**
 * Bing Search API 配置
 */
export interface BingSearchConfig {
  apiKey: string;
  endpoint?: string;
  timeout?: number;
}

/**
 * Bing Search API v7 响应
 */
interface BingApiResponse {
  webPages?: {
    value?: Array<{
      name: string;
      url: string;
      snippet?: string;
      dateLastCrawled?: string;
    }>;
    totalEstimatedMatches?: number;
  };
}

/**
 * Bing Search 提供商
 */
export class BingSearchProvider implements SearchProvider {
  name = "Bing";
  private client: AxiosInstance;
  private logger: Logger;
  private config: Required<BingSearchConfig>;

  constructor(config: BingSearchConfig) {
    this.logger = new Logger("BingSearchProvider");
    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint || "https://api.bing.microsoft.com/v7.0/search",
      timeout: config.timeout || 10000,
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        "Ocp-Apim-Subscription-Key": this.config.apiKey,
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

      // 构建 Bing 查询参数
      const params = this.buildQueryParams(options);

      this.logger.debug("Executing Bing search", { params });

      // 调用 API
      const response = await this.client.get<BingApiResponse>("", { params });

      // 解析响应
      const results = this.parseResponse(response.data);

      const searchTime = Date.now() - startTime;

      this.logger.info("Bing search completed", {
        resultCount: results.length,
        searchTime,
      });

      return {
        results,
        totalResults: response.data.webPages?.totalEstimatedMatches,
        query: options.query,
        searchTime,
      };
    } catch (error: any) {
      this.logger.error("Bing search failed", { error });
      throw this.handleError(error);
    }
  }

  /**
   * 验证搜索选项
   */
  private validateOptions(options: SearchOptions): void {
    if (!options.query || options.query.trim().length < 2) {
      throw new SearchError(
        "Search query must be at least 2 characters",
        "INVALID_QUERY"
      );
    }

    if (options.allowedDomains && options.blocked_domains) {
      throw new SearchError(
        "Cannot specify both allowedDomains and blocked_domains",
        "CONFLICTING_PARAMS"
      );
    }

    if (!this.config.apiKey) {
      throw new SearchError("Bing API key is not configured", "API_KEY_MISSING");
    }
  }

  /**
   * 构建 Bing 查询参数
   */
  private buildQueryParams(options: SearchOptions): Record<string, any> {
    const params: Record<string, any> = {
      q: options.query,
      count: options.limit || 10,
      offset: options.offset || 0,
    };

    // 域名过滤
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      params.q = `${params.q} site:${options.allowedDomains.join(" OR site:")}`;
    }

    if (options.blocked_domains && options.blocked_domains.length > 0) {
      params.q = `${params.q} -site:${options.blocked_domains.join(" -site:")}`;
    }

    // 时间范围
    if (options.recency && options.recency !== SearchRecency.NO_LIMIT) {
      const freshnessMap: Record<SearchRecency, string> = {
        [SearchRecency.ONE_DAY]: "Day",
        [SearchRecency.ONE_WEEK]: "Week",
        [SearchRecency.ONE_MONTH]: "Month",
        [SearchRecency.ONE_YEAR]: "Year",
        [SearchRecency.NO_LIMIT]: "",
      };
      params.freshness = freshnessMap[options.recency];
    }

    // 区域设置
    if (options.location === SearchLocation.CN) {
      params.cc = "CN";
      params.setLang = "zh-Hans";
    } else if (options.location === SearchLocation.US) {
      params.cc = "US";
      params.setLang = "en";
    }

    return params;
  }

  /**
   * 解析 Bing API 响应
   */
  private parseResponse(data: BingApiResponse): SearchResult[] {
    if (!data.webPages?.value) {
      return [];
    }

    return data.webPages.value.map((item) => {
      const result: SearchResult = {
        title: item.name,
        url: item.url,
        snippet: item.snippet,
      };

      // 提取域名
      try {
        const urlObj = new URL(item.url);
        result.domain = urlObj.hostname;
      } catch {
        // 忽略无效 URL
      }

      // 最后更新时间
      if (item.dateLastCrawled) {
        result.lastUpdated = item.dateLastCrawled;
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
      const message = error.response.data?.error?.message || error.message;

      switch (statusCode) {
        case 401:
          return new SearchError(
            "Invalid Bing API key",
            "INVALID_API_KEY",
            statusCode
          );
        case 429:
          return new SearchError(
            "Bing API rate limit exceeded",
            "RATE_LIMITED",
            statusCode
          );
        case 400:
          return new SearchError(
            `Invalid request: ${message}`,
            "BAD_REQUEST",
            statusCode
          );
        default:
          return new SearchError(
            `Bing API error (${statusCode}): ${message}`,
            "API_ERROR",
            statusCode
          );
      }
    }

    if (error.code === "ECONNABORTED") {
      return new SearchError("Search request timeout", "TIMEOUT");
    }

    return new SearchError(
      error.message || "Unknown search error",
      "UNKNOWN_ERROR"
    );
  }
}
