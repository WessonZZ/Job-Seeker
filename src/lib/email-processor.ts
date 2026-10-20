/**
 * 邮件处理器 —— 用 LLM 分类求职邮件，提取结构化信息
 *
 * 1. 判断邮件是否与求职相关
 * 2. 提取公司、职位、事件类型、时间等
 * 3. 匹配到已有投递记录 → 创建时间线事件
 */

import { prisma } from "@/lib/prisma";
import { getLLMConfig, resolveClaudeModel, resolveDeepseekModel, type LLMConfig } from "@/lib/llm-config";
import { statusFromEventType } from "@/lib/application-stages";
import { fetchWithTimeout, LLM_TIMEOUT_MS } from "@/lib/http";
import { parseLlmJson } from "@/lib/llm-json";
import type { EmailMessage } from "./email-service";

interface ClassifiedEmail {
  isJobRelated: boolean;
  company?: string;
  position?: string;
  eventType?:
    | "submit" | "oa" | "interview_pending" | "interview" | "offer"
    | "rejection" | "followup" | "test" | "note";
  eventDate?: string;
  details?: string;
  confidence: number; // 0-1
}

/**
 * 处理一批邮件：分类 → 匹配 → 创建时间线事件
 */
export async function processEmails(
  emails: EmailMessage[]
): Promise<{
  total: number;
  jobRelated: number;
  matched: number;
  created: number;
  matchedIds: string[];
  createdIds: string[];
  errors: string[];
  emails: Array<{ subject: string; from: string; isJobRelated: boolean; company?: string; eventType?: string; error?: string }>;
}> {
  const errors: string[] = [];
  const matchedIds: string[] = [];
  const createdIds: string[] = [];
  const emailItems: Array<{ subject: string; from: string; isJobRelated: boolean; company?: string; eventType?: string; error?: string }> = [];
  let jobRelated = 0;
  let matched = 0;
  let created = 0;

  // 获取已有投递记录（含全部时间线事件，用于准确去重）
  const applications = await prisma.application.findMany({
    include: { timelineEvents: true },
  });

  for (const email of emails) {
    try {
      const result = await classifyEmail(email);

      if (!result.isJobRelated) {
        emailItems.push({ subject: email.subject, from: email.from, isJobRelated: false });
        continue;
      }
      jobRelated++;

      if (!result.company) {
        emailItems.push({ subject: email.subject, from: email.from, isJobRelated: true, error: "未识别到公司" });
        errors.push(`[${email.subject}] 未识别到公司名`);
        continue;
      }

      // 匹配到已有投递记录
      const matchedApp = findMatchingApplication(
        result.company,
        result.position,
        applications
      );

      if (!matchedApp) {
        emailItems.push({ subject: email.subject, from: email.from, isJobRelated: true, company: result.company, eventType: result.eventType, error: "未匹配" });
        errors.push(`[${email.subject}] 未匹配到 "(${result.company})" 的投递记录`);
        continue;
      }
      matched++;
      emailItems.push({ subject: email.subject, from: email.from, isJobRelated: true, company: result.company, eventType: result.eventType });
      if (matchedApp) matchedIds.push(matchedApp.id);

      // 检查是否已存在相同事件（去重：按 事件类型+日期+标题，
      // 这样同一天两封不同笔试/面试邀请都能建事件，同时同一封邮件重复处理时能去重）
      const eventDate = result.eventDate
        ? new Date(result.eventDate)
        : email.date;
      const eventTitle = buildEventTitle(result);
      const eventDay = eventDate.toDateString();
      const exists = matchedApp.timelineEvents.some(
        (e) =>
          e.eventType === result.eventType &&
          e.date.toDateString() === eventDay &&
          e.title === eventTitle
      );
      if (exists) continue;

      // 创建时间线事件
      const createdEventType = result.eventType ?? "note";
      createdIds.push(matchedApp.id);
      await prisma.timelineEvent.create({
        data: {
          applicationId: matchedApp.id,
          eventType: createdEventType,
          title: eventTitle,
          description: result.details ?? email.text.slice(0, 500),
          date: eventDate,
          isKey: result.eventType !== "followup" && result.eventType !== "note",
        },
      });

      // 回写快照，否则同一批次里后续内容相同的邮件查不到这条新事件，会重复建
      matchedApp.timelineEvents.push({
        eventType: createdEventType,
        date: eventDate,
        title: eventTitle,
      });

      // 更新投递状态。注意走共享映射：事件类型 "rejection" 对应的状态是
      // "rejected_by_company"，直接写 eventType 会存进一个 UI 不认识的值。
      const nextStatus = statusFromEventType(createdEventType);
      if (nextStatus) {
        await prisma.application.update({
          where: { id: matchedApp.id },
          data: { status: nextStatus },
        });
      }

      created++;
    } catch (err) {
      errors.push(`[${email.subject}] 处理失败: ${err}`);
    }
  }

  return { total: emails.length, jobRelated, matched, created, matchedIds, createdIds, errors, emails: emailItems };
}

