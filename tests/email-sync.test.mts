/**
 * 邮件同步集成测试 —— 跑在**独立的临时数据库**上，不碰 prisma/dev.db。
 *
 *   npm test
 *
 * 覆盖本轮改动的那条链路：
 *   getLLMConfig(DB) → callConfiguredLLM → parseResult → findMatchingApplication
 *   → 批次内去重 → 建时间线事件 → 状态回写
 *
 * 为什么要起一个本地假 LLM 服务：`keywordFallback` 不提取公司名，
 * 走关键词回退时 `result.company` 永远是空的，`processEmails` 会在
 * 「未识别到公司」处 continue，根本走不到回写状态那段代码。
 * 所以必须让分类真的返回一个公司名，才能测到 A1。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import { STATUS_CONFIG } from "../src/lib/utils";

// ── 临时库：必须在 import prisma 之前把 DATABASE_URL 换掉 ──────────────
// Prisma 把 file: 相对路径解析到 schema 所在目录，所以是 prisma/test-email.db
const TEST_DB = path.join(process.cwd(), "prisma", "test-email.db");
const TEST_DB_URL = "file:./test-email.db";

process.env["DATABASE_URL"] = TEST_DB_URL;
// 别让真实 key 把测试引到外网
delete process.env["DEEPSEEK_API_KEY"];
delete process.env["ANTHROPIC_API_KEY"];
delete process.env["LLM_PROVIDER"];

const cleanupDb = () => {
  for (const f of [TEST_DB, `${TEST_DB}-journal`, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    if (existsSync(f)) rmSync(f, { force: true });
  }
};
cleanupDb();
process.on("exit", cleanupDb);

execFileSync(
  path.join(process.cwd(), "node_modules", ".bin", "prisma"),
  ["db", "push", "--skip-generate"],
  { env: { ...process.env, DATABASE_URL: TEST_DB_URL }, stdio: "ignore" }
);

const { prisma } = await import("../src/lib/prisma");
const { processEmails } = await import("../src/lib/email-processor");

// ── 假 LLM：返回一个可切换的分类结果 ────────────────────────────────
let nextClassification: Record<string, unknown> = {
  isJobRelated: false,
  confidence: 0,
};
const llmCalls: string[] = [];

const stub = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    llmCalls.push(body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(nextClassification) } }],
      })
    );
  });
});
await new Promise<void>((r) => stub.listen(0, "127.0.0.1", r));
const llmPort = (stub.address() as AddressInfo).port;
process.on("exit", () => stub.close());

// 让 getLLMConfig() 走 DB 分支，指向本地假服务
await prisma.setting.createMany({
  data: [
    { key: "llm.baseUrl", value: `http://127.0.0.1:${llmPort}` },
    { key: "llm.apiKey", value: "sk-stub-not-a-real-key" },
    { key: "llm.model", value: "stub-model" },
  ],
});

const user = await prisma.user.create({ data: { name: "测试用户" } });

const makeApp = (companyName: string, position: string, status = "applied") =>
  prisma.application.create({
    data: {
      userId: user.id,
      companyName,
      position,
      appliedDate: new Date(2026, 9, 1),
      status,
    },
  });

/**
 * 注意：`classifyEmail` 在调 LLM 之前有一道**关键词预筛**，命中不了就直接返回
 * 「不相关」、根本不问 LLM。所以这里的主题/正文必须含预筛关键词
 * （面试/笔试/投递/简历/Offer/招聘…），否则 nextClassification 会被完全忽略。
 */
const email = (subject: string, text: string, day = 20) => ({
  id: `msg-${subject}-${day}`,
  subject,
  from: "hr@example.com",
  fromName: "招聘组",
  date: new Date(2026, 9, day, 10, 0, 0),
  text,
});

const rejection = () =>
  email("关于您的投递", "感谢您投递我们的岗位，经过评估我们决定不再推进。", 20);

const eventsOf = (applicationId: string) =>
  prisma.timelineEvent.findMany({ where: { applicationId } });

// ─────────────────────────────────────────────────────────────────────

test("拒信邮件：批次内重复邮件只建一个事件，状态归一成 rejected_by_company", async () => {
  const app = await makeApp("星尘科技", "后端开发工程师");
  nextClassification = {
    isJobRelated: true,
    company: "星尘科技",
    position: "后端开发工程师",
    eventType: "rejection",
    eventDate: "2026-10-20",
    details: "岗位已关闭",
    confidence: 0.95,
  };

  // 同一批次里两封一模一样的邮件 —— A7 就是这里会重复建事件
  const result = await processEmails([rejection(), rejection()]);

  assert.equal(result.jobRelated, 2);
  assert.equal(result.matched, 2, `未匹配到投递记录：${result.errors.join("; ")}`);
  assert.equal(result.created, 1, "同一批次内的重复邮件建了多个事件");
  assert.deepEqual(result.errors, []);

  const events = await eventsOf(app.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "rejection", "事件类型本身不该被改写");

  const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
  assert.equal(
    after.status,
    "rejected_by_company",
    `A1 复发：写入了 "${after.status}"，UI 的状态徽章会消失`
  );
  assert.ok(after.status in STATUS_CONFIG, `"${after.status}" 不是 UI 认识的状态值`);
});

test("跨批次重复：再跑一次同样的邮件不会重复建事件", async () => {
  const app = await makeApp("跨批测试公司", "前端工程师");
  nextClassification = {
    isJobRelated: true,
    company: "跨批测试公司",
    position: "前端工程师",
    eventType: "rejection",
    eventDate: "2026-10-20",
    details: "岗位已关闭",
    confidence: 0.95,
  };

  await processEmails([rejection()]);
  const second = await processEmails([rejection()]);

  assert.equal(second.created, 0, "第二批次重复建了事件");
  assert.equal((await eventsOf(app.id)).length, 1);
});

