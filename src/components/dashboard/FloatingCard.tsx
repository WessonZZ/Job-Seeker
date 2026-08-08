import type { ReactNode } from "react";

/**
 * 动态浮动卡片：外层缓慢上下浮动，内层悬停时上浮放大并泛出英雄色光晕。
 * delay 用于交错浮动节奏。
 */
export default function FloatingCard({
  title,
  badge,
  children,
  delay = 0,
  className = "",
}: {
  title?: string;
  badge?: string;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className="animate-float-slow h-full"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={`hover-float bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 h-full ${className}`}
      >
        {(title || badge) && (
          <div className="flex items-center justify-between mb-5">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {badge && (
              <span className="text-xs text-[var(--muted)]">{badge}</span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
