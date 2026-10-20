/**
 * 从 LLM 输出里抠出 JSON 对象。
 *
 * 之前两个模块各用一个正则：llm-extractor 是贪婪的 /\{[\s\S]*"jobs"[\s\S]*\}/，
 * 会从第一个 { 一路吃到最后一个 }；email-processor 是 /\{[^{}]*"isJobRelated"[^{}]*\}/，
 * 一遇到嵌套花括号就废。模型只要在 JSON 前后多说一句带花括号的话，解析就静默失败、
 * 回退到关键词提取。
 *
 * 这里改成按括号配平扫描（同时跳过字符串字面量里的括号和转义），
 * 逐个尝试解析，返回第一个满足条件的对象。
 */

/** 从文本中依次提取出所有配平的顶层 JSON 对象字面量 */
export function extractJsonObjects(text: string): string[] {
  const found: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf("{", cursor);
    if (start === -1) break;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end === -1) break; // 花括号没配平，剩下的都不用看了
    found.push(text.slice(start, end + 1));
    cursor = end + 1;
  }

  return found;
}

/** 剥掉 ```json ... ``` 围栏（模型经常不听"不要代码块"） */
export function stripCodeFence(text: string): string {
  const fence = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : text.trim();
}

/**
 * 解析 LLM 输出，返回第一个通过 `isValid` 校验的对象。
 * 全部失败时返回 null。
 */
export function parseLlmJson<T>(
  text: string,
  isValid: (value: unknown) => boolean
): T | null {
  const candidates = extractJsonObjects(stripCodeFence(text));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isValid(parsed)) return parsed as T;
    } catch {
      // 这个片段不是合法 JSON，试下一个
    }
  }
  return null;
}
