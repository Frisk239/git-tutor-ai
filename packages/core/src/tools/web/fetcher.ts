// Web 获取器 - 抓取和清理网页内容
// 参考 Cline 的 web_fetch 工具实现

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../logging/logger.js';
import { load, CheerioAPI } from 'cheerio';
import { Readability } from '@mozilla/readability';
import * as TurndownService from 'turndown';
import { WebFetchOptions, WebPageContent, WebFetchError, CleanupOptions } from './fetch-types.js';

/**
 * Web 获取器
 */
export class WebFetcher {
  private logger: Logger;
  private client: AxiosInstance;
  private turndown: any;

  constructor(timeout: number = 30000) {
    this.logger = new Logger('WebFetcher');
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    this.client = axios.create({
      timeout,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
  }

  /**
   * 获取网页内容
   */
  async fetch(options: WebFetchOptions): Promise<WebPageContent> {
    const startTime = Date.now();

    try {
      this.validateOptions(options);

      this.logger.info('Fetching webpage', { url: options.url });

      // 1. 获取 HTML
      const html = await this.fetchHtml(options.url, options.timeout);

      // 2. 解析 HTML
      const $ = load(html);

      // 3. 提取页面信息
      const title = this.extractTitle($);
      const finalUrl = options.url; // TODO: 处理重定向

      // 4. 清理 HTML
      const cleanedHtml = this.cleanupHtml($, html);

      // 5. 转换为指定格式
      let content: string;
      switch (options.returnFormat || 'markdown') {
        case 'markdown':
          content = this.convertToMarkdown(cleanedHtml);
          break;
        case 'text':
          content = this.convertToText(cleanedHtml);
          break;
        case 'html':
          content = cleanedHtml;
          break;
        default:
          content = this.convertToMarkdown(cleanedHtml);
      }

      // 6. 截断内容
      if (options.maxContentLength && content.length > options.maxContentLength) {
        content = content.substring(0, options.maxContentLength) + '\n\n[内容已截断,因为内容过大]';
      }

      // 7. 提取链接
      let links: string[] | undefined;
      let linksSummary: string | undefined;
      if (options.extractLinks || options.withLinksSummary) {
        const extractedLinks = this.extractLinks($);
        links = extractedLinks;
        if (options.withLinksSummary) {
          linksSummary = this.generateLinksSummary(extractedLinks);
        }
      }

      // 8. 提取图片
      let images: string[] | undefined;
      let imagesSummary: string | undefined;
      if (options.withImagesSummary || options.retainImages) {
        const extractedImages = this.extractImages($);
        images = extractedImages;
        if (options.withImagesSummary) {
          imagesSummary = this.generateImagesSummary(extractedImages);
        }
      }

      const fetchTime = Date.now() - startTime;

      this.logger.info('Webpage fetched successfully', {
        url: finalUrl,
        contentLength: content.length,
        fetchTime,
      });

      return {
        url: finalUrl,
        title,
        content,
        links,
        images,
        imagesSummary,
        linksSummary,
        wordCount: content.split(/\s+/).length,
        fetchTime,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch webpage', { error });
      throw this.handleError(error, options.url);
    }
  }

  /**
   * 验证选项
   */
  private validateOptions(options: WebFetchOptions): void {
    if (!options.url) {
      throw new WebFetchError('URL is required', 'MISSING_URL');
    }

    try {
      new URL(options.url);
    } catch {
      throw new WebFetchError(`Invalid URL: ${options.url}`, 'INVALID_URL');
    }

    if (options.maxContentLength && options.maxContentLength < 100) {
      throw new WebFetchError('maxContentLength must be at least 100 characters', 'INVALID_LENGTH');
    }
  }

  /**
   * 获取 HTML
   */
  private async fetchHtml(url: string, timeout?: number): Promise<string> {
    try {
      const response = await this.client.get(url, {
        responseType: 'text',
        timeout: timeout || 30000,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new WebFetchError(
          `HTTP ${error.response.status}: ${error.response.statusText}`,
          'HTTP_ERROR',
          error.response.status,
          url
        );
      }
      throw error;
    }
  }

  /**
   * 提取标题
   */
  private extractTitle($: CheerioAPI): string | undefined {
    // 尝试多种方式提取标题
    const title =
      $('title').text() ||
      $('h1').first().text() ||
      $("meta[property='og:title']").attr('content') ||
      $("meta[name='twitter:title']").attr('content');

    return title?.trim() || undefined;
  }

  /**
   * 清理 HTML
   */
  private cleanupHtml($: CheerioAPI, html: string): string {
    // 移除不需要的元素
    $('script, style, link, meta').remove();
    $('nav, .nav, .navigation, .navbar').remove();
    $('footer, .footer, .page-footer').remove();
    $('.ad, .advertisement, .ads, .sidebar, .comments').remove();

    // 移除隐藏元素
    $('[style*="display:none"]').remove();
    $('.hidden, .hide').remove();

    return $.html();
  }

  /**
   * 转换为 Markdown
   */
  private convertToMarkdown(html: string): string {
    try {
      return this.turndown.turndown(html);
    } catch (error) {
      this.logger.warn('Failed to convert to markdown', { error });
      return html;
    }
  }

  /**
   * 转换为纯文本
   */
  private convertToText(html: string): string {
    const $ = load(html);
    return $.text();
  }

  /**
   * 提取链接
   */
  private extractLinks($: CheerioAPI): string[] {
    const links = new Set<string>();

    $('a[href]').each((_, element) => {
      try {
        const href = $(element).attr('href');
        if (href) {
          // 转换为绝对 URL
          const url = new URL(href, $.baseURL || 'https://example.com').href;
          links.add(url);
        }
      } catch {
        // 忽略无效 URL
      }
    });

    return Array.from(links);
  }

  /**
   * 提取图片
   */
  private extractImages($: CheerioAPI): string[] {
    const images = new Set<string>();

    $('img[src]').each((_, element) => {
      try {
        const src = $(element).attr('src');
        if (src) {
          // 转换为绝对 URL
          const url = new URL(src, $.baseURL || 'https://example.com').href;
          images.add(url);
        }
      } catch {
        // 忽略无效 URL
      }
    });

    return Array.from(images);
  }

  /**
   * 生成链接摘要
   */
  private generateLinksSummary(links: string[]): string {
    if (links.length === 0) {
      return '未找到链接';
    }

    const uniqueDomains = new Set<string>();
    links.forEach((link) => {
      try {
        const domain = new URL(link).hostname;
        uniqueDomains.add(domain);
      } catch {
        // 忽略
      }
    });

    return `找到 ${links.length} 个链接，涉及 ${uniqueDomains.size} 个域名`;
  }

  /**
   * 生成图片摘要
   */
  private generateImagesSummary(images: string[]): string {
    if (images.length === 0) {
      return '未找到图片';
    }

    return `找到 ${images.length} 个图片`;
  }

  /**
   * 处理错误
   */
  private handleError(error: any, url: string): WebFetchError {
    if (error instanceof WebFetchError) {
      return error;
    }

    if (error.code === 'ENOTFOUND') {
      return new WebFetchError(`Cannot resolve hostname: ${url}`, 'DNS_ERROR', undefined, url);
    }

    if (error.code === 'ECONNREFUSED') {
      return new WebFetchError(`Connection refused: ${url}`, 'CONNECTION_REFUSED', undefined, url);
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new WebFetchError(`Request timeout: ${url}`, 'TIMEOUT', undefined, url);
    }

    return new WebFetchError(
      error.message || `Failed to fetch ${url}`,
      'UNKNOWN_ERROR',
      undefined,
      url
    );
  }
}

/**
 * 获取全局 Web 获取器实例
 */
let globalWebFetcher: WebFetcher | null = null;

export function getWebFetcher(): WebFetcher {
  if (!globalWebFetcher) {
    globalWebFetcher = new WebFetcher();
  }
  return globalWebFetcher;
}
