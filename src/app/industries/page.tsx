import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Building2, ChevronRight } from "lucide-react";

export default async function IndustriesPage() {
  const industries = await prisma.industry.findMany({
    include: {
      _count: { select: { companies: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">行业岗位信息</h1>
        <p className="text-[var(--muted)] mt-1">
          按行业浏览公司和招聘职位
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {industries.map((industry) => (
          <Link
            key={industry.id}
            href={`/industries/${industry.slug}`}
            className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--primary)]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{industry.icon ?? "🏢"}</span>
              <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
            </div>
            <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
              {industry.name}
            </h3>
            {industry.description && (
              <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                {industry.description}
              </p>
            )}
            <p className="text-xs text-[var(--primary)] mt-3">
              {industry._count.companies} 家公司
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
