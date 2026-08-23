"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface CountdownItem {
  id: string;
  applicationId: string;
  companyName: string;
  position: string;
  eventType: string;
  title: string;
  date: string; // ISO
}

const EVENT_META: Record<string, { label: string; color: string }> = {
  oa: { label: "笔试", color: "#d97706" },
  test: { label: "笔试", color: "#d97706" },
  interview: { label: "面试", color: "#7c3aed" },
  interview_pending: { label: "待预约面试", color: "#7c3aed" },
  followup: { label: "跟进", color: "#475569" },
};

function formatRemaining(ms: number): { text: string; ended: boolean } {
  if (ms < 0) return { text: "已结束", ended: true };
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return { text: `${days}天 ${hours}小时`, ended: false };
  if (hours > 0) return { text: `${hours}小时 ${mins}分`, ended: false };
  return { text: `${mins}分钟`, ended: false };
}

/**
 * 阶段倒计时：展示未来将要发生的笔试 / 面试 / 跟进事件，实时倒计时。
 */
export default function CountdownList({ items }: { items: CountdownItem[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted)] text-sm">
        暂无进行中的笔试 / 面试
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((item) => {
        const meta = EVENT_META[item.eventType] ?? { label: item.title || "阶段", color: "#64748b" };
        const diff = new Date(item.date).getTime() - now;
        const { text, ended } = formatRemaining(diff);
        const when = new Date(item.date).toLocaleString("zh-CN", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Link
            key={item.id}
            href={`/journey/applications/${item.applicationId}`}
            className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${
              ended
                ? "opacity-60 border-[var(--border)]"
                : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 hover:shadow-sm"
            }`}
            title="查看该投递详情"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: meta.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate group-hover:text-[var(--primary)] transition-colors">
                  {item.companyName}
                </span>
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[var(--sidebar-active)] text-[var(--muted)]">
                  {meta.label}
                </span>
              </div>
              <div className="text-xs text-[var(--muted)] truncate mt-0.5">
                {item.position} · {when}
              </div>
            </div>
            <div
              className={`text-right shrink-0 ${
                ended ? "text-[var(--muted)]" : "text-[var(--primary)]"
              }`}
            >
              <div className="text-lg font-bold leading-none tabular-nums tracking-tight">
                {text}
              </div>
              <div className="text-[10px] text-[var(--muted)] mt-1">倒计时</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