test("不改变状态的事件（followup）不会覆盖手动设置的状态", async () => {
  const app = await makeApp("手动状态公司", "算法工程师", "offer");
  nextClassification = {
    isJobRelated: true,
    company: "手动状态公司",
    position: "算法工程师",
    eventType: "followup",
    eventDate: "2026-10-21",
    details: "HR 跟进",
    confidence: 0.9,
  };

  const result = await processEmails([
    email("面试后续跟进", "想跟您确认一下面试之后的进度。", 21),
  ]);
  assert.equal(result.created, 1);

  const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
  assert.equal(after.status, "offer", "followup 事件不该把状态从 offer 改掉");
});

test("笔试邮件把状态推到 oa，且每个写入的状态都是合法值", async () => {
  const app = await makeApp("笔试测试公司", "测试工程师");
  nextClassification = {
    isJobRelated: true,
    company: "笔试测试公司",
    position: "测试工程师",
    eventType: "oa",
    eventDate: "2026-10-22",
    details: "在线测评邀请",
    confidence: 0.9,
  };

  await processEmails([email("在线笔试邀请", "请于 48 小时内完成在线笔试测评。", 22)]);

  const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
  assert.equal(after.status, "oa");

  const all = await prisma.application.findMany({ select: { status: true } });
  for (const row of all) {
    assert.ok(row.status in STATUS_CONFIG, `库里存在 UI 不认识的状态 "${row.status}"`);
  }
});

test("非求职邮件被跳过，不产生事件", async () => {
  const app = await makeApp("无关邮件公司", "数据工程师");
  nextClassification = { isJobRelated: false, confidence: 0.1 };

  // 主题里故意带"面试"以通过预筛 —— 要测的是「LLM 判定不相关 → 跳过」，
  // 而不是「预筛拦住了」（那是另一条分支）
  const result = await processEmails([
    email("面试官的团建通知", "记得报名参加本周的团建活动。", 23),
  ]);

  assert.equal(result.jobRelated, 0);
  assert.equal(result.created, 0);
  assert.equal((await eventsOf(app.id)).length, 0);
  assert.equal(result.emails[0].isJobRelated, false);
});

test("识别不到公司时不建事件，并记一条可读的错误", async () => {
  const app = await makeApp("有记录的公司", "运维工程师");
  nextClassification = {
    isJobRelated: true,
    company: "",
    eventType: "interview",
    confidence: 0.7,
  };

  const result = await processEmails([email("面试邀请", "邀请您参加面试。", 24)]);

  assert.equal(result.matched, 0);
  assert.equal(result.created, 0);
  assert.equal((await eventsOf(app.id)).length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /未识别到公司/);
});

test("LLM 返回带花括号的散文时仍能解析出 JSON（A12）", async () => {
  const app = await makeApp("散文解析公司", "全栈工程师");
  // 覆盖假服务：内容前后夹着解释文字和多余花括号
  const prose = `好的，分析如下：这是一封拒信。{注意：以下才是 JSON}
{"isJobRelated":true,"company":"散文解析公司","position":"全栈工程师","eventType":"rejection","eventDate":"2026-10-25","details":"流程终止","confidence":0.9}
以上就是结果。`;

  const proseServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: prose } }] }));
  });
  await new Promise<void>((r) => proseServer.listen(0, "127.0.0.1", r));
  const prosePort = (proseServer.address() as AddressInfo).port;
  await prisma.setting.update({
    where: { key: "llm.baseUrl" },
    data: { value: `http://127.0.0.1:${prosePort}` },
  });

  try {
    const result = await processEmails([email("投递结果通知", "感谢您的关注。", 25)]);
    assert.equal(result.created, 1, `贪婪正则会在这里解析失败：${result.errors.join("; ")}`);
    const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    assert.equal(after.status, "rejected_by_company");
  } finally {
    proseServer.close();
    await prisma.setting.update({
      where: { key: "llm.baseUrl" },
      data: { value: `http://127.0.0.1:${llmPort}` },
    });
  }
});

test("不含预筛关键词的真实拒信不该被静默丢弃", async () => {
  // 这封邮件的措辞在真实拒信里很常见，但一个预筛关键词都不含
  // （没有"面试/笔试/投递/简历/招聘/Offer"），会在问 LLM 之前就被判成"不相关"
  const app = await makeApp("措辞测试公司", "客户端工程师");
  nextClassification = {
    isJobRelated: true,
    company: "措辞测试公司",
    position: "客户端工程师",
    eventType: "rejection",
    eventDate: "2026-10-26",
    details: "未能通过筛选",
    confidence: 0.9,
  };

  const result = await processEmails([
    email(
      "关于您的申请",
      "感谢您对本公司的关注。经过综合评估，我们遗憾地通知您，您的申请未能通过筛选。",
      26
    ),
  ]);

  assert.equal(
    result.jobRelated,
    1,
    "这封拒信被判成了不相关 —— 预筛关键词漏了「申请/感谢/遗憾/未通过」这类常见措辞"
  );
  const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
  assert.equal(after.status, "rejected_by_company");
});

test("收尾：假 LLM 确实被调用过（证明没走关键词回退）", () => {
  assert.ok(llmCalls.length > 0, "LLM 一次都没被调用，测试没覆盖到目标链路");
  assert.ok(llmCalls.every((b) => b.includes("stub-model")), "请求里没有用上配置的模型名");
});

test.after(async () => {
  stub.close();
  await prisma.$disconnect();
});
