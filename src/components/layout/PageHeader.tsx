import type { ReactNode } from "react";

/** 统一的页面标题区：英文微标签 + 大标题 + 副文案 + 右侧操作位 */
export default function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-[var(--muted)] mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}