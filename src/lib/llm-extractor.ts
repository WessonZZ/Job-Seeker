/**
 * LLM 岗位信息提取器
 *
 * 支持:
 * - DeepSeek (默认，OpenAI 兼容 API)
 * - Claude/Anthropic
 *
 * 配置 (.env):
 *   LLM_PROVIDER=deepseek  (默认)
 *   DEEPSEEK_API_KEY=sk-...
 *
 *   或
 *
 *   LLM_PROVIDER=claude
 *   ANTHROPIC_API_KEY=sk-ant-...
 */

import type { ExtractedJob } from "./scraper-engine";

const MAX_TEXT_LENGTH = 8000;
const KEYWORDS = ["工程师", "开发", "算法", "产品", "运营", "设计", "校招", "实习"];

interface LLMJobItem {
  title: string;
  jd?: string;
  location?: string;
  salary?: string;
  type?: string;
  url?: string;
}

interface LLMResponse {
  jobs: LLMJobItem[];
  isCareerPage: boolean;
  note?: string;
}

/** 检查 API Key 是否真的配置了（不是占位符） */
function hasRealKey(key: string | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  // 跳过占位符
  if (trimmed === "sk-你的key" || trimmed === "sk-ant-你的key") return false;
  if (trimmed.startsWith("${") || trimmed.startsWith("your_")) return false;
  return true;
}

/** 获取当前 LLM 提供者和模型信息 */
export function getLLMProvider(): { name: string; model: string; configured: boolean; keyHint: string } {
  const provider = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  const model = process.env["LLM_MODEL"] || "";
  const deepseekKey = process.env["DEEPSEEK_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  if (provider === "claude" || provider === "anthropic") {
    return {
      name: "Claude",
      model: model || "claude-sonnet-5-20251001",
      configured: hasRealKey(anthropicKey),
      keyHint: "设置 ANTHROPIC_API_KEY=sk-ant-...",
    };
  }

  // 默认: DeepSeek
  if (hasRealKey(deepseekKey)) {
    return {
      name: "DeepSeek",
      model: model || "deepseek-chat",
      configured: true,
      keyHint: "",
    };
  }
  return {
    name: "DeepSeek",
    model: model || "deepseek-chat",
    configured: false,
    keyHint: "在 .env 中设置你的 DEEPSEEK_API_KEY=sk-...",
  };
}

/**
 * 使用 LLM 从 HTML 中提取岗位信息
 * 按优先级: DeepSeek → Claude → 关键词回退
 */
export async function extractWithLLM(
  html: string,
  companyName: string,
  pageUrl: string
): Promise<ExtractedJob[]> {
  const provider = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  const deepseekKey = hasRealKey(process.env["DEEPSEEK_API_KEY"]) ? process.env["DEEPSEEK_API_KEY"] : undefined;
  const anthropicKey = hasRealKey(process.env["ANTHROPIC_API_KEY"]) ? process.env["ANTHROPIC_API_KEY"] : undefined;

  // 优先 DeepSeek
  if (provider !== "claude" && provider !== "anthropic" && deepseekKey) {
    try {
      const jobs = await callDeepSeek(html, companyName, pageUrl, deepseekKey);
      if (jobs.length > 0) return jobs;
    } catch (err) {
      console.error("[LLM] DeepSeek 调用失败:", err);
    }
  }

  // 其次 Claude
  if (anthropicKey) {
    try {
      const jobs = await callClaude(html, companyName, pageUrl, anthropicKey);
      if (jobs.length > 0) return jobs;
    } catch (err) {
      console.error("[LLM] Claude 调用失败:", err);
    }
  }

  console.log("[LLM] 无可用 LLM，使用关键词回退");
  return fallbackExtract(html, companyName, pageUrl);
}

// ═══════════════════════════════════════
// DeepSeek (OpenAI 兼容 API)
// ═══════════════════════════════════════

async function callDeepSeek(
  html: string,
  companyName: string,
  pageUrl: string,
  apiKey: string
): Promise<ExtractedJob[]> {
  const cleanHtml = cleanPageHtml(html);

  const result = await callOpenAICompatible(
    "https://api.deepseek.com/v1/chat/completions",
    apiKey,
    process.env["LLM_MODEL"] || "deepseek-chat",
    [{ role: "user", content: buildPrompt(companyName, pageUrl, cleanHtml) }]
  );

  return parseAndMap(result, pageUrl);
}

// ═══════════════════════════════════════
// Claude / Anthropic
// ═══════════════════════════════════════

