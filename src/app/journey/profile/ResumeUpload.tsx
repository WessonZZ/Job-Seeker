"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import ResumePDFViewer from "./ResumePDFViewer";

interface ResumeUploadProps {
  resumeUrl: string | null;
}

export default function ResumeUpload({ resumeUrl: initialUrl }: ResumeUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(initialUrl);
  const [parseResult, setParseResult] = useState<{
    updated: string[];
    errors: string[];
    mode: "text" | "vision" | "none";
    note?: string;
  } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setParseResult(null);
    setProgress({ pct: 5, label: "正在上传…" });

    const name = (file.name || "").toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isDocx = name.endsWith(".docx") || name.endsWith(".doc") || (file.type || "").includes("word");
    if (!isPdf && !isDocx) { setError("仅支持 PDF 或 Word (.docx) 格式"); setProgress(null); return; }
    if (file.size > 10 * 1024 * 1024) { setError("文件大小不能超过 10MB"); setProgress(null); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/resume", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "上传失败");
        setProgress(null);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError("上传失败，请重试"); setProgress(null); return; }

      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.stage === "extract") setProgress({ pct: 30, label: "正在提取简历文本…" });
          else if (msg.stage === "render") setProgress({ pct: 55, label: "正在渲染简历页面…" });
          else if (msg.stage === "llm") setProgress({ pct: 80, label: "LLM 正在解析…" });
          else if (msg.stage === "done") {
            setProgress({ pct: 100, label: "解析完成" });
            setLocalUrl(String(msg.resumeUrl || ""));
            if (msg.parseResult) setParseResult(msg.parseResult as typeof parseResult);
            router.refresh();
          } else if (msg.stage === "error") {
            setError(String(msg.message || "解析失败，请重试"));
            setProgress(null);
          }
        }
      }
    } catch {
      setError("网络错误，请重试");
      setProgress(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayUrl = localUrl;
  const isDocx = !!displayUrl && displayUrl.toLowerCase().endsWith(".docx");

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">个人简历</h2>
        {displayUrl && (
          <a href={displayUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
            <ExternalLink className="w-3 h-3" />查看简历
          </a>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-500/10 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </div>
      )}

      {parseResult && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />简历解析完成
            <span className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-200">
              {parseResult.mode === "vision" ? "视觉识别 (VLM)" : parseResult.mode === "text" ? "文本解析" : ""}
            </span>
          </p>
          <div className="flex flex-wrap gap-1">
            {parseResult.updated.map((item, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-200">{item}</span>
            ))}
          </div>
          {parseResult.note && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{parseResult.note}</p>
          )}
          {parseResult.errors.length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{parseResult.errors.join("; ")}</p>
          )}
          <p className="text-[10px] text-[var(--muted)] mt-1">已自动填充到个人信息，可手动修改</p>
        </div>
      )}

      {/* 上传进度条（无论首次上传还是更新简历都显示） */}
      {uploading && progress && (
        <div className="mb-3 p-3 rounded-lg bg-[var(--sidebar-hover)]/60 border border-[var(--border)]">
          <div className="h-2 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-purple-400 transition-all duration-300 animate-pulse"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress.label}
          </p>
        </div>
      )}

      {displayUrl ? (
        <div className="space-y-3">
          {isDocx ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-hover)]/50 p-8 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">Word 简历暂不支持在线预览</p>
              <button onClick={() => window.open(displayUrl, "_blank")}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--background)] transition-colors mx-auto">
                <ExternalLink className="w-3.5 h-3.5" />新窗口打开
              </button>
            </div>
          ) : (
            <ResumePDFViewer file={displayUrl} />
          )}
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "上传中..." : "更新简历"}
              <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            <button onClick={() => window.open(displayUrl, "_blank")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--sidebar-hover)] transition-colors">
              <FileText className="w-3.5 h-3.5" />新窗口打开
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--sidebar-hover)] transition-colors">
            {uploading ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted)]">上传并解析中...</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--muted)]" />
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--muted)]">点击上传简历</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">PDF 或 Word 格式，最大 10MB</p>
                </div>
              </>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}
