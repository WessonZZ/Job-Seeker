"use client";

/**
 * 漫威英雄徽章
 * 每个英雄对应一个专属渐变 + 缩写，用于渲染导航、按钮等 UI 元素。
 */
export type HeroKey =
  | "IM" // 钢铁侠 红金
  | "CAP" // 美国队长 蓝红
  | "HULK" // 浩克 绿
  | "THOR" // 雷神 金蓝
  | "BP" // 黑豹 紫金
  | "BW" // 黑寡妇 暗红
  | "SP"; // 蜘蛛侠 红蓝

export const HERO_META: Record<HeroKey, { name: string; short: string; from: string; to: string }> = {
  IM: { name: "钢铁侠", short: "IM", from: "#e62429", to: "#f5b301" },
  CAP: { name: "美国队长", short: "CAP", from: "#1f51a8", to: "#e62429" },
  HULK: { name: "浩克", short: "HULK", from: "#1b9e4b", to: "#8fe04e" },
  THOR: { name: "雷神", short: "THOR", from: "#d4a017", to: "#00b7ff" },
  BP: { name: "黑豹", short: "BP", from: "#5e2c91", to: "#c9a54a" },
  BW: { name: "黑寡妇", short: "BW", from: "#7c1f1f", to: "#3b3b3b" },
  SP: { name: "蜘蛛侠", short: "SP", from: "#e62429", to: "#1f51a8" },
};

interface HeroBadgeProps {
  hero: HeroKey;
  /** sm: 导航 / md: 头像按钮 / lg: 卡片大图标 */
  size?: "sm" | "md" | "lg";
  /** 是否在右侧附加英雄中文名 */
  showName?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<HeroBadgeProps["size"]>, string> = {
  sm: "h-6 w-6 min-w-6 text-[9px]",
  md: "h-8 w-8 min-w-8 text-[11px]",
  lg: "h-10 w-10 min-w-10 text-xs",
};

export default function HeroBadge({ hero, size = "md", showName = false, className = "" }: HeroBadgeProps) {
  const meta = HERO_META[hero];
  return (
    <span className={`inline-flex items-center gap-2 shrink-0 ${className}`} title={meta.name}>
      <span
        className={`font-comic inline-flex items-center justify-center rounded-lg text-white shadow-sm ${SIZE_CLASS[size]}`}
        style={{
          background: `linear-gradient(135deg, ${meta.from} 0%, ${meta.to} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.45)",
        }}
      >
        {meta.short}
      </span>
      {showName && <span className="text-sm font-medium">{meta.name}</span>}
    </span>
  );
}
