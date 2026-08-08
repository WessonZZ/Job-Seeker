import { NextResponse } from "next/server";
import {
  runAllScrapers,
  getRunHistory,
  getAvailableSources,
} from "@/scraper/orchestrator";

// GET /api/scraper — 获取爬虫状态和历史
export async function GET() {
  const history = getRunHistory().map((r) => ({
    id: r.id,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    totalJobs: r.totalJobs,
    newJobs: r.newJobs,
    errors: r.errors,
    results: r.results.map((sr) => ({
      source: sr.source.name,
      success: sr.success,
      jobCount: sr.jobs.length,
      error: sr.error || null,
      jobs: sr.jobs.map((j) => ({
        companyName: j.companyName,
        title: j.title,
        location: j.location || null,
      })),
    })),
  }));

  return NextResponse.json({
    sources: getAvailableSources(),
    lastRun: history.length > 0 ? history[history.length - 1] : null,
    history,
  });
}

// POST /api/scraper — 手动触发爬取
export async function POST() {
  try {
    const report = await runAllScrapers();
    return NextResponse.json({
      success: true,
      totalJobs: report.totalJobs,
      newJobs: report.newJobs,
      errors: report.errors,
      duration: report.finishedAt.getTime() - report.startedAt.getTime(),
      results: report.results.map((sr) => ({
        source: sr.source.name,
        success: sr.success,
        jobCount: sr.jobs.length,
        error: sr.error || null,
        jobs: sr.jobs.map((j) => ({
          companyName: j.companyName,
          title: j.title,
          location: j.location || null,
          url: j.url || null,
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
