import EmailSyncClient from "./EmailSyncClient";

export default function EmailSyncPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">邮件同步</h1>
        <p className="text-[var(--muted)] mt-1">
          连接你的邮箱，自动识别求职相关邮件并更新到投递记录
        </p>
      </div>
      <EmailSyncClient />
    </div>
  );
}
