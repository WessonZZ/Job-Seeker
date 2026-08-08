import { BaseScraper } from "../base-scraper";
import type { ScrapedJob, ScraperSource } from "../types";
import { extractJobsFromUrl } from "@/lib/scraper-engine";

export class TencentScraper extends BaseScraper {
  source: ScraperSource = {
    id: "tencent",
    name: "腾讯",
    website: "https://join.qq.com",
    type: "html",
  };

  async scrape(): Promise<ScrapedJob[]> {
    const urls = [
      "https://join.qq.com",
      "https://join.qq.com/campus",
      "https://join.qq.com/position",
    ];

    for (const url of urls) {
      try {
        const jobs = await extractJobsFromUrl("腾讯", url);
        if (jobs.length > 0) {
          return jobs.map((j) => ({
            companyName: "腾讯",
            title: j.title,
            jd: j.jd,
            url: j.url,
            source: "腾讯校招",
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
