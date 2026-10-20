/**
 * 纯函数单元测试（Node 内置 test runner + tsx，无需额外依赖）
 *
 *   npm test
 *
 * 覆盖本轮修复的状态推导、日期解析与请求校验；其中「状态映射 vs STATUS_CONFIG」
 * 是 A1 的回归护栏 —— 一旦有人再往映射里塞 UI 不认识的状态值，这里会红。
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  EVENT_TO_STATUS,
  statusFromEventType,
  deriveStatusFromEvents,
} from "../src/lib/application-stages";
import {
  parseDateInput,
  firstIssueMessage,
  isKnownStatus,
  applicationCreateSchema,
} from "../src/lib/validation";
import { STATUS_CONFIG } from "../src/lib/utils";
import { z } from "zod";

const d = (iso: string) => new Date(iso);

test("EVENT_TO_STATUS 里每个状态值都是 STATUS_CONFIG 认识的键", () => {
  for (const [eventType, status] of Object.entries(EVENT_TO_STATUS)) {
    assert.ok(
      status in STATUS_CONFIG,
      `事件 "${eventType}" 映射到了未知状态 "${status}" —— 该投递的状态徽章会消失`
    );
  }
});

test("statusFromEventType：rejection 归一成 rejected_by_company", () => {
  assert.equal(statusFromEventType("rejection"), "rejected_by_company");
  assert.equal(statusFromEventType("oa"), "oa");
  assert.equal(statusFromEventType("test"), "oa");
});

test("statusFromEventType：不改变状态的事件返回 null", () => {
  assert.equal(statusFromEventType("note"), null);
  assert.equal(statusFromEventType("followup"), null);
  assert.equal(statusFromEventType("不存在的类型"), null);
});

test("deriveStatusFromEvents：空事件 → applied", () => {
  assert.equal(deriveStatusFromEvents([]), "applied");
});

test("deriveStatusFromEvents：取日期最新的可映射事件", () => {
  assert.equal(
    deriveStatusFromEvents([
      { eventType: "submit", date: d("2026-01-01") },
      { eventType: "oa", date: d("2026-03-01") },
      { eventType: "interview", date: d("2026-02-01") },
    ]),
    "oa"
  );
});

test("deriveStatusFromEvents：最新事件是 note 时跳过，回退到上一个可映射事件", () => {
  assert.equal(
    deriveStatusFromEvents([
      { eventType: "rejection", date: d("2026-01-01") },
      { eventType: "note", date: d("2026-06-01") },
    ]),
    "rejected_by_company"
  );
});

test("deriveStatusFromEvents：全是不可映射事件 → applied", () => {
  assert.equal(
    deriveStatusFromEvents([{ eventType: "note", date: d("2026-06-01") }]),
    "applied"
  );
});

test("deriveStatusFromEvents：不修改传入数组", () => {
  const events = [
    { eventType: "submit", date: d("2026-01-01") },
    { eventType: "offer", date: d("2026-06-01") },
  ];
  deriveStatusFromEvents(events);
  assert.equal(events[0].eventType, "submit", "入参被就地排序了");
});

test("parseDateInput：纯日期串按本地时区解析，不跨天", () => {
  const parsed = parseDateInput("2026-10-19");
  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 9);
  assert.equal(parsed.getDate(), 19);
});

test("parseDateInput：接受完整 ISO 串", () => {
  const parsed = parseDateInput("2026-10-19T08:30:00.000Z");
  assert.ok(parsed);
  assert.equal(parsed.toISOString(), "2026-10-19T08:30:00.000Z");
});

test("parseDateInput：拒绝拼接坏的日期串（A6 的原始 bug）", () => {
  // 旧代码对 ISO 入参拼 `${appliedDate}T00:00`，结果就是这个串
  assert.equal(parseDateInput("2026-10-19T00:00:00.000Z" + "T00:00"), null);
  assert.equal(parseDateInput("not-a-date"), null);
  assert.equal(parseDateInput(""), null);
  assert.equal(parseDateInput("   "), null);
  assert.equal(parseDateInput(null), null);
  assert.equal(parseDateInput(undefined), null);
  assert.equal(parseDateInput(20261019), null);
});

test("parseDateInput：Date 实例原样通过，Invalid Date 返回 null", () => {
  const good = d("2026-10-19T00:00:00.000Z");
  assert.equal(parseDateInput(good), good);
  assert.equal(parseDateInput(new Date("nope")), null);
});

test("applicationCreateSchema：拒绝缺失的必填字段并给出中文提示", () => {
  const result = applicationCreateSchema.safeParse({ position: "后端" });
  assert.equal(result.success, false);
  assert.match(firstIssueMessage(result.error as z.ZodError), /公司/);
});

test("isKnownStatus：只放行 STATUS_CONFIG 里的状态值", () => {
  assert.equal(isKnownStatus("applied"), true);
  assert.equal(isKnownStatus("rejected_by_company"), true);
  // A1 的元凶：事件类型被当成状态值写库
  assert.equal(isKnownStatus("rejection"), false);
  assert.equal(isKnownStatus(""), false);
  // 别被原型链上的键骗过去
  assert.equal(isKnownStatus("constructor"), false);
  assert.equal(isKnownStatus("toString"), false);
});

test("applicationCreateSchema：priority 越界被拒、字符串数字被转成数字", () => {
  const base = { companyName: "某公司", position: "后端", appliedDate: "2026-10-19" };
  assert.equal(applicationCreateSchema.safeParse({ ...base, priority: 5 }).success, false);
  assert.equal(applicationCreateSchema.safeParse({ ...base, priority: -1 }).success, false);
  assert.equal(applicationCreateSchema.safeParse({ ...base, priority: 1.5 }).success, false);
  assert.equal(applicationCreateSchema.safeParse({ ...base, priority: "abc" }).success, false);

  const ok = applicationCreateSchema.safeParse({ ...base, priority: "2" });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.priority, 2);
});

test("applicationCreateSchema：所有报错都是中文，不泄露 zod 英文默认文案", () => {
  const cases: Array<[string, unknown]> = [
    ["缺公司名", { position: "后端", appliedDate: "2026-10-19" }],
    ["缺职位", { companyName: "某公司", appliedDate: "2026-10-19" }],
    ["缺投递日期", { companyName: "某公司", position: "后端" }],
    ["状态为空", { companyName: "某公司", position: "后端", appliedDate: "2026-10-19", status: "" }],
    ["优先级不是数字", { companyName: "某公司", position: "后端", appliedDate: "2026-10-19", priority: "abc" }],
  ];
  for (const [label, input] of cases) {
    const result = applicationCreateSchema.safeParse(input);
    assert.equal(result.success, false, `${label}：本该校验失败`);
    const msg = firstIssueMessage(result.error!);
    assert.ok(
      !/Invalid input|expected|received|Too small|Too big/.test(msg),
      `${label}：报错是 zod 英文默认文案「${msg}」`
    );
    assert.match(msg, /[一-龥]/, `${label}：报错不含中文 —— 「${msg}」`);
  }
});

test("firstIssueMessage：无 issue 时有兜底文案", () => {
  assert.equal(firstIssueMessage({ issues: [] } as unknown as z.ZodError), "请求参数不合法");
});
