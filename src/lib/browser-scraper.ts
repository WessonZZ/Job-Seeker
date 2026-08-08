/**
 * 浏览器级爬虫 —— 使用 Playwright + Chromium 渲染 SPA 页面
 * 能从 JavaScript 动态加载的招聘页面中提取真实岗位数据
 */

import { chromium } from "playwright";

let browserInstance: Awaited<ReturnType<typeof chromium.launch>> | null = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

/**
 * 使用浏览器打开页面，等待渲染后提取文本内容
 * @returns 渲染后的页面纯文本
 */
export async function renderAndExtract(
  url: string,
  waitTime = 4000
): Promise<{
  text: string;
  title: string;
  url: string;
}> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "zh-CN",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    // 额外等待 JS 执行完毕
    await page.waitForTimeout(waitTime);

    const title = await page.title();
    // 提取页面可见文本
    const text = await page.evaluate(() => {
      // 移除 script 和 style 元素
      const clones = document.cloneNode(true) as Document;
      clones.querySelectorAll("script, style, nav, footer, header").forEach((el) => el.remove());
      return clones.body?.innerText ?? "";
    });

    return { text, title, url: page.url() };
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * 关闭浏览器实例
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
