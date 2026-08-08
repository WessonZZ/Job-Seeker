import { BaseScraper } from "../base-scraper";
import type { ScrapedJob, ScraperSource } from "../types";
import { extractJobsFromUrl } from "@/lib/scraper-engine";

/**
 * 字节跳动校招爬虫
 * 使用通用爬取引擎
 */
export class ByteDanceScraper extends BaseScraper {
  source: ScraperSource = {
    id: "bytedance",
    name: "字节跳动",
    website: "https://jobs.bytedance.com",
    type: "html",
  };

  async scrape(): Promise<ScrapedJob[]> {
    const urls = [
      "https://jobs.bytedance.com/campus",
      "https://jobs.bytedance.com",
      "https://jobs.bytedance.com/campus/position",
    ];

    for (const url of urls) {
      try {
        const jobs = await extractJobsFromUrl("字节跳动", url);
        if (jobs.length > 0) {
          return jobs.map((j) => ({
            companyName: "字节跳动",
            title: j.title,
            jd: j.jd,
            url: j.url,
            source: "字节跳动校招",
            salary: j.salary,
            location: j.location,
            postedDate: new Date(),
          }));
        }
      } catch {
        continue;
      }
    }

    return [];
  }
}
