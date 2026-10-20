import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applicationCreateSchema,
  applicationPatchSchema,
  firstIssueMessage,
  isKnownStatus,
  parseDateInput,
} from "@/lib/validation";

// GET /api/applications
export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(applications);
  } catch (err) {
    console.error("[applications GET]", err);
    return NextResponse.json({ error: "获取投递记录失败" }, { status: 500 });
  }
}

// POST /api/applications
export async function POST(request: Request) {
  try {
    const parsed = applicationCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    }
    const { companyName, position, jd, url, appliedDate, status, notes, priority, jobPostingId } =
      parsed.data;

    const applied = parseDateInput(appliedDate);
    if (!applied) {
      return NextResponse.json({ error: "投递日期格式无法识别" }, { status: 400 });
    }
    if (status && !isKnownStatus(status)) {
      return NextResponse.json({ error: `未知的状态值：${status}` }, { status: 400 });
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
        userId: user.id,
        companyName,
        position,
        jd: resolvedJd ?? "",
        url: url ?? "",
        appliedDate: applied,
        status: status ?? "applied",
        notes: notes ?? "",
        priority: priority ?? 0,
        // 投递事件与 appliedDate 用同一个日期对象，避免两者相差一个时区偏移
        timelineEvents: {
          create: {
            eventType: "submit",
            title: "投递简历",
            date: applied,
            isKey: true,
          },
        },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    console.error("[applications POST]", err);
    return NextResponse.json({ error: "创建投递记录失败" }, { status: 500 });
  }
}

// DELETE /api/applications — 删除投递记录（时间线级联删除）
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
    await prisma.application.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[applications DELETE]", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

// PATCH /api/applications — 更新单个字段（如 jd）
export async function PATCH(request: Request) {
  try {
    const parsed = applicationPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    }

    // 白名单之外的字段（userId / createdAt / id 本身…）在这里已经被 schema 丢掉了
    const { id, companyName, position, appliedDate, status, jd, url, notes, priority } =
      parsed.data;

    if (status && !isKnownStatus(status)) {
      return NextResponse.json({ error: `未知的状态值：${status}` }, { status: 400 });
    }

    // 逐字段显式赋值：schema 是白名单，这里也是，两道都不放行未声明的字段
    const data: Prisma.ApplicationUpdateInput = {};
    if (companyName !== undefined) data.companyName = companyName;
    if (position !== undefined) data.position = position;
    if (status !== undefined) data.status = status;
    if (jd !== undefined) data.jd = jd;
    if (url !== undefined) data.url = url;
    if (notes !== undefined) data.notes = notes;
    if (priority !== undefined) data.priority = priority;
    if (appliedDate !== undefined) {
      const applied = parseDateInput(appliedDate);
      if (!applied) {
        return NextResponse.json({ error: "投递日期格式无法识别" }, { status: 400 });
      }
      data.appliedDate = applied;
    }

    const app = await prisma.application.update({ where: { id }, data });
    return NextResponse.json(app);
  } catch (err) {
    console.error("[applications PATCH]", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
