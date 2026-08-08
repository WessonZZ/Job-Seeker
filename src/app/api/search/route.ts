import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KNOWN_COMPANIES } from "@/lib/company-lookup";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ companies: [], jobs: [] });
  }

  try {
    const [companies, jobs] = await Promise.all([
      // 搜索公司（按名称匹配）
      prisma.company.findMany({
        where: {
          name: { contains: q },
        },
        include: {
          industry: { select: { id: true, name: true, slug: true } },
          _count: { select: { jobPostings: true } },
        },
        orderBy: { name: "asc" },
        take: 20,
      }),

      // 搜索职位（按标题或公司名匹配）
      prisma.jobPosting.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { company: { name: { contains: q } } },
          ],
        },
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { postedDate: "desc" },
        take: 20,
      }),
    ]);

    // 从大型公司库中搜索建议（未录入系统的公司名）
    const existingNames = new Set(companies.map((c) => c.name.toLowerCase()));
    const allCompanyNames = Object.keys(KNOWN_COMPANIES);
    const suggestions = allCompanyNames
      .filter(
        (name) =>
          name.includes(q) &&
          !existingNames.has(name.toLowerCase())
      )
      .slice(0, 10);

    return NextResponse.json({ companies, jobs, suggestions });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "搜索失败", companies: [], jobs: [], suggestions: [] },
      { status: 500 }
    );
  }
}
