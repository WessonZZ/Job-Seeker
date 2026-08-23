import type { ReactNode } from "react";

/** 统一区块卡片：标题 + 右侧角标 + 内容 */
export default function FloatingCard({
  title,
  badge,
  children,
  className = "",
}: {
  title?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--sidebar-active)] text-[var(--muted)]">
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}