"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, BookOpen, ChevronRight,
} from "lucide-react";

export default function EmailSyncClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHost, setCustomHost] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    totalEmails: number;
    jobRelated: number;
    matched: number;
    created: number;
    matchedIds?: string[];
    createdIds?: string[];
    errors: string[];
    syncedAt?: string;
    emails?: Array<{
      subject: string;
      from: string;
      isJobRelated: boolean;
      company?: string;
      eventType?: string;
      error?: string;
    }>;
  } | null>(null);
  const [error, setError] = useState("");
  const [showEmailList, setShowEmailList] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState<string | null>(null);

  // Restore saved results
  useEffect(() => {
    const saved = localStorage.getItem("email_sync_result");
    if (saved) {
      try { setResult(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const savedEmail = localStorage.getItem("email_sync_address");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          customHost: customHost.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        data.syncedAt = new Date().toLocaleString("zh-CN");
        setResult(data);
        localStorage.setItem("email_sync_result", JSON.stringify(data));
        localStorage.setItem("email_sync_address", email.trim());
        router.refresh();
      } else {
        setError(data.error ?? data.errors?.[0] ?? "同步失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoCreate = async (company: string, eventType?: string, subject?: string) => {
    setCreatingCompany(company);
    try {
      const res = await fetch("/api/email/auto-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company, eventType: eventType, subject: subject }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh the result
        const saved = localStorage.getItem("email_sync_result");
        if (saved) {
          const r = JSON.parse(saved);
          r.matched = (r.matched || 0) + 1;
          r.created = (r.created || 0) + (data.eventCreated || 1);
          // Remove error for this company
          r.emails = r.emails?.map((e: any) => {
            if (e.company === company) return { ...e, error: undefined };
            return e;
          });
          r.errors = r.errors?.filter((err: string) => !err.includes(company));
          localStorage.setItem("email_sync_result", JSON.stringify(r));
          setResult(r);
        }
        router.refresh();
      }
    } catch {}
    setCreatingCompany(null);
  };

  const providers = [
    { label: "Gmail", hosts: "imap.gmail.com", note: "需开启 IMAP + 应用密码" },
    { label: "QQ邮箱", hosts: "imap.qq.com", note: "需开启 IMAP + 授权码" },
    { label: "163邮箱", hosts: "imap.163.com", note: "开启 IMAP 服务" },
    { label: "Outlook/高校", hosts: "outlook.office365.com", note: "Office 365 IMAP" },
  ];

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm">
        <p className="font-medium mb-1">📧 自动识别求职邮件并更新到投递记录</p>
        <p className="text-xs opacity-80">用 DeepSeek 分析邮件 → 识别求职相关 → 匹配投递记录 → 创建时间线事件</p>
      </div>

      <Link href="/journey/email-sync/help"
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--sidebar-hover)] transition-colors">
        <BookOpen className="w-4 h-4 text-[var(--primary)]" />
        <span>各邮箱详细设置教程</span>
        <ChevronRight className="w-4 h-4 ml-auto text-[var(--muted)]" />
      </Link>

      {/* 连接表单 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Mail className="w-5 h-5" />连接邮箱</h2>

        {/* 快捷选择 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {providers.map((p) => (
            <button key={p.label} type="button"
              onClick={() => { setCustomHost(p.hosts); setShowAdvanced(true); }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSync} className="space-y-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@qq.com"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm" />

          <div className="relative">
            <input type={showPassword ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="QQ邮箱请填授权码"
              className="w-full pr-10 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)]">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-[var(--muted)]">{showAdvanced ? "收起" : "展开"}高级设置</button>
          {showAdvanced && (
            <input type="text" value={customHost} onChange={(e) => setCustomHost(e.target.value)}
              placeholder="imap.qq.com"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm" />
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-500/10">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <button type="submit" disabled={syncing || !email || !password}
            className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 flex items-center justify-center gap-2">
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />同步中...</> : <><RefreshCw className="w-4 h-4" />开始同步</>}
          </button>
        </form>
      </div>

      {/* 同步结果 */}
      {result && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />同步完成
          </h2>
          {result.syncedAt && <p className="text-xs text-[var(--muted)] mb-4">上次同步: {result.syncedAt}</p>}

          {/* 统计卡片（全部可点击） */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <button onClick={() => setShowEmailList(!showEmailList)}
              className="text-center p-3 rounded-lg bg-[var(--sidebar-hover)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <div className="text-2xl font-bold">{result.totalEmails}</div>
              <div className="text-xs text-[var(--muted)] mt-1">扫描邮件</div>
            </button>
            <button onClick={() => {
                if (result.matchedIds?.length) router.push("/journey/applications?source=email&ids=" + result.matchedIds.join(","));
                else router.push("/journey/applications");
              }}
              className="text-center p-3 rounded-lg bg-[var(--sidebar-hover)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <div className="text-2xl font-bold text-blue-500">{result.jobRelated}</div>
              <div className="text-xs text-[var(--muted)] mt-1">求职相关</div>
            </button>
            <button onClick={() => {
                if (result.matchedIds?.length) router.push("/journey/applications?source=email&ids=" + result.matchedIds.join(","));
                else router.push("/journey/applications");
              }}
              className="text-center p-3 rounded-lg bg-[var(--sidebar-hover)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <div className="text-2xl font-bold text-purple-500">{result.matched}</div>
              <div className="text-xs text-[var(--muted)] mt-1">匹配成功</div>
            </button>
            <button onClick={() => {
                if (result.createdIds?.length) router.push("/journey/applications?source=email&ids=" + result.createdIds.join(","));
                else router.push("/journey/applications");
              }}
              className="text-center p-3 rounded-lg bg-[var(--sidebar-hover)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <div className="text-2xl font-bold text-emerald-500">{result.created}</div>
              <div className="text-xs text-[var(--muted)] mt-1">新增事件</div>
            </button>
          </div>

          {/* 邮件详情列表（点击"扫描邮件"展开） */}
          {showEmailList && result.emails && result.emails.length > 0 && (
            <div className="mb-4 border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-60 overflow-y-auto">
              {result.emails.map((e, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span>{e.isJobRelated ? "🟢" : "⚪"}</span>
                  <span className="truncate flex-1">{e.subject}</span>
                  {e.isJobRelated && e.company && !e.error && (
                    <span className="shrink-0 text-[var(--primary)] font-medium">{e.company}</span>
                  )}
                  {e.isJobRelated && e.company && e.error && (
                    <button onClick={() => handleAutoCreate(e.company || "", e.eventType, e.subject)}
                      className="shrink-0 px-2 py-1 rounded bg-[var(--primary)] text-white text-[10px] font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50" disabled={creatingCompany === e.company}>
                      {creatingCompany === e.company ? "创建中..." : "+ 创建" + e.company + "投递"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 错误 */}
          {result.errors.length > 0 && (
            <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-amber-500">部分邮件未处理 ({result.errors.length}):</p>
              {result.errors.map((err, i) => <p key={i} className="text-xs text-[var(--muted)] truncate">{err}</p>)}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => router.push("/journey/applications")}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary-hover)]">
              查看投递记录
            </button>
            <button onClick={() => router.push("/journey/applications/new")}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--sidebar-hover)]">
              新增投递
            </button>
            <button onClick={() => router.push("/journey/email-sync/help")}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--sidebar-hover)]">
              帮助
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
