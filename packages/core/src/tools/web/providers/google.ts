// Google Custom Search API 提供商
// 参考: https://developers.google.com/custom-search/v1/overview

import axios, { AxiosInstance } from "axios";
import { Logger } from "../../../logging/logger.js";
import {
  SearchProvider,
  SearchOptions,
  SearchResponse,
  SearchError,
  SearchRecency,
} from "../types.js";

/**
 * Google Custom Search API 配置
 */
export interface GoogleSearchConfig {
  apiKey: string; // Google API key
  searchEngineId: string; // Custom Search Engine ID (cx)
  endpoint?: string;
  timeout?: number;
}

/**
 * Google API 响应
 */
interface GoogleApiResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet?: string;
    pagemap?: {
      metatags?: Array<{
        "article:published_time"?: string;
        "dateModified"?: string;
      }>;
    };
  }>;
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
  };
}

/**
 * Google Search 提供商
 */
export class GoogleSearchProvider implements SearchProvider {
  name = "Google";
  private client: AxiosInstance;
  private logger: Logger;
  private config: Required<GoogleSearchConfig>;

  constructor(config: GoogleSearchConfig) {
    this.logger = new Logger("GoogleSearchProvider");

    if (!config.searchEngineId) {
      throw new Error("Google searchEngineId is required");
    }

    this.config = {
      apiKey: config.apiKey,
      searchEngineId: config.searchEngineId,
      endpoint: config.endpoint || "https://www.googleapis.com/customsearch/v1",
      timeout: config.timeout || 10000,
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
    });
  }

  /**
   * 检查提供商是否可用
   */
  isAvailable(): boolean {
    return !!this.config.apiKey && !!this.config.searchEngineId;
  }

  /**
   * 执行搜索
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      this.validateOptions(options);

      const params = this.buildQueryParams(options);

      this.logger.debug("Executing Google search", { params });

      const response = await this.client.get<GoogleApiResponse>("", { params });

      const results = this.parseResponse(response.data);
      const searchTime = Date.now() - startTime;

      this.logger.info("Google search completed", {
        resultCount: results.length,
        searchTime,
      });

      return {
        results,
        totalResults: response.data.searchInformation?.totalResults
          ? parseInt(response.data.searchInformation.totalResults)
          : undefined,
        query: options.query,
        searchTime,
      };
    } catch (error: any) {
      this.logger.error("Google search failed", { error });
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

    if (!this.config.apiKey || !this.config.searchEngineId) {
      throw new SearchError(
        "Google API key or searchEngineId is not configured",
        "API_KEY_MISSING"
      );
    }
  }

  /**
   * 构建 Google 查询参数
   */
  private buildQueryParams(options: SearchOptions): Record<string, any> {
    const params: Record<string, any> = {
      key: this.config.apiKey,
      cx: this.config.searchEngineId,
      q: options.query,
      num: Math.min(options.limit || 10, 10), // Google max is 10 per request
      start: (options.offset || 0) + 1, // Google uses 1-based indexing
    };

    // 域名过滤
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      params.q = `${params.q} site:${options.allowedDomains.join(" OR site:")}`;
    }

    if (options.blocked_domains && options.blocked_domains.length > 0) {
      params.q = `${params.q} -site:${options.blocked_domains.join(" -site:")}`;
    }

    // 时间范围 (Google 使用 dateRestrict)
    if (options.recency && options.recency !== SearchRecency.NO_LIMIT) {
      const dateMap: Record<SearchRecency, string> = {
        [SearchRecency.ONE_DAY]: "d1",
        [SearchRecency.ONE_WEEK]: "w1",
        [SearchRecency.ONE_MONTH]: "m1",
        [SearchRecency.ONE_YEAR]: "y1",
        [SearchRecency.NO_LIMIT]: "",
      };
      params.dateRestrict = dateMap[options.recency];
    }

    // 语言设置
    if (options.location === "cn") {
      params.lr = "lang_zh-CN";
    } else if (options.location === "us") {
      params.lr = "lang_en";
    }

    return params;
  }

  /**
   * 解析 Google API 响应
   */
  private parseResponse(data: GoogleApiResponse): SearchResult[] {
    if (!data.items) {
      return [];
    }

    return data.items.map((item) => {
      const result: SearchResult = {
        title: item.title,
        url: item.link,
        snippet: item.snippet,
      };

      // 提取域名
      try {
        const urlObj = new URL(item.link);
        result.domain = urlObj.hostname;
      } catch {
        // 忽略无效 URL
      }

      // 提取发布时间
      if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        result.lastUpdated =
          meta["article:published_time"] || meta["dateModified"];
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
        error.response.data?.error?.message || error.response.data?.error?.errors?.[0]?.message || error.message;

      switch (statusCode) {
        case 403:
          return new SearchError(
            "Invalid Google API key or quota exceeded",
            "INVALID_API_KEY",
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
            `Google API error (${statusCode}): ${message}`,
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
