import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findCompanyUrl,
  searchCompanies,
  guessCareerUrl,
  validateUrl,
} from "@/lib/company-lookup";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name || name.length < 1) {
    return NextResponse.json({
      name: "",
      careerUrl: null,
      guessedUrls: [],
      inDatabase: false,
      dbCompanies: [],
      suggestions: [],
    });
  }

  // 1. 查数据库
  const dbCompanies = await prisma.company.findMany({
    where: { name: { contains: name } },
    select: { id: true, name: true, website: true, slug: true },
    take: 5,
  });

  // 2. 查已知公司库
  const exactUrl = findCompanyUrl(name);
  const suggestions = searchCompanies(name);

  // 3. 合并数据库 URL
  const dbUrl =
    dbCompanies.find((c) => c.name === name)?.website ??
    dbCompanies[0]?.website ??
    null;

  const bestUrl = exactUrl ?? dbUrl;

  // 4. 如果没找到，尝试智能 URL 猜测
  let guessedUrls: string[] = [];
  if (!bestUrl) {
    guessedUrls = guessCareerUrl(name);

    // 尝试验证前 3 个猜测
    const verified: string[] = [];
    for (const url of guessedUrls.slice(0, 3)) {
      if (await validateUrl(url)) {
        verified.push(url);
      }
    }
    // 替换为已验证的 URL（如果有），否则保留未验证的
    if (verified.length > 0) {
      guessedUrls = [...verified, ...guessedUrls.slice(3)];
    }
  }

  return NextResponse.json({
    name,
    careerUrl: bestUrl,
    guessedUrls: guessedUrls.slice(0, 5),
    inDatabase: dbCompanies.length > 0,
    dbCompanies: dbCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      website: c.website,
      slug: c.slug,
    })),
    suggestions: suggestions.map((s) => ({
      name: s.name,
      careerUrl: s.careerUrl,
    })),
  });
}
