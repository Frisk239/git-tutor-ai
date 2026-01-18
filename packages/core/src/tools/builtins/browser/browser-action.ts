
/**
 * BROWSER_ACTION 工具 - 完整的浏览器自动化工具
 *
 * 基于 Cline 的 browser_action 实现
 * 支持: launch, click, type, scroll_down, scroll_up, close
 *
 * 与 Cline 的差异:
 * - Cline: VSCode 扩展,通过 gRPC 与 Webview 通信
 * - Git Tutor AI: Web 应用,通过回调函数与前端通信
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from "../../types.js";

// ============================================================================
// 常量定义
// ============================================================================

// 临时定义 ToolPermission 枚举
enum ToolPermission {
  READ = "read",
  WRITE = "write",
  EXECUTE = "execute",
}

// 支持的浏览器操作
export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const;
export type BrowserAction = (typeof browserActions)[number];

// 默认配置
const DEFAULT_VIEWPORT = { width: 900, height: 600 };
const DEFAULT_NAVIGATION_TIMEOUT = 7000;
const DEFAULT_ACTION_TIMEOUT = 3000;

// ============================================================================
// 类型定义
// ============================================================================

export interface BrowserActionParams {
  /** 操作类型 */
  action: BrowserAction;
  /** URL (launch 操作必需) */
  url?: string;
  /** 坐标 (click 操作必需,格式: "x,y") */
  coordinate?: string;
  /** 文本 (type 操作必需) */
  text?: string;
}

export interface BrowserActionResult {
  /** 操作是否成功 */
  success: boolean;
  /** 截图 (Base64 编码) */
  screenshot?: string;
  /** 控制台日志 */
  logs?: string;
  /** 当前页面 URL */
  currentUrl?: string;
  /** 当前鼠标位置 */
  currentMousePosition?: string;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 浏览器会话管理器
// ============================================================================

class BrowserSession {
  private browser: any = null;
  private page: any = null;
  private currentMousePosition?: string;
  private isConnected = false;

  /**
   * 启动浏览器
   */
  async launch(): Promise<{ success: boolean; error?: string }> {
    try {
      // 动态导入 puppeteer
      const puppeteer = await this.importPuppeteer();

      this.browser = await puppeteer.launch({
        headless: "shell",
        args: [
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ],
        defaultViewport: DEFAULT_VIEWPORT,
      });

      this.page = await this.browser.newPage();
      this.isConnected = true;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 导航到指定 URL
   */
  async navigateToUrl(url: string): Promise<BrowserActionResult> {
    return this.doAction(async (page: any) => {
      await page.goto(url, {
        timeout: DEFAULT_NAVIGATION_TIMEOUT,
        waitUntil: ["domcontentloaded", "networkidle2"],
      });

      // 等待页面稳定
      await this.waitForPageStable(page);
    });
  }

  /**
   * 点击指定坐标
   */
  async click(coordinate: string): Promise<BrowserActionResult> {
    const [x, y] = coordinate.split(",").map(Number);

    return this.doAction(async (page: any) => {
      // 监控网络活动
      let hasNetworkActivity = false;
      const requestListener = () => {
        hasNetworkActivity = true;
      };
      page.on("request", requestListener);

      // 执行点击
      await page.mouse.click(x, y);
      this.currentMousePosition = coordinate;

      // 如果有网络活动,等待导航完成
      if (hasNetworkActivity) {
        await page
          .waitForNavigation({
            waitUntil: ["domcontentloaded", "networkidle2"],
            timeout: DEFAULT_ACTION_TIMEOUT,
          })
          .catch(() => {});
        await this.waitForPageStable(page);
      }

      page.off("request", requestListener);
    });
  }

  /**
   * 输入文本
   */
  async type(text: string): Promise<BrowserActionResult> {
    return this.doAction(async (page: any) => {
      await page.keyboard.type(text);
    });
  }

  /**
   * 向下滚动
   */
  async scrollDown(): Promise<BrowserActionResult> {
    return this.doAction(async (page: any) => {
      await page.evaluate(() => {
        window.scrollBy({ top: 600, behavior: "auto" });
      });
      await this.sleep(300);
    });
  }

  /**
   * 向上滚动
   */
  async scrollUp(): Promise<BrowserActionResult> {
    return this.doAction(async (page: any) => {
      await page.evaluate(() => {
        window.scrollBy({ top: -600, behavior: "auto" });
      });
      await this.sleep(300);
    });
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isConnected = false;
    }
  }

  /**
   * 检查浏览器是否已连接
   */
  isActive(): boolean {
    return this.isConnected && this.browser !== null && this.page !== null;
  }

  /**
   * 执行操作并捕获结果
   */
  private async doAction(action: (page: any) => Promise<void>): Promise<BrowserActionResult> {
    if (!this.isActive()) {
      return {
        success: false,
        error: "浏览器未启动,请先使用 launch 操作",
      };
    }

    const logs: string[] = [];
    let lastLogTime = Date.now();

    // 监听控制台消息
    const consoleListener = (msg: any) => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
      lastLogTime = Date.now();
    };

    // 监听页面错误
    const errorListener = (err: Error) => {
      logs.push(`[Page Error] ${err.message}`);
      lastLogTime = Date.now();
    };

    this.page.on("console", consoleListener);
    this.page.on("pageerror", errorListener);

    try {
      await action(this.page);

      // 等待控制台静止 (500ms 无活动)
      await this.waitForConsoleIdle(lastLogTime);

      // 截图
      const screenshot = await this.page.screenshot({
        encoding: "base64",
        type: "png",
      });

      this.page.off("console", consoleListener);
      this.page.off("pageerror", errorListener);

      return {
        success: true,
        screenshot: `data:image/png;base64,${screenshot}`,
        logs: logs.join("\n"),
        currentUrl: this.page.url(),
        currentMousePosition: this.currentMousePosition,
      };
    } catch (error) {
      this.page.off("console", consoleListener);
      this.page.off("pageerror", errorListener);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: logs.join("\n"),
      };
    }
  }

