"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, CalendarDays, AlertCircle,
} from "lucide-react";
import { format, hasClockTime } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  date: Date;
  application: {
    companyName: string;
    position: string;
    id: string;
  };
}

interface Props {
  eventsByDate: Record<string, CalendarEvent[]>;
}

const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function InterviewCalendar({ eventsByDate }: Props) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0

  const monthLabel = `${currentYear}年${currentMonth + 1}月`;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Build calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ date: number; events: CalendarEvent[]; isToday: boolean; dateStr: string }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: d,
        dateStr,
        events: eventsByDate[dateStr] || [],
        isToday: dateStr === todayStr(),
      });
    }
    return days;
  }, [currentMonth, currentYear, eventsByDate, daysInMonth]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedEvents = selectedDay ? eventsByDate[selectedDay] || [] : [];

  // 当前查看月份里"今天及以后"的面试，按日期排序（主动展示，无需点击）
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const upcomingEvents = useMemo(() => {
    const todayS = todayStr();
    const list: CalendarEvent[] = [];
    for (const [dateStr, evs] of Object.entries(eventsByDate)) {
      if (!dateStr.startsWith(monthPrefix) || dateStr < todayS) continue;
      list.push(...evs);
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [eventsByDate, monthPrefix]);

  const totalEvents = Object.values(eventsByDate).flat().length;

  return (
    <div className="space-y-4">
      {/* 头部导航 */}
      <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">{monthLabel}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted)]">{totalEvents} 个面试事件</span>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
            今天
          </button>
        </div>
      </div>

      {/* 日历网格 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* 星期头 */}
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-medium text-[var(--muted)]">
              {d}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7">
          {/* 空白占位 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] border-r border-b border-[var(--border)] bg-[var(--sidebar-hover)]/30" />
          ))}

          {/* 日期格子 */}
          {calendarDays.map((day) => {
            const isSelected = selectedDay === day.dateStr;
            const hasEvents = day.events.length > 0;
            const maxShow = 2;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(isSelected ? null : day.dateStr)}
                className={`min-h-[90px] p-1.5 border-r border-b border-[var(--border)] text-left transition-colors relative ${
                  isSelected
                    ? "bg-[var(--primary)]/5 ring-2 ring-inset ring-[var(--primary)]/30"
                    : hasEvents
                    ? "hover:bg-[var(--sidebar-hover)]"
                    : "hover:bg-[var(--sidebar-hover)]/50"
                }`}
              >
                {/* 日期数字 */}
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  day.isToday ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)]"
                }`}>
                  {day.date}
                </span>

                {/* 事件 */}
                {hasEvents && (
                  <div className="mt-1 space-y-0.5">
                    {day.events.slice(0, maxShow).map((ev) => (
                      <div
                        key={ev.id}
                        className={`px-1 py-0.5 rounded text-[10px] leading-tight truncate font-medium ${
                          ev.eventType === "interview"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                        }`}
                      >
                        {ev.application.companyName}
                      </div>
                    ))}
                    {day.events.length > maxShow && (
                      <div className="text-[9px] text-[var(--muted)] px-1">
                        +{day.events.length - maxShow} 更多
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 即将到来的面试（主动展示，无需点击） */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-semibold">即将到来的面试</h3>
          {upcomingEvents.length > 0 && (
            <span className="text-xs text-[var(--muted)]">{upcomingEvents.length} 个安排</span>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">
            {monthPrefix <= todayStr() ? "本月没有未来的面试安排" : "该月暂无面试安排"}
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((ev) => {
              const cd = countdownInfo(ev.date);
              return (
                <Link
                  key={ev.id}
                  href={`/journey/applications/${ev.application.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] hover:shadow-sm hover:border-[var(--primary)]/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      ev.eventType === "interview"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                    }`}>
                      {ev.eventType === "interview" ? "🤝面试" : "📅待预约"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                        {ev.application.companyName} · {ev.application.position}
                      </div>
                      <div className="text-xs text-[var(--muted)] truncate">{ev.title}</div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">
                      {format.dateShortCN(ev.date)}
                      {hasClockTime(ev.date) && ` ${format.clock(ev.date)}`}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${cd.cls}`}>
                      {cd.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 选中日期的详情 */}
      {selectedDay && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-semibold">{selectedDay}</h3>
            <span className="text-xs text-[var(--muted)]">{selectedEvents.length} 个事件</span>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">暂无面试安排</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/journey/applications/${ev.application.id}`}
                  className="block p-4 rounded-xl border border-[var(--border)] hover:shadow-sm hover:border-[var(--primary)]/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ev.eventType === "interview"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                        }`}>
                          {ev.eventType === "interview" ? "🤝 面试" : "📅 待预约"}
                        </span>
                        <span className="text-xs font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {ev.application.companyName}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium truncate">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {hasClockTime(ev.date) && (
                        <div className="text-xs font-medium text-[var(--foreground)]">
                          {format.clock(ev.date)}
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">{ev.application.position}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 无面试事件时 */}
      {totalEvents === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[var(--muted)] opacity-50" />
          <p className="text-sm text-[var(--muted)]">暂无面试安排</p>
          <p className="text-xs text-[var(--muted)] mt-1">添加面试时间线事件后，会在此处显示</p>
        </div>
      )}
    </div>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function countdownInfo(date: Date): { label: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0)
    return { label: "今天", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
  if (days === 1)
    return { label: "明天", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400" };
  return { label: `还有 ${days} 天`, cls: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" };
}
