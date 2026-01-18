// DuckDuckGo 搜索提供商
// 使用 DuckDuckGo Instant Answer API (不需要 API key)
// 参考: https://duckduckgo.com/api

import axios, { AxiosInstance } from "axios";
import { Logger } from "../../../logging/logger.js";
import { load } from "cheerio";
import {
  SearchProvider,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchError,
} from "../types.js";

/**
 * DuckDuckGo 配置
 */
export interface DuckDuckGoConfig {
  endpoint?: string;
  timeout?: number;
}

/**
 * DuckDuckGo HTML 搜索响应
 * DuckDuckGo 不提供官方 API,我们通过解析 HTML 结果
 */
export class DuckDuckGoProvider implements SearchProvider {
  name = "DuckDuckGo";
  private client: AxiosInstance;
  private logger: Logger;
  private config: Required<DuckDuckGoConfig>;

  constructor(config: DuckDuckGoConfig = {}) {
    this.logger = new Logger("DuckDuckGoProvider");
    this.config = {
      endpoint: config.endpoint || "https://html.duckduckgo.com/html",
      timeout: config.timeout || 10000,
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
  }

  /**
   * 检查提供商是否可用
   * DuckDuckGo 不需要 API key,所以总是可用
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * 执行搜索
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      this.validateOptions(options);

      const params = this.buildQueryParams(options);

      this.logger.debug("Executing DuckDuckGo search", { params });

      const response = await this.client.get("", {
        params,
        responseType: "text",
      });

      const results = this.parseHtmlResponse(response.data);
      const searchTime = Date.now() - startTime;

      this.logger.info("DuckDuckGo search completed", {
        resultCount: results.length,
        searchTime,
      });

      return {
        results,
        query: options.query,
        searchTime,
      };
    } catch (error: any) {
      this.logger.error("DuckDuckGo search failed", { error });
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

    // DuckDuckGo 不支持时间范围筛选
    if (options.recency && options.recency !== "noLimit") {
      this.logger.warn("DuckDuckGo does not support recency filtering");
    }
  }

  /**
   * 构建查询参数
   */
  private buildQueryParams(options: SearchOptions): Record<string, any> {
    const params: Record<string, any> = {
      q: options.query,
    };

    // 域名过滤通过查询字符串实现
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      params.q = `${params.q} site:${options.allowedDomains.join(" OR site:")}`;
    }

    if (options.blocked_domains && options.blocked_domains.length > 0) {
      params.q = `${params.q} -site:${options.blocked_domains.join(" -site:")}`;
    }

    return params;
  }

  /**
   * 解析 HTML 响应
   */
  private parseHtmlResponse(html: string): SearchResult[] {
    const $ = load(html);
    const results: SearchResult[] = [];

    // DuckDuckGo 的搜索结果在 .result__a 类中
    $(".result__body").each((_, element) => {
      try {
        const $el = $(element);
        const titleEl = $el.find(".result__a");
        const snippetEl = $el.find(".result__snippet");
        const urlEl = $el.find(".result__url");

        const title = titleEl.text().trim();
        const url = titleEl.attr("href") || urlEl.text().trim();
        const snippet = snippetEl.text().trim();

        if (!title || !url) {
          return;
        }

        // 清理 URL (DuckDuckGo 会添加跳转链接)
        const cleanUrl = this.cleanDuckDuckGoUrl(url);

        const result: SearchResult = {
          title,
          url: cleanUrl,
          snippet: snippet || undefined,
        };

        // 提取域名
        try {
          const urlObj = new URL(cleanUrl);
          result.domain = urlObj.hostname;
        } catch {
          // 忽略无效 URL
        }

        results.push(result);
      } catch (error) {
        this.logger.warn("Failed to parse search result", { error });
      }
    });

    return results;
  }

  /**
   * 清理 DuckDuckGo URL
   * DuckDuckGo 使用跳转链接,需要提取真实 URL
   */
  private cleanDuckDuckGoUrl(url: string): string {
    try {
      // 移除 DuckDuckGo 的跳转前缀
      // 例如: /l/?uddg=https://example.com
      if (url.startsWith("/l/?uddg=")) {
        const realUrl = url.substring("/l/?uddg=".length);
        // URL 编码解码
        return decodeURIComponent(realUrl);
      }

      // 移除其他 DuckDuckGo 跟踪参数
      const urlObj = new URL(url, "https://duckduckgo.com");
      urlObj.searchParams.delete("uddg");
      urlObj.searchParams.delete("rut");

      return urlObj.href;
    } catch {
      return url;
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: any): SearchError {
    if (error.response) {
      const statusCode = error.response.status;
      return new SearchError(
        `DuckDuckGo error (${statusCode}): ${error.message}`,
        "API_ERROR",
        statusCode
      );
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
