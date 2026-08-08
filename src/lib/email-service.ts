/**
 * 邮件服务 —— IMAP 收取邮件
 * 支持 Gmail、QQ邮箱、163、Outlook 等
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser"; // will be needed

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  date: Date;
  text: string;
  html?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

/**
 * 常用邮箱的 IMAP 配置
 */
export const EMAIL_PROVIDERS: Record<string, EmailConfig> = {
  gmail: { host: "imap.gmail.com", port: 993, secure: true, user: "", password: "" },
  qq: { host: "imap.qq.com", port: 993, secure: true, user: "", password: "" },
  "163": { host: "imap.163.com", port: 993, secure: true, user: "", password: "" },
  "126": { host: "imap.126.com", port: 993, secure: true, user: "", password: "" },
  outlook: { host: "outlook.office365.com", port: 993, secure: true, user: "", password: "" },
  foxmail: { host: "imap.foxmail.com", port: 993, secure: true, user: "", password: "" },
};

/**
 * 检测邮箱域名对应的 IMAP 配置
 */
export function detectEmailProvider(email: string): EmailConfig | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail")) return { ...EMAIL_PROVIDERS.gmail, user: email };
  if (domain.includes("qq")) return { ...EMAIL_PROVIDERS.qq, user: email };
  if (domain.includes("163")) return { ...EMAIL_PROVIDERS["163"], user: email };
  if (domain.includes("126")) return { ...EMAIL_PROVIDERS["126"], user: email };
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live"))
    return { ...EMAIL_PROVIDERS.outlook, user: email };
  if (domain.includes("foxmail")) return { ...EMAIL_PROVIDERS.foxmail, user: email };
  if (domain.includes("cuhk")) return { ...EMAIL_PROVIDERS.outlook, user: email };
  if (domain.endsWith(".edu") || domain.endsWith(".edu.cn") || domain.endsWith(".edu.hk"))
    return { ...EMAIL_PROVIDERS.outlook, user: email };
  return null;
}

/**
 * 连接邮箱并获取最近 N 天的邮件
 */
export async function fetchRecentEmails(
  config: EmailConfig,
  daysBack = 7,
  maxEmails = 30
): Promise<EmailMessage[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);

      const messages: EmailMessage[] = [];
      const seen = new Set<string>();

      for await (const msg of client.fetch(
        { since },
        { source: true, envelope: true, uid: true }
      )) {
        if (messages.length >= maxEmails) break;

        const subject = msg.envelope?.subject ?? "";
        const from = msg.envelope?.from?.[0]?.address ?? "";
        const fromName = msg.envelope?.from?.[0]?.name ?? "";

        // 去重(同主题+同发件人视为同一封)
        const dedupKey = `${subject}|${from}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        // 解析邮件正文
        let text = "";
        if (msg.source) {
          try {
            const parsed = await simpleParser(msg.source);
            text = parsed.text?.slice(0, 3000) ?? "";
          } catch {
            text = "(无法解析邮件正文)";
          }
        }

        messages.push({
          id: String(msg.uid),
          subject,
          from,
          fromName,
          date: msg.envelope?.date ?? new Date(),
          text,
        });
      }

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
