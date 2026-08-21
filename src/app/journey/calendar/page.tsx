import { prisma } from "@/lib/prisma";
import InterviewCalendar from "./InterviewCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // 获取所有面试相关的时间线事件
  const events = await prisma.timelineEvent.findMany({
    where: {
      eventType: { in: ["interview", "interview_pending"] },
    },
    include: {
      application: {
        select: { companyName: true, position: true, id: true },
      },
    },
    orderBy: { date: "asc" },
  });

  // 按日期分组（本地时区，避免跨日偏移）
  const eventsByDate = new Map<string, typeof events>();
  for (const event of events) {
    const dateKey = `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, "0")}-${String(event.date.getDate()).padStart(2, "0")}`;
    if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, []);
    eventsByDate.get(dateKey)!.push(event);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">面试日历</h1>
        <p className="text-[var(--muted)] mt-1">
          可视化查看各岗位的面试安排，共 {events.length} 个面试事件
        </p>
      </div>

      <InterviewCalendar eventsByDate={Object.fromEntries(eventsByDate)} />
    </div>
  );
}