/**
 * 用 LLM 分类单封邮件
 */
async function classifyEmail(email: EmailMessage): Promise<ClassifiedEmail> {
  const provider = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  const deepseekKey = process.env["DEEPSEEK_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  // 关键词快速预筛（提高效率）
  //
  // 这道预筛是"不命中就不问 LLM、直接判为不相关"，所以漏词 = 邮件被静默丢弃。
  // 之前只覆盖了面试/笔试/投递这类措辞，真实拒信里最常见的
  // 「感谢您对本公司的关注…您的申请未能通过筛选」一个词都不含，
  // 于是最该被抓到的拒信反而最先被丢掉。
  const keywords = [
    // 流程类
    "面试", "笔试", "测评", "录用", "入职", "offer",
    // 投递/申请类
    "投递", "申请", "应聘", "求职", "简历", "候选人",
    // 招聘类
    "招聘", "校招", "秋招", "春招", "实习生", "岗位", "职位",
    // 拒信类
    "遗憾", "未通过", "不合适", "拒绝",
    // 英文
    "interview", "recruit", "candidate", "invitation", "assessment", "hiring",
  ];
  // 统一转小写，否则 "Interview" 这种首字母大写的写法会漏掉
  const textToCheck = `${email.subject} ${email.from} ${email.text}`.toLowerCase();
  const hasKeyword = keywords.some((kw) => textToCheck.includes(kw));
  if (!hasKeyword) {
    return { isJobRelated: false, confidence: 0 };
  }

  // 用 LLM 精确判断
  const prompt = `你是一个求职邮件分析器。分析以下邮件，判断是否与求职/招聘相关。

发件人: ${email.from} (${email.fromName})
主题: ${email.subject}
日期: ${email.date.toISOString()}
正文: ${email.text.slice(0, 2000)}

如果是求职相关邮件，提取以下信息（JSON格式，不要markdown）：
{
  "isJobRelated": true/false,
  "company": "公司名称（如无法确定则留空）",
  "position": "职位名称（如无法确定则留空）",
  "eventType": "事件类型: submit(投递确认) / oa(笔试) / interview_pending(面试邀请-需预约) / interview(面试) / offer(录用) / rejection(拒信) / test(测试) / followup(跟进)",
  "eventDate": "事件日期（如"2026-07-15"，无法确定则留空）",
  "details": "关键信息摘要（30字内）",
  "confidence": 0.0-1.0
}

如果无关，返回 {"isJobRelated":false,"confidence":0}`;

  // 优先用数据库配置（设置页，OpenAI 兼容）
  const cfg = await getLLMConfig();
  if (cfg.source === "db") {
    try {
      return await callConfiguredLLM(prompt, cfg);
    } catch (e) {
      console.error("[Email] 数据库配置调用失败，回退环境变量:", e);
    }
  }

  // 其次 DeepSeek
  if (deepseekKey && provider !== "claude") {
    try {
      return await callLLM(prompt, deepseekKey, "deepseek");
    } catch {
      // fall through
    }
  }
  if (anthropicKey) {
    try {
      return await callLLM(prompt, anthropicKey, "claude");
    } catch {
      // fall through
    }
  }

  // 无 LLM 时的关键词回退
  return keywordFallback(email);
}

/** 用数据库配置（OpenAI 兼容）调用 LLM 分类邮件 */
async function callConfiguredLLM(prompt: string, cfg: LLMConfig): Promise<ClassifiedEmail> {
  const baseUrl = cfg.baseUrl.replace(/\/+$/, "");
  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  }, LLM_TIMEOUT_MS);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return parseResult(data?.choices?.[0]?.message?.content ?? "");
}

