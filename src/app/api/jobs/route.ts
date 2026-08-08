import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, title, location, salary, jd, url, source, tags } =
      body;

    if (!companyName || !title) {
      return NextResponse.json(
        { error: "公司名称和职位名称为必填项" },
        { status: 400 }
      );
    }

    // Find or create company
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    });

    if (!company) {
      const defaultIndustry = await prisma.industry.findFirst({
        orderBy: { name: "asc" },
      });
      if (!defaultIndustry) {
        return NextResponse.json(
          { error: "没有行业数据，请先添加行业" },
          { status: 400 }
        );
      }
      const slug = generateSlug(companyName);
      company = await prisma.company.create({
        data: { name: companyName, slug, industryId: defaultIndustry.id },
      });
    }

    const job = await prisma.jobPosting.create({
      data: {
        companyId: company.id,
        title,
        jd: jd ?? "",
        url: url ?? "",
        source: source ?? "手动录入",
        salary: salary ?? null,
        location: location ?? null,
        tags: tags ? JSON.stringify(tags) : null,
        postedDate: new Date(),
        isActive: true,
      },
      include: { company: true },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "创建职位失败" },
      { status: 500 }
    );
  }
}
