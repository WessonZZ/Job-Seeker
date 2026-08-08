import { NextResponse } from "next/server";
import { renderPageAsImage, getDocumentProxy } from "unpdf";
import { readFile } from "fs/promises";
import { join } from "path";

// Node 端渲染 PDF 页面需要 @napi-rs/canvas（原生模块，已在 next.config 设为 external）
const canvasImport = () => import("@napi-rs/canvas");

/**
 * 简历 PDF 页面渲染接口
 *   ?file=resume_xxx.pdf&info=1      → { totalPages }
 *   ?file=resume_xxx.pdf&page=1&scale=1.5 → image/png
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const scale = Math.min(4, Math.max(0.5, parseFloat(searchParams.get("scale") || "3")));
    const info = searchParams.get("info") === "1";

    if (!/^[a-zA-Z0-9_.-]+\.pdf$/.test(file)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const filePath = join(process.cwd(), "public", "resumes", file);
    const buffer = await readFile(filePath);
    const data = new Uint8Array(buffer);

    if (info) {
      const doc = await getDocumentProxy(data);
      return NextResponse.json({ totalPages: doc.numPages });
    }

    const png = await renderPageAsImage(data, page, { scale, canvasImport });
    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "渲染失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
