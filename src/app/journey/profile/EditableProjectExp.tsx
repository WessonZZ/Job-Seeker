"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface ProjectExp {
  id: string;
  projectName: string;
  role: string | null;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  isCurrent: boolean;
}

interface EditableProjectExpProps {
  exp: ProjectExp;
}

export default function EditableProjectExp({ exp }: EditableProjectExpProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    projectName: exp.projectName,
    role: exp.role || "",
    startDate: new Date(exp.startDate).toISOString().split("T")[0],
    endDate: exp.endDate ? new Date(exp.endDate).toISOString().split("T")[0] : "",
    description: exp.description || "",
    isCurrent: exp.isCurrent,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: exp.id,
          projectName: form.projectName,
          role: form.role,
          startDate: form.startDate,
          endDate: form.isCurrent ? null : form.endDate || null,
          description: form.description,
          isCurrent: form.isCurrent,
        }),
      });
      setEditing(false);
      router.refresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("确定删除这条项目经历？")) return;
    await fetch(`/api/projects?id=${exp.id}`, { method: "DELETE" });
    router.refresh();
  };

  const fmtDate = (d: Date) => d.getFullYear() + "." + (d.getMonth() + 1);
  const dur = () => {
    const ms = (form.isCurrent || !form.endDate ? new Date() : new Date(form.endDate)).getTime() - new Date(form.startDate).getTime();
    const m = Math.round(ms / (1000 * 60 * 60 * 24 * 30));
    if (m < 1) return "不足1个月";
    if (m < 12) return m + "个月";
    const y = Math.floor(m / 12);
    const r = m % 12;
    return r > 0 ? y + "年" + r + "个月" : y + "年";
  };

  if (editing) {
    return (
      <div className="p-4 rounded-lg bg-[var(--sidebar-hover)] border border-[var(--primary)]/30 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">项目名称</label>
            <input value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">担任角色</label>
            <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              placeholder="如：前端开发 / 项目负责人"
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">开始日期</label>
            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">结束日期</label>
            <div className="flex items-center gap-2">
              <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                disabled={form.isCurrent}
                className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs disabled:opacity-30" />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap shrink-0">
                <input type="checkbox" checked={form.isCurrent} onChange={e => setForm(p => ({ ...p, isCurrent: e.target.checked }))} />
                至今
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">项目内容（每行一条）</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4} className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-xs resize-y" />
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 rounded bg-[var(--primary)] text-white text-xs font-medium disabled:opacity-50">
            <Check className="w-3 h-3 inline mr-0.5" />{saving ? "保存中" : "保存"}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs">
            <X className="w-3 h-3 inline mr-0.5" />取消
          </button>
          <button onClick={handleDelete} className="ml-auto px-3 py-1.5 rounded border border-red-200 text-xs text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3 inline mr-0.5" />删除
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="p-4 rounded-lg bg-[var(--sidebar-hover)] border border-[var(--border)] group relative">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-sm shrink-0">🚀</div>
          <div>
            <h3 className="font-semibold text-sm">{form.projectName}</h3>
            {form.role && <p className="text-xs text-[var(--primary)] font-medium">{form.role}</p>}
          </div>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium text-[var(--foreground)]">
              {form.startDate ? fmtDate(new Date(form.startDate)) : ""} - {form.isCurrent ? "至今" : form.endDate ? fmtDate(new Date(form.endDate)) : ""}
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{dur()}</p>
          </div>
          <button onClick={() => setEditing(true)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] transition-all"
            title="编辑">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {form.description && (
        <div className="ml-11 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] leading-relaxed space-y-1">
            {form.description.split("\n").filter(l => l.trim()).map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[var(--primary)] shrink-0 mt-0.5">•</span>
                <span>{line.replace(/^[•\-\d+.\s]+/, "").trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
