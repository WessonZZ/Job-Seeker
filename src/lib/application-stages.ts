/**
 * 求职阶段模型：投递 → 笔试 → 面试 → Offer
 * 用于 Dashboard 的转化漏斗与公司进度条。
 */

export const STAGE_ORDER = ["applied", "oa", "interview", "offer"] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

/** 每个阶段的展示信息 */
export const STAGE_META: Record<StageKey, { label: string }> = {
  applied: { label: "已投递" },
  oa: { label: "笔试" },
  interview: { label: "面试" },
  offer: { label: "Offer" },
};

/** 每个阶段的语义色（投递蓝 / 笔试琥珀 / 面试紫 / Offer 绿） */
export const STAGE_COLORS: Record<StageKey, { from: string; to: string }> = {
  applied: { from: "#3b82f6", to: "#60a5fa" },
  oa: { from: "#d97706", to: "#f59e0b" },
  interview: { from: "#7c3aed", to: "#a78bfa" },
  offer: { from: "#059669", to: "#34d399" },
};

/** 阶段权重（用于求"到达深度"） */
export const STAGE_WEIGHT: Record<StageKey, number> = {
  applied: 1,
  oa: 2,
  interview: 3,
  offer: 4,
};

/**
 * 时间线事件类型 → 投递状态（单一事实来源）
 *
 * 邮件同步、时间线 API、前端三处都依赖这个映射。以前它们各写一份，
 * 结果 email-processor 把 "rejection" 原样写进了 status，而 STATUS_CONFIG
 * 里只有 "rejected_by_company" —— 状态徽章会整个消失。
 *
 * 未列出的类型（followup / note）不改变投递状态。
 */
export const EVENT_TO_STATUS: Record<string, string> = {
  submit: "applied",
  oa: "oa",
  test: "oa",
  interview_pending: "interview_pending",
  interview: "interview",
  offer: "offer",
  rejection: "rejected_by_company",
};

/** 事件类型对应的状态；不改变状态的类型返回 null */
export function statusFromEventType(eventType: string): string | null {
  return EVENT_TO_STATUS[eventType] ?? null;
}

/**
 * 由时间线事件推导当前状态：取日期最新的、且能映射到状态的那个事件。
 * 无有效事件时回退 "applied"。
 */
export function deriveStatusFromEvents(
  events: Array<{ eventType: string; date: Date }>
): string {
  if (events.length === 0) return "applied";
  const sorted = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());
  for (const e of sorted) {
    const status = EVENT_TO_STATUS[e.eventType];
    if (status) return status;
  }
  return "applied";
}

/** 时间线事件类型 → 表示到达的阶段 */
const EVENT_TO_STAGE: Record<string, StageKey> = {
  submit: "applied",
  oa: "oa",
  test: "oa",
  interview: "interview",
  interview_pending: "interview",
  offer: "offer",
};

/** 当前状态 → 表示到达的阶段（无记录则视为仅投递） */
const STATUS_TO_STAGE: Record<string, StageKey | undefined> = {
  applied: "applied",
  oa: "oa",
  interview_pending: "interview",
  interview: "interview",
  offer: "offer",
  saved: undefined,
};

/**
 * 计算一次投递当前到达的最深阶段权重（1=已投递 … 4=Offer）。
 * 综合"当前状态"与"时间线事件"两者取最大。
 */
export function deepestStageIndex(status: string, eventTypes: Iterable<string>): number {
  let weight = status === "saved" ? 0 : 1;
  for (const et of eventTypes) {
    const stage = EVENT_TO_STAGE[et];
    if (stage) weight = Math.max(weight, STAGE_WEIGHT[stage]);
  }
  const stage = STATUS_TO_STAGE[status];
  if (stage) weight = Math.max(weight, STAGE_WEIGHT[stage]);
  return weight;
}

/* ─────────────────────────────
   无回应（ghosted）动态判定规则：
   投递简历超过 GHOST_AFTER_DAYS 天，且之后没有任何进度，即视为无回应。
   ───────────────────────────── */

export const GHOST_AFTER_DAYS = 14;

/** 表示公司侧进度的时间线事件（用户自己的备注/跟进不算） */
const PROGRESS_EVENTS = new Set([
  "oa",
  "test",
  "interview",
  "interview_pending",
  "offer",
]);

/**
 * 计算"有效状态"：若投递超过两周且无后续进度，返回 "ghosted"，否则返回原状态。
 * - 手动标记为 ghosted 的一律视为无回应
 * - 只要状态已推进（oa/interview/offer/rejected 等）或存在进度事件，就不算无回应
 */
export function computeEffectiveStatus(opts: {
  status: string;
  appliedDate: Date;
  eventTypes: Iterable<string>;
}): string {
  const { status, appliedDate, eventTypes } = opts;
  if (status === "ghosted") return "ghosted";
  if (status !== "applied") return status;
  const hasProgress = [...eventTypes].some((et) => PROGRESS_EVENTS.has(et));
  if (hasProgress) return "applied";
  const ms = GHOST_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - appliedDate.getTime() >= ms ? "ghosted" : "applied";
}
