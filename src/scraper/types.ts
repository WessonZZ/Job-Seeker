// ── 爬虫数据模型 ──

export interface ScraperSource {
  id: string;
  name: string;
  website: string;
  type: "api" | "html";
}

export interface ScrapedJob {
  companyName: string;
  title: string;
  jd: string;
  url: string;
  source: string; // 来源名称，如 "字节跳动校招"
  salary?: string;
  location?: string;
  tags?: string[];
  postedDate: Date;
}

export interface ScraperResult {
  source: ScraperSource;
  success: boolean;
  jobs: ScrapedJob[];
  error?: string;
  duration: number; // ms
  timestamp: Date;
}

export interface ScrapeRunReport {
  id: string;
  startedAt: Date;
  finishedAt: Date;
  totalJobs: number;
  newJobs: number;
  results: ScraperResult[];
  errors: string[];
}
