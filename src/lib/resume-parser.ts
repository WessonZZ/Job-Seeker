/**
 * 简历解析器 —— 用 LLM/VLM 从简历内容中提取结构化个人信息
 *
 * 解析路径按配置的"视觉能力"路由：
 *   - 视觉模型：把简历每页图片交给 VLM；失败自动回退文本
 *   - 文本模型：直接解析文本
 * 配置来自数据库（设置页）或环境变量回退，见 llm-config.ts
 */
import { prisma } from "@/lib/prisma";
import { getLLMConfig, type LLMConfig } from "@/lib/llm-config";
import type { ExtractedResume } from "@/lib/resume-extract";

interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  school?: string;
  major?: string;
  degree?: string;
  graduationYear?: number;
  summary?: string;
  workExperiences?: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description?: string;
    isCurrent?: boolean;
  }>;
  projectExperiences?: Array<{
    projectName: string;
    role?: string;
    startDate: string;
    endDate?: string;
    description?: string;
    isCurrent?: boolean;
  }>;
}

export interface ParseResult {
  updated: string[];
  errors: string[];
  mode: "text" | "vision" | "none";
  note?: string;
}

// ═══════════════════════════════════════
// Prompt 模板
// ═══════════════════════════════════════

function buildResumePrompt(text: string): string {
  return `你是一个简历解析器。从以下简历文本中提取个人信息，以 JSON 格式返回（不要 markdown 代码块）。

{
  "name": "姓名",
  "email": "邮箱",
  "phone": "手机号",
  "school": "学校",
  "major": "专业",
  "degree": "学历(大专/本科/硕士/博士)",
  "graduationYear": 毕业年份(数字),
  "summary": "个人简介（基于简历内容总结，20字内）",
  "workExperiences": [
    {"company": "公司名", "title": "职位", "startDate": "开始日期(如2024-09)", "endDate": "结束日期(如2025-06，或留空)", "description": "该段经历的简历原文", "isCurrent": 是否至今}
  ],
  "projectExperiences": [
    {"projectName": "项目名称", "role": "担任角色", "startDate": "开始日期(如2024-03)", "endDate": "结束日期(如2024-06，或留空)", "description": "该项目的简历原文", "isCurrent": 是否至今}
  ]
}

规则（务必严格遵守）：
- 【最关键】workExperiences 和 projectExperiences 的 description 必须【逐字保留简历上的原始内容】，不要总结、改写、精简、扩写或重新组织语言。
- description 只需要整理换行格式：把简历原文的每个要点/句子分行，用 \\n 分隔；不要添加原文没有的编号或 bullet 符号（-、•、*、1. 等）。
- company / title / projectName / role 同样从简历原文原样提取，不要改写。
- 只有 summary 允许总结（基于学校、专业、学历、工作经历，不超过20字）；其余字段一律保留原文，不得改动。
- 如果某字段在简历中未找到，对应字段留空或为 null。
- 毕业年份只填数字。开始/结束日期格式为 YYYY-MM。

简历文本：
${text.slice(0, 8000)}`;
}

function buildVisionPrompt(pages: number): string {
  return `你是一个简历解析器。我给你的是简历的 ${pages} 页图片（依次为第 1 页到最后）。请仔细阅读每页内容，提取个人信息，以 JSON 格式返回（不要 markdown 代码块）。

{
  "name": "姓名",
  "email": "邮箱",
  "phone": "手机号",
  "school": "学校",
  "major": "专业",
  "degree": "学历(大专/本科/硕士/博士)",
  "graduationYear": 毕业年份(数字),
  "summary": "个人简介（基于简历内容总结，20字内）",
  "workExperiences": [
    {"company": "公司名", "title": "职位", "startDate": "开始日期(如2024-09)", "endDate": "结束日期(如2025-06，或留空)", "description": "该段经历的简历原文", "isCurrent": 是否至今}
  ],
  "projectExperiences": [
    {"projectName": "项目名称", "role": "担任角色", "startDate": "开始日期(如2024-03)", "endDate": "结束日期(如2024-06，或留空)", "description": "该项目的简历原文", "isCurrent": 是否至今}
  ]
}

规则（务必严格遵守）：
- 【最关键】workExperiences 和 projectExperiences 的 description 必须【逐字保留简历图片上的原始内容】，不要总结、改写、精简、扩写或重新组织语言。
- description 只需要整理换行格式：把简历原文的每个要点/句子分行，用 \\n 分隔；不要添加原文没有的编号或 bullet 符号（-、•、*、1. 等）。
- company / title / projectName / role 同样从简历原文原样提取，不要改写。
- 只有 summary 允许总结（不超过20字）；其余字段一律保留原文，不得改动。
- 某字段未找到则留空或为 null。毕业年份只填数字。日期格式为 YYYY-MM。`;
}

// ═══════════════════════════════════════
// LLM 调用
// ═══════════════════════════════════════

