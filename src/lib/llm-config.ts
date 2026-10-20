/**
 * LLM 配置中心 —— 优先读数据库设置（运行时配置，无需重启），
 * 未配置时回退到环境变量。
 *
 * 配置项（数据库 Setting 表）:
 *   llm.baseUrl  OpenAI 兼容接口地址（不含 /chat/completions）
 *   llm.apiKey   API Key
 *   llm.model    模型名
 *   llm.visual   是否支持视觉理解（"true"/"false"）
 *
 * 环境变量回退:
 *   LLM_PROVIDER / LLM_MODEL / DEEPSEEK_API_KEY / ANTHROPIC_API_KEY / LLM_BASE_URL
 */
import { prisma } from "@/lib/prisma";
import { fetchWithTimeout } from "@/lib/http";

/** 设置页"测试连接"不该让用户干等太久 */
const TEST_TIMEOUT_MS = 15_000;

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visual: boolean;
  source: "db" | "env" | "none";
}

export const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";

/**
 * 各 provider 的默认模型。
 *
 * 之前三个文件都硬编码了 "claude-sonnet-5-20251001"，这个 ID 并不存在
 * （日期后缀是 Claude 3/4 时代的写法），走 Claude 分支会直接 404，
 * 然后静默回退到关键词提取，看起来就像"模型不好用"。
 */
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5-5";

/**
 * 模型名解析：provider 专属变量 → 通用的 LLM_MODEL → 内置默认。
 * 拆开是因为 DeepSeek 和 Claude 共用一个 LLM_MODEL 时，
 * 给 DeepSeek 设的名字会被当成 Claude 的模型名发出去。
 */
export function resolveDeepseekModel(): string {
  return (
    process.env["DEEPSEEK_MODEL"] || process.env["LLM_MODEL"] || DEFAULT_DEEPSEEK_MODEL
  );
}

export function resolveClaudeModel(): string {
  return (
    process.env["ANTHROPIC_MODEL"] || process.env["LLM_MODEL"] || DEFAULT_CLAUDE_MODEL
  );
}

/** 检查 API Key 是否真的配置了（不是占位符） */
export function hasRealKey(key: string | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed === "sk-你的key" || trimmed === "sk-ant-你的key") return false;
  if (trimmed.startsWith("${") || trimmed.startsWith("your_")) return false;
  return true;
}

/** 从 DB 设置表读取全部键值 */
async function getDbSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

/** 读取当前生效的 LLM 配置 */
export async function getLLMConfig(): Promise<LLMConfig> {
  const settings = await getDbSettings();
  const dbBaseUrl = settings["llm.baseUrl"]?.trim();
  const dbApiKey = settings["llm.apiKey"]?.trim();
  const dbModel = settings["llm.model"]?.trim();
  const dbVisual = settings["llm.visual"];

  // DB 配置优先（OpenAI 兼容）
  if (hasRealKey(dbApiKey)) {
    return {
      baseUrl: dbBaseUrl || DEFAULT_BASE_URL,
      apiKey: dbApiKey as string,
      model: dbModel || "deepseek-chat",
      visual: dbVisual === "true",
      source: "db",
    };
  }

  // 环境变量回退
  const provider = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  const isClaude = provider === "claude" || provider === "anthropic";
  const envKey = isClaude
    ? process.env["ANTHROPIC_API_KEY"]
    : process.env["DEEPSEEK_API_KEY"];
  if (hasRealKey(envKey)) {
    return {
      baseUrl:
        isClaude
          ? "https://api.anthropic.com"
          : process.env["LLM_BASE_URL"] || DEFAULT_BASE_URL,
      apiKey: envKey as string,
      model: isClaude ? resolveClaudeModel() : resolveDeepseekModel(),
      visual: false,
      source: "env",
    };
  }

  return {
    baseUrl: dbBaseUrl || DEFAULT_BASE_URL,
    apiKey: "",
    model: dbModel || "deepseek-chat",
    visual: dbVisual === "true",
    source: "none",
  };
}

/** 供设置页/爬虫页展示的状态摘要 */
export async function getLLMStatus(): Promise<{
  configured: boolean;
  source: "db" | "env" | "none";
  model: string;
  baseUrl: string;
  visual: boolean;
}> {
  const c = await getLLMConfig();
  return {
    configured: c.source !== "none",
    source: c.source,
    model: c.model,
    baseUrl: c.baseUrl,
    visual: c.visual,
  };
}

/** 测试给定配置的连通性（对视觉/文本模型都只用最小文本请求） */
export async function testLLMConnection(cfg: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!hasRealKey(cfg.apiKey)) return { ok: false, message: "请填写 API Key" };
  const baseUrl = cfg.baseUrl.trim().replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, message: "请填写 Base URL" };
  try {
    const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model.trim(),
        messages: [{ role: "user", content: "回复 OK" }],
        max_tokens: 10,
      }),
    }, TEST_TIMEOUT_MS);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        message: `HTTP ${res.status}: ${(body || res.statusText).slice(0, 200)}`,
      };
    }
    return { ok: true, message: "连接成功" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "连接失败" };
  }
}
