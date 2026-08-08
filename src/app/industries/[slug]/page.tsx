import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Globe,
  ChevronRight,
  ArrowLeft,
  Briefcase,
} from "lucide-react";

interface IndustryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function IndustryPage({
  params,
}: IndustryPageProps) {
  const { slug } = await params;
  const industry = await prisma.industry.findUnique({
    where: { slug },
    include: {
      companies: {
        include: {
          _count: { select: { jobPostings: { where: { isActive: true } } } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!industry) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link
          href="/industries"
          className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          行业列表
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">
          {industry.name}
        </span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{industry.icon ?? "🏢"}</span>
          <div>
            <h1 className="text-2xl font-bold">{industry.name}</h1>
            {industry.description && (
              <p className="text-[var(--muted)] mt-1">
                {industry.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Companies */}
      <div className="space-y-3">
        {industry.companies.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]">
            暂无公司信息
          </div>
        ) : (
          industry.companies.map((company) => (
            <Link
              key={company.id}
              href={`/industries/${slug}/companies/${company.slug}`}
              className="block bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-sm hover:border-[var(--primary)]/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[var(--muted)]" />
                    <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">
                      {company.name}
                    </h3>
                  </div>
                  {company.description && (
                    <p className="text-sm text-[var(--muted)] mt-1 ml-7 line-clamp-2">
                      {company.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 ml-7">
                    {company.website && (
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Globe className="w-3 h-3" />
                        {new URL(company.website).hostname}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                      <Briefcase className="w-3 h-3" />
                      {company._count.jobPostings} 个在招职位
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0 group-hover:text-[var(--primary)] transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
