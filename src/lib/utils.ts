/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return "刚刚";
    return `${hours} 小时前`;
  }
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;

  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format date as YYYY-MM-DD（本地时区，避免跨时区偏移）
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Format only the clock time as HH:mm
 */
export function formatClock(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Whether a datetime carries a meaningful time (not midnight 00:00)
 */
export function hasClockTime(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

/**
 * Format date, appending HH:mm when a time is set
 */
export function formatDateWithOptionalTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  return hasClockTime(d) ? `${datePart} ${formatClock(d)}` : datePart;
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date for timeline
 */
export function formatDateShortCN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

/**
 * Status display config (应用状态)
 */
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  saved: { label: "待投递", color: "text-gray-500 bg-gray-100 dark:bg-gray-500/10", icon: "📋" },
  applied: { label: "已投递", color: "text-blue-500 bg-blue-100 dark:bg-blue-500/10", icon: "📤" },
  oa: { label: "笔试中", color: "text-amber-500 bg-amber-100 dark:bg-amber-500/10", icon: "📝" },
  interview_pending: { label: "待预约面试", color: "text-sky-500 bg-sky-100 dark:bg-sky-500/10", icon: "📅" },
  interview: { label: "面试中", color: "text-purple-500 bg-purple-100 dark:bg-purple-500/10", icon: "🤝" },
  offer: { label: "已 offer", color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10", icon: "🎉" },
  rejected: { label: "已拒绝", color: "text-red-500 bg-red-100 dark:bg-red-500/10", icon: "🚫" },
  rejected_by_company: { label: "被拒", color: "text-rose-500 bg-rose-100 dark:bg-rose-500/10", icon: "💔" },
  ghosted: { label: "无回应", color: "text-gray-500 bg-gray-100 dark:bg-gray-500/10", icon: "👻" },
};

/**
 * Event type display config (时间线事件)
 */
export const EVENT_CONFIG: Record<
  string,
  { label: string; icon: string; badgeClass: string; dotClass: string }
> = {
  submit: {
    label: "投递简历",
    icon: "📤",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dotClass: "bg-blue-500 ring-4 ring-blue-500/20",
  },
  oa: {
    label: "在线笔试",
    icon: "📝",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dotClass: "bg-amber-500 ring-4 ring-amber-500/20",
  },
  interview_pending: {
    label: "待预约面试",
    icon: "📅",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dotClass: "bg-sky-500 ring-4 ring-sky-500/20",
  },
  interview: {
    label: "面试",
    icon: "🤝",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    dotClass: "bg-purple-500 ring-4 ring-purple-500/20",
  },
  test: {
    label: "测试",
    icon: "🧪",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
    dotClass: "bg-cyan-500 ring-4 ring-cyan-500/20",
  },
  offer: {
    label: "收到 Offer",
    icon: "🎉",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dotClass: "bg-emerald-500 ring-4 ring-emerald-500/20",
  },
  rejection: {
    label: "被拒",
    icon: "💔",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dotClass: "bg-red-500 ring-4 ring-red-500/20",
  },
  followup: {
    label: "跟进",
    icon: "📧",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400",
    dotClass: "bg-slate-500 ring-4 ring-slate-500/20",
  },
  note: {
    label: "备注",
    icon: "📌",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
    dotClass: "bg-gray-400 ring-4 ring-gray-400/20",
  },
};

// Re-export for convenience
export const format = {
  date: formatDate,
  dateShort: formatDateShort,
  dateTime: formatDateTime,
  dateShortCN: formatDateShortCN,
  clock: formatClock,
  dateTimeOptional: formatDateWithOptionalTime,
};
