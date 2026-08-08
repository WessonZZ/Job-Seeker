import type { HeroKey } from "@/components/HeroBadge";

/**
 * 求职阶段模型：投递 → 笔试 → 面试 → Offer
 * 用于 Dashboard 的转化漏斗与公司进度条。
 */

export const STAGE_ORDER = ["applied", "oa", "interview", "offer"] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

/** 每个阶段的展示信息 + 对应英雄 */
export const STAGE_META: Record<StageKey, { label: string; hero: HeroKey }> = {
  applied: { label: "已投递", hero: "IM" },
  oa: { label: "笔试", hero: "THOR" },
  interview: { label: "面试", hero: "CAP" },
  offer: { label: "Offer", hero: "HULK" },
};

/** 英雄专属渐变色（服务端/客户端通用） */
export const HERO_COLORS: Record<HeroKey, { from: string; to: string }> = {
  IM: { from: "#e62429", to: "#f5b301" },
  SP: { from: "#e62429", to: "#1f51a8" },
  CAP: { from: "#1f51a8", to: "#e62429" },
  HULK: { from: "#1b9e4b", to: "#8fe04e" },
  THOR: { from: "#d4a017", to: "#00b7ff" },
  BP: { from: "#5e2c91", to: "#c9a54a" },
  BW: { from: "#7c1f1f", to: "#3b3b3b" },
};

/** 每个阶段的颜色（英雄渐变） */
export const STAGE_COLORS: Record<StageKey, { from: string; to: string }> = {
  applied: HERO_COLORS.IM,
  oa: HERO_COLORS.THOR,
  interview: HERO_COLORS.CAP,
  offer: HERO_COLORS.HULK,
};

/** 阶段权重（用于求"到达深度"） */
export const STAGE_WEIGHT: Record<StageKey, number> = {
  applied: 1,
  oa: 2,
  interview: 3,
  offer: 4,
};

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
