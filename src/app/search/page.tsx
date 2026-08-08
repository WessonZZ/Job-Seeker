import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">搜索结果</h1>
      </div>
      <Suspense fallback={<div className="text-[var(--muted)]">搜索中...</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
