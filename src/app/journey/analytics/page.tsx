import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_CONFIG } from "@/lib/utils";
import { computeEffectiveStatus } from "@/lib/application-stages";
import PageHeader from "@/components/layout/PageHeader";

// 数据分析实时反映投递数据，禁止构建时静态预渲染
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [totalApplications, applications, user] = await Promise.all([
    prisma.application.count(),
    prisma.application.findMany({
      select: {
        companyName: true,
        position: true,
        status: true,
        appliedDate: true,
        timelineEvents: { select: { eventType: true } },
      },
      orderBy: { appliedDate: "asc" },
    }),
    prisma.user.findFirst(),
  ]);

  // 状态分布：无回应按"投递超两周无进度"动态判定
  const statusMap: Record<string, number> = {};
  for (const app of applications) {
    const eff = computeEffectiveStatus({
      status: app.status,
      appliedDate: app.appliedDate,
      eventTypes: app.timelineEvents.map((e) => e.eventType),
    });
    statusMap[eff] = (statusMap[eff] ?? 0) + 1;
  }

  // Interview conversion rate
  const oa = statusMap["oa"] ?? 0;
  const interview = statusMap["interview"] ?? 0;
  const offer = statusMap["offer"] ?? 0;
  const rejected = statusMap["rejected"] ?? 0;

  const oaRate = totalApplications > 0 ? (oa / totalApplications) * 100 : 0;
  const interviewRate =
    totalApplications > 0 ? (interview / totalApplications) * 100 : 0;
  const offerRate =
    totalApplications > 0 ? (offer / totalApplications) * 100 : 0;
  const rejectRate =
    totalApplications > 0 ? (rejected / totalApplications) * 100 : 0;

  // Applications by month
  const byMonth: Record<string, number> = {};
  applications.forEach((app) => {
    const month = app.appliedDate.toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  });
  const months = Object.entries(byMonth).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="数据分析"
        sub="投递趋势和面试转化分析"
      />

      {/* Conversion Funnel */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">转化漏斗</h2>
        <div className="space-y-3">
          {[
            { label: "总投递", value: totalApplications, pct: 100 },
            { label: "收到笔试", value: oa, pct: oaRate },
            { label: "进入面试", value: interview, pct: interviewRate },
            { label: "获得 Offer", value: offer, pct: offerRate },
            { label: "被拒绝", value: rejected, pct: rejectRate },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="text-[var(--muted)]">
                  {item.value} ({item.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--sidebar-hover)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status distribution */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">状态分布</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = statusMap[key] ?? 0;
            const pct =
              totalApplications > 0
                ? ((count / totalApplications) * 100).toFixed(1)
                : "0";
            return (
              <Link
                key={key}
                href={`/journey/applications?status=${key}`}
                className="group text-center p-4 rounded-lg bg-[var(--sidebar-hover)] hover:bg-[var(--sidebar-active)] hover:-translate-y-0.5 transition-all"
                title={`查看${config.label}的投递记录`}
              >
                <div
                  className={`text-2xl font-bold group-hover:text-[var(--primary)] transition-colors ${config.color.split(" ")[0]}`}
                >
                  {count}
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  {config.label}
                </div>
                <div className="text-xs text-[var(--muted)]">{pct}%</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">投递趋势（按月份）</h2>
        {months.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">
            暂无数据
          </p>
        ) : (
          <div className="space-y-2">
            {months.map(([month, count]) => {
              const maxCount = Math.max(...months.map(([, c]) => c));
              const width = (count / maxCount) * 100;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)] w-16 shrink-0">
                    {month}
                  </span>
                  <div className="flex-1 h-6 rounded bg-[var(--sidebar-hover)] overflow-hidden">
                    <div
                      className="h-full rounded bg-[var(--primary)] flex items-center justify-end pr-2 text-xs text-white font-medium transition-all"
                      style={{ width: `${width}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick stats */}
      {user && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">个人信息摘要</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {user.name && (
              <div>
                <span className="text-[var(--muted)]">姓名：</span>
                {user.name}
              </div>
            )}
            {user.school && (
              <div>
                <span className="text-[var(--muted)]">学校：</span>
                {user.school}
              </div>
            )}
            {user.major && (
              <div>
                <span className="text-[var(--muted)]">专业：</span>
                {user.major}
              </div>
            )}
            {user.degree && (
              <div>
                <span className="text-[var(--muted)]">学历：</span>
                {user.degree}
              </div>
            )}
            {user.graduationYear && (
              <div>
                <span className="text-[var(--muted)]">毕业年份：</span>
                {user.graduationYear}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
