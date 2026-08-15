"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteApplicationButtonProps {
  applicationId: string;
  position: string;
  companyName: string;
}

export default function DeleteApplicationButton({
  applicationId,
  position,
  companyName,
}: DeleteApplicationButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "删除失败，请重试");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="删除投递记录"
        className="shrink-0 p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1">删除投递记录？</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              将删除
              <span className="font-medium text-[var(--foreground)]"> {position} </span>
              于 {companyName} 的记录及其全部时间线，此操作不可恢复。
            </p>
            {error && (
              <p className="mb-3 text-sm text-red-500">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
