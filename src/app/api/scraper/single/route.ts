import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { extractJobsFromUrl } from "@/lib/scraper-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, careerUrl } = body;

    if (!companyName || !careerUrl) {
      return NextResponse.json(
        { error: "公司名和招聘官网 URL 为必填项" },
        { status: 400 }
      );
    }

    console.log(`[Import] ${companyName} ← ${careerUrl}`);

    // 1. 提取岗位
    const extracted = await extractJobsFromUrl(companyName, careerUrl);

    if (extracted.length === 0) {
      // 先创建公司，让用户后续可以手动添加岗位
      await ensureCompany(companyName, careerUrl);

      return NextResponse.json({
        success: true,
        companyName,
        careerUrl,
        extractedCount: 0,
        imported: 0,
        isSpa: true,
        message:
          "未能从此页面自动提取岗位（该网站可能使用了动态加载）。" +
          "公司已创建，你可以前往该公司页面手动添加岗位，或在搜索中找到后直接投递。",
      });
    }

    // 2. 入库
    const company = await ensureCompany(companyName, careerUrl);

    let imported = 0;
    for (const job of extracted) {
      const existing = await prisma.jobPosting.findFirst({
        where: { companyId: company.id, title: job.title },
      });
      if (!existing) {
        await prisma.jobPosting.create({
          data: {
            companyId: company.id,
            title: job.title,
            jd: job.jd || `从 ${careerUrl} 导入`,
            url: job.url || careerUrl,
            source: `${companyName}官网导入`,
            salary: job.salary,
            location: job.location,
            postedDate: new Date(),
            isActive: true,
          },
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      companyName,
      companyId: company.id,
      careerUrl,
      extractedCount: extracted.length,
      imported,
      isSpa: false,
      message: imported > 0
        ? `成功导入 ${imported} 个岗位`
        : `已提取 ${extracted.length} 个岗位，但都已在系统中存在`,
    });
  } catch (error) {
    console.error("[Import] 失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "导入失败",
      },
      { status: 500 }
    );
  }
}

async function ensureCompany(name: string, website: string) {
  let company = await prisma.company.findFirst({
    where: { name },
  });

  if (!company) {
    const defaultIndustry = await prisma.industry.findFirst({
      orderBy: { name: "asc" },
    });
    const slug = generateSlug(name);

    company = await prisma.company.create({
      data: {
        name,
        slug,
        industryId: defaultIndustry?.id ?? "",
        website,
      },
    });
  } else if (!company.website) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { website },
    });
  }

  return company;
}
