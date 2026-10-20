import { prisma } from "@/lib/prisma";
import { computeEffectiveStatus } from "@/lib/application-stages";
import ApplicationsBrowser from "./ApplicationsBrowser";

interface Props {
  searchParams: Promise<{ status?: string; view?: string; ids?: string; source?: string }>;
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const params = await searchParams;
  // 默认按公司分组展示（列表需显式切换）
  const currentView = params.view === "list" ? "list" : "company";

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
      id: app.id,
      position: app.position,
      companyName: app.companyName,
      appliedDate: app.appliedDate,
      priority: app.priority,
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

  return (
    <ApplicationsBrowser
      applications={applications}
      currentView={currentView}
      params={params}
    />
  );
}
