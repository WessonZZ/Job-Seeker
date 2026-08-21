"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check, Calendar as CalIcon } from "lucide-react";
import { format, hasClockTime, EVENT_CONFIG } from "@/lib/utils";

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
  submit: "投递简历", oa: "在线笔试", interview_pending: "待预约面试",
  interview: "面试", test: "测试", offer: "收到 Offer",
  rejection: "被拒", followup: "跟进", note: "备注",
};

interface TimelineEventCardProps {
  event: {
    id: string;
    eventType: string;
    title: string;
    description: string | null;
    date: Date;
    isKey: boolean;
    gap?: string;
  };
}

export default function TimelineEventCard({ event }: TimelineEventCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initialEventDate = new Date(event.date);
  const [formData, setFormData] = useState({
    eventType: event.eventType,
    title: event.title,
    description: event.description || "",
    date: format.dateShort(initialEventDate),
    time: hasClockTime(initialEventDate) ? format.clock(initialEventDate) : "",
  });

  const eventConfig = EVENT_CONFIG[event.eventType as keyof typeof EVENT_CONFIG];

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/timeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          eventType: formData.eventType,
          title: formData.title,
          description: formData.description,
          date: formData.time ? `${formData.date}T${formData.time}` : `${formData.date}T00:00`,
        }),
      });
      setEditing(false);
      router.refresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("确定删除此事件？")) return;
    setDeleting(true);
    try {
      await fetch(`/api/timeline?id=${event.id}`, { method: "DELETE" });
      router.refresh();
    } catch { /* ignore */ }
    setDeleting(false);
  };

  // 编辑模式
  if (editing) {
    return (
      <div className="bg-[var(--sidebar-hover)] rounded-xl p-4 border border-[var(--primary)]/30 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">事件类型</label>
            <select value={formData.eventType} onChange={(e) => {
              setFormData((p) => ({ ...p, eventType: e.target.value, title: DEFAULT_TITLES[e.target.value] || p.title }));
            }} className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs">
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">日期</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">时间</label>
            <input type="time" value={formData.time} onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium mb-1">标题</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium mb-1">描述</label>
            <textarea rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs resize-none" />
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium disabled:opacity-50">
            <Check className="w-3 h-3 inline mr-0.5" />{saving ? "保存中" : "保存"}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">
            <X className="w-3 h-3 inline mr-0.5" />取消
          </button>
        </div>
      </div>
    );
  }

  // 查看模式
  return (
    <div className="bg-[var(--sidebar-hover)] rounded-xl p-4 hover:shadow-sm transition-shadow border border-[var(--border)] group relative">
      {/* 事件类型标签 + 标题 */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {eventConfig && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${eventConfig.badgeClass}`}>
              <span>{eventConfig.icon}</span>
              {eventConfig.label}
            </span>
          )}
          {event.isKey && <span className="text-[10px] text-[var(--primary)] font-medium">关键节点</span>}
        </div>

        {/* 编辑/删除按钮（悬浮显示） */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" title="编辑">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="p-1 rounded hover:bg-red-100 text-[var(--muted)] hover:text-red-500 transition-colors" title="删除">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-sm">{event.title}</h3>

      {event.description && (
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed whitespace-pre-wrap">{event.description}</p>
      )}

      <div className="flex items-center gap-1 mt-2 text-[11px] text-[var(--muted)]">
        <CalIcon className="w-3 h-3" />
        {format.dateTimeOptional(event.date)}
        {event.gap && <span className="ml-1 opacity-60">({event.gap})</span>}
      </div>
    </div>
  );
}
