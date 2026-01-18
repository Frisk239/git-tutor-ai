// Web 获取工具类型定义

/**
 * Web 获取选项
 */
export interface WebFetchOptions {
  url: string; // 要获取的 URL
  timeout?: number; // 超时时间(毫秒)
  maxContentLength?: number; // 最大内容长度(字符)
  retainImages?: boolean; // 是否保留图片
  extractLinks?: boolean; // 是否提取链接列表
  withImagesSummary?: boolean; // 是否包含图片摘要
  withLinksSummary?: boolean; // 是否包含链接摘要
  returnFormat?: 'markdown' | 'text' | 'html'; // 返回格式
}

/**
 * 获取的网页内容
 */
export interface WebPageContent {
  url: string; // 实际的 URL (可能经过重定向)
  title?: string; // 页面标题
  content: string; // 页面内容(根据 returnFormat 格式化)
  links?: string[]; // 提取的链接列表
  images?: string[]; // 提取的图片 URL 列表
  imagesSummary?: string; // 图片摘要
  linksSummary?: string; // 链接摘要
  wordCount?: number; // 内容字数
  fetchTime?: number; // 获取耗时(毫秒)
}

/**
 * Web 获取错误
 */
export class WebFetchError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'WebFetchError';
  }
}

/**
 * 清理选项
 */
export interface CleanupOptions {
  removeScripts?: boolean; // 移除脚本
  removeStyles?: boolean; // 移除样式
  removeComments?: boolean; // 移除注释
  removeNav?: boolean; // 移除导航栏
  removeFooter?: boolean; // 移除页脚
  removeAds?: boolean; // 移除广告
  preserveLinks?: boolean; // 保留链接
  preserveImages?: boolean; // 保留图片
  extractMainContent?: boolean; // 提取主要内容
}
