// Web 搜索模块主入口
export * from './types.js';
export * from './manager.js';
export * from './fetch-types.js';
export * from './fetcher.js';

// 导出搜索提供商
export * from './providers/bing.js';
export * from './providers/google.js';
export * from './providers/duckduckgo.js';

// 导出便捷函数
export { getSearchManager, initializeSearchManager } from './manager.js';
export { getWebFetcher } from './fetcher.js';
