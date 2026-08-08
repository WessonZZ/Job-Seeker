import { prisma } from "@/lib/prisma";
import { format, STATUS_CONFIG, EVENT_CONFIG } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Clock,
} from "lucide-react";
import AddTimelineEvent from "./AddTimelineEvent";
import EditableJD from "./EditableJD";
import TimelineEventCard from "./TimelineEventCard";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      timelineEvents: { orderBy: { date: "asc" } },
      jobPosting: {
        include: { company: true },
      },
    },
  });

  if (!application) notFound();

  const statusConfig =
    STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];

  // 计算各阶段之间的时间间隔
  const timelineWithGap = application.timelineEvents.map((event, i, arr) => {
    let gap = "";
    if (i > 0) {
      const prev = arr[i - 1];
      const diffMs = event.date.getTime() - prev.date.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) gap = "同一天";
      else if (diffDays === 1) gap = "隔 1 天";
      else if (diffDays < 30) gap = `隔 ${diffDays} 天`;
      else gap = `隔 ${Math.round(diffDays / 30)} 个月`;
    }
    return { ...event, gap };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/journey/applications"
        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回投递列表
      </Link>

      {/* Application Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">
                {application.position}
              </h1>
              {statusConfig && (
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              )}
              {application.priority > 0 && (
                <span className="text-amber-500 text-sm">
                  {application.priority === 2 ? "★★★★" : "★★★"}
                </span>
              )}
            </div>
            <p className="text-lg text-[var(--muted)] mt-1">
              {application.companyName}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                投递于 {format.date(application.appliedDate)}
              </span>
              {application.jobPosting?.company && (
                <Link
                  href={`/industries/${application.jobPosting.company.industryId}/companies/${application.jobPosting.company.slug}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  查看公司详情
                </Link>
              )}
            </div>
          </div>
          {application.url && (
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              原链接
            </a>
          )}
        </div>
      </div>

      {/* JD Section (editable) */}
      <EditableJD
        applicationId={application.id}
        initialJD={application.jd}
        companyName={application.companyName}
      />

      {/* Notes */}
      {application.notes && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">备注</h2>
          <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">
            {application.notes}
          </p>
        </div>
      )}

      {/* ======== Timeline ======== */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            时间线
          </h2>
          {application.timelineEvents.length > 0 && (
            <span className="text-xs text-[var(--muted)]">
              共 {application.timelineEvents.length} 个阶段
            </span>
          )}
        </div>

        {application.timelineEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-[var(--muted)] mb-1">暂无时间线事件</p>
            <p className="text-xs text-[var(--muted)]">
              记录投递后的每个关键节点：笔试、面试、Offer……
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 时间线竖线 */}
            <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-[var(--primary)] via-purple-400 to-emerald-400 rounded-full" />

            <div className="space-y-0">
              {timelineWithGap.map((event, index) => {
                const isLast = index === application.timelineEvents.length - 1;
                return (
                  <div key={event.id} className="relative">
                    <div className="flex gap-4 pb-8 last:pb-0">
                      {/* 左侧：时间 */}
                      <div className="w-16 shrink-0 pt-1.5 text-right">
                        <div className="text-xs font-semibold text-[var(--foreground)]">
                          {format.dateShortCN(event.date)}
                        </div>
                        {event.gap && (
                          <div className="text-[10px] text-[var(--muted)] mt-0.5">{event.gap}</div>
                        )}
                      </div>

                      {/* 竖线和圆点 */}
                      <div className="relative flex flex-col items-center">
                        <div className="relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 bg-[var(--primary)] ring-4 ring-[var(--primary)]/20" />
                        {!isLast && <div className="absolute top-[18px] bottom-0 w-0.5 bg-[var(--border)]" />}
                      </div>

                      {/* 右侧：可编辑事件卡片 */}
                      <div className="flex-1 min-w-0">
                        <TimelineEventCard event={event} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Event Button */}
        <div className="mt-4">
          <AddTimelineEvent applicationId={application.id} />
        </div>
      </div>
    </div>
  );
}

/**
 * 简短日期格式化（时间线专用）
 */

/**
 * 带时间的日期格式化
 */
