"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

const EVENT_TYPE_OPTIONS = [
  { value: "submit", label: "投递简历" },
  { value: "oa", label: "在线笔试" },
  { value: "interview_pending", label: "待预约面试" },
  { value: "interview", label: "面试" },
  { value: "test", label: "测试" },
  { value: "offer", label: "收到 Offer" },
  { value: "rejection", label: "被拒" },
  { value: "followup", label: "跟进" },
  { value: "note", label: "备注" },
];

const DEFAULT_TITLES: Record<string, string> = {
  submit: "投递简历",
  oa: "在线笔试",
  interview_pending: "待预约面试",
  interview: "面试",
  test: "测试",
  offer: "收到 Offer",
  rejection: "被拒",
  followup: "跟进",
  note: "备注",
};

interface AddTimelineEventProps {
  applicationId: string;
}

export default function AddTimelineEvent({
  applicationId,
}: AddTimelineEventProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "note",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  // 事件类型变化时自动填充标题
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      title: DEFAULT_TITLES[prev.eventType] || "",
    }));
  }, [formData.eventType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          ...formData,
          isKey: formData.eventType !== "note",
        }),
      });

      if (res.ok) {
        setFormData({
          eventType: "note",
          title: "备注",
          description: "",
          date: new Date().toISOString().split("T")[0],
        });
        setOpen(false);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
      >
        <Plus className="w-4 h-4" />
        添加时间线事件
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--sidebar-hover)] space-y-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">事件类型</label>
          <select
            value={formData.eventType}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, eventType: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">日期</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">
            标题 <span className="text-[var(--muted)]">（选填，默认使用事件类型）</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder={DEFAULT_TITLES[formData.eventType] || "输入自定义标题"}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">描述</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="面试感受、结果等..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--background)]"
        >
          取消
        </button>
      </div>
    </form>
  );
}
