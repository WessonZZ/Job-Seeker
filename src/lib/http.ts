/**
 * 带超时的 fetch。
 *
 * 爬虫 / 邮件同步 / LLM 调用之前都没有超时：上游卡住时请求会一直挂着，
 * 界面既不报错也不结束。这里统一给一个默认上限。
 */

export const DEFAULT_TIMEOUT_MS = 30_000;
/** LLM 生成较慢，给宽一点 */
export const LLM_TIMEOUT_MS = 60_000;

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  // 调用方已经自带 signal 时不覆盖
  if (init.signal) return fetch(input, init);
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
