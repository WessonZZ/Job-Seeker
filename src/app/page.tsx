import {
  TrendingUp,
  Send,
  CalendarCheck,
  Building,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeroBadge, { type HeroKey } from "@/components/HeroBadge";
import FunnelChart from "@/components/dashboard/FunnelChart";
import CompanyProgress from "@/components/dashboard/CompanyProgress";
import TimeMonitor, { type TimePoint } from "@/components/dashboard/TimeMonitor";
import CountdownList from "@/components/dashboard/CountdownList";
import FloatingCard from "@/components/dashboard/FloatingCard";
import {
  STAGE_ORDER,
  STAGE_META,
  STAGE_WEIGHT,
  deepestStageIndex,
} from "@/lib/application-stages";

// 仪表盘实时反映投递数据，禁止构建时静态预渲染
export const dynamic = "force-dynamic";

async function getStats() {
  const [
    todayJobs,
    totalJobs,
    totalCompanies,
    totalApplications,
    activeApplications,
    interviewCount,
  ] = await Promise.all([
    prisma.jobPosting.count({
      where: {
        postedDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.company.count(),
    prisma.application.count(),
    prisma.application.count({
      where: {
        status: { in: ["applied", "oa", "interview"] },
      },
    }),
    prisma.application.count({
      where: { status: "interview" },
    }),
  ]);

  return {
    todayJobs,
    totalJobs,
    totalCompanies,
    totalApplications,
    activeApplications,
    interviewCount,
  };
}

// ─────────────────────────────────────────────
// Dashboard 数据分析（漏斗 / 公司进度 / 时间监控 / 倒计时）
// ─────────────────────────────────────────────

const COUNTDOWN_EVENTS = ["oa", "test", "interview", "interview_pending", "followup"];

const HERO_POOL: HeroKey[] = ["IM", "CAP", "HULK", "THOR", "BP", "BW", "SP"];

/** 根据公司名确定性映射到一个英雄 */
function heroForCompany(name: string): HeroKey {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 997;
  return HERO_POOL[h % HERO_POOL.length];
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 周一为一周开始
  x.setDate(x.getDate() - day);
  return x;
}

async function getDashboardData() {
  const [applications, events, companies] = await Promise.all([
    prisma.application.findMany({
      select: {
        id: true,
        companyName: true,
        position: true,
        status: true,
        appliedDate: true,
        updatedAt: true,
      },
    }),
    prisma.timelineEvent.findMany({
      select: { id: true, applicationId: true, eventType: true, date: true, title: true },
    }),
    prisma.company.findMany({ select: { name: true, logo: true } }),
  ]);

  const companyMap = new Map(companies.map((c) => [c.name, c]));

  const eventsByApp = new Map<string, TimelineEventLike[]>();
  for (const e of events) {
    if (!eventsByApp.has(e.applicationId)) eventsByApp.set(e.applicationId, []);
    eventsByApp.get(e.applicationId)!.push(e);
  }

  const apps = applications.map((a) => {
    const evs = eventsByApp.get(a.id) ?? [];
    const stageIndex = deepestStageIndex(
      a.status,
      evs.map((e) => e.eventType)
    );
    const oaDate =
      evs.find((e) => e.eventType === "oa" || e.eventType === "test")?.date ??
      (a.status === "oa" ? a.updatedAt : null);
    const interviewDate =
      evs.find((e) => e.eventType === "interview" || e.eventType === "interview_pending")
        ?.date ??
      (a.status === "interview" || a.status === "offer" ? a.updatedAt : null);
    const offerDate =
      evs.find((e) => e.eventType === "offer")?.date ??
      (a.status === "offer" ? a.updatedAt : null);
    return { ...a, stageIndex, oaDate, interviewDate, offerDate };
  });

  return { apps, events, companyMap };
}

interface TimelineEventLike {
  applicationId: string;
  eventType: string;
  date: Date;
  title: string;
}

export default async function HomePage() {
  const stats = await getStats();
  const { apps, events, companyMap } = await getDashboardData();

  // 1) 求职转化漏斗：到达各阶段的应用数（点击跳转到对应岗位）
  const funnel = STAGE_ORDER.map((key) => {
    const ids = apps.filter((a) => a.stageIndex >= STAGE_WEIGHT[key]).map((a) => a.id);
    return {
      key,
      label: STAGE_META[key].label,
      hero: STAGE_META[key].hero,
      count: ids.length,
      href: `/journey/applications?source=dashboard&ids=${ids.length ? ids.join(",") : "__none__"}`,
    };
  });

  // 2) 公司岗位进度（公司头可点击该公司全部岗位）
  const byCompany = new Map<string, typeof apps>();
  for (const a of apps) {
    if (!byCompany.has(a.companyName)) byCompany.set(a.companyName, []);
    byCompany.get(a.companyName)!.push(a);
  }
  const companyProgress = [...byCompany.entries()]
    .map(([name, list]) => {
      const ids = list.map((a) => a.id);
      return {
        name,
        logo: companyMap.get(name)?.logo ?? null,
        hero: heroForCompany(name),
        href: `/journey/applications?source=dashboard&ids=${ids.length ? ids.join(",") : "__none__"}`,
        positions: list.map((a) => ({
          id: a.id,
          position: a.position,
          stageIndex: a.stageIndex,
        })),
      };
    })
    .sort((a, b) => {
      const deepA = Math.max(...a.positions.map((p) => p.stageIndex));
      const deepB = Math.max(...b.positions.map((p) => p.stageIndex));
      return deepB - deepA || b.positions.length - a.positions.length;
    });

  // 3) 时间维度监控：月度从今年 1 月开始；周度从当前周往前推 12 周
  const now = new Date();
  const months: TimePoint[] = [];
  const year = now.getFullYear();
  for (let m = 0; m <= now.getMonth(); m++) {
    const start = new Date(year, m, 1);
    const next = new Date(year, m + 1, 1);
    months.push({
      label: `${m + 1}月`,
      applied: apps.filter((a) => a.appliedDate >= start && a.appliedDate < next).length,
      oa: apps.filter((a) => a.oaDate && a.oaDate >= start && a.oaDate < next).length,
      interview: apps.filter((a) => a.interviewDate && a.interviewDate >= start && a.interviewDate < next).length,
      offer: apps.filter((a) => a.offerDate && a.offerDate >= start && a.offerDate < next).length,
    });
  }

  const weeks: TimePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const s = startOfWeek(new Date(now));
    s.setDate(s.getDate() - i * 7);
    const next = new Date(s);
    next.setDate(next.getDate() + 7);
    weeks.push({
      label: `${s.getMonth() + 1}/${s.getDate()}`,
      applied: apps.filter((a) => a.appliedDate >= s && a.appliedDate < next).length,
      oa: apps.filter((a) => a.oaDate && a.oaDate >= s && a.oaDate < next).length,
      interview: apps.filter((a) => a.interviewDate && a.interviewDate >= s && a.interviewDate < next).length,
      offer: apps.filter((a) => a.offerDate && a.offerDate >= s && a.offerDate < next).length,
    });
  }

  // 4) 阶段倒计时：未来的笔试 / 面试事件
  const nowDate = new Date();
  const appById = new Map(apps.map((a) => [a.id, a]));
  const countdown = events
    .filter((e) => COUNTDOWN_EVENTS.includes(e.eventType) && e.date > nowDate)
    .map((e) => {
      const app = appById.get(e.applicationId);
      return {
        id: e.id,
        applicationId: e.applicationId,
        companyName: app?.companyName ?? "未知公司",
        position: app?.position ?? "",
        eventType: e.eventType,
        title: e.title,
        date: e.date.toISOString(),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const quickLinks: {
    title: string;
    description: string;
    href: string;
    hero: HeroKey;
    count: string;
  }[] = [
    {
      title: "每日工作资讯",
      description: "查看最新发布的招聘信息",
      href: "/news",
      hero: "SP",
      count: `${stats.todayJobs} 条今日更新`,
    },
    {
      title: "行业岗位信息",
      description: "按行业浏览公司和职位",
      href: "/industries",
      hero: "CAP",
      count: `${stats.totalCompanies} 家公司 · ${stats.totalJobs} 个职位`,
    },
    {
      title: "个人求职历程",
      description: "管理投递记录和面试进程",
      href: "/journey",
      hero: "HULK",
      count: `${stats.totalApplications} 条投递记录`,
    },
  ];

  // 统计卡跳转目标（进行中/面试中用 ids 精确筛选）
  const activeIds = apps
    .filter((a) => ["applied", "oa", "interview"].includes(a.status))
    .map((a) => a.id);
  const interviewIds = apps
    .filter((a) => a.status === "interview")
    .map((a) => a.id);
  const idsParam = (ids: string[]) =>
    `/journey/applications?source=dashboard&ids=${ids.length ? ids.join(",") : "__none__"}`;

  const statCards = [
    {
      label: "今日新岗",
      value: stats.todayJobs,
      icon: TrendingUp,
      color: "text-blue-500",
      href: "/news",
    },
    {
      label: "进行中投递",
      value: stats.activeApplications,
      icon: Send,
      color: "text-emerald-500",
      href: idsParam(activeIds),
    },
    {
      label: "面试中",
      value: stats.interviewCount,
      icon: CalendarCheck,
      color: "text-amber-500",
      href: idsParam(interviewIds),
    },
    {
      label: "公司总数",
      value: stats.totalCompanies,
      icon: Building,
      color: "text-purple-500",
      href: "/industries",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)] mt-1">
          欢迎回来，这是你的求职总览
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group hover-float bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
              title={`查看详情 →`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider group-hover:text-[var(--primary)] transition-colors">
                  {stat.label}
                </span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold group-hover:text-[var(--primary)] transition-colors">
                {stat.value}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">快速入口</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group hover-float bg-[var(--card)] border border-[var(--border)] rounded-xl p-5"
              >
                <div className="mb-3">
                  <HeroBadge hero={link.hero} size="lg" />
                </div>
                <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {link.description}
                </p>
                <p className="text-xs text-[var(--primary)] mt-2">
                  {link.count}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 求职转化漏斗 + 投递趋势监控 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <FloatingCard
          title="求职转化漏斗"
          badge="投递 → Offer"
          delay={0}
        >
          <FunnelChart stages={funnel} />
        </FloatingCard>

        <TimeMonitor months={months} weeks={weeks} />
      </div>

      {/* 阶段倒计时 */}
      <FloatingCard
        title="阶段倒计时"
        badge="进行中的笔试 / 面试"
        delay={0.7}
      >
        <CountdownList items={countdown} />
      </FloatingCard>

      {/* 公司岗位进度 */}
      <FloatingCard
        title="公司岗位进度"
        badge={`${companyProgress.length} 家公司`}
        delay={1.2}
      >
        <CompanyProgress items={companyProgress} />
      </FloatingCard>
    </div>
  );
}
