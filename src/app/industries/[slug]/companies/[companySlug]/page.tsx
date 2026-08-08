import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Calendar,
  Tag,
  ExternalLink,
} from "lucide-react";

interface CompanyPageProps {
  params: Promise<{ slug: string; companySlug: string }>;
}

// 公司详情页（通过唯一 ID 查找更可靠）
export default async function CompanyPage({
  params,
}: CompanyPageProps) {
  const { slug, companySlug } = await params;

  // 尝试用多种方式查找公司
  const companies = await prisma.company.findMany({
    where: {
      slug: companySlug,
    },
    include: {
      industry: true,
      jobPostings: {
        where: { isActive: true },
        orderBy: { postedDate: "desc" },
      },
    },
  });

  // 按行业 slug 过滤
  const company =
    companies.find((c) => c.industry.slug === slug) ??
    companies[0]; // 如果行业不匹配也展示

  if (!company) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link
          href="/industries"
          className="hover:text-[var(--foreground)] transition-colors"
        >
          行业列表
        </Link>
        <span>/</span>
        <Link
          href={`/industries/${company.industry.slug}`}
          className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {company.industry.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{company.name}</span>
      </div>

      {/* Company Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--sidebar-hover)] flex items-center justify-center text-2xl shrink-0">
            <Building2 className="w-7 h-7 text-[var(--muted)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {company.description && (
              <p className="text-[var(--muted)] mt-1">
                {company.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--primary)] hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  官方网站
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {company.industry.name && (
                <span className="flex items-center gap-1 text-[var(--muted)]">
                  <Building2 className="w-4 h-4" />
                  {company.industry.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job Postings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          在招职位 ({company.jobPostings.length})
        </h2>
        <div className="space-y-3">
          {company.jobPostings.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              暂无在招职位
            </div>
          ) : (
            company.jobPostings.map((job) => {
              const tags = safeParseTags(job.tags);
              return (
                <div
                  key={job.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-base font-semibold hover:text-[var(--primary)] transition-colors line-clamp-1"
                      >
                        {job.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--muted)]">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format.date(job.postedDate)}
                        </span>
                      </div>
                      {job.salary && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1.5">
                          {job.salary}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--sidebar-hover)] text-xs text-[var(--muted)]"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-3 line-clamp-2">
                    {job.jd}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function safeParseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
