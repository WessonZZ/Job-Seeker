import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function EmailHelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Link
        href="/journey/email-sync"
        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回邮件同步
      </Link>

      <div>
        <h1 className="text-2xl font-bold">邮箱同步帮助</h1>
        <p className="text-[var(--muted)] mt-1">
          各邮箱的 IMAP 配置方法和常见问题
        </p>
      </div>

      {/* 通用说明 */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 space-y-1">
        <p className="font-medium">⚠️ 重要说明</p>
        <p className="text-xs opacity-80">
          大多数邮箱服务商出于安全考虑，不再支持直接用密码登录 IMAP。
          需要先开启 IMAP 服务并获取**授权码**或**应用密码**作为密码使用。
        </p>
      </div>

      {/* ======== QQ邮箱 ======== */}
      <ProviderSection
        title="QQ邮箱"
        icon="🐧"
        config={{
          server: "imap.qq.com",
          port: "993 (SSL)",
          username: "你的 QQ 号@qq.com",
          password: "授权码（16 位字母数字）",
        }}
        steps={[
          "登录 QQ 邮箱 (https://mail.qq.com)",
          "点击顶部 ⚙ 设置 → 账户",
          "往下翻找到「POP3/IMAP/SMTP 服务」，点击「开启」",
          "按提示用绑定的手机号发送短信验证",
          "系统会生成一个 16 位授权码（如 xxxxxxxx）",
          "复制授权码，粘贴到系统密码框里",
        ]}
        note="授权码和 QQ 密码不同！忘记授权码可以随时去设置页面重新生成。推荐将求职邮件转发到 QQ 邮箱后同步。"
        status="推荐"
      />

      {/* ======== Gmail ======== */}
      <ProviderSection
        title="Gmail"
        icon="📧"
        config={{
          server: "imap.gmail.com",
          port: "993 (SSL)",
          username: "你的 Gmail 邮箱地址",
          password: "应用密码（16 位字母）",
        }}
        steps={[
          "开启两步验证: https://myaccount.google.com/security (必须)",
          "开启 IMAP: https://mail.google.com → ⚙ 设置 → 转发和 POP/IMAP → 启用 IMAP",
          "生成应用密码: https://myaccount.google.com/apppasswords",
          "选择「邮件」和「Mac」作为设备，生成 16 位密码",
          "复制应用密码，粘贴到系统密码框里",
        ]}
        note="Gmail 必须开启两步验证后才能生成应用密码。应用密码和 Gmail 登录密码不同！"
        status="可用"
        links={[
          { label: "Google 官方指南", url: "https://support.google.com/accounts/answer/185833" },
        ]}
      />

      {/* ======== Outlook / Hotmail ======== */}
      <ProviderSection
        title="Outlook.com / Hotmail"
        icon="💼"
        config={{
          server: "outlook.office365.com",
          port: "993 (SSL)",
          username: "你的 Outlook 邮箱地址",
          password: "应用密码或普通密码",
        }}
        steps={[
          "Microsoft 已禁用 IMAP 密码登录，需要尝试以下方案：",
          "方案A：使用应用密码 — https://support.microsoft.com/account-billing/app-passwords",
          "方案B：在 Outlook 设置自动转发 → 将邮件转发到 QQ 邮箱",
          "  登录 https://outlook.live.com → ⚙ 设置 → 查看所有 Outlook 设置 → 邮件 → 转发",
          "  开启转发，填入你的 QQ 邮箱地址",
          "方案C：直接在 QQ 邮箱中设置收取 Outlook 邮件",
        ]}
        note="🔥 推荐方案B：设置自动转发到 QQ 邮箱，然后用 QQ 邮箱同步。这样最稳定。"
        status="不推荐直接连接"
      />

      {/* ======== 163 / 126 ======== */}
      <ProviderSection
        title="163 / 126 邮箱"
        icon="📪"
        config={{
          server: "imap.163.com / imap.126.com",
          port: "993 (SSL)",
          username: "你的邮箱地址",
          password: "授权码",
        }}
        steps={[
          "登录 163/126 邮箱 → 设置 → POP3/SMTP/IMAP",
          "开启 IMAP 服务",
          "新增授权码（用于第三方客户端登录）",
          "将生成的授权码粘贴到系统密码框",
        ]}
        note="163/126 同样需要使用授权码而非登录密码。"
        status="可用"
      />

      {/* ======== CUHK 高校邮箱 ======== */}
      <ProviderSection
        title="CUHK / 高校邮箱"
        icon="🎓"
        config={{
          server: "outlook.office365.com",
          port: "993 (SSL)",
          username: "学号@link.cuhk.edu.cn（不是别名邮箱）",
          password: "你的学校账号密码",
        }}
        steps={[
          "CUHK(SZ) 等高校使用 Office 365 邮箱",
          "⚠️ 登录必须用学号邮箱（如 s123456@link.cuhk.edu.cn），不能用别名",
          "确认 IMAP 已开启：登录 https://portal.office.com → 设置 → 邮件 → IMAP",
          "如果连不上，可能是学校禁用了 IMAP 基础认证",
          "解决方案：将求职邮件自动转发到 QQ 邮箱",
          "  Outlook 网页版 → ⚙ 设置 → 查看所有 Outlook 设置 → 邮件 → 转发 → 添加 QQ 邮箱",
        ]}
        note="别名邮箱（拼音名@link.cuhk.edu.cn）只能收信不能登录。推荐转发到 QQ 邮箱同步。"
        status="可能受限"
      />

      {/* 通用转发流程 */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">🔄 通用推荐方案：转发到 QQ 邮箱</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          无论你用什么邮箱，最稳定的方式都是将求职邮件转发到 QQ 邮箱：
        </p>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600">Outlook / Gmail / 163 / 学校邮箱</span>
          <span className="text-[var(--muted)]">→ 设置转发 →</span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 font-medium">QQ 邮箱</span>
          <span className="text-[var(--muted)]">→ 系统 IMAP 同步 →</span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/10 text-purple-600">DeepSeek 解析</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600">投递记录时间线</span>
        </div>
      </div>
    </div>
  );
}

function ProviderSection({
  title,
  icon,
  config,
  steps,
  note,
  status,
  links,
}: {
  title: string;
  icon: string;
  config: Record<string, string>;
  steps: string[];
  note: string;
  status: string;
  links?: Array<{ label: string; url: string }>;
}) {
  const statusColors: Record<string, string> = {
    "推荐": "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    "可用": "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    "不推荐直接连接": "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "可能受限": "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || ""}`}>
          {status}
        </span>
      </div>

      {/* IMAP 配置 */}
      <div className="p-3 rounded-lg bg-[var(--sidebar-hover)] space-y-1 text-sm">
        <p className="text-xs font-semibold text-[var(--muted)] mb-1.5">IMAP 配置参数</p>
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex text-xs">
            <span className="text-[var(--muted)] w-16 shrink-0">{key}</span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* 步骤 */}
      <div>
        <p className="text-xs font-semibold text-[var(--muted)] mb-2">设置步骤</p>
        <ol className="space-y-1">
          {steps.map((step, i) => (
            <li key={i} className="text-sm text-[var(--muted)] flex gap-2">
              <span className="text-[var(--foreground)] font-medium shrink-0 w-5">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 链接 */}
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* 提示 */}
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
        {note}
      </div>
    </div>
  );
}
