import type { ScrapedJob, ScraperResult, ScraperSource } from "./types";

/**
 * 基础爬虫抽象类
 * 所有数据源爬虫都继承此类
 */
export abstract class BaseScraper {
  abstract source: ScraperSource;

  /**
   * 执行爬取，返回结构化结果
   */
  abstract scrape(): Promise<ScrapedJob[]>;

  /**
   * 执行爬取并包装结果（包含耗时、错误等元数据）
   */
  async run(): Promise<ScraperResult> {
    const start = Date.now();
    try {
      const jobs = await this.scrape();
      return {
        source: this.source,
        success: true,
        jobs,
        duration: Date.now() - start,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        source: this.source,
        success: false,
        jobs: [],
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 通用 HTTP GET 请求
   */
  protected async fetch(url: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/html, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
    }

    return response;
  }

  /**
   * 检测是否已经存在相似的岗位（基于标题+公司去重）
   * 会在 orchestrator 中统一调用，这里仅做辅助
   */
  static generateDedupeKey(job: ScrapedJob): string {
    const company = job.companyName.trim().toLowerCase();
    const title = job.title.trim().toLowerCase();
    return `${company}::${title}`;
  }
}
