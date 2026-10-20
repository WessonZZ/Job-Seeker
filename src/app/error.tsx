"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import Button from "@/components/ui/Button";

/**
 * 应用内错误边界。
 * 没有它的话，任何页面抛错都会落到 Next 的默认错误页（开发模式直接甩堆栈），
 * 和侧边栏外壳完全脱节。
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>

      <h1 className="text-xl font-semibold mb-2">页面出错了</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        这一步没能完成。可以重试一次；如果一直失败，数据本身没有受影响。
      </p>

      {error.digest && (
        <p className="text-xs text-[var(--muted)] mb-6 font-mono">
          错误编号：{error.digest}
        </p>
      )}

      <Button onClick={reset} className="inline-flex items-center gap-2">
        <RotateCw className="w-4 h-4" />
        重试
      </Button>
    </div>
  );
}
