"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

interface EditableNotesProps {
  applicationId: string;
  initialNotes: string | null;
}

export default function EditableNotes({ applicationId, initialNotes }: EditableNotesProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, notes }),
      });
      setEditing(false);
      router.refresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCancel = () => {
    setNotes(initialNotes || "");
    setEditing(false);
  };

  if (!initialNotes && !editing) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">备注</h2>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors">
            <Pencil className="w-3 h-3" />添加备注
          </button>
        </div>
        <p className="text-sm text-[var(--muted)] text-center py-4">
          暂无备注，点击「添加备注」记录要点
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">备注</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
            <Pencil className="w-3 h-3" />编辑
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">
              <Check className="w-3 h-3" />{saving ? "保存中..." : "保存"}
            </button>
            <button onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
              <X className="w-3 h-3" />取消
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-y min-h-[80px]"
          placeholder="任何想记录的备注..."
          rows={4}
        />
      ) : (
        <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">
          {notes}
        </p>
      )}
    </div>
  );
}
