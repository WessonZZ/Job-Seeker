import type { ReactNode } from "react";

interface EmptyStateProps {
  /** 主文案，如"暂无投递记录" */
  title: string;
  /** 补充说明 */
  hint?: string;
  /** 行动按钮/链接 */
  action?: ReactNode;
  /** 图标（lucide 组件） */
  icon?: ReactNode;
  className?: string;
}

/**
 * 统一的空状态。此前 15 处各写各的"暂无 xxx"，字号与间距都不一致。
 */
export default function EmptyState({
  title,
  hint,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center text-[var(--muted)] ${className}`}>
      {icon && (
        <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-[var(--sidebar-hover)] flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-lg mb-2">{title}</p>
      {hint && <p className="text-sm mb-2">{hint}</p>}
      {action}
    </div>
  );
}
