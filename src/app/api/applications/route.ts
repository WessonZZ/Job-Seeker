import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/applications
export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: "获取投递记录失败" }, { status: 500 });
  }
}

// POST /api/applications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, position, jd, url, appliedDate, status, notes, priority, jobPostingId } = body;

    if (!companyName || !position || !appliedDate) {
      return NextResponse.json({ error: "公司名称、职位和投递日期为必填项" }, { status: 400 });
    }

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { name: "用户", email: "user@example.com" } });
    }

    // 从岗位拷贝 JD（如果创建时未提供）
    let resolvedJd = jd;
    if (!resolvedJd && jobPostingId) {
      const job = await prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
      if (job?.jd) resolvedJd = job.jd;
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id, companyName, position,
        jd: resolvedJd ?? "", url: url ?? "",
        appliedDate: new Date(appliedDate),
        status: status ?? "applied", notes: notes ?? "", priority: priority ?? 0,
        timelineEvents: { create: { eventType: "submit", title: "投递简历", date: new Date(appliedDate), isKey: true } },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建投递记录失败" }, { status: 500 });
  }
}

// PATCH /api/applications — 更新单个字段（如 jd）
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

    const app = await prisma.application.update({ where: { id }, data: fields });
    return NextResponse.json(app);
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
