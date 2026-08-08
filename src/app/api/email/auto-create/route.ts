import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, eventType, subject } = body;

    if (!companyName) {
      return NextResponse.json({ error: "公司名为必填项" }, { status: 400 });
    }

    // 1. 查找或创建公司
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    });

    if (!company) {
      const defaultIndustry = await prisma.industry.findFirst({
        orderBy: { name: "asc" },
      });
      company = await prisma.company.create({
        data: {
          name: companyName,
          slug: generateSlug(companyName),
          industryId: defaultIndustry?.id ?? "",
        },
      });
    }

    // 2. 查找或创建默认用户
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { name: "用户", email: "user@example.com" },
      });
    }

    // 3. 从邮件主题提取职位名（如果有）
    const position = extractPosition(companyName, subject);
    // 用邮件主题作为 JD
    const jdText = subject
      ? `【邮件同步】${subject}\n\n该投递记录由邮件自动创建，原始邮件主题如上。\n建议补充完整的职位描述信息。`
      : `【邮件同步】来自 ${companyName} 的求职相关邮件\n\n该投递记录由邮件自动创建，请补充完整的职位描述信息。`;

    // 4. 创建投递记录
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        companyName,
        position,
        jd: jdText,
        appliedDate: new Date(),
        status: eventType === "interview_pending" ? "interview_pending" : "applied",
        notes: `由邮件自动创建 | 事件类型: ${eventType || "未知"}`,
        timelineEvents: {
          create: [
            {
              eventType: "submit",
              title: "投递简历",
              date: new Date(),
              isKey: true,
            },
            ...(eventType === "interview_pending"
              ? [{
                  eventType: "interview_pending" as const,
                  title: "待预约面试",
                  description: "收到面试预约邀请，需确认时间",
                  date: new Date(),
                  isKey: true,
                }]
              : []),
          ],
        },
      },
      include: {
        timelineEvents: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      companyName,
      position: application.position,
      status: application.status,
      eventCreated: eventType === "interview_pending" ? 2 : 1,
      message: `已创建「${companyName}」的投递记录${eventType === "interview_pending" ? "，并添加了「待预约面试」事件" : ""}`,
    });
  } catch (error) {
    console.error("[Email AutoCreate] 失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}

/**
 * 从邮件主题中提取职位名称
 */
function extractPosition(companyName: string, subject?: string): string {
  if (!subject) return `${companyName} 岗位申请`;

  // 常见模式: "【公司】职位名 - 内容" 或 "公司 职位名 面试邀请"
  const cleaned = subject
    .replace(/^[【\[]?转发[】\]]?[：:]?\s*/, "")
    .replace(/^[【\[]?\w+[】\]]?[：:]?\s*/, "")
    .replace(new RegExp(`^[【\\[]?${escapeRegExp(companyName)}[】\\]]?[：:]?\\s*`), "")
    .replace(/[-‒–—](?!.*[-‒–—])[^-‒–—]*$/, "") // 去掉最后一个分隔符后的内容
    .trim();

  if (cleaned && cleaned.length > 2 && cleaned.length < 80) {
    return cleaned;
  }

  return `${companyName} 岗位申请`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
