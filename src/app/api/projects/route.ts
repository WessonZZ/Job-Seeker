import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 获取第一个用户（项目经历挂在该用户下） */
async function getDefaultUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  return user?.id ?? null;
}

// POST /api/projects — 新建一条项目经历
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, role, startDate, endDate, description, isCurrent } = body;
    if (!projectName) return NextResponse.json({ error: "缺少项目名称" }, { status: 400 });

    const userId = await getDefaultUserId();
    if (!userId) return NextResponse.json({ error: "请先完善个人信息" }, { status: 400 });

    const proj = await prisma.projectExperience.create({
      data: {
        userId,
        projectName,
        role: role || null,
        startDate: new Date(startDate || "2024-01"),
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        isCurrent: isCurrent ?? false,
      },
    });
    return NextResponse.json(proj);
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// PUT /api/projects — 更新一条项目经历
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, projectName, role, startDate, endDate, description, isCurrent } = body;
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (projectName !== undefined) data.projectName = projectName;
    if (role !== undefined) data.role = role;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (description !== undefined) data.description = description;
    if (isCurrent !== undefined) data.isCurrent = isCurrent;

    const proj = await prisma.projectExperience.update({ where: { id }, data });
    return NextResponse.json(proj);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/projects — 删除一条项目经历
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    await prisma.projectExperience.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
