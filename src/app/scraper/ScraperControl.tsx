"use client";

import { useState, useEffect } from "react";
import {
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Database,
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface ScraperSource {
  id: string;
  name: string;
  website: string;
  type: string;
}

interface JobItem {
  companyName: string;
  title: string;
  location: string | null;
  url: string | null;
}

interface SourceResult {
  source: string;
  success: boolean;
  jobCount: number;
  error: string | null;
  jobs: JobItem[];
}

interface RunRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  totalJobs: number;
  newJobs: number;
  errors: string[];
  results?: SourceResult[];
}

interface LastResult {
  totalJobs: number;
  newJobs: number;
  errors: string[];
  duration: number;
  results?: SourceResult[];
}

export default function ScraperControl() {
  const [sources, setSources] = useState<ScraperSource[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [scraping, setScraping] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/scraper");
      const data = await res.json();
      setSources(data.sources ?? []);
      setHistory(data.history ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/scraper", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setLastResult(data);
      } else {
        setLastResult({
          totalJobs: 0,
          newJobs: 0,
          errors: [data.error ?? "未知错误"],
          duration: 0,
          results: [],
        });
      }

      setTimeout(fetchStatus, 500);
    } catch {
      setLastResult({
        totalJobs: 0,
        newJobs: 0,
        errors: ["网络错误"],
        duration: 0,
        results: [],
      });
    } finally {
      setScraping(false);
    }
  };

  const lastRun = history.length > 0 ? history[history.length - 1] : null;
  const results = lastResult?.results ?? (lastRun?.results as SourceResult[] | undefined);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">立即爬取</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              从所有已配置的源抓取最新岗位
            </p>
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
          >
            {scraping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                爬取中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                开始爬取
              </>
            )}
          </button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--sidebar-hover)]">
            <div className="flex items-center gap-2 mb-2">
              {lastResult.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              <span className="font-medium text-sm">
                {lastResult.errors.length > 0
                  ? "部分完成（有错误）"
                  : "爬取成功"}
              </span>
              <span className="text-xs text-[var(--muted)]">
                ({Math.round(lastResult.duration / 1000)} 秒)
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <span>
                发现 <strong>{lastResult.totalJobs}</strong> 个岗位
              </span>
              <span>
                新增 <strong>{lastResult.newJobs}</strong> 条
              </span>
            </div>

            {/* Source results with job details */}
            {results && results.length > 0 && (
              <div className="mt-3 space-y-2">
                {results.map((sr) => (
                  <div key={sr.source} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    {/* Source header */}
                    <button
                      onClick={() =>
                        setExpandedSource(
                          expandedSource === sr.source ? null : sr.source
                        )
                      }
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium bg-[var(--background)] hover:bg-[var(--sidebar-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {sr.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{sr.source}</span>
                        <span className="text-[var(--muted)]">
                          ({sr.jobCount} 个岗位
                          {sr.error ? `, ${sr.error}` : ""})
                        </span>
                      </div>
                      {sr.jobs.length > 0 &&
                        (expandedSource === sr.source ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ))}
                    </button>

                    {/* Job list */}
                    {expandedSource === sr.source && sr.jobs.length > 0 && (
                      <div className="divide-y divide-[var(--border)]">
                        {sr.jobs.map((job, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--sidebar-hover)] transition-colors"
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {job.url ? (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[var(--foreground)] min-w-0 truncate flex-1 hover:text-[var(--primary)] transition-colors flex items-center gap-1"
                              >
                                {job.title}
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />
                              </a>
                            ) : (
                              <span className="font-medium text-[var(--foreground)] min-w-0 truncate flex-1">
                                {job.title}
                              </span>
                            )}
                            <span className="shrink-0">{job.companyName}</span>
                            {job.location && (
                              <span className="shrink-0 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {lastResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {lastResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-[var(--muted)]" />
          数据源
        </h2>

        {loading ? (
          <div className="text-sm text-[var(--muted)]">加载中...</div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--sidebar-hover)]"
              >
                <div>
                  <div className="font-medium text-sm">{source.name}</div>
                  <a
                    href={source.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                  >
                    {source.website}
                  </a>
                </div>
                <span className="text-xs text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded-full">
                  {source.type === "api" ? "API" : "HTML"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run History */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-[var(--muted)]" />
          运行历史
        </h2>

        {history.length === 0 ? (
          <div className="text-sm text-[var(--muted)] text-center py-6">
            暂无运行记录，点击上方按钮开始爬取
          </div>
        ) : (
          <div className="space-y-2">
            {[...history].reverse().map((run) => (
              <div
                key={run.id}
                className="p-3 rounded-lg bg-[var(--sidebar-hover)]"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[var(--muted)]" />
                    <span>
                      {new Date(run.startedAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[var(--muted)]">
                      {run.totalJobs} 个岗位
                    </span>
                    <span className="text-emerald-500 font-medium">
                      +{run.newJobs}
                    </span>
                    {run.errors.length > 0 && (
                      <span className="text-amber-500 text-xs">
                        {run.errors.length} 个错误
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
