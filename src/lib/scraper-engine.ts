/**
 * 岗位爬取引擎
 *
 * 策略栈（依次尝试，命中即止）:
 * 0. LLM 大模型解析（如果配置了 ANTHROPIC_API_KEY，首选）
 * 1. JSON-LD / 内嵌 JSON
 * 2. Cheerio HTML 解析
 * 3. 常见 API 端点尝试
 * 4. Web 搜索回退
 */

import * as cheerio from "cheerio";
import { extractWithLLM } from "./llm-extractor";

export interface ExtractedJob {
  title: string;
  jd: string;
  url: string;
  salary?: string;
  location?: string;
}

interface PageInfo {
  url: string;
  html: string;
  ok: boolean;
}

// 常见的招聘页面路径模式
const CAREER_PATHS = [
  "/careers", "/career", "/jobs", "/job",
  "/join", "/join-us", "/joinus",
  "/campus", "/campus-recruitment",
  "/recruit", "/recruitment",
  "/position", "/positions",
  "/about/jobs", "/about/careers",
  "/work-with-us", "/career-center",
];

// 常见 API 端点模式
const API_PATTERNS = [
  "/api/jobs", "/api/positions", "/api/careers",
  "/api/recruit/list", "/api/campus/list",
  "/api/v1/position/list", "/api/v1/campus/list",
  "/graphql", "/positions.json",
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * 尝试从公司招聘官网提取岗位
 */
export async function extractJobsFromUrl(
  companyName: string,
  baseUrl: string
): Promise<ExtractedJob[]> {
  // 标准化 baseUrl
  const normalizedUrl = baseUrl
    .replace(/\/+$/, "")       // 去掉尾部斜杠
    .replace(/^http:/, "https:");

  // ── 阶段 1: 尝试多种路径 ──
  const pages: PageInfo[] = [];
  const urlsToTry = [normalizedUrl];

  // 对裸域名补充路径
  const isRoot =
    !normalizedUrl.includes("/career") &&
    !normalizedUrl.includes("/jobs") &&
    !normalizedUrl.includes("/join") &&
    !normalizedUrl.includes("/recruit") &&
    !normalizedUrl.includes("/campus") &&
    !normalizedUrl.includes("/position");

  if (isRoot) {
    for (const path of CAREER_PATHS) {
      urlsToTry.push(`${normalizedUrl}${path}`);
      urlsToTry.push(`${normalizedUrl.replace("www.", "")}${path}`);
    }
  }

  for (const url of urlsToTry.slice(0, 15)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/json,*/*" },
        signal: AbortSignal.timeout(5000),
      });
      const html = await res.text();
      pages.push({ url, html, ok: res.ok });
    } catch {
      continue;
    }
  }

  if (pages.length === 0) return [];

  const allJobs: ExtractedJob[] = [];
  const seen = new Set<string>();

  // ── 阶段 2: LLM 提取（首选，更准确） ──
  const hasLLM =
    !!process.env["DEEPSEEK_API_KEY"] || !!process.env["ANTHROPIC_API_KEY"];
  if (!hasLLM) {
    console.log(`[Scraper] LLM 未配置: DEEPSEEK_KEY=${!!process.env["DEEPSEEK_API_KEY"]}, ANTHROPIC_KEY=${!!process.env["ANTHROPIC_API_KEY"]}`);
  }
  if (hasLLM) {
    const bestPage = pages.find((p) => p.ok && p.html.length > 1000) ?? pages[0];
    try {
      const llmJobs = await extractWithLLM(bestPage.html, companyName, bestPage.url);
      if (llmJobs.length > 0) {
        console.log(`[Scraper] LLM 提取到 ${llmJobs.length} 个岗位`);
        for (const j of llmJobs) {
          if (!seen.has(j.title)) {
            seen.add(j.title);
            allJobs.push(j);
          }
        }
      }
    } catch (err) {
      console.error("[Scraper] LLM 提取失败:", err);
    }
  }

  // ── 阶段 3: 规则引擎提取（作为 LLM 的补充/回退） ──
  if (allJobs.length === 0) {
    for (const page of pages) {
      const jobs = extractFromHtml(page.html, page.url, seen);
      allJobs.push(...jobs);
    }
  }

  // ── 阶段 4: 如果 HTML 没找到，尝试 API ──
  if (allJobs.length < 2) {
    const [origin] = normalizedUrl.match(/^https?:\/\/[^/]+/) ?? [normalizedUrl];
    for (const path of API_PATTERNS) {
      try {
        const jobs = await tryApiEndpoint(`${origin}${path}`);
        for (const job of jobs) {
          if (!seen.has(job.title)) {
            seen.add(job.title);
            allJobs.push(job);
          }
        }
        if (allJobs.length > 3) break;
      } catch {
        continue;
      }
    }
  }

  // ── 阶段 5: 全局后置过滤 ──
  // 所有提取结果再次验证，确保不是导航文字、文章标题等
  const filtered = allJobs.filter((j) => looksLikeJobTitle(j.title));
  if (filtered.length !== allJobs.length) {
    console.log(`[Scraper] 后置过滤移除了 ${allJobs.length - filtered.length} 个非岗位结果`);
  }

  return filtered.slice(0, 30);
}

/**
 * 从 HTML 中提取岗位信息
 */
function extractFromHtml(
  html: string,
  pageUrl: string,
  seen: Set<string>
): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];

  // 策略 A: JSON-LD 结构化数据
  try {
    const ldMatch = html.match(
      /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    if (ldMatch) {
      for (const block of ldMatch) {
        const json = block.replace(/<\/?script[^>]*>/gi, "");
        try {
          const parsed = JSON.parse(json);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (
              item["@type"] === "JobPosting" ||
              item["@type"] === "BreadcrumbList"
            ) {
              const title = item.title || item.name;
              if (title && !seen.has(title)) {
                seen.add(title);
                jobs.push({
                  title,
                  jd: item.description || item.jd || "",
                  url: item.url || pageUrl,
                  salary: item.salary?.toString(),
                  location: item.jobLocation?.addressLocality ||
                    item.jobLocation?.name ||
                    item.location,
                });
              }
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch {
    // ignore
  }

  // 策略 B: 查找 <script> 中的 JSON 数据（__NEXT_DATA__, __NUXT__, 等）
  try {
    const scriptPatterns = [
      /__NEXT_DATA__\s*=\s*({[\s\S]*?});/,
      /__NUXT__\s*=\s*({[\s\S]*?});/,
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
    ];

    for (const pattern of scriptPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const titles = extractTitlesFromJson(data, seen);
          for (const title of titles) {
            jobs.push({
              title,
              jd: "",
              url: pageUrl,
            });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  // 策略 C: 查找页面中的原始 JSON 数据
  try {
    const jsonBlocks = html.match(
      /<script[^>]*(?:type="application\/json"|type="text\/x\-template")[^>]*>([\s\S]*?)<\/script>/gi
    );
    if (jsonBlocks) {
      for (const block of jsonBlocks) {
        const json = block.replace(/<\/?script[^>]*>/gi, "").trim();
        if (!json || json.length < 20) continue;
        try {
          const data = JSON.parse(json);
          const titles = extractTitlesFromJson(data, seen);
          for (const title of titles) {
            jobs.push({ title, jd: "", url: pageUrl });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  // 策略 D: Cheerio HTML 解析
  if (jobs.length < 3) {
    const $ = cheerio.load(html);
    const selectors = [
      // 职位卡片
      "[class*='position']:has(a)", "[class*='job-item']:has(a)",
      "[class*='recruit-item']:has(a)", "[class*='career-item']:has(a)",
      // 表格行
      "table tr:has(a)", "[class*='list'] > li:has(a)",
      // 通用卡片
      ".card:has(h3):has(a)", ".item:has(h3)", ".post-item",
    ];

    for (const selector of selectors) {
      $(selector).each((_i, el) => {
        try {
          const link = $(el).find("a").first();
          const title = link.text().trim() ||
            $(el).find("h3, h4, [class*='title'], [class*='name']").first().text().trim();
          if (!title || title.length < 3 || title.length > 60) return;
          if (!looksLikeJobTitle(title)) return;
          if (seen.has(title)) return;
          seen.add(title);

          const href = link.attr("href") ?? "";
          const url = href.startsWith("http")
            ? href
            : href.startsWith("/")
            ? new URL(href, pageUrl).href
            : `${pageUrl.replace(/\/+$/, "")}/${href}`;

          const location = $(el)
            .find("[class*='location'], [class*='city'], [class*='place']")
            .first().text().trim();
          const salary = $(el)
            .find("[class*='salary'], [class*='pay'], [class*='compensation']")
            .first().text().trim();

          jobs.push({ title, jd: "", url, location: location || undefined, salary: salary || undefined });
        } catch {
          // skip individual errors
        }
      });
      if (jobs.length > 5) break;
    }
  }

  // 策略 E: 纯文本关键词提取
  if (jobs.length < 3) {
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 4 && l.length < 100);

    for (const line of text) {
      if (seen.has(line)) continue;
      if (!looksLikeJobTitle(line)) continue;
      seen.add(line);
      jobs.push({ title: line.slice(0, 80), jd: "", url: pageUrl });
    }
  }

  return jobs;
}

/**
 * 判断文本是否看起来像职位名称
 */
function looksLikeJobTitle(text: string): boolean {
  const t = text.trim();

  // 跳过太短或太长的文本
  if (t.length < 4 || t.length > 60) return false;

  // 跳过页面标题 / 导航（包含分隔符）
  if (t.includes("｜") || t.includes("|") || t.includes("—") || t.includes("–")) return false;

  // 跳过常见非职位文本
  const skipWords = [
    "首页", "关于我们", "联系我们", "加入我们", "登录", "注册",
    "更多", "全部", "返回", "上一页", "下一页", "搜索", "请输入",
    "网站地图", "法律声明", "隐私政策", "友情链接", "帮助中心",
    "常见问题", "招聘流程", "热招职位", "推荐职位",
    "最新职位", "职位搜索", "职位类别", "工作地点",
    "Cookie", "Settings", "footer", "header", "menu", "nav",
    "©", "copyright", "All Rights Reserved",
  ];
  if (skipWords.some((w) => t.includes(w))) return false;

  // 排除博客/文章类标题
  const articleWords = ["如何", "怎样", "什么", "为什么", "指南", "攻略", "分享", "故事", "专访"];
  if (articleWords.some((w) => t.includes(w))) return false;

  // 必须是纯职位关键词匹配（不能只是"校招"两个字就通过）
  const jobKeywords = [
    "工程师", "开发", "算法", "产品经理", "产品运营", "运营",
    "设计师", "UI", "UX", "市场", "销售", "财务", "人力",
    "HR", "行政", "法务", "战略", "投资", "分析师",
    "研究", "数据", "测试", "运维", "安全", "架构",
    "前端", "后端", "全栈", "移动端", "客户端", "嵌入式",
    "AI", "机器学习", "深度学习", "自然语言",
    "Graduate", "Intern", "Campus",
  ];

  return jobKeywords.some((kw) => t.includes(kw));
}

/**
 * 递归查找 JSON 对象中的职位标题
 */
function extractTitlesFromJson(
  obj: unknown,
  seen: Set<string>
): string[] {
  const titles: string[] = [];

  function walk(value: unknown, depth: number) {
    if (depth > 10) return;
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }

    const record = value as Record<string, unknown>;

    // 检查是否是职位对象
    const titleField =
      record.title || record.name || record.positionName ||
      record.jobTitle || record.recruitName;

    if (
      typeof titleField === "string" &&
      !seen.has(titleField)
    ) {
      if (looksLikeJobTitle(titleField)) {
        seen.add(titleField);
        titles.push(titleField);
        return; // 找到就不再深入这个对象
      }
    }

    for (const val of Object.values(record)) {
      walk(val, depth + 1);
    }
  }

  walk(obj, 0);
  return titles;
}

/**
 * 尝试调用 JSON API
 */
async function tryApiEndpoint(url: string): Promise<ExtractedJob[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return extractFromApiJson(data);
  } catch {
    return [];
  }
}

/**
 * 从 API JSON 响应中提取职位
 */
function extractFromApiJson(data: unknown): ExtractedJob[] {
  const jobs: ExtractedJob[] = [];
  const seen = new Set<string>();

  let records: unknown[] = [];

  // 尝试常见的响应结构
  const d = data as Record<string, unknown>;
  records =
    (d?.data as Record<string, unknown>)?.positions as unknown[] ??
    (d?.data as Record<string, unknown>)?.list as unknown[] ??
    (d?.data as Record<string, unknown>)?.records as unknown[] ??
    (d?.data as unknown[]) ??
    d?.positions as unknown[] ??
    d?.list as unknown[] ??
    d?.items as unknown[] ??
    d?.content as unknown[] ?? [];

  if (!Array.isArray(records)) return [];

  for (const item of records) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const title = String(
      r.title ?? r.name ?? r.positionName ?? r.jobTitle ?? r.recruitName ?? ""
    );
    if (!title || title.length < 2 || seen.has(title)) continue;
    seen.add(title);

    jobs.push({
      title,
      jd: String(
        r.jd ?? r.description ?? r.requirement ?? r.content ?? r.intro ?? ""
      ),
      url: String(r.applyUrl ?? r.url ?? r.link ?? ""),
      salary: r.salary ? String(r.salary) : undefined,
      location: String(
        r.location ?? r.city ?? r.workCity ?? r.workPlace ?? ""
      ) || undefined,
    });
  }

  return jobs;
}
