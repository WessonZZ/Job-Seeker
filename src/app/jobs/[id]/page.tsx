import { prisma } from "@/lib/prisma";
import { format } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Tag,
  ExternalLink,
  DollarSign,
} from "lucide-react";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: { company: { include: { industry: true } } },
  });

  if (!job) notFound();

  const tags = safeParseTags(job.tags);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link
          href="/news"
          className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          返回资讯
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">职位详情</span>
      </div>

      {/* Job Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h1 className="text-2xl font-bold">{job.title}</h1>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <Link
            href={`/industries/${job.company.industry.slug}/companies/${job.company.slug}`}
            className="flex items-center gap-1 text-[var(--primary)] hover:underline"
          >
            <Building2 className="w-4 h-4" />
            {job.company.name}
          </Link>
          {job.location && (
            <span className="flex items-center gap-1 text-[var(--muted)]">
              <MapPin className="w-4 h-4" />
              {job.location}
            </span>
          )}
          <span className="flex items-center gap-1 text-[var(--muted)]">
            <Calendar className="w-4 h-4" />
            发布于 {format.date(job.postedDate)}
          </span>
          {job.source && (
            <span className="text-[var(--muted)]">
              来源：{job.source}
            </span>
          )}
        </div>

        {job.salary && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">{job.salary}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--sidebar-hover)] text-xs font-medium"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* JD Content */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">职位描述</h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[var(--muted)] leading-relaxed">
          {job.jd}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            查看原始发布
          </a>
        )}
        <Link
          href={`/journey/applications/new?jobId=${job.id}`}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--sidebar-hover)] transition-colors font-medium"
        >
          记录投递
        </Link>
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
