// Web 搜索管理器
// 支持多个搜索提供商的配置和切换

import { Logger } from '../../logging/logger.js';
import { SearchProvider, SearchOptions, SearchResponse } from './types.js';
import { BingSearchProvider, BingSearchConfig } from './providers/bing.js';
import { GoogleSearchProvider, GoogleSearchConfig } from './providers/google.js';
import { DuckDuckGoProvider, DuckDuckGoConfig } from './providers/duckduckgo.js';
import { TavilySearchProvider, TavilySearchConfig } from './providers/tavily.js';

/**
 * 搜索提供商类型
 */
export enum SearchProviderType {
  BING = 'bing',
  GOOGLE = 'google',
  DUCKDUCKGO = 'duckduckgo',
  TAVILY = 'tavily',
}

/**
 * 搜索配置
 */
export interface WebSearchConfig {
  // 默认提供商
  defaultProvider?: SearchProviderType;
  // 提供商配置
  bing?: BingSearchConfig;
  google?: GoogleSearchConfig;
  duckduckgo?: DuckDuckGoConfig;
  tavily?: TavilySearchConfig;
}

/**
 * Web 搜索管理器
 */
export class WebSearchManager {
  private logger: Logger;
  private providers: Map<SearchProviderType, SearchProvider> = new Map();
  private defaultProvider: SearchProviderType;

  constructor(config: WebSearchConfig = {}) {
    this.logger = new Logger('WebSearchManager');

    // 设置默认提供商 (DuckDuckGo 不需要 API key)
    this.defaultProvider = config.defaultProvider || SearchProviderType.DUCKDUCKGO;

    // 初始化提供商
    this.initializeProviders(config);
  }

  /**
   * 初始化搜索提供商
   */
  private initializeProviders(config: WebSearchConfig): void {
    // Bing
    if (config.bing?.apiKey) {
      this.providers.set(SearchProviderType.BING, new BingSearchProvider(config.bing));
      this.logger.info('Bing search provider initialized');
    }

    // Google
    if (config.google?.apiKey && config.google?.searchEngineId) {
      this.providers.set(SearchProviderType.GOOGLE, new GoogleSearchProvider(config.google));
      this.logger.info('Google search provider initialized');
    }

    // Tavily
    if (config.tavily?.apiKey) {
      this.providers.set(SearchProviderType.TAVILY, new TavilySearchProvider(config.tavily));
      this.logger.info('Tavily search provider initialized');
    }

    // DuckDuckGo (不需要 API key,作为备用)
    this.providers.set(
      SearchProviderType.DUCKDUCKGO,
      new DuckDuckGoProvider(config.duckduckgo || {})
    );
    this.logger.info('DuckDuckGo search provider initialized');
  }

  /**
   * 执行搜索
   */
  async search(options: SearchOptions, provider?: SearchProviderType): Promise<SearchResponse> {
    const providerType = provider || this.defaultProvider;
    const searchProvider = this.providers.get(providerType);

    if (!searchProvider) {
      throw new Error(`Search provider ${providerType} is not available. Please configure it.`);
    }

    if (!searchProvider.isAvailable()) {
      // 尝试使用备用提供商
      this.logger.warn(`Provider ${providerType} is not available, trying fallback`);
      return this.searchWithFallback(options, providerType);
    }

    this.logger.info(`Using search provider: ${searchProvider.name}`);

    return searchProvider.search(options);
  }

  /**
   * 使用备用提供商搜索
   */
  private async searchWithFallback(
    options: SearchOptions,
    failedProvider: SearchProviderType
  ): Promise<SearchResponse> {
    // 尝试其他可用的提供商
    for (const [providerType, provider] of this.providers.entries()) {
      if (providerType !== failedProvider && provider.isAvailable()) {
        this.logger.info(`Fallback to provider: ${provider.name}`);
        return provider.search(options);
      }
    }

    throw new Error('No search provider is available. Please configure at least one provider.');
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): SearchProviderType[] {
    const available: SearchProviderType[] = [];
    for (const [type, provider] of this.providers.entries()) {
      if (provider.isAvailable()) {
        available.push(type);
      }
    }
    return available;
  }

  /**
   * 检查提供商是否可用
   */
  isProviderAvailable(type: SearchProviderType): boolean {
    const provider = this.providers.get(type);
    return provider ? provider.isAvailable() : false;
  }

  /**
   * 设置默认提供商
   */
  setDefaultProvider(type: SearchProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} is not configured`);
    }
    this.defaultProvider = type;
    this.logger.info(`Default search provider set to: ${type}`);
  }

  /**
   * 获取默认提供商
   */
  getDefaultProvider(): SearchProviderType {
    return this.defaultProvider;
  }
}

/**
 * 全局搜索管理器实例
 */
let globalSearchManager: WebSearchManager | null = null;

/**
 * 获取全局搜索管理器
 */
export function getSearchManager(): WebSearchManager {
  if (!globalSearchManager) {
    // 从环境变量读取配置
    const config: WebSearchConfig = {};

    // Tavily (优先级高,API 质量好)
    if (process.env.TAVILY_API_KEY) {
      config.tavily = {
        apiKey: process.env.TAVILY_API_KEY,
      };
      config.defaultProvider = SearchProviderType.TAVILY;
    }

    // Bing
    if (process.env.BING_SEARCH_API_KEY) {
      config.bing = {
        apiKey: process.env.BING_SEARCH_API_KEY,
        endpoint: process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search',
      };
      if (!config.defaultProvider) {
        config.defaultProvider = SearchProviderType.BING;
      }
    }

    // Google
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      config.google = {
        apiKey: process.env.GOOGLE_SEARCH_API_KEY,
        searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
        endpoint:
          process.env.GOOGLE_SEARCH_ENDPOINT ||
          'https://customsearch.googleapis.com/customsearch/v1',
      };
      if (!config.defaultProvider) {
        config.defaultProvider = SearchProviderType.GOOGLE;
      }
    }

    // DuckDuckGo (总是可用,作为备用)
    config.duckduckgo = {};

    globalSearchManager = new WebSearchManager(config);
  }

  return globalSearchManager;
}

/**
 * 初始化搜索管理器
 */
export function initializeSearchManager(config: WebSearchConfig): void {
  globalSearchManager = new WebSearchManager(config);
}
