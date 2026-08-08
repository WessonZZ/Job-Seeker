"use client";

import { useState } from "react";

export interface TimePoint {
  label: string;
  applied: number;
  oa: number;
  interview: number;
  offer: number;
}

const SERIES = [
  { key: "applied", label: "投递", color: "#e62429" },
  { key: "oa", label: "笔试", color: "#d4a017" },
  { key: "interview", label: "面试", color: "#1f51a8" },
  { key: "offer", label: "Offer", color: "#1b9e4b" },
] as const;

type Mode = "month" | "week";

const MODE_META: Record<Mode, { label: string; ranges: { v: string; label: string }[]; defaultRange: string }> = {
  month: {
    label: "月度",
    ranges: [
      { v: "3", label: "近 3 月" },
      { v: "6", label: "近 6 月" },
      { v: "all", label: "今年至今" },
    ],
    defaultRange: "all",
  },
  week: {
    label: "周度",
    ranges: [
      { v: "1", label: "近 1 周" },
      { v: "4", label: "近 4 周" },
      { v: "8", label: "近 8 周" },
    ],
    defaultRange: "4",
  },
};

/**
 * 投递趋势监控：月度 / 周度切换 + 时间范围选择，分组条形图。
 */
export default function TimeMonitor({
  months,
  weeks,
}: {
  months: TimePoint[];
  weeks: TimePoint[];
}) {
  const [mode, setMode] = useState<Mode>("month");
  const [range, setRange] = useState<string>(MODE_META.month.defaultRange);

  const switchMode = (m: Mode) => {
    setMode(m);
    setRange(MODE_META[m].defaultRange);
  };

  const meta = MODE_META[mode];
  const full = mode === "month" ? months : weeks;
  const data = full.slice(-(range === "all" ? full.length : Number(range)));
  const max = Math.max(
    ...data.flatMap((d) => [d.applied, d.oa, d.interview, d.offer]),
    1
  );

  return (
    <div className="animate-float-slow h-full">
    <div className="hover-float bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 h-full">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">投递趋势监控</h2>
      </div>
      {/* 控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--sidebar-active)]">
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {MODE_META[m].label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {meta.ranges.map((r) => (
            <button
              key={r.v}
              onClick={() => setRange(r.v)}
              className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                range === r.v
                  ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-medium"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 text-xs text-[var(--muted)]">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="h-40 flex items-end gap-2">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 relative group"
          >
            {/* 悬停数据提示 */}
            <div className="chart-tooltip chart-tooltip--stacked">
              <div className="font-semibold">{d.label}</div>
              <div className="mt-0.5 text-[var(--background)]/80">
                {SERIES.map((s) => `${s.label} ${d[s.key]}`).join(" · ")}
              </div>
            </div>

            <div className="flex items-end gap-1 h-full">
              {SERIES.map((s) => {
                const v = d[s.key];
                if (v === 0) return null;
                return (
                  <div
                    key={s.key}
                    className="w-3 rounded-t-[3px]"
                    style={{ height: `${(v / max) * 100}%`, background: s.color }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
