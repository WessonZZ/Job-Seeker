import Skeleton from "@/components/ui/Skeleton";

/** 投递详情页骨架：面包屑 + 头部 + JD/备注 + 时间线 */
export default function ApplicationDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-4 w-28" />

      {/* 头部 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* JD / 备注 */}
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />

      {/* 时间线 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <Skeleton className="h-5 w-24 mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-3 w-12 shrink-0" />
              <Skeleton className="h-20 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
