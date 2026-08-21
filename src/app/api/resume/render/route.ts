import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { pdfPageCount, pdfToImages } from "@/lib/pdf-render";

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

    if (info) {
      const totalPages = await pdfPageCount(buffer);
      return NextResponse.json({ totalPages });
    }

    const images = await pdfToImages(buffer, scale);
    const png = images[page - 1];
    if (!png) {
      return NextResponse.json({ error: "页码超出范围" }, { status: 400 });
    }
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