  /**
   * 等待页面 HTML 稳定
   */
  private async waitForPageStable(page: any, timeout = 5000): Promise<void> {
    const checkDuration = 500;
    const maxChecks = timeout / checkDuration;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      const html = await page.content();
      const currentHTMLSize = html.length;

      if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
        countStableSizeIterations++;
      } else {
        countStableSizeIterations = 0;
      }

      if (countStableSizeIterations >= minStableSizeIterations) {
        break;
      }

      lastHTMLSize = currentHTMLSize;
      await this.sleep(checkDuration);
    }
  }

  /**
   * 等待控制台静止
   */
  private async waitForConsoleIdle(lastLogTime: number, timeout = 3000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (Date.now() - lastLogTime >= 500) {
        return;
      }
      await this.sleep(100);
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 动态导入 puppeteer
   */
  private async importPuppeteer() {
    try {
      return await import("puppeteer-core");
    } catch (error) {
      throw new Error(
        "puppeteer-core 未安装。请运行: npm install puppeteer-core"
      );
    }
  }
}

// ============================================================================
// 工具处理器
// ============================================================================

class BrowserActionToolHandler implements ToolHandler {
  private session = new BrowserSession();

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    try {
      const { action, url, coordinate, text } = params as BrowserActionParams;

      // 验证操作类型
      if (!action || !browserActions.includes(action)) {
        return {
          success: false,
          error: `无效的操作类型: ${action}。支持的操作: ${browserActions.join(", ")}`,
        };
      }

      // 执行操作
      let result: BrowserActionResult;

      switch (action) {
        case "launch":
          result = await this.handleLaunch(url);
          break;

        case "click":
          result = await this.handleClick(coordinate);
          break;

        case "type":
          result = await this.handleType(text);
          break;

        case "scroll_down":
          result = await this.handleScrollDown();
          break;

        case "scroll_up":
          result = await this.handleScrollUp();
          break;

        case "close":
          await this.session.close();
          result = {
            success: true,
            logs: "浏览器已关闭",
          };
          break;

        default:
          result = {
            success: false,
            error: `未实现的操作: ${action}`,
          };
      }

      return {
        success: result.success,
        data: result,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleLaunch(url?: string): Promise<BrowserActionResult> {
    // 参数验证
    if (!url) {
      return {
        success: false,
        error: "launch 操作需要提供 url 参数",
      };
    }

    // 如果浏览器已启动,先关闭
    if (this.session.isActive()) {
      await this.session.close();
    }

    // 启动浏览器
    const launchResult = await this.session.launch();
    if (!launchResult.success) {
      return {
        success: false,
        error: launchResult.error,
      };
    }

    // 导航到 URL
    return this.session.navigateToUrl(url);
  }

  private async handleClick(coordinate?: string): Promise<BrowserActionResult> {
    if (!coordinate) {
      return {
        success: false,
        error: "click 操作需要提供 coordinate 参数 (格式: 'x,y')",
      };
    }

    // 验证坐标格式
    const match = coordinate.match(/^(\d+),(\d+)$/);
    if (!match) {
      return {
        success: false,
        error: "坐标格式错误,应为 'x,y' (例如: '100,200')",
      };
    }

    const [x, y] = coordinate.split(",").map(Number);

    // 验证坐标范围
    if (
      x < 0 ||
      x > DEFAULT_VIEWPORT.width ||
      y < 0 ||
      y > DEFAULT_VIEWPORT.height
    ) {
      return {
        success: false,
        error: `坐标超出视口范围 (${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height})`,
      };
    }

    return this.session.click(coordinate);
  }

  private async handleType(text?: string): Promise<BrowserActionResult> {
    if (!text) {
      return {
        success: false,
        error: "type 操作需要提供 text 参数",
      };
    }

    return this.session.type(text);
  }

  private async handleScrollDown(): Promise<BrowserActionResult> {
    return this.session.scrollDown();
  }

  private async handleScrollUp(): Promise<BrowserActionResult> {
    return this.session.scrollUp();
  }
}

// ============================================================================
// 工具定义
// ============================================================================

export const browserActionTool: ToolDefinition = {
  name: "browser_action",
  displayName: "浏览器自动化",
  description:
    "完整的浏览器自动化工具,支持多种操作。" +
    "\n\n**支持的操作**:" +
    "\n- **launch**: 启动浏览器并导航到指定 URL (需要 url 参数)" +
    "\n- **click**: 在指定坐标处点击 (需要 coordinate 参数,格式: 'x,y')" +
    "\n- **type**: 输入文本 (需要 text 参数)" +
    "\n- **scroll_down**: 向下滚动一页" +
    "\n- **scroll_up**: 向上滚动一页" +
    "\n- **close**: 关闭浏览器" +
    "\n\n**使用流程**:" +
    "\n1. 使用 **launch** 启动浏览器并访问网页" +
    "\n2. 使用 **click**, **type**, **scroll** 等操作与页面交互" +
    "\n3. 使用 **close** 关闭浏览器" +
    "\n\n**重要约束**:" +
    "\n- 必须以 launch 开始,以 close 结束" +
    "\n- 点击坐标必须在视口范围内 (默认: 900x600)" +
    "\n- 每次操作后会自动截图并捕获控制台日志" +
    "\n\n**依赖**:" +
    "\n需要安装 puppeteer-core: `npm install puppeteer-core`",
  category: "browser",
  parameters: [
    {
      name: "action",
      type: "string",
      required: true,
      description: "操作类型: launch, click, type, scroll_down, scroll_up, close",
      enum: browserActions,
    },
    {
      name: "url",
      type: "string",
      required: false,
      description: "URL (launch 操作必需)",
    },
    {
      name: "coordinate",
      type: "string",
      required: false,
      description: "坐标 (click 操作必需,格式: 'x,y')",
    },
    {
      name: "text",
      type: "string",
      required: false,
      description: "输入的文本 (type 操作必需)",
    },
  ],
  permissions: [ToolPermission.READ, ToolPermission.EXECUTE],
  enabled: true,
  handler: new BrowserActionToolHandler(),
};

// 默认导出
export default browserActionTool;
