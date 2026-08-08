import { BaseScraper } from "../base-scraper";
import type { ScrapedJob, ScraperSource } from "../types";
import { extractJobsFromUrl } from "@/lib/scraper-engine";

export class AlibabaScraper extends BaseScraper {
  source: ScraperSource = {
    id: "alibaba",
    name: "阿里巴巴",
    website: "https://talent.alibaba.com",
    type: "html",
  };

  async scrape(): Promise<ScrapedJob[]> {
    const urls = [
      "https://talent.alibaba.com/campus",
      "https://talent.alibaba.com",
      "https://talent.alibaba.com/campus/list",
    ];

    for (const url of urls) {
      try {
        const jobs = await extractJobsFromUrl("阿里巴巴", url);
        if (jobs.length > 0) {
          return jobs.map((j) => ({
            companyName: "阿里巴巴",
            title: j.title,
            jd: j.jd,
            url: j.url,
            source: "阿里巴巴校招",
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
