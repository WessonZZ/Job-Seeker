import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * 应用内 404。
 * 之前访问不存在的路由（或删掉记录后点旧链接）会看到 Next 默认的 404 页。
 */
export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[var(--sidebar-hover)] flex items-center justify-center">
        <SearchX className="w-6 h-6 text-[var(--muted)]" />
      </div>

      <h1 className="text-xl font-semibold mb-2">找不到这个页面</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        链接可能已经失效，或者对应的记录已被删除。
      </p>

      <div className="flex items-center justify-center gap-3">
        <Link
          href="/journey/applications"
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          返回投递记录
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
