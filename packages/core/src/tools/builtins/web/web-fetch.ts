/**
 * WEB_FETCH 工具
 * 获取网页内容，支持 HTML、JSON、文本等格式
 * 参考 Cline 实现：cline/src/core/task/tools/handlers/WebFetchToolHandler.ts
 * 简化版：使用标准 fetch API，不依赖 Cline 后端服务
 */

import type { ToolDefinition, ToolContext, ToolResult } from "../../types.js";
import { ToolPermission } from "@git-tutor/shared";
import { toolRegistry } from "../../registry.js";

/**
 * 网页获取结果
 */
export interface WebFetchResult {
  /** 请求的 URL */
  url: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 状态文本 */
  statusText: string;
  /** 内容类型 */
  contentType: string;
  /** 原始内容 */
  content: string;
  /** 提取的文本内容（去除 HTML 标签） */
  textContent: string;
  /** 内容长度 */
  contentLength: number;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
}

/**
 * 工具参数
 */
interface WebFetchParams {
  /** 要获取的 URL */
  url: string;
  /** 最大内容长度（字符数，默认：10000） */
  maxContentLength?: number;
  /** 是否提取纯文本（去除 HTML，默认：true） */
  extractText?: boolean;
  /** 超时时间（秒，默认：30） */
  timeout?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 移除 HTML 标签，提取纯文本
 * @param html HTML 内容
 * @returns 纯文本内容
 */
function extractTextFromHtml(html: string): string {
  // 移除 script 和 style 标签及其内容
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 移除 HTML 注释
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // 移除所有 HTML 标签
  text = text.replace(/<[^>]+>/g, " ");

  // 解码 HTML 实体
  const htmlEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  for (const [entity, char] of Object.entries(htmlEntities)) {
    text = text.replace(new RegExp(entity, "g"), char);
  }

  // 规范化空白字符
  text = text.replace(/\s+/g, " ");
  text = text.trim();

  return text;
}

/**
 * 截断内容到指定长度
 * @param content 内容
 * @param maxLength 最大长度
 * @returns 截断后的内容
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // 在边界处截断，避免截断单词
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * WEB_FETCH 工具定义
 */
const webFetchTool: ToolDefinition = {
  name: "web_fetch",
  displayName: "获取网页内容",
  description:
    "获取指定 URL 的网页内容。支持 HTML、JSON、文本等格式。自动提取文本内容，去除 HTML 标签。适用于读取网页、API 调用等场景。",
  category: "web",
  parameters: [
    {
      name: "url",
      type: "string",
      description: "要获取的 URL（例如：https://example.com）",
      required: true,
    },
    {
      name: "maxContentLength",
      type: "number",
      description: "最大内容长度（字符数，默认：10000）",
      required: false,
    },
    {
      name: "extractText",
      type: "boolean",
      description: "是否提取纯文本（去除 HTML，默认：true）",
      required: false,
    },
    {
      name: "timeout",
      type: "number",
      description: "超时时间（秒，默认：30）",
      required: false,
    },
    {
      name: "headers",
      type: "object",
      description: "自定义请求头（可选）",
      required: false,
    },
  ],
  permissions: [ToolPermission.READ],
  enabled: true,

  handler: async (context: ToolContext, params: Record<string, any>): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const { url, maxContentLength = 10000, extractText = true, timeout = 30, headers = {} } =
        params as WebFetchParams;

      // 参数验证
      if (!url || typeof url !== "string") {
        return {
          success: false,
          error: "参数 'url' 必须是非空字符串",
        };
      }

      // 验证 URL 格式
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch (error) {
        return {
          success: false,
          error: `无效的 URL 格式: ${url}`,
        };
      }

      // 只允许 HTTP 和 HTTPS 协议
      if (!["http:", "https:"].includes(validUrl.protocol)) {
        return {
          success: false,
          error: `不支持的协议: ${validUrl.protocol}。只支持 HTTP 和 HTTPS。`,
        };
      }

      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      // 准备请求头
      const requestHeaders: HeadersInit = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      };

      try {
        // 发起请求
        const response = await fetch(url, {
          method: "GET",
          headers: requestHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 获取内容类型
        const contentType = response.headers.get("content-type") || "unknown";

        // 获取内容
        const content = await response.text();

        // 提取文本内容
        let textContent = content;
        if (extractText && contentType.includes("html")) {
          textContent = extractTextFromHtml(content);
        }

        // 截断内容
        const truncatedContent = truncateContent(content, maxContentLength);
        const truncatedTextContent = truncateContent(textContent, maxContentLength);

        const result: WebFetchResult = {
          url,
          statusCode: response.status,
          statusText: response.statusText,
          contentType,
          content: truncatedContent,
          textContent: truncatedTextContent,
          contentLength: content.length,
          duration: Date.now() - startTime,
          success: response.ok,
        };

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        // 处理超时错误
        if (error.name === "AbortError") {
          return {
            success: false,
            error: `请求超时（超过 ${timeout} 秒）`,
          };
        }

        // 处理网络错误
        return {
          success: false,
          error: `网络错误: ${error.message}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * 注册 WEB_FETCH 工具
 */
export function registerWebFetchTool(): void {
  toolRegistry.register(webFetchTool);
}

// 自动注册
registerWebFetchTool();
