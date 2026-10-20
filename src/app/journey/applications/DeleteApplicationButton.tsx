"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

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
  const toast = useToast();
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
      toast(`已删除「${companyName} · ${position}」`);
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

      <ConfirmDialog
        open={confirming}
        title="删除投递记录？"
        description={
          <>
            将删除
            <span className="font-medium text-[var(--foreground)]"> {position} </span>
            于 {companyName} 的记录及其全部时间线，此操作不可恢复。
          </>
        }
        confirmLabel="确认删除"
        busyLabel="删除中..."
        busy={deleting}
        error={error}
        danger
        onConfirm={handleDelete}
        onCancel={() => { setError(""); setConfirming(false); }}
      />
    </>
  );
}
