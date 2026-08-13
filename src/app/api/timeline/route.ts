import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/timeline — 创建
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, eventType, title, description, date, isKey } = body;

    if (!applicationId || !eventType || !date) {
      return NextResponse.json(
        { error: "applicationId、eventType 和 date 为必填项" },
        { status: 400 }
      );
    }

    const event = await prisma.timelineEvent.create({
      data: {
        applicationId,
        eventType,
        title: title || getDefaultTitle(eventType),
        description: description ?? "",
        date: new Date(date),
        isKey: isKey ?? false,
      },
    });

    // Update application status
    const statusMap: Record<string, string> = {
      oa: "oa", interview_pending: "interview_pending",
      interview: "interview", offer: "offer", rejection: "rejected_by_company",
    };
    if (statusMap[eventType]) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: statusMap[eventType] },
      });
    }

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// PUT /api/timeline — 编辑
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, eventType, title, description, date, isKey } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少事件 ID" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (eventType) data.eventType = eventType;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date) data.date = new Date(date);
    if (isKey !== undefined) data.isKey = isKey;

    const event = await prisma.timelineEvent.update({
      where: { id },
      data,
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/timeline — 删除
function getDefaultTitle(eventType: string): string {
  const map: Record<string, string> = {
    submit: "投递简历",
    oa: "在线笔试",
    interview: "面试",
    interview_pending: "待预约面试",
    test: "测试",
    offer: "收到 Offer",
    rejection: "被拒",
    followup: "跟进",
    note: "备注",
  };
  return map[eventType] || eventType;
}

// DELETE /api/timeline — 删除事件，自动重算状态
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少事件 ID" }, { status: 400 });

    const event = await prisma.timelineEvent.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: "事件不存在" }, { status: 404 });

    const appId = event.applicationId;
    await prisma.timelineEvent.delete({ where: { id } });

    // 重新计算状态
    const remaining = await prisma.timelineEvent.findMany({
      where: { applicationId: appId },
      orderBy: { date: "desc" },
    });
    const newStatus = deriveStatus(remaining);
    await prisma.application.update({
      where: { id: appId },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, newStatus });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

function deriveStatus(events: Array<{ eventType: string; isKey: boolean; date: Date }>): string {
  if (events.length === 0) return "applied";
  const sorted = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());
  const map: Record<string, string> = {
    offer: "offer", rejection: "rejected_by_company",
    interview: "interview", interview_pending: "interview_pending",
    oa: "oa", submit: "applied",
  };
  for (const e of sorted) {
    if (map[e.eventType]) return map[e.eventType];
  }
  return "applied";
}
