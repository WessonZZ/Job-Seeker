/**
 * 简历文件提取层 —— 把 PDF / Word 转换成大模型能理解的内容：
 *   - 始终提取文本（PDF 用 pdfjs-dist，DOCX 用 mammoth），作为回退与文本模式的基础
 *   - 需要视觉时额外把 PDF 逐页渲染成 PNG；DOCX 需 LibreOffice 转 PDF，
 *     未安装或渲染失败时给出 warning，由上层回退到文本解析
 *
 * 说明：PDF 文本与图片都走 pdfjs-dist（见 ./pdf-render），避免与 unpdf 打包的
 * pdfjs 在同进程冲突。
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import path from "path";
import { pdfToText, pdfToImages } from "./pdf-render";

const execFileAsync = promisify(execFile);

export type ResumeFileKind = "pdf" | "docx";

export interface ExtractedResume {
  text: string;
  images?: Buffer[];
  visionAvailable: boolean;
  warning?: string;
}

async function isSofficeAvailable(): Promise<boolean> {
  const candidates = ["soffice", "libreoffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"];
  for (const c of candidates) {
    try {
      await execFileAsync("which", [c]);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function docxToPdf(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "resume-docx-"));
  const docxPath = path.join(dir, "input.docx");
  const pdfPath = path.join(dir, "input.pdf");
  await writeFile(docxPath, buffer);
  await execFileAsync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, docxPath], { timeout: 60000 });
  const pdf = await readFile(pdfPath);
  await rm(dir, { recursive: true, force: true });
  return pdf;
}

/**
 * 提取简历内容：始终返回文本；需要视觉时附带每页图片。
 * 视觉不可用（缺 LibreOffice / 渲染失败）不抛错，改由 warning 说明并回退文本。
 * onStage 用于上报进度阶段（提取文本 / 渲染页面）。
 */
export async function extractResume(
  buffer: Buffer,
  kind: ResumeFileKind,
  wantVision: boolean,
  onStage?: (stage: "extract" | "render") => void
): Promise<ExtractedResume> {
  // 1) 文本（必得）
  let text: string;
  onStage?.("extract");
  if (kind === "pdf") {
    text = await pdfToText(buffer);
  } else {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer });
    text = (res.value || "").trim();
  }
  if (!text) throw new Error(kind === "pdf" ? "PDF 未提取到文本" : "Word 未提取到文本");

  if (!wantVision) return { text, visionAvailable: false };

  // 2) 视觉（尽力而为，失败则回退）
  onStage?.("render");
  if (kind === "pdf") {
    try {
      const images = await pdfToImages(buffer);
      if (images.length > 0) return { text, images, visionAvailable: true };
    } catch (e) {
      console.error("[ResumeExtract] PDF 渲染失败:", e);
      return { text, visionAvailable: false, warning: "PDF 转图片失败，已回退文本解析" };
    }
    return { text, visionAvailable: false, warning: "PDF 渲染为空，已回退文本解析" };
  }

  if (await isSofficeAvailable()) {
    try {
      const pdf = await docxToPdf(buffer);
      const images = await pdfToImages(pdf);
      if (images.length > 0) return { text, images, visionAvailable: true };
    } catch {
      return { text, visionAvailable: false, warning: "Word 视觉渲染失败，已回退文本解析" };
    }
  }
  return { text, visionAvailable: false, warning: "Word 视觉解析需要安装 LibreOffice，已回退文本解析" };
}
