/**
 * PDF 渲染与文本提取（pdfjs-dist + @napi-rs/canvas）
 *
 * 注意：不要在本模块同进程里再加载 unpdf 打包的 pdfjs——
 * Next/turbopack 下先加载 unpdf 再加载 pdfjs-dist 会导致 pdfjs-dist 模块初始化报错。
 */
import path from "path";
import { pathToFileURL } from "url";

function setupWorker(pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs")) {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
  ).href;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  setupWorker(pdfjs);
  return pdfjs;
}

/** 提取 PDF 全文 */
export async function pdfToText(buffer: Buffer): Promise<string> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    const parts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ")
        .trim();
      if (line) parts.push(line);
      page.cleanup();
    }
    return parts.join("\n");
  } finally {
    await doc.destroy();
  }
}

/** 获取 PDF 页数 */
export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
}

/** 将 PDF 每页渲染成 PNG */
export async function pdfToImages(buffer: Buffer, scale = 2): Promise<Buffer[]> {
  const pdfjs = await loadPdfjs();
  const { createCanvas } = await import("@napi-rs/canvas");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    const images: Buffer[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(
        Math.max(1, Math.floor(viewport.width)),
        Math.max(1, Math.floor(viewport.height))
      );
      await page.render({
        canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise;
      images.push(Buffer.from(canvas.toBuffer("image/png")));
      page.cleanup();
    }
    return images;
  } finally {
    await doc.destroy();
  }
}
