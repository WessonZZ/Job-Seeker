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
  const [localUrl, setLocalUrl] = useState<string | null>(initialUrl);
  const [parseResult, setParseResult] = useState<{ updated: string[]; errors: string[] } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setParseResult(null);

    if (file.type !== "application/pdf") { setError("仅支持 PDF 格式"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("文件大小不能超过 10MB"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/resume", { method: "POST", body: fd });
      const data = await res.json();

      if (data.success) {
        setLocalUrl(data.resumeUrl);
        if (data.parseResult) setParseResult(data.parseResult);
        router.refresh();
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayUrl = localUrl;

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
          </p>
          <div className="flex flex-wrap gap-1">
            {parseResult.updated.map((item, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-200">{item}</span>
            ))}
          </div>
          {parseResult.errors.length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{parseResult.errors.join("; ")}</p>
          )}
          <p className="text-[10px] text-[var(--muted)] mt-1">已自动填充到个人信息，可手动修改</p>
        </div>
      )}

      {displayUrl ? (
        <div className="space-y-3">
          {/* 简历预览：pdf.js 渲染，文字可选中复制 */}
          <ResumePDFViewer file={displayUrl} />
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "上传中..." : "更新简历"}
              <input ref={inputRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
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
                <p className="text-xs text-[var(--muted)] mt-1">DeepSeek 正在提取简历信息</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--muted)]" />
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--muted)]">点击上传简历</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">PDF 格式，最大 10MB</p>
                </div>
              </>
            )}
            <input ref={inputRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}