async function callLLM(
  prompt: string,
  apiKey: string,
  provider: "deepseek" | "claude"
): Promise<ClassifiedEmail> {
  if (provider === "claude") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: resolveClaudeModel(),
      max_tokens: 1024,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    return parseResult(text);
  }

  // DeepSeek (OpenAI 兼容)
  const res = await fetchWithTimeout("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveDeepseekModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  }, LLM_TIMEOUT_MS);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseResult(text);
}

function parseResult(text: string): ClassifiedEmail {
  const parsed = parseLlmJson<ClassifiedEmail>(
    text,
    (v) =>
      !!v &&
      typeof v === "object" &&
      typeof (v as { isJobRelated?: unknown }).isJobRelated === "boolean"
  );
  return parsed ?? { isJobRelated: false, confidence: 0 };
}

/**
 * 关键词回退策略（无 LLM 时）
 */
function keywordFallback(email: EmailMessage): ClassifiedEmail {
  // 同样转小写，否则 "Offer" 之外的写法（offer / OFFER）匹配不到
  const t = `${email.subject} ${email.text}`.toLowerCase();

  if (t.includes("预约面试") || t.includes("邀请您面试") || t.includes("邀约面试") || (t.includes("面试") && (t.includes("预约") || t.includes("选择时间") || t.includes("确认时间")))) {
    return {
      isJobRelated: true,
      eventType: "interview_pending",
      details: "面试预约邀请（关键词匹配）",
      confidence: 0.5,
    };
  }
  if (t.includes("面试") || t.includes("interview") || t.includes("约面")) {
    return {
      isJobRelated: true,
      eventType: "interview",
      details: "面试邀请（关键词匹配）",
      confidence: 0.5,
    };
  }
  if (t.includes("笔试") || t.includes("在线测评") || t.includes("assessment")) {
    return {
      isJobRelated: true,
      eventType: "oa",
      details: "笔试通知（关键词匹配）",
      confidence: 0.5,
    };
  }
  if (t.includes("offer") || t.includes("录用") || t.includes("入职")) {
    return {
      isJobRelated: true,
      eventType: "offer",
      details: "录用通知（关键词匹配）",
      confidence: 0.5,
    };
  }
  // 拒信：既认"感谢+投递/申请"这种委婉说法，也认直白的措辞
  if (
    (t.includes("感谢") && (t.includes("投递") || t.includes("申请"))) ||
    t.includes("遗憾") ||
    t.includes("未通过") ||
    t.includes("不合适")
  ) {
    return {
      isJobRelated: true,
      eventType: "rejection",
      details: "拒信（关键词匹配）",
      confidence: 0.4,
    };
  }
  if (t.includes("收到") && (t.includes("简历") || t.includes("申请"))) {
    return {
      isJobRelated: true,
      eventType: "submit",
      details: "投递确认（关键词匹配）",
      confidence: 0.4,
    };
  }

  return { isJobRelated: false, confidence: 0 };
}

/**
 * 从已有投递记录中匹配公司
 */
function findMatchingApplication(
  company: string,
  position: string | undefined,
  applications: Array<{
    id: string;
    companyName: string;
    position: string;
    timelineEvents: Array<{ eventType: string; date: Date; title: string }>;
  }>
) {
  // 精确匹配公司名
  const exact = applications.find(
    (a) =>
      a.companyName.includes(company) || company.includes(a.companyName)
  );
  if (exact) return exact;

  // 模糊匹配
  const c = company.toLowerCase();
  const matched = applications.filter(
    (a) =>
      a.companyName.toLowerCase().includes(c) ||
      c.includes(a.companyName.toLowerCase())
  );
  if (matched.length === 1) return matched[0];

  // 按公司+职位匹配
  if (position && matched.length > 1) {
    const p = position.toLowerCase();
    return matched.find((a) => a.position.toLowerCase().includes(p));
  }

  return null;
}

function buildEventTitle(result: ClassifiedEmail): string {
  const typeLabels: Record<string, string> = {
    submit: "投递确认",
    oa: "在线笔试",
    interview_pending: "待预约面试",
    interview: "面试邀请",
    offer: "录用通知",
    rejection: "拒信",
    test: "测试",
    followup: "跟进",
  };

  const base = typeLabels[result.eventType ?? ""] ?? "邮件通知";
  if (result.details) return `${base}: ${result.details}`;
  return base;
}
