import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Send,
  CalendarCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { STATUS_CONFIG } from "@/lib/utils";
import { computeEffectiveStatus } from "@/lib/application-stages";

// 求职历程实时反映投递数据，禁止构建时静态预渲染
export const dynamic = "force-dynamic";

async function getJourneyStats() {
  const [
    totalApplications,
    statusCounts,
    interviewCount,
    offerCount,
    recentApplications,
    ghostedCount,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.application.count({ where: { status: "interview" } }),
    prisma.application.count({ where: { status: "offer" } }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    // 无回应按规则动态判定：投递超两周且无后续进度
    prisma.application
      .findMany({
        select: {
          status: true,
          appliedDate: true,
          timelineEvents: { select: { eventType: true } },
        },
      })
      .then(
        (apps) =>
          apps.filter(
            (a) =>
              computeEffectiveStatus({
                status: a.status,
                appliedDate: a.appliedDate,
                eventTypes: a.timelineEvents.map((e) => e.eventType),
              }) === "ghosted"
          ).length
      ),
  ]);

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s) => {
    statusMap[s.status] = s._count;
  });

  return {
    totalApplications,
    statusMap,
    interviewCount,
    offerCount,
    recentApplications,
    ghostedCount,
  };
}

export default async function JourneyPage() {
  const stats = await getJourneyStats();

  const statCards = [
    {
      label: "总投递",
      value: stats.totalApplications,
      icon: Send,
      color: "text-blue-500",
    },
    {
      label: "面试中",
      value: stats.interviewCount,
      icon: CalendarCheck,
      color: "text-purple-500",
    },
    {
      label: "已获 Offer",
      value: stats.offerCount,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "暂无回应",
      value: stats.ghostedCount,
      icon: Clock,
      color: "text-gray-500",
    },
  ];

  const pipelineStages = [
    { key: "applied", label: "已投递" },
    { key: "oa", label: "笔试中" },
    { key: "interview", label: "面试中" },
    { key: "offer", label: "已 Offer" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">求职历程</h1>
          <p className="text-[var(--muted)] mt-1">
            管理你的投递记录和面试进程
          </p>
        </div>
        <Link
          href="/journey/applications/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增投递
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {stat.label}
                </span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">投递漏斗</h2>
        <div className="grid grid-cols-4 gap-4">
          {pipelineStages.map((stage, i) => {
            const count = stats.statusMap[stage.key] ?? 0;
            const config =
              STATUS_CONFIG[stage.key as keyof typeof STATUS_CONFIG];
            return (
              <div key={stage.key} className="text-center">
                <div className="text-2xl font-bold mb-1">{count}</div>
                <div
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config?.color}`}
                >
                  {config?.label ?? stage.label}
                </div>
                {i < pipelineStages.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-auto mt-2 text-[var(--muted)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/journey/applications"
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-sm transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
                全部投递记录
              </h3>
              <p className="text-sm text-[var(--muted)] mt-1">
                查看和管理所有投递
              </p>
            </div>
            <Send className="w-8 h-8 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
          </div>
        </Link>
        <Link
          href="/journey/analytics"
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-sm transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
                数据分析
              </h3>
              <p className="text-sm text-[var(--muted)] mt-1">
                投递趋势和面试转化分析
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
