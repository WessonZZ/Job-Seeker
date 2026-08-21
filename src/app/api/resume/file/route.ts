import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * 简历文件服务接口
 *   ?name=resume_xxx.pdf  → PDF/Word 文件内容
 *
 * 说明：不能依赖 public/ 静态服务——`next start` 不提供运行时新增到 public/
 * 的文件（会 404），所以上传的简历统一从这里读磁盘返回。
 */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name") || "";
  if (!/^[a-zA-Z0-9_.-]+\.(pdf|docx)$/.test(name)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "resumes", name);
  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const contentType = name.endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
