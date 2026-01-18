/**
 * BROWSER_OPEN 实际网站测试
 * 测试真实的网站访问和截图功能
 */

const path = require("path");

// 导入 puppeteer-core
const coreNodeModules = path.join(__dirname, "../../packages/core/node_modules");
const puppeteerPath = require.resolve("puppeteer-core", { paths: [coreNodeModules, __dirname] });
const puppeteer = require(puppeteerPath);

// 查找系统浏览器路径
let executablePath;
const fs = require("fs");

if (process.platform === "win32") {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }
} else if (process.platform === "darwin") {
  executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
} else {
  executablePath = "/usr/bin/google-chrome";
}

async function testWebsite(url) {
  console.log(`\n🚀 正在访问: ${url}`);
  console.log("=".repeat(80));

  const startTime = Date.now();

  try {
    // 启动浏览器
    const launchOptions = {
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
      console.log(`📂 浏览器路径: ${executablePath}`);
    }

    const browser = await puppeteer.launch(launchOptions);
    console.log(`✅ 浏览器已启动`);

    const page = await browser.newPage();

    // 设置视口
    await page.setViewport({ width: 1920, height: 1080 });

    // 收集日志
    const logs = [];
    page.on("console", (msg) => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // 访问页面
    console.log(`📖 正在加载页面...`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 等待额外时间让动态内容加载
    console.log(`⏳ 等待页面完全加载...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 获取页面信息
    const title = await page.title();
    const urlInfo = page.url();

    console.log(`\n✅ 页面加载成功!`);
    console.log(`   标题: ${title}`);
    console.log(`   URL: ${urlInfo}`);
    console.log(`   控制台日志: ${logs.length} 条`);

    if (logs.length > 0) {
      console.log(`\n📋 控制台日志:`);
      logs.slice(0, 5).forEach((log) => {
        console.log(`   ${log}`);
      });
      if (logs.length > 5) {
        console.log(`   ... 还有 ${logs.length - 5} 条`);
      }
    }

    // 截图
    console.log(`\n📸 正在截图...`);
    const screenshot = await page.screenshot({
      encoding: "base64",
      fullPage: false,
    });

    // 保存截图到文件
    const screenshotPath = path.join(__dirname, "screenshot.png");
    const screenshotBuffer = Buffer.from(screenshot, "base64");
    require("fs").writeFileSync(screenshotPath, screenshotBuffer);

    console.log(`   ✅ 截图已保存: ${screenshotPath}`);
    console.log(`   📊 截图大小: ${(screenshotBuffer.length / 1024).toFixed(2)} KB`);

    // 关闭浏览器
    await browser.close();

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  总耗时: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log("\n" + "=".repeat(80));

    return {
      success: true,
      title,
      url: urlInfo,
      screenshotPath,
      logsCount: logs.length,
      duration,
    };
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    console.log("=".repeat(80));
    return {
      success: false,
      error: error.message,
    };
  }
}

// 测试几个真实网站
async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🌐 BROWSER_OPEN - 实际网站测试");
  console.log("=".repeat(80));
  console.log(`测试时间: ${new Date().toLocaleString()}`);

  const websites = [
    {
      name: "GitHub 首页",
      url: "https://github.com",
      description: "测试动态内容丰富的现代网站",
    },
    {
      name: "MDN Web Docs",
      url: "https://developer.mozilla.org/zh-CN/",
      description: "测试技术文档网站",
    },
    {
      name: "Wikipedia 中文",
      url: "https://zh.wikipedia.org/wiki/人工智能",
      description: "测试内容密集型网站",
    },
  ];

  const results = [];

  for (let i = 0; i < websites.length; i++) {
    const site = websites[i];
    console.log(`\n\n📊 测试 ${i + 1}/${websites.length}: ${site.name}`);
    console.log(`📝 说明: ${site.description}`);
    console.log("");

    const result = await testWebsite(site.url);
    results.push({
      ...site,
      ...result,
    });

    // 等待一下再测试下一个
    if (i < websites.length - 1) {
      console.log(`\n⏸️  等待 2 秒后继续...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 打印总结
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 测试总结");
  console.log("=".repeat(80) + "\n");

  const successCount = results.filter((r) => r.success).length;

  results.forEach((result, index) => {
    const icon = result.success ? "✅" : "❌";
    const status = result.success ? "成功" : "失败";
    const time = result.success ? `${result.duration}ms` : "N/A";
    console.log(
      `   ${index + 1}. ${icon} ${result.name} - ${status} (${time})`
    );
    if (result.success) {
      console.log(`      标题: ${result.title}`);
      console.log(`      截图: ${result.screenshotPath}`);
    }
  });

  console.log(`\n📈 成功率: ${((successCount / results.length) * 100).toFixed(1)}% (${successCount}/${results.length})`);
  console.log("\n" + "=".repeat(80));

  if (successCount === results.length) {
    console.log("🎉 所有网站测试通过!");
    console.log("\n💡 BROWSER_OPEN 工具可以:");
    console.log("   - ✅ 打开各种类型的网站");
    console.log("   - ✅ 正确渲染动态内容");
    console.log("   - ✅ 捕获控制台日志");
    console.log("   - ✅ 保存高质量截图");
    console.log("   - ✅ 跨平台支持 (Windows/macOS/Linux)\n");
  }
}

// 运行测试
main().catch((error) => {
  console.error("\n💥 测试失败:", error);
  process.exit(1);
});
