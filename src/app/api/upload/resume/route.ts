import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { parseAndUpdateProfile } from "@/lib/resume-parser";
// pdf-parse CJS import
import { extractText } from "unpdf";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "仅支持 PDF 格式" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 10MB" }, { status: 400 });
    }

    // 保存文件
    const uploadDir = path.join(process.cwd(), "public", "resumes");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `resume_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 更新数据库中的 resumeUrl
    const resumeUrl = `/resumes/${fileName}`;
    let user = await prisma.user.findFirst();
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { resumeUrl } });
    } else {
      user = await prisma.user.create({ data: { name: "用户", email: "user@example.com", resumeUrl } });
    }

    // PDF 文本提取 + LLM 解析
    let parseResult = { updated: [] as string[], errors: [] as string[] };
    try {
      const pdfBuffer = await readFile(filePath);
      // Extract text using unpdf (pure JS, no worker needed)
      const pdfResult = await extractText(new Uint8Array(pdfBuffer));
      const text = (pdfResult.text || []).join("\n").trim();
      console.log(`[PDF] Extracted ${text.length} chars`);

      if (text && text.length > 20) {
        parseResult = await parseAndUpdateProfile(text);
      } else {
        parseResult.errors.push("PDF 文本提取为空，请检查文件是否可读");
      }
    } catch (e) {
      parseResult.errors.push(`PDF 解析失败: ${e instanceof Error ? e.message : "未知错误"}`);
    }

    return NextResponse.json({
      success: true,
      resumeUrl,
      fileName,
      parseResult,
    });
  } catch (error) {
    console.error("[Upload] 失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
