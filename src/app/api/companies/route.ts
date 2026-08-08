import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, industryId, website } = body;

    if (!name || !industryId) {
      return NextResponse.json(
        { error: "公司名称和行业为必填项" },
        { status: 400 }
      );
    }

    // Check if company already exists
    const existing = await prisma.company.findFirst({
      where: { name },
    });
    if (existing) {
      return NextResponse.json(
        { error: "该公司已存在", company: existing },
        { status: 409 }
      );
    }

    const slug = generateSlug(name);

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        industryId,
        website: website || null,
      },
      include: { industry: true },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Failed to create company:", error);
    return NextResponse.json(
      { error: "创建公司失败" },
      { status: 500 }
    );
  }
}
