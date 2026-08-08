"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApplicationFormProps {
  prefill: {
    companyName: string;
    position: string;
    jd: string;
    url: string;
  };
}

export default function ApplicationForm({
  prefill,
}: ApplicationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: prefill.companyName,
    position: prefill.position,
    jd: prefill.jd,
    url: prefill.url,
    appliedDate: new Date().toISOString().split("T")[0],
    status: "applied",
    notes: "",
    priority: "0",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

      router.push("/journey/applications");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5"
    >
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all resize-none"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all resize-none"
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
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
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
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
