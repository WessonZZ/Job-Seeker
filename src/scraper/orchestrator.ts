import { prisma } from "@/lib/prisma";
import { BaseScraper } from "./base-scraper";
import type { ScrapeRunReport, ScraperResult, ScrapedJob } from "./types";

// 所有已注册的爬虫源
// 注意：大厂招聘站 (字节/腾讯/阿里等) 使用 JS 动态加载，无法自动爬取
// 请使用搜索页的「一键导入」功能手动添加具体公司的招聘官网网址
const SCRAPERS: BaseScraper[] = [];

// 运行历史的环状缓冲区（内存，最多存 10 条）
const runHistory: ScrapeRunReport[] = [];

export function getRunHistory(): ScrapeRunReport[] {
  return [...runHistory];
}

export function getLastRun(): ScrapeRunReport | null {
  return runHistory.length > 0 ? runHistory[runHistory.length - 1] : null;
}

/**
 * 执行一次完整的全源爬取
 */
export async function runAllScrapers(): Promise<ScrapeRunReport> {
  const startedAt = new Date();
  const reportId = `scrape_${startedAt.getTime()}`;

  console.log(`[Scraper] 开始爬取: ${startedAt.toISOString()}`);

  // 并行运行所有爬虫
  const results: ScraperResult[] = await Promise.all(
    SCRAPERS.map((scraper) => scraper.run())
  );

  // 收集所有新岗位
  const allJobs: ScrapedJob[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.success) {
      allJobs.push(...result.jobs);
    } else {
      errors.push(`[${result.source.name}] ${result.error}`);
    }
  }

  // 去重
  const seen = new Set<string>();
  const uniqueJobs = allJobs.filter((job) => {
    const key = BaseScraper.generateDedupeKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 写入数据库
  let newJobs = 0;
  for (const job of uniqueJobs) {
    try {
      const existing = await prisma.jobPosting.findFirst({
        where: {
          company: { name: job.companyName },
          title: job.title,
        },
      });

      if (!existing) {
        let company = await prisma.company.findFirst({
          where: { name: job.companyName },
        });

        if (!company) {
          const defaultIndustry = await prisma.industry.findFirst({
            orderBy: { name: "asc" },
          });
          company = await prisma.company.create({
            data: {
              name: job.companyName,
              slug: job.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              industryId: defaultIndustry?.id ?? "",
            },
          });
        }

        await prisma.jobPosting.create({
          data: {
            companyId: company.id,
            title: job.title,
            jd: job.jd || "暂无描述",
            url: job.url || "",
            source: job.source,
            salary: job.salary,
            location: job.location,
            tags: job.tags ? JSON.stringify(job.tags) : null,
            postedDate: job.postedDate,
            isActive: true,
          },
        });
        newJobs++;
      }
    } catch (err) {
      console.error(`[Scraper] 写入失败: ${job.companyName} - ${job.title}`, err);
    }
  }

  const finishedAt = new Date();
  const report: ScrapeRunReport = {
    id: reportId,
    startedAt,
    finishedAt,
    totalJobs: uniqueJobs.length,
    newJobs,
    results,
    errors,
  };

  runHistory.push(report);
  if (runHistory.length > 10) runHistory.shift();

  console.log(
    `[Scraper] 完成: ${uniqueJobs.length} 个唯一岗位，${newJobs} 条新增，${errors.length} 个错误`
  );

  return report;
}

/**
 * 获取所有已注册的爬虫源
 */
export function getAvailableSources() {
  return SCRAPERS.map((s) => ({
    id: s.source.id,
    name: s.source.name,
    website: s.source.website,
    type: s.source.type,
  }));
}
