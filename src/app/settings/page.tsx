"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  Save, Trash2, Plug, CheckCircle2, AlertCircle, Loader2, Brain,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all";
const labelClass = "block text-sm font-medium mb-1.5";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ baseUrl: "", apiKey: "", model: "", visual: false });
  const [configured, setConfigured] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [source, setSource] = useState<"db" | "env" | "none">("none");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/llm");
        const data = await res.json();
        setForm({
          baseUrl: data.baseUrl || "",
          apiKey: "",
          model: data.model || "",
          visual: !!data.visual,
        });
        setConfigured(!!data.configured);
        setHasKey(!!data.hasKey);
        setSource(data.source);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const refreshStatus = async () => {
    try {
      const res = await fetch("/api/settings/llm");
      const data = await res.json();
      setConfigured(!!data.configured);
      setHasKey(!!data.hasKey);
      setSource(data.source);
    } catch { /* ignore */ }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          model: form.model,
          visual: form.visual,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "配置已保存" });
        setForm((f) => ({ ...f, apiKey: "" }));
        await refreshStatus();
        router.refresh();
      } else {
        setMsg({ type: "err", text: data.error || "保存失败" });
      }
    } catch {
      setMsg({ type: "err", text: "网络错误，请重试" });
    }
    setSaving(false);
  };

  const clear = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });
      if (res.ok) {
        setMsg({ type: "ok", text: "已清除数据库 LLM 配置" });
        await refreshStatus();
        router.refresh();
      } else {
        setMsg({ type: "err", text: "清除失败" });
      }
    } catch {
      setMsg({ type: "err", text: "网络错误，请重试" });
    }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/llm?action=test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, message: "网络错误，请重试" });
    }
    setTesting(false);
  };

  const sourceLabel =
    source === "db" ? "数据库配置（当前生效）" : source === "env" ? "环境变量配置（当前生效）" : "未配置";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="设置"
        sub="配置 LLM 服务，用于简历解析、爬虫与邮件分类"
      />

      {/* 状态提示 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
        <Brain className={`w-5 h-5 ${configured ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {configured ? "LLM 已配置" : "LLM 未配置"}
          </p>
          <p className="text-xs text-[var(--muted)] mt-0.5">{sourceLabel} · 模型：{form.model || "—"}</p>
        </div>
        {form.visual && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            支持视觉 (VLM)
          </span>
        )}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div>
          <label className={labelClass}>Base URL（OpenAI 兼容接口地址）</label>
          <input
            type="text"
            value={form.baseUrl}
            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            placeholder="如：https://api.deepseek.com/v1"
            className={inputClass}
          />
          <p className="text-xs text-[var(--muted)] mt-1">代码会自动拼接 /chat/completions 发送请求</p>
        </div>

        <div>
          <label className={labelClass}>API Key</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder={configured ? "已配置（输入新 Key 可覆盖）" : "sk-..."}
            className={inputClass}
            autoComplete="off"
          />
          {hasKey && (
            <p className="text-xs text-[var(--muted)] mt-1">留空保存表示保留现有 Key；如需清除请点「清除配置」</p>
          )}
        </div>

        <div>
          <label className={labelClass}>模型</label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder="如：deepseek-chat"
            className={inputClass}
          />
        </div>

        {/* 视觉开关 */}
        <label className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors">
          <input
            type="checkbox"
            checked={form.visual}
            onChange={(e) => setForm((f) => ({ ...f, visual: e.target.checked }))}
            className="mt-0.5 w-4 h-4 accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-medium">模型支持视觉理解（VLM）</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              开启后，PDF 简历会逐页转成图片交给模型识别；Word 简历仍走文本解析。若开启后解析失败，会自动回退到文本方式。
            </p>
          </div>
        </label>

        {msg && (
          <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            测试连接
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            清除配置
          </button>
        </div>
      </div>
    </div>
  );
}
