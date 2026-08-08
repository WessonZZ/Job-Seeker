import { prisma } from "@/lib/prisma";
import { format, STATUS_CONFIG } from "@/lib/utils";
import { computeEffectiveStatus } from "@/lib/application-stages";
import Link from "next/link";
import {
  Plus, ChevronRight, LayoutList, Building2, Clock,
} from "lucide-react";

interface Props {
  searchParams: Promise<{ status?: string; view?: string; ids?: string; source?: string }>;
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentView = params.view === "company" ? "company" : "list";

  // 拉取全部并计算"有效状态"（无回应按"投递超两周无进度"动态判定）
  const allApps = await prisma.application.findMany({
    include: { timelineEvents: { select: { eventType: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const idFilter = params.ids
    ? new Set(params.ids.split(",").filter(Boolean))
    : null;
  const statusFilter =
    params.status && params.status !== "all" ? params.status : null;

  const applications = allApps
    .map((app) => ({
      ...app,
      effStatus: computeEffectiveStatus({
        status: app.status,
        appliedDate: app.appliedDate,
        eventTypes: app.timelineEvents.map((e) => e.eventType),
      }),
      _count: { timelineEvents: app.timelineEvents.length },
    }))
    .filter((app) => {
      if (idFilter && (idFilter.size === 0 || !idFilter.has(app.id)))
        return false;
      if (statusFilter && app.effStatus !== statusFilter) return false;
      return true;
    });

  const grouped = applications.reduce<Record<string, typeof applications>>((acc, app) => {
    if (!acc[app.companyName]) acc[app.companyName] = [];
    acc[app.companyName].push(app);
    return acc;
  }, {});
  const companyNames = Object.keys(grouped).sort();

  const href = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.view) sp.set("view", params.view);
    if (params.status) sp.set("status", params.status);
    Object.entries(overrides).forEach(([k, v]) => v ? sp.set(k, v) : sp.delete(k));
    const q = sp.toString();
    return `/journey/applications${q ? "?" + q : ""}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">投递记录</h1>
          <p className="text-[var(--muted)] mt-1">
            {params.ids
              ? params.source === "email"
                ? "邮件同步结果"
                : `共 ${applications.length} 条记录`
              : currentView === "list"
                ? `共 ${applications.length} 条记录`
                : `${companyNames.length} 家公司 · ${applications.length} 条投递`}
          </p>
        </div>
        <Link href="/journey/applications/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)]">
          <Plus className="w-4 h-4" />新增投递
        </Link>
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
          {applications.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)]">
              <p className="text-lg mb-2">暂无投递记录</p>
              <Link href="/journey/applications/new" className="text-[var(--primary)] hover:underline text-sm">开始你的第一条投递记录</Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {applications.map((app) => {
                const config = STATUS_CONFIG[app.effStatus as keyof typeof STATUS_CONFIG];
                return (
                  <Link key={app.id} href={`/journey/applications/${app.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--sidebar-hover)] transition-colors group">
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
              <p className="text-lg mb-2">暂无投递记录</p>
              <Link href="/journey/applications/new" className="text-[var(--primary)] hover:underline text-sm">开始你的第一条投递记录</Link>
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
                      <Link key={app.id} href={`/journey/applications/${app.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--sidebar-hover)] transition-colors group">
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