async function callClaude(
  html: string,
  companyName: string,
  pageUrl: string,
  apiKey: string
): Promise<ExtractedJob[]> {
  const cleanHtml = cleanPageHtml(html);

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env["LLM_MODEL"] || "claude-sonnet-5-20251001",
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      { role: "user", content: buildPrompt(companyName, pageUrl, cleanHtml) },
    ],
  });

  const text = response.content.find((c) => c.type === "text")?.text ?? "";
  const parsed = parseJSONResponse(text);
  if (!parsed) return [];

  return parsed.jobs
    .filter((j) => j.title?.length > 2)
    .map((j) => ({
      title: j.title,
      jd: j.jd ?? "",
      url: j.url || pageUrl,
      salary: j.salary,
      location: j.location,
    }));
}

// ═══════════════════════════════════════
// 通用工具
// ═══════════════════════════════════════

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<LLMResponse | null> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseJSONResponse(text);
}

function buildPrompt(
  companyName: string,
  pageUrl: string,
  cleanHtml: string
): string {
  return `你是一个招聘网站解析器。我会给你一段 HTML 源码，来自 ${companyName} 的招聘页面 (${pageUrl})。

请完成以下任务：
1. **识别所有真实的招聘岗位** — 只提取真正的职位，忽略导航、页脚、版权声明等
2. **每个岗位提取以下信息**：
   - title: 职位名称（必填）
   - jd: 职位描述（如果有）
   - location: 工作地点（如果有）
   - salary: 薪资范围（如果有）
   - type: 招聘类型（"校招" / "实习" / "社招" / "未知"）
3. **判断页面类型**：这个页面是否是招聘岗位列表页（isCareerPage: true/false）

请以 JSON 格式返回，不要 markdown 代码块：

{"jobs":[{"title":"...","jd":"...","location":"...","salary":"...","type":"..."}],"isCareerPage":true,"note":"..."}

如果没有任何招聘岗位，返回 {"jobs":[],"isCareerPage":false,"note":"..."}

HTML 内容：

${cleanHtml}`;
}

function cleanPageHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .slice(0, MAX_TEXT_LENGTH);
}

function parseJSONResponse(text: string): LLMResponse | null {
  try {
    let t = text.trim();
    // 剥掉 ```json ... ``` markdown 围栏（模型经常不听"不要代码块"）
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    // 去掉首尾非 JSON 的杂文字
    const jsonMatch = t.match(/\{[\s\S]*"jobs"[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    // 校验结构，避免截到残缺 JSON
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.jobs)) {
      return parsed as LLMResponse;
    }
    return null;
  } catch {
    return null;
  }
}

function parseAndMap(
  result: LLMResponse | null,
  pageUrl: string
): ExtractedJob[] {
  if (!result) return [];
  return result.jobs
    .filter((j) => j.title?.length > 2)
    .map((j) => ({
      title: j.title,
      jd: j.jd ?? "",
      url: j.url || pageUrl,
      salary: j.salary,
      location: j.location,
    }));
}

// ═══════════════════════════════════════
// 关键词回退
// ═══════════════════════════════════════

function fallbackExtract(
  html: string,
  _companyName: string,
  pageUrl: string
): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];
  const seen = new Set<string>();

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && l.length < 60);

  for (const line of text) {
    if (seen.has(line)) continue;
    if (!KEYWORDS.some((kw) => line.includes(kw))) continue;
    // 过滤导航/栏目/页面文案等误报
    if (isNavJunk(line)) continue;
    seen.add(line);
    jobs.push({ title: line.slice(0, 60), jd: "", url: pageUrl });
  }

  return jobs;
}

/** 判断一行是否更像导航/栏目文案而不是真实岗位标题 */
function isNavJunk(line: string): boolean {
  const junkPhrases = [
    "首页", "关于我们", "加入我们", "联系我们", "公司介绍", "公司简介",
    "新闻中心", "产品中心", "解决方案", "新闻资讯", "人才招聘", "校园招聘",
    "热招", "职位搜索", "工作机会", "联系方式", "更多", "全部", "返回",
    "登录", "注册", "隐私政策", "法律声明", "网站地图", "投资者关系",
    "社会责任", "诚聘英才", "期待", "欢迎加入", "职位列表", "招聘信息",
    "查看详情", "投递简历", "立即申请", "在线投递", "了解更多", "查看更多",
    "｜", "|", "—", ">", "…", "…", "工作地点", "薪资待遇", "职位要求",
  ];
  // 含"中心/我们/关于/更多/招聘信息/职位列表"等栏目词的也视为导航
  if (/中心|关于我们|联系我们|加入我们|招聘信息|职位列表|热招|查看更多/.test(line)) return true;
  return junkPhrases.some((w) => line.includes(w));
}