/** OpenAI 兼容接口（数据库配置均为该协议） */
async function callOpenAICompatible(
  config: LLMConfig,
  messages: unknown,
  maxTokens = 4096
): Promise<string | null> {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

/** 文本路径（DB 配置） */
async function parseWithTextOpenAI(text: string, config: LLMConfig): Promise<ParsedResume | null> {
  const out = await callOpenAICompatible(config, [
    { role: "user", content: buildResumePrompt(text) },
  ]);
  return out ? parseJSON(out) : null;
}

/** 视觉路径（DB 配置）—— 逐页图片交给 VLM */
async function parseWithVisionOpenAI(
  images: Buffer[],
  config: LLMConfig
): Promise<ParsedResume | null> {
  const content: Array<{ type: string; [k: string]: unknown }> = [
    { type: "text", text: buildVisionPrompt(images.length) },
    ...images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${img.toString("base64")}` },
    })),
  ];
  const out = await callOpenAICompatible(config, [{ role: "user", content }]);
  return out ? parseJSON(out) : null;
}

/** 文本路径（环境变量回退，保持原 deepseek / anthropic 行为） */
async function parseWithTextLegacy(text: string): Promise<ParsedResume | null> {
  const deepseekKey = process.env["DEEPSEEK_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  if (deepseekKey) {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env["LLM_MODEL"] || "deepseek-chat",
        messages: [{ role: "user", content: buildResumePrompt(text) }],
        max_tokens: 4096, temperature: 0.1,
      }),
    });
    const data = await res.json();
    return parseJSON(data?.choices?.[0]?.message?.content ?? "");
  }

  if (anthropicKey) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: process.env["LLM_MODEL"] || "claude-sonnet-5-20251001",
      max_tokens: 4096, temperature: 0.1,
      messages: [{ role: "user", content: buildResumePrompt(text) }],
    });
    const t = response.content.find((c) => c.type === "text")?.text ?? "";
    return parseJSON(t);
  }

  return null;
}

function parseJSON(text: string): ParsedResume | null {
  try {
    const match = text.match(/\{[\s\S]*"name"[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════
// 主入口
// ═══════════════════════════════════════

/**
 * 从提取的简历内容解析并更新用户信息
 * 路由规则：视觉配置 → 先视觉，失败回退文本；否则直接文本
 */
export async function parseAndUpdateProfile(content: ExtractedResume): Promise<ParseResult> {
  const config = await getLLMConfig();

  if (config.source === "none") {
    return { updated: [], errors: ["未配置 LLM，请到「设置」页面配置"], mode: "none" };
  }

  const errors: string[] = [];
  const notes: string[] = [];
  if (content.warning) notes.push(content.warning);

  let parsed: ParsedResume | null = null;
  let usedVision = false;

  // 视觉路径（配置了视觉能力且有图片时）
  if (config.visual && content.images?.length) {
    try {
      parsed = await parseWithVisionOpenAI(content.images, config);
    } catch (e) {
      console.error("[Resume] 视觉解析失败，回退文本:", e);
      notes.push("视觉解析失败，已回退文本解析");
    }
    if (parsed) usedVision = true;
  }

  // 文本路径（含视觉失败后的回退）
  if (!parsed) {
    try {
      parsed =
        config.source === "db"
          ? await parseWithTextOpenAI(content.text, config)
          : await parseWithTextLegacy(content.text);
    } catch (e) {
      console.error("[Resume] 文本解析失败:", e);
    }
  }

  if (!parsed) {
    errors.push("LLM 解析失败，请检查设置中的 Base URL / API Key / 模型");
    return { updated: [], errors, mode: usedVision ? "vision" : "text", note: notes.join("；") };
  }

  // 获取用户
  let user = await prisma.user.findFirst();

  // 构建更新数据
  const updateData: Record<string, unknown> = {};
  const fields: Array<{ key: keyof ParsedResume; label: string }> = [
    { key: "name", label: "姓名" },
    { key: "email", label: "邮箱" },
    { key: "phone", label: "手机" },
    { key: "school", label: "学校" },
    { key: "major", label: "专业" },
    { key: "degree", label: "学历" },
    { key: "summary", label: "简介" },
  ];

  const updated: string[] = [];
  for (const { key, label } of fields) {
    const val = parsed[key];
    if (val !== undefined && val !== null && val !== "") {
      updateData[key] = val;
      updated.push(label);
    }
  }

  if (parsed.graduationYear) {
    updateData.graduationYear = parsed.graduationYear;
    updated.push("毕业年份");
  }

  // 更新用户信息
  if (Object.keys(updateData).length > 0) {
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: updateData });
    } else {
      user = await prisma.user.create({
        data: { name: parsed.name || "用户", email: parsed.email || "user@example.com", ...updateData },
      });
    }
  }

  // 处理工作经历
  if (parsed.workExperiences && parsed.workExperiences.length > 0 && user) {
    await prisma.workExperience.deleteMany({ where: { userId: user.id } });

    for (const exp of parsed.workExperiences) {
      if (!exp.company || !exp.title) continue;
      try {
        await prisma.workExperience.create({
          data: {
            userId: user.id,
            company: exp.company,
            title: exp.title,
            startDate: new Date(exp.startDate || "2020-01"),
            endDate: exp.endDate ? new Date(exp.endDate) : exp.isCurrent ? null : undefined,
            description: exp.description || null,
            isCurrent: exp.isCurrent ?? false,
          },
        });
        updated.push(`工作经历: ${exp.company} - ${exp.title}`);
      } catch {
        errors.push(`工作经历「${exp.company}」保存失败`);
      }
    }
  }

  // 处理项目经历
  if (parsed.projectExperiences && parsed.projectExperiences.length > 0 && user) {
    await prisma.projectExperience.deleteMany({ where: { userId: user.id } });

    for (const proj of parsed.projectExperiences) {
      if (!proj.projectName) continue;
      try {
        await prisma.projectExperience.create({
          data: {
            userId: user.id,
            projectName: proj.projectName,
            role: proj.role || null,
            startDate: new Date(proj.startDate || "2024-01"),
            endDate: proj.endDate ? new Date(proj.endDate) : proj.isCurrent ? null : undefined,
            description: proj.description || null,
            isCurrent: proj.isCurrent ?? false,
          },
        });
        updated.push(`项目经历: ${proj.projectName}`);
      } catch {
        errors.push(`项目经历「${proj.projectName}」保存失败`);
      }
    }
  }

  return { updated, errors, mode: usedVision ? "vision" : "text", note: notes.join("；") || undefined };
}
