import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractResume, type ResumeFileKind } from "@/lib/resume-extract";
import { parseAndUpdateProfile } from "@/lib/resume-parser";
import { getLLMConfig } from "@/lib/llm-config";

function detectKind(file: File, fileName: string): ResumeFileKind | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx";
  const type = (file.type || "").toLowerCase();
  if (type === "application/pdf") return "pdf";
  if (type.includes("wordprocessingml") || type === "application/msword") return "docx";
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const kind = detectKind(file, file.name || "");
    if (!kind) {
      return NextResponse.json({ error: "仅支持 PDF 或 Word (.docx) 格式" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 10MB" }, { status: 400 });
    }

    // 保存文件
    const uploadDir = path.join(process.cwd(), "public", "resumes");
    await mkdir(uploadDir, { recursive: true });

    const ext = kind === "pdf" ? ".pdf" : ".docx";
    const savedName = `resume_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, savedName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 更新数据库中的 resumeUrl（走文件服务接口，public 静态服务不提供运行时新增文件）
    const resumeUrl = `/api/resume/file?name=${encodeURIComponent(savedName)}`;
    let user = await prisma.user.findFirst();
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { resumeUrl } });
    } else {
      user = await prisma.user.create({ data: { name: "用户", email: "user@example.com", resumeUrl } });
    }

    // 流式返回解析进度（NDJSON）：extract / render / llm / done / error
    const config = await getLLMConfig();
    const buffer = Buffer.from(bytes);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        try {
          const extracted = await extractResume(buffer, kind, config.visual, (stage) =>
            send({ stage })
          );
          send({ stage: "llm" });
          const parseResult = await parseAndUpdateProfile(extracted);
          send({ stage: "done", resumeUrl, parseResult });
        } catch (e) {
          console.error("[Upload] 解析失败:", e);
          send({ stage: "error", message: e instanceof Error ? e.message : "解析失败，请重试" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  } catch (error) {
    console.error("[Upload] 失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
