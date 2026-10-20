"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus, ChevronRight, LayoutList, Building2, Clock, Search, X,
} from "lucide-react";
import { format, STATUS_CONFIG } from "@/lib/utils";
import DeleteApplicationButton from "./DeleteApplicationButton";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export type ApplicationRow = {
  id: string;
  position: string;
  companyName: string;
  appliedDate: Date;
  priority: number;
  effStatus: string;
  _count: { timelineEvents: number };
};

type SearchScope = "company" | "position";

interface Props {
  applications: ApplicationRow[];
  currentView: "list" | "company";
  params: { status?: string; view?: string; ids?: string; source?: string };
}

export default function ApplicationsBrowser({ applications, currentView, params }: Props) {
  const [scope, setScope] = useState<SearchScope>("company");
  const [query, setQuery] = useState("");

  const keyword = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!keyword) return applications;
    return applications.filter((app) =>
      (scope === "company" ? app.companyName : app.position)
        .toLowerCase()
        .includes(keyword)
    );
  }, [applications, keyword, scope]);

  const grouped = useMemo(() => {
    const acc: Record<string, ApplicationRow[]> = {};
    for (const app of filtered) {
      if (!acc[app.companyName]) acc[app.companyName] = [];
      acc[app.companyName].push(app);
    }
    return acc;
  }, [filtered]);

  const companyNames = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const href = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.view) sp.set("view", params.view);
    if (params.status) sp.set("status", params.status);
    Object.entries(overrides).forEach(([k, v]) => v ? sp.set(k, v) : sp.delete(k));
    const q = sp.toString();
    return `/journey/applications${q ? "?" + q : ""}`;
  };

  const clearSearch = () => setQuery("");

  const emptyState = keyword ? (
    <EmptyState
      title="没有匹配的记录"
      hint={`没有${scope === "company" ? "公司名" : "岗位名"}包含「${query.trim()}」`}
      action={
        <button
          type="button"
          onClick={clearSearch}
          className="text-[var(--primary)] hover:underline text-sm"
        >
          清空搜索
        </button>
      }
    />
  ) : (
    <EmptyState
      title="暂无投递记录"
      action={
        <Link
          href="/journey/applications/new"
          className="text-[var(--primary)] hover:underline text-sm"
        >
          开始你的第一条投递记录
        </Link>
      }
    />
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Applications"
        title="投递记录"
        sub={
          params.ids
            ? params.source === "email"
              ? "邮件同步结果"
              : `共 ${filtered.length} 条记录`
            : currentView === "list"
              ? `共 ${filtered.length} 条记录`
              : `${companyNames.length} 家公司 · ${filtered.length} 条投递`
        }
        actions={
          <Link href="/journey/applications/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)]">
            <Plus className="w-4 h-4" />新增投递
          </Link>
        }
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={scope === "company" ? "搜索公司名…" : "搜索岗位名…"}
            aria-label={scope === "company" ? "搜索公司名" : "搜索岗位名"}
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)] transition-colors"
          />
          {query && (
            <button type="button" onClick={clearSearch} aria-label="清空搜索"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[var(--sidebar-hover)] rounded-lg p-0.5 border border-[var(--border)]">
          <button type="button" onClick={() => setScope("company")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              scope === "company" ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>公司</button>
          <button type="button" onClick={() => setScope("position")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              scope === "position" ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>岗位</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={href({ status: "" })}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              !params.status ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--sidebar-hover)]"
            }`}>全部</Link>
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <Link key={key} href={href({ status: key })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                params.status === key ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--sidebar-hover)]"
              }`}>
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[var(--sidebar-hover)] rounded-lg p-0.5 border border-[var(--border)]">
          <Link href={href({ view: "" })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "list" ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>
            <LayoutList className="w-3.5 h-3.5" />列表
          </Link>
          <Link href={href({ view: "company" })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "company" ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>
            <Building2 className="w-3.5 h-3.5" />按公司
          </Link>
        </div>
      </div>

      {/* List View */}
      {currentView === "list" && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)]">{emptyState}</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((app) => {
                const config = STATUS_CONFIG[app.effStatus as keyof typeof STATUS_CONFIG];
                return (
                  <div key={app.id} className="flex items-center gap-1 px-5 py-4 hover:bg-[var(--sidebar-hover)] transition-colors group">
                    <Link href={`/journey/applications/${app.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate group-hover:text-[var(--primary)] transition-colors">{app.position}</h3>
                          {config && (
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${config.color}`}>
                              <span>{config.icon}</span>{config.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted)]">
                          <span>{app.companyName}</span>
                          <span>·</span>
                          <span>投递于 {format.date(app.appliedDate)}</span>
                          {app._count.timelineEvents > 0 && (<><span>·</span><span>{app._count.timelineEvents} 个事件</span></>)}
                        </div>
                      </div>
                      {app.priority > 0 && <span className="text-xs text-amber-500 font-medium">★ 重点</span>}
                      <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    </Link>
                    <DeleteApplicationButton applicationId={app.id} position={app.position} companyName={app.companyName} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Company View */}
      {currentView === "company" && (
        <div className="space-y-4">
          {companyNames.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-16 text-center text-[var(--muted)]">
              {emptyState}
            </div>
          ) : companyNames.map((name) => {
            const apps = grouped[name];
            return (
              <div key={name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--sidebar-hover)] border-b border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{name}</h3>
                      <p className="text-xs text-[var(--muted)]">{apps.length} 条投递</p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)]">最近: {format.date(apps.reduce((a, b) => a.appliedDate > b.appliedDate ? a : b).appliedDate)}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {apps.map((app) => {
                    const config = STATUS_CONFIG[app.effStatus as keyof typeof STATUS_CONFIG];
                    return (
                      <div key={app.id} className="flex items-center gap-1 px-5 py-3.5 hover:bg-[var(--sidebar-hover)] transition-colors group">
                        <Link href={`/journey/applications/${app.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-medium truncate group-hover:text-[var(--primary)]">{app.position}</h4>
                              {config && (
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${config.color}`}>
                                  <span>{config.icon}</span>{config.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted)]">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format.date(app.appliedDate)}</span>
                              {app._count.timelineEvents > 0 && <span>{app._count.timelineEvents} 个事件</span>}
                            </div>
                          </div>
                          {app.priority > 0 && <span className="text-xs text-amber-500">★</span>}
                          <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                        </Link>
                        <DeleteApplicationButton applicationId={app.id} position={app.position} companyName={app.companyName} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
