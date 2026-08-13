import { prisma } from "@/lib/prisma";
import { format } from "@/lib/utils";
import { Calendar, Building2, MapPin, Tag } from "lucide-react";
import Link from "next/link";

interface NewsPageProps {
  searchParams: Promise<{
    industry?: string;
    date?: string;
  }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const where: Record<string, unknown> = { isActive: true };

  if (params.industry) {
    where.company = { industry: { slug: params.industry } };
  }
  if (params.date) {
    // 用本地零点作为当天边界（new Date("2026-08-13") 会被解析成 UTC 零点，差 8 小时）
    const start = new Date(`${params.date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.postedDate = { gte: start, lt: end };
  }

  const [jobPostings, industries] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: { company: { include: { industry: true } } },
      orderBy: { postedDate: "desc" },
      take: 50,
    }),
    prisma.industry.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">每日工作资讯</h1>
        <p className="text-[var(--muted)] mt-1">
          最新发布的招聘信息，共 {jobPostings.length} 条
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/news"
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            !params.industry
              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
              : "border-[var(--border)] hover:bg-[var(--sidebar-hover)]"
          }`}
        >
          全部
        </Link>
        {industries.map((ind) => (
          <Link
            key={ind.id}
            href={`/news?industry=${ind.slug}`}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              params.industry === ind.slug
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "border-[var(--border)] hover:bg-[var(--sidebar-hover)]"
            }`}
          >
            {ind.icon} {ind.name}
          </Link>
        ))}
      </div>

      {/* Job List */}
      <div className="space-y-3">
        {jobPostings.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]">
            暂无招聘信息
          </div>
        ) : (
          jobPostings.map((job) => {
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
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.company.name}
                      </span>
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
                  <Link
                    href={job.url ?? `/jobs/${job.id}`}
                    target={job.url ? "_blank" : undefined}
                    className="shrink-0 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    查看详情
                  </Link>
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
