"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  school: string | null;
  major: string | null;
  degree: string | null;
  graduationYear: number | null;
  summary: string | null;
}

interface ProfileFormProps {
  user: UserData | null;
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    school: user?.school ?? "",
    major: user?.major ?? "",
    degree: user?.degree ?? "",
    graduationYear: user?.graduationYear?.toString() ?? "",
    summary: user?.summary ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载/联动时的一次性 setState，属合法模式
    setFormData({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      school: user?.school ?? "",
      major: user?.major ?? "",
      degree: user?.degree ?? "",
      graduationYear: user?.graduationYear?.toString() ?? "",
      summary: user?.summary ?? "",
    });
  }, [user]);
  const [message, setMessage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          graduationYear: formData.graduationYear
            ? parseInt(formData.graduationYear)
            : null,
        }),
      });

      if (res.ok) {
        setMessage("保存成功");
        router.refresh();
      } else {
        setMessage("保存失败");
      }
    } catch {
      setMessage("网络错误");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5"
    >
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message === "保存成功"
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
              : "bg-red-50 dark:bg-red-500/10 text-red-600"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">姓名</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">邮箱</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">手机</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">学校</label>
          <input
            type="text"
            name="school"
            value={formData.school}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">专业</label>
          <input
            type="text"
            name="major"
            value={formData.major}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">学历</label>
          <select
            name="degree"
            value={formData.degree}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">请选择</option>
            <option value="大专">大专</option>
            <option value="本科">本科</option>
            <option value="硕士">硕士</option>
            <option value="博士">博士</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            毕业年份
          </label>
          <input
            type="number"
            name="graduationYear"
            value={formData.graduationYear}
            onChange={handleChange}
            placeholder="2026"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">个人简介</label>
        <textarea
          name="summary"
          rows={3}
          value={formData.summary}
          onChange={handleChange}
          placeholder="简短介绍自己..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
