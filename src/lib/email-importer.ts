/**
 * 邮件导入编排器 —— 连接邮箱 → 获取邮件 → LLM 处理
 */
import { fetchRecentEmails, detectEmailProvider, type EmailConfig } from "./email-service";
import { processEmails } from "./email-processor";

export interface EmailSyncDetail {
  subject: string;
  from: string;
  isJobRelated: boolean;
  company?: string;
  eventType?: string;
  error?: string;
}

export interface EmailSyncResult {
  success: boolean;
  totalEmails: number;
  jobRelated: number;
  matched: number;
  created: number;
  errors: string[];
  provider?: string;
  matchedIds?: string[];
  createdIds?: string[];
  emails?: EmailSyncDetail[];
}

/**
 * 执行一次完整的邮件同步
 */
export async function syncEmails(
  email: string,
  password: string,
  customHost?: string
): Promise<EmailSyncResult> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  // 1. 检测邮箱配置
  let config: EmailConfig | null = null;

  if (customHost) {
    config = { host: customHost, port: 993, secure: true, user: email, password };
  } else {
    config = detectEmailProvider(email);
    if (config) {
      config.password = password;
    }
  }

  if (!config) {
    return {
      success: false,
      totalEmails: 0,
      jobRelated: 0,
      matched: 0,
      created: 0,
      errors: [`无法识别的邮箱: ${email}，请手动指定 IMAP 服务器`],
    };
  }

  // 2. 获取邮件
  let emails;
  try {
    emails = await fetchRecentEmails(config, 14, 50);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    let hint = "";
    if (domain.includes("gmail"))
      hint = "Gmail 需要开启 IMAP 并使用应用密码（不是你的 Gmail 密码）。开启方法: https://support.google.com/accounts/answer/185833";
    else if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live"))
      hint = "Outlook 已禁用密码登录。方案A：使用应用密码 (https://support.microsoft.com/account-billing/app-passwords) | 方案B：将求职邮件转发到 QQ 邮箱再同步";
    else if (domain.includes("qq"))
      hint = "QQ邮箱需使用授权码登录。方法: 登录QQ邮箱 → 设置 → 账户 → 开启POP3/IMAP/SMTP服务 → 发送短信获取授权码 → 用授权码作为密码登录";

    return {
      success: false,
      totalEmails: 0,
      jobRelated: 0,
      matched: 0,
      created: 0,
      errors: [`连接失败: ${msg}`, hint].filter(Boolean),
    };
  }

  if (emails.length === 0) {
    return {
      success: true,
      totalEmails: 0,
      jobRelated: 0,
      matched: 0,
      created: 0,
      errors: ["最近 14 天没有找到邮件"],
      provider: config.host,
    };
  }

  // 3. LLM 处理
  const result = await processEmails(emails);

  return {
    success: true,
    totalEmails: result.total,
    jobRelated: result.jobRelated,
    matched: result.matched,
    created: result.created,
    errors: result.errors,
    emails: result.emails,
    matchedIds: result.matchedIds,
    createdIds: result.createdIds,
    provider: config.host,
  };
}
