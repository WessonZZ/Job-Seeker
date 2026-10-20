import Skeleton from "@/components/ui/Skeleton";

/** 投递记录页骨架：结构对齐真实页面（标题 + 搜索行 + 筛选行 + 公司分组卡片） */
export default function ApplicationsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* 搜索行 */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 max-w-md rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* 筛选行 */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      {/* 公司分组卡片 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[var(--sidebar-hover)] border-b border-[var(--border)]">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="px-5 py-3.5 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
