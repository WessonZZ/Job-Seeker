"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_CONFIG, format } from "@/lib/utils";
import { Pencil, Check, X, Calendar, ExternalLink } from "lucide-react";

interface EditableHeaderProps {
  applicationId: string;
  position: string;
  companyName: string;
  appliedDate: Date;
  status: string;
  priority: number;
  url: string | null;
  companyHref?: string | null;
}

export default function EditableHeader({
  applicationId,
  position,
  companyName,
  appliedDate,
  status,
  priority,
  url,
  companyHref,
}: EditableHeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    position,
    companyName,
    appliedDate: format.dateShort(appliedDate),
    status,
    priority: String(priority),
    url: url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const statusConfig = STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.position.trim() || !form.companyName.trim() || !form.appliedDate) {
      setError("岗位名称、公司名称和投递日期为必填项");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: applicationId,
          position: form.position.trim(),
          companyName: form.companyName.trim(),
          appliedDate: new Date(form.appliedDate).toISOString(),
          status: form.status,
          priority: parseInt(form.priority),
          url: form.url.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "保存失败，请重试");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      position,
      companyName,
      appliedDate: format.dateShort(appliedDate),
      status,
      priority: String(priority),
      url: url ?? "",
    });
    setError("");
    setEditing(false);
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all";
  const labelClass = "block text-sm font-medium mb-1.5";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-start justify-between">
        {editing ? (
          <>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>岗位名称 *</label>
                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    placeholder="如：后端开发工程师"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>公司名称 *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="如：字节跳动"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>投递日期 *</label>
                  <input
                    type="date"
                    name="appliedDate"
                    value={form.appliedDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>当前状态</label>
                  <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                    {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                      <option key={key} value={key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>优先级</label>
                  <select name="priority" value={form.priority} onChange={handleChange} className={inputClass}>
                    <option value="0">普通</option>
                    <option value="1">重点</option>
                    <option value="2">强烈关注</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>投递链接</label>
                  <input
                    type="url"
                    name="url"
                    value={form.url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                <Check className="w-3 h-3" />{saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />取消
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{position}</h1>
                {statusConfig && (
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                )}
                {priority > 0 && (
                  <span className="text-amber-500 text-sm">
                    {priority === 2 ? "★★★★" : "★★★"}
                  </span>
                )}
              </div>
              <p className="text-lg text-[var(--muted)] mt-1">{companyName}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  投递于 {format.date(appliedDate)}
                </span>
                {companyHref && (
                  <Link href={companyHref} className="text-[var(--primary)] hover:underline">
                    查看公司详情
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  原链接
                </a>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                <Pencil className="w-3 h-3" />编辑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
