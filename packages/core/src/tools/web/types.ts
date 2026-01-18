// Web 搜索类型定义

/**
 * 搜索时间范围
 */
export enum SearchRecency {
  ONE_DAY = "oneDay",
  ONE_WEEK = "oneWeek",
  ONE_MONTH = "oneMonth",
  ONE_YEAR = "oneYear",
  NO_LIMIT = "noLimit",
}

/**
 * 搜索区域
 */
export enum SearchLocation {
  CN = "cn", // 中国
  US = "us", // 美国
}

/**
 * 搜索内容详细程度
 */
export enum ContentSize {
  MEDIUM = "medium", // 平衡模式,400-600 字
  HIGH = "high",     // 最大化上下文,2500 字
}

/**
 * 搜索结果
 */
export interface SearchResult {
  title: string; // 结果标题
  url: string; // 结果 URL
  snippet?: string; // 结果摘要
  domain?: string; // 域名
  lastUpdated?: string; // 最后更新时间
  relevanceScore?: number; // 相关性评分
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  query: string; // 搜索查询
  allowedDomains?: string[]; // 允许的域名白名单
  blockedDomains?: string[]; // 阻止的域名黑名单
  recency?: SearchRecency; // 时间范围
  location?: SearchLocation; // 搜索区域
  contentSize?: ContentSize; // 内容详细程度
  limit?: number; // 结果数量限制
  offset?: number; // 结果偏移(分页)
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  query?: string;
  searchTime?: number; // 搜索耗时(ms)
}

/**
 * 搜索错误
 */
export class SearchError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "SearchError";
  }
}

/**
 * 搜索提供商接口
 */
export interface SearchProvider {
  name: string;
  search(options: SearchOptions): Promise<SearchResponse>;
  isAvailable(): boolean;
}
