"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

/** 添加一条空的项目经历（默认从本月开始），随后进入可编辑状态 */
export default function AddProjectButton() {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: "新项目",
          role: "",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: "",
          description: "",
          isCurrent: true,
        }),
      });
      router.refresh();
    } catch { /* ignore */ }
    setAdding(false);
  };

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
    >
      {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
      添加项目经历
    </button>
  );
}
