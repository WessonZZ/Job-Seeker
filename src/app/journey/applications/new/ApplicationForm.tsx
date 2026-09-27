"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ApplicationFormProps {
  prefill: {
    companyName: string;
    position: string;
    jd: string;
    url: string;
  };
}

const DRAFT_KEY = "jobseeker:application:new:draft";

function nowDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyData(prefill: ApplicationFormProps["prefill"]) {
  return {
    companyName: prefill.companyName,
    position: prefill.position,
    jd: prefill.jd,
    url: prefill.url,
    appliedDate: nowDate(),
    status: "applied",
    notes: "",
    priority: "0",
  };
}

type FormData = ReturnType<typeof emptyData>;

/** 没有任何实际内容（如刚"放弃草稿"后）→ 不写草稿、并清掉残留 */
function isEmptyDraft(f: FormData): boolean {
  return !f.companyName && !f.position && !f.jd && !f.url && !f.notes;
}

function loadDraft(): FormData | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && typeof d === "object" && ("companyName" in d) && ("position" in d)) {
      return d as FormData;
    }
  } catch { /* ignore */ }
  return null;
}

export default function ApplicationForm({ prefill }: ApplicationFormProps) {
  const router = useRouter();
  // 一次性惰性初始化：优先恢复草稿，并记录是否来自草稿
  const [initial] = useState(() => {
    const draft = loadDraft();
    return { form: draft ?? emptyData(prefill), restored: draft !== null };
  });
  const [formData, setFormData] = useState<FormData>(initial.form);
  const [restoredDraft, setRestoredDraft] = useState(initial.restored);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 草稿只在离开页面时保存一次（不再每次输入都写 localStorage，避免频繁写入）
  const draftRef = useRef<FormData>(formData);
  const dirtyRef = useRef(false); // 用户是否真的改动过（防止把预填内容当草稿存下）
  const discardRef = useRef(false); // 提交/取消/放弃后：离开时不保存

  // 每次渲染后把最新值同步到 ref（渲染期不允许直接写 ref）
  useEffect(() => {
    draftRef.current = formData;
  });

  useEffect(() => {
    const save = () => {
      if (discardRef.current) {
        try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        return;
      }
      if (!dirtyRef.current) return; // 未改动 → 不动草稿
      const f = draftRef.current;
      if (isEmptyDraft(f)) {
        try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        return;
      }
      try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save(); // 软导航卸载时保存一次
    };
  }, []);

  const clearDraft = useCallback(() => {
    discardRef.current = true;
    try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          priority: parseInt(formData.priority),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "保存失败");
        return;
      }

      clearDraft();
      router.push("/journey/applications");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearDraft();
    router.back();
  };

  const handleReset = () => {
    clearDraft();
    setFormData(emptyData(prefill));
    setRestoredDraft(false);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    dirtyRef.current = true;
    discardRef.current = false; // 放弃后重新输入 → 恢复草稿保存
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5"
    >
      {restoredDraft && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--sidebar-active)] border border-[var(--primary)]/20 text-sm">
          <span className="text-[var(--primary)]">已恢复上次未提交的草稿</span>
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
          >
            放弃草稿
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            公司名称 *
          </label>
          <input
            type="text"
            name="companyName"
            required
            value={formData.companyName}
            onChange={handleChange}
            placeholder="如：字节跳动"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            职位名称 *
          </label>
          <input
            type="text"
            name="position"
            required
            value={formData.position}
            onChange={handleChange}
            placeholder="如：后端开发工程师（2026 届秋招）"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            投递日期 *
          </label>
          <input
            type="date"
            name="appliedDate"
            required
            value={formData.appliedDate}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            当前状态
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="saved">待投递</option>
            <option value="applied">已投递</option>
            <option value="oa">笔试中</option>
            <option value="interview_pending">待预约面试</option>
            <option value="interview">面试中</option>
            <option value="offer">已 Offer</option>
            <option value="rejected">已拒绝</option>
            <option value="rejected_by_company">被拒</option>
            <option value="ghosted">无回应</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            投递链接
          </label>
          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://..."
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            职位描述 / JD
          </label>
          <textarea
            name="jd"
            rows={5}
            value={formData.jd}
            onChange={handleChange}
            placeholder="复制粘贴职位描述..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            备注
          </label>
          <textarea
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="任何想记录的备注..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            优先级
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="0">普通</option>
            <option value="1">重点</option>
            <option value="2">强烈关注</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}