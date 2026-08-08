import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";

// 该页从数据库读取简历/经历，必须每次请求实时渲染，禁止静态预渲染缓存
export const dynamic = "force-dynamic";
import ResumeUpload from "./ResumeUpload";
import EditableWorkExp from "./EditableWorkExp";
import EditableProjectExp from "./EditableProjectExp";
import AddProjectButton from "./AddProjectButton";

function formatDateShort(d: Date): string {
  return d.getFullYear() + "." + (d.getMonth() + 1);
}

function splitLines(text: string): string[] {
  const parts = text.split(/\n+|(?=\d+\.)/).map(l => l.trim()).filter(l => l.length > 0);
  return parts.length > 0 ? parts : [text];
}

function calcDuration(start: Date, end?: Date | null): string {
  const ms = (end || new Date()).getTime() - start.getTime();
  const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "不足1个月";
  if (months < 12) return months + "个月";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? years + "年" + rem + "个月" : years + "年";
}

export default async function ProfilePage() {
  let user = await prisma.user.findFirst();
  let workExperiences: Array<{
    id: string;
    company: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    description: string | null;
    isCurrent: boolean;
  }> = [];
  let projectExperiences: Array<{
    id: string;
    projectName: string;
    role: string | null;
    startDate: Date;
    endDate: Date | null;
    description: string | null;
    isCurrent: boolean;
  }> = [];

  if (user) {
    workExperiences = await prisma.workExperience.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });
    projectExperiences = await prisma.projectExperience.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人信息</h1>
        <p className="text-[var(--muted)] mt-1">
          管理你的基本资料和工作经历
        </p>
      </div>

      <ProfileForm user={user} />

      <ResumeUpload resumeUrl={user?.resumeUrl ?? null} />

      {/* Work Experience */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">工作/实习经历</h2>

        {workExperiences.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">
            暂无工作经历
          </p>
        ) : (
          <div className="space-y-4">
            {workExperiences.map((exp) => (
              <EditableWorkExp key={exp.id} exp={exp} />
            ))}
          </div>
        )}
      </div>

      {/* Project Experience */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">项目经历</h2>
          <AddProjectButton />
        </div>

        {projectExperiences.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">
            暂无项目经历
          </p>
        ) : (
          <div className="space-y-4">
            {projectExperiences.map((proj) => (
              <EditableProjectExp key={proj.id} exp={proj} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
