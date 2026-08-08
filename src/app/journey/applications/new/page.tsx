import { prisma } from "@/lib/prisma";
import ApplicationForm from "./ApplicationForm";

interface NewApplicationPageProps {
  searchParams: Promise<{
    jobId?: string;
  }>;
}

export default async function NewApplicationPage({
  searchParams,
}: NewApplicationPageProps) {
  const params = await searchParams;
  let prefill = { companyName: "", position: "", jd: "", url: "" };

  if (params.jobId) {
    const job = await prisma.jobPosting.findUnique({
      where: { id: params.jobId },
      include: { company: true },
    });
    if (job) {
      prefill = {
        companyName: job.company.name,
        position: job.title,
        jd: job.jd,
        url: job.url ?? "",
      };
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新增投递记录</h1>
        <p className="text-[var(--muted)] mt-1">
          记录你投递的岗位信息
        </p>
      </div>
      <ApplicationForm prefill={prefill} />
    </div>
  );
}
