/**
 * 简历解析器 —— 用 LLM 从简历文本中提取结构化个人信息
 */
import { prisma } from "@/lib/prisma";

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

/**
 * 解析简历文本，提取结构化信息
 */
async function parseWithLLM(text: string): Promise<ParsedResume | null> {
  const deepseekKey = process.env["DEEPSEEK_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  if (!deepseekKey && !anthropicKey) return null;

  const prompt = `你是一个简历解析器。从以下简历文本中提取个人信息，以 JSON 格式返回（不要 markdown 代码块）。

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
    {
      "company": "公司名",
      "title": "职位",
      "startDate": "开始日期(如2024-09)",
      "endDate": "结束日期(如2025-06，或留空)",
      "description": "工作描述（分点列出，每点一行，用\n分隔，如"参与XX系统开发\n负责XX模块设计"）",
      "isCurrent": 是否至今
    }
  ],
  "projectExperiences": [
    {
      "projectName": "项目名称",
      "role": "担任角色（如：前端开发/项目负责人）",
      "startDate": "开始日期(如2024-03)",
      "endDate": "结束日期(如2024-06，或留空)",
      "description": "项目内容与个人职责（分点列出，每点一行，用\n分隔）",
      "isCurrent": 是否至今
    }
  ]
}

规则：
- description 中的工作内容/项目内容必须分点列出，每点一行，用 \n 分隔
- summary 必须生成，基于学校、专业、学历、工作经历总结，不超过20字
- 如果某字段在简历中未找到，对应字段留空或为 null
- 毕业年份只填数字。开始/结束日期格式为 YYYY-MM。

简历文本：
${text.slice(0, 8000)}`;

  if (deepseekKey) {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env["LLM_MODEL"] || "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096, temperature: 0.1,
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return parseJSON(text);
  }

  if (anthropicKey) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: process.env["LLM_MODEL"] || "claude-sonnet-5-20251001",
      max_tokens: 4096, temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
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

/**
 * 从 PDF 文本中解析简历并更新用户信息
 * 返回解析结果摘要
 */
export async function parseAndUpdateProfile(
  pdfText: string
): Promise<{ updated: string[]; errors: string[] }> {
  const updated: string[] = [];
  const errors: string[] = [];

  const parsed = await parseWithLLM(pdfText);
  if (!parsed) {
    errors.push("LLM 未配置或解析失败");
    return { updated, errors };
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
    // 先删除旧的工作经历（简历同步时完全替换）
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
    // 先删除旧的项目经历（简历同步时完全替换）
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

  return { updated, errors };
}
