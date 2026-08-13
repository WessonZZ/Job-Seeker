import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/work-experiences — 更新一条工作经历
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, company, title, startDate, endDate, description, isCurrent } = body;

    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (company !== undefined) data.company = company;
    if (title !== undefined) data.title = title;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (description !== undefined) data.description = description;
    if (isCurrent !== undefined) data.isCurrent = isCurrent;

    const exp = await prisma.workExperience.update({ where: { id }, data });
    return NextResponse.json(exp);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/work-experiences — 删除一条工作经历
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    await prisma.workExperience.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
