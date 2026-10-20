import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  deriveStatusFromEvents,
  statusFromEventType,
} from "@/lib/application-stages";
import { parseDateInput, timelineWriteSchema, firstIssueMessage } from "@/lib/validation";

/** 取某个投递的全部事件（只取推导状态需要的字段） */
const EVENTS_FOR_STATUS = { select: { eventType: true, date: true } } as const;

// POST /api/timeline — 创建
export async function POST(request: Request) {
  try {
    const parsed = timelineWriteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    }
    const { applicationId, eventType, title, description, date, isKey } = parsed.data;

    if (!applicationId || !eventType || !date) {
      return NextResponse.json(
        { error: "applicationId、eventType 和 date 为必填项" },
        { status: 400 }
      );
    }

    const eventDate = parseDateInput(date);
    if (!eventDate) {
      return NextResponse.json({ error: "日期格式无法识别" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!application) {
      return NextResponse.json({ error: "投递记录不存在" }, { status: 404 });
    }

    // 建事件 + 重算状态必须原子完成，否则可能留下"事件建了、状态没跟上"的脏数据
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.timelineEvent.create({
        data: {
          applicationId,
          eventType,
          title: title || getDefaultTitle(eventType),
          description: description ?? "",
          date: eventDate,
          isKey: isKey ?? false,
        },
      });

      // 只有会影响状态的事件才重算（备注/跟进不该动状态）
      if (statusFromEventType(eventType)) {
        const all = await tx.timelineEvent.findMany({
          where: { applicationId },
          ...EVENTS_FOR_STATUS,
        });
        await tx.application.update({
          where: { id: applicationId },
          data: { status: deriveStatusFromEvents(all) },
        });
      }

      return created;
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("[timeline POST]", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// PUT /api/timeline — 编辑
export async function PUT(request: Request) {
  try {
    const parsed = timelineWriteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    }
    const { id, eventType, title, description, date, isKey } = parsed.data;

    if (!id) {
      return NextResponse.json({ error: "缺少事件 ID" }, { status: 400 });
    }

    const existing = await prisma.timelineEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "事件不存在" }, { status: 404 });
    }

    const data: {
      eventType?: string;
      title?: string;
      description?: string;
      date?: Date;
      isKey?: boolean;
    } = {};
    if (eventType) data.eventType = eventType;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (isKey !== undefined) data.isKey = isKey;

    if (date) {
      const eventDate = parseDateInput(date);
      if (!eventDate) {
        return NextResponse.json({ error: "日期格式无法识别" }, { status: 400 });
      }
      data.date = eventDate;
    }

    // 改类型或改日期都可能让"最新事件"易主，从而改变推导出的状态
    const typeChanged = eventType !== undefined && eventType !== existing.eventType;
    const dateChanged =
      data.date !== undefined && data.date.getTime() !== existing.date.getTime();
    const affectsStatus =
      statusFromEventType(eventType ?? existing.eventType) !== null ||
      statusFromEventType(existing.eventType) !== null;

    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.timelineEvent.update({ where: { id }, data });

      if ((typeChanged || dateChanged) && affectsStatus) {
        const all = await tx.timelineEvent.findMany({
          where: { applicationId: existing.applicationId },
          ...EVENTS_FOR_STATUS,
        });
        await tx.application.update({
          where: { id: existing.applicationId },
          data: { status: deriveStatusFromEvents(all) },
        });
      }

      return updated;
    });

    return NextResponse.json(event);
  } catch (err) {
    console.error("[timeline PUT]", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

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
    const affectsStatus = statusFromEventType(event.eventType) !== null;

    const newStatus = await prisma.$transaction(async (tx) => {
      await tx.timelineEvent.delete({ where: { id } });

      // 删掉备注/跟进不影响状态，保持用户手动设过的状态
      if (!affectsStatus) {
        const app = await tx.application.findUnique({
          where: { id: appId },
          select: { status: true },
        });
        return app?.status ?? "applied";
      }

      const remaining = await tx.timelineEvent.findMany({
        where: { applicationId: appId },
        ...EVENTS_FOR_STATUS,
      });
      const next = deriveStatusFromEvents(remaining);
      await tx.application.update({
        where: { id: appId },
        data: { status: next },
      });
      return next;
    });

    return NextResponse.json({ success: true, newStatus });
  } catch (err) {
    console.error("[timeline DELETE]", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
