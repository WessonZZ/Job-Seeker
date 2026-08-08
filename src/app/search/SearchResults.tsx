"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Plus,
  X,
  Check,
  Search as SearchIcon,
  Globe,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface SearchIndustry {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface SearchCompany {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: SearchIndustry;
  _count: { jobPostings: number };
}

interface SearchJob {
  id: string;
  title: string;
  company: { id: string; name: string; slug: string };
  salary: string | null;
  location: string | null;
  postedDate: string;
}

interface LookupResult {
  careerUrl: string | null;
  guessedUrls: string[];
  suggestions: Array<{ name: string; careerUrl: string }>;
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [companies, setCompanies] = useState<SearchCompany[]>([]);
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Add company modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCompanyName, setAddCompanyName] = useState("");
  const [addCompanyIndustry, setAddCompanyIndustry] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [industries, setIndustries] = useState<SearchIndustry[]>([]);
  const [saving, setSaving] = useState(false);
  const [addResult, setAddResult] = useState("");

  // Auto-lookup state
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    extractedCount?: number;
    imported?: number;
  } | null>(null);
  const [quickJobTitle, setQuickJobTitle] = useState("");
  const [addingQuickJob, setAddingQuickJob] = useState(false);
  const [quickJobAdded, setQuickJobAdded] = useState("");

  useEffect(() => {
    if (!q) return;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setCompanies(data.companies ?? []);
        setJobs(data.jobs ?? []);
        setSuggestions(data.suggestions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  const fetchIndustries = useCallback(async () => {
    try {
      const res = await fetch("/api/industries-list");
      const data = await res.json();
      setIndustries(data.industries ?? []);
      if (data.industries?.length > 0) {
        setAddCompanyIndustry(data.industries[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  const lookupCompany = useCallback(async (name: string) => {
    setLookingUp(true);
    setLookupResult(null);
    setShowSuggestionDropdown(false);

    try {
      const res = await fetch(
        `/api/company-lookup?name=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      setLookupResult({
        careerUrl: data.careerUrl,
        guessedUrls: data.guessedUrls ?? [],
        suggestions: data.suggestions ?? [],
      });
      setShowSuggestionDropdown(
        (data.suggestions ?? []).length > 0 &&
          !data.careerUrl
      );
    } catch {
      setLookupResult({ careerUrl: null, guessedUrls: [], suggestions: [] });
    } finally {
      setLookingUp(false);
    }
  }, []);

  const openAddCompany = async (name: string) => {
    setAddCompanyName(name);
    setAddResult("");
    setImportResult(null);
    await fetchIndustries();
    setShowAddModal(true);
    // Auto-lookup the company URL
    lookupCompany(name);
  };

  const selectSuggestion = (suggestion: {
    name: string;
    careerUrl: string;
  }) => {
    setAddCompanyName(suggestion.name);
    setLookupResult({
      careerUrl: suggestion.careerUrl,
      guessedUrls: [],
      suggestions: [],
    });
    setShowSuggestionDropdown(false);
  };

  const handleAddCompany = async () => {
    if (!addCompanyName || !addCompanyIndustry) return;
    setSaving(true);
    setAddResult("");

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addCompanyName,
          industryId: addCompanyIndustry,
          website: lookupResult?.careerUrl ?? undefined,
        }),
      });

      if (res.ok) {
        setAddResult("success");
        setTimeout(() => {
          setShowAddModal(false);
          window.location.reload();
        }, 1200);
      } else {
        const data = await res.json();
        setAddResult(data.error ?? "添加失败");
      }
    } catch {
      setAddResult("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    const targetUrl = lookupResult?.careerUrl ?? manualUrl;
    if (!addCompanyName || !targetUrl) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/scraper/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: addCompanyName,
          careerUrl: targetUrl,
        }),
      });
      const data = await res.json();

      setImportResult({
        success: data.success,
        message: data.message ?? data.error ?? "导入完成",
        extractedCount: data.extractedCount,
        imported: data.imported,
      });
    } catch {
      setImportResult({
        success: false,
        message: "网络错误",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleQuickAddJob = async () => {
    const title = quickJobTitle.trim();
    if (!title) return;
    setAddingQuickJob(true);
    setQuickJobAdded("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: addCompanyName,
          title,
        }),
      });
      if (res.ok) {
        setQuickJobAdded(`已添加「${title}」`);
        setQuickJobTitle("");
      } else {
        setQuickJobAdded("添加失败");
      }
    } catch {
      setQuickJobAdded("网络错误");
    } finally {
      setAddingQuickJob(false);
    }
  };

  const handleNameChange = (newName: string) => {
    setAddCompanyName(newName);
    setImportResult(null);
    // Auto-lookup after typing stops (debounce handled by useEffect-like pattern)
    if (newName.length >= 1) {
      lookupCompany(newName);
    }
  };

  if (!q) {
    return (
      <div className="text-center py-16 text-[var(--muted)]">
        <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>输入关键词搜索公司和职位</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {loading && (
        <div className="text-center py-8 text-[var(--muted)]">搜索中...</div>
      )}

      {!loading && (
        <>
          {/* Companies */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              公司 ({companies.length})
            </h2>
            {companies.length === 0 ? (
              <div className="text-sm text-[var(--muted)] py-4">
                未找到匹配的公司
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/industries/${c.industry.slug}/companies/${c.slug}`}
                          className="font-medium hover:text-[var(--primary)] transition-colors"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {c.industry.name}
                        </p>
                        <p className="text-xs text-[var(--primary)] mt-1">
                          {c._count.jobPostings} 个职位
                        </p>
                      </div>
                      <Link
                        href={`/industries/${c.industry.slug}/companies/${c.slug}`}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] hover:bg-[var(--sidebar-hover)] transition-colors"
                      >
                        查看
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Suggestions — Click to add */}
          {suggestions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                未收录的公司 — 点击添加
              </h2>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => openAddCompany(name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Jobs */}
          {jobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                职位 ({jobs.length})
              </h2>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:text-[var(--primary)] transition-colors"
                        >
                          {job.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                          <span>{job.company.name}</span>
                          {job.location && <span>{job.location}</span>}
                          {job.salary && (
                            <span className="text-emerald-500">
                              {job.salary}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] hover:bg-[var(--sidebar-hover)] transition-colors"
                        >
                          详情
                        </Link>
                        <Link
                          href={`/journey/applications/new?jobId=${job.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          投递
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {companies.length === 0 &&
            jobs.length === 0 &&
            suggestions.length === 0 && (
              <div className="text-center py-16 text-[var(--muted)]">
                <p className="text-lg mb-2">未找到 &ldquo;{q}&rdquo; 的相关结果</p>
                <p className="text-sm">
                  你可以尝试其他关键词，或
                  <button
                    onClick={() => openAddCompany(q)}
                    className="text-[var(--primary)] hover:underline mx-1 font-medium"
                  >
                    手动添加 &ldquo;{q}&rdquo;
                  </button>
                  到系统中
                </p>
              </div>
            )}
        </>
      )}

      {/* ─── Add Company Modal (with auto-lookup + import) ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">添加公司</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-[var(--sidebar-hover)] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Company name with auto-suggest dropdown */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1">
                  公司名称 *
                </label>
                <input
                  type="text"
                  value={addCompanyName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="输入公司名称，系统自动查找官网"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />

                {/* Auto-suggest dropdown */}
                {showSuggestionDropdown &&
                  lookupResult?.suggestions &&
                  lookupResult.suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg">
                      {lookupResult.suggestions.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => selectSuggestion(s)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-[var(--sidebar-hover)] transition-colors text-left"
                        >
                          <Building2 className="w-4 h-4 shrink-0 text-[var(--muted)]" />
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-[var(--muted)]">
                              {s.careerUrl}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Auto-lookup result */}
              <div className="p-3 rounded-lg bg-[var(--sidebar-hover)]">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-[var(--muted)]" />
                  <span className="text-xs font-medium text-[var(--muted)]">
                    招聘官网
                  </span>
                </div>

                {lookingUp ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在查找官网...
                  </div>
                ) : lookupResult?.careerUrl ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <a
                      href={lookupResult.careerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--primary)] hover:underline truncate"
                    >
                      {lookupResult.careerUrl}
                    </a>
                  </div>
                ) : lookupResult?.guessedUrls &&
                  lookupResult.guessedUrls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-amber-500">
                      <span>未精确匹配，以下是猜测的官网：</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lookupResult.guessedUrls.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => {
                            setLookupResult({
                              ...lookupResult,
                              careerUrl: url,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg border border-dashed border-[var(--border)] text-xs hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                        >
                          {url.replace("https://", "").replace("http://", "")}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      选择一个或手动输入下方 URL
                    </p>
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <span>未找到对应官网</span>
                  </div>
                )}
              </div>

              {/* Industry select */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  所属行业 *
                </label>
                <select
                  value={addCompanyIndustry}
                  onChange={(e) =>
                    setAddCompanyIndustry(e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                >
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.icon ?? "📁"} {ind.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import button (only show when URL found) */}
              {(lookupResult?.careerUrl || manualUrl) && (
                <div className="p-3 rounded-lg border border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[var(--primary)]" />
                    从此官网导入岗位
                  </p>

                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在爬取...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        一键导入岗位
                      </>
                    )}
                  </button>

                  {/* Import result */}
                  {importResult && (
                    <div
                      className={`mt-2 p-2 rounded text-sm ${
                        importResult.success
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                          : "bg-red-50 dark:bg-red-500/10 text-red-500"
                      }`}
                    >
                      <p className="flex items-center gap-1">
                        {importResult.success ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        {importResult.message}
                      </p>
                      {importResult.success && importResult.imported !== undefined && (
                        <p className="text-xs mt-1 opacity-75">
                          提取到 {importResult.extractedCount ?? 0} 个岗位，新增 {importResult.imported} 条
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick Add Job (when import found 0 jobs) */}
                  {importResult?.success && importResult.imported === 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-medium text-[var(--muted)]">
                        未自动提取到岗位，你可以快速添加：
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickJobTitle}
                          onChange={(e) => setQuickJobTitle(e.target.value)}
                          placeholder="输入职位名称"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                        <button
                          onClick={handleQuickAddJob}
                          disabled={!quickJobTitle.trim() || addingQuickJob}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                        >
                          {addingQuickJob ? "添加中" : "添加"}
                        </button>
                      </div>
                      {quickJobAdded && (
                        <p className="text-xs text-emerald-500 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {quickJobAdded}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Add result */}
              {addResult === "success" && (
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <Check className="w-4 h-4" />
                  添加成功！页面将刷新
                </div>
              )}
              {addResult && addResult !== "success" && (
                <div className="text-sm text-red-500">{addResult}</div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddCompany}
                  disabled={saving || !addCompanyIndustry}
                  className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                  {saving ? "添加中..." : "确认添加公司"}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
