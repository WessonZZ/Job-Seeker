"use client";

import { useEffect, useRef, useState } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import type { PDFViewer as PDFViewerInstance } from "pdfjs-dist/web/pdf_viewer.mjs";

/**
 * 简历 PDF 预览（pdf.js 渲染，支持选中/复制文字）
 * - 用 PDFViewer 渲染页面画布 + 文字层，文字可选中
 * - 缩放用常规的 [-] [百分比框] [+]
 */
export default function ResumePDFViewer({ file }: { file: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PDFViewerInstance | null>(null);
  const fitScaleRef = useRef<number>(1);
  const [zoom, setZoom] = useState(55);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);

  const ZOOM_MIN = 30;
  const ZOOM_MAX = 150;

  // 加载 PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const { EventBus, PDFViewer } = await import("pdfjs-dist/web/pdf_viewer.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const container = containerRef.current;
        if (!container) return;

        const eventBus = new EventBus();
        const viewer = new PDFViewer({ container, eventBus });
        viewerRef.current = viewer;

        const doc = await pdfjs.getDocument({ url: file }).promise;
        if (cancelled) return;

        // 计算"适合宽度"的基准缩放（让 100% 时铺满容器）
        const page = await doc.getPage(1);
        const vp = page.getViewport({ scale: 1 });
        const fitScale = (container.clientWidth - 32) / vp.width;
        fitScaleRef.current = Math.max(0.5, Math.min(2, fitScale));
        page.cleanup();

        viewer.setDocument(doc);
        setStatus("ready");
      } catch (e) {
        console.error("简历 PDF 加载失败:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      // 某些 PDFViewer 版本提供 destroy，安全清理
      (viewerRef.current as unknown as { destroy?: () => void } | null)?.destroy?.();
      viewerRef.current = null;
    };
  }, [file, retryKey]);

  // 缩放变化 → 更新 viewer 缩放（100% = 铺满容器宽度）
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.currentScale = (fitScaleRef.current * zoom) / 100;
    }
  }, [zoom, status]);

  return (
    <div className="space-y-3">
      {/* 缩放控制：[-] [百分比框] [+] */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 10))}
          className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-base text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
          title="缩小"
        >
          −
        </button>
        <div className="w-14 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-xs tabular-nums text-[var(--muted)]">
          {zoom}%
        </div>
        <button
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 10))}
          className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-base text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
          title="放大"
        >
          +
        </button>
        <button
          onClick={() => setZoom(55)}
          className="px-2 py-1 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
          title="恢复默认缩放"
        >
          默认
        </button>
        {status === "ready" && (
          <span className="ml-auto text-[10px] text-[var(--muted)]">
            文字可选中复制
          </span>
        )}
      </div>

      {/* 渲染容器：pdf.js 要求 container 绝对定位；外层定高，内部滚动 */}
      {/* 容器用主题背景色，避免简历四周大片白色 */}
      <div className="relative rounded-lg border border-[var(--border)] bg-[var(--background)] h-[65vh]">
        <div ref={containerRef} className="absolute inset-0 overflow-auto">
          <div className="pdfViewer" />
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 bg-[var(--background)] flex items-center justify-center text-sm text-[var(--muted)]">
            简历加载中...
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 bg-[var(--background)] flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-[var(--muted)]">简历加载失败</p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <a href={file} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--primary)] hover:underline">
                在新窗口查看
              </a>
              <a href={file} download
                className="text-xs text-[var(--primary)] hover:underline">
                下载简历
              </a>
              <button
                onClick={() => {
                  setStatus("loading");
                  setRetryKey((k) => k + 1);
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--primary)]"
              >
                重新加载
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
