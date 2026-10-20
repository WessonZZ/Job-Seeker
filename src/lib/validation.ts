/**
 * API 请求体校验与日期解析。
 *
 * 以前各路由直接 `new Date(body.appliedDate)`，遇到非法值会拼出 Invalid Date，
 * Prisma 抛错后被 catch 成 500「创建失败」，看不出是格式问题。
 * 这里统一成：解析失败 → 400 + 明确的字段提示。
 */

import { z } from "zod";
import { STATUS_CONFIG } from "@/lib/utils";

/** "YYYY-MM-DD" 纯日期串（本地午夜，避免 UTC 偏移把日期挪一天） */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 把请求体里的日期值解析成 Date。
 * 同时接受纯日期串和完整 ISO 串（GET 返回的是 ISO，回传时不该炸）。
 * 无法解析时返回 null。
 */
export function parseDateInput(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const local = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(local.getTime()) ? null : local;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 取 zod 校验结果里的第一条错误文案 */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "请求参数不合法";
}

/**
 * 状态值必须是 UI 认识的那几个（STATUS_CONFIG 的键）。
 * 写进别的值会让该投递的状态徽章整个消失 —— A1 就是这么来的。
 * 放在这里是为了让 POST 和 PATCH 共用同一份判断，避免两边规则漂移。
 */
export function isKnownStatus(status: string): boolean {
  return Object.prototype.hasOwnProperty.call(STATUS_CONFIG, status);
}

/**
 * 必填字符串。注意 zod 4 里 `.min(1, "msg")` 的自定义文案**只覆盖长度校验**，
 * 字段缺失时报的是 invalid_type，文案会退回英文默认值 ——
 * 所以 `{ error }` 和 `.min()` 的文案都要给。
 */
const requiredText = (msg: string) => z.string({ error: msg }).trim().min(1, msg);

const statusField = z.string({ error: "状态格式不正确" }).trim().min(1, "状态不能为空");
const priorityField = z.coerce
  .number({ error: "优先级必须是 0-2 的数字" })
  .int("优先级必须是整数")
  .min(0, "优先级范围 0-2")
  .max(2, "优先级范围 0-2");
const optionalText = z.string();

/** POST /api/applications */
export const applicationCreateSchema = z.object({
  companyName: requiredText("公司名称为必填项"),
  position: requiredText("职位为必填项"),
  appliedDate: requiredText("投递日期为必填项"),
  status: statusField.optional(),
  jd: optionalText.optional(),
  url: optionalText.optional(),
  notes: optionalText.optional(),
  priority: priorityField.optional(),
  jobPostingId: z.string().trim().min(1).optional(),
});

/**
 * PATCH /api/applications —— 显式白名单。
 *
 * 之前是 `const { id, ...fields } = body`，请求体里任何字段都会写库，
 * 包括 userId（可以把记录转给别的用户）和 createdAt。
 * 白名单外的字段一律忽略。
 */
export const applicationPatchSchema = z.object({
  id: requiredText("缺少 ID"),
  companyName: z.string({ error: "公司名称不能为空" }).trim().min(1, "公司名称不能为空").optional(),
  position: z.string({ error: "职位不能为空" }).trim().min(1, "职位不能为空").optional(),
  appliedDate: z.string({ error: "投递日期格式不正确" }).trim().min(1).optional(),
  status: statusField.optional(),
  jd: optionalText.optional(),
  url: optionalText.optional(),
  notes: optionalText.optional(),
  priority: priorityField.optional(),
});

/** POST / PUT /api/timeline */
export const timelineWriteSchema = z.object({
  id: z.string({ error: "缺少事件 ID" }).trim().min(1, "缺少事件 ID").optional(),
  applicationId: z.string({ error: "缺少 applicationId" }).trim().min(1, "缺少 applicationId").optional(),
  eventType: z.string({ error: "缺少事件类型" }).trim().min(1, "缺少事件类型").optional(),
  title: optionalText.optional(),
  description: optionalText.optional(),
  date: z.string({ error: "缺少日期" }).trim().min(1, "缺少日期").optional(),
  isKey: z.boolean().optional(),
});
