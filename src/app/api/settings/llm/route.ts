import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLLMStatus, testLLMConnection } from "@/lib/llm-config";

const KEYS = ["llm.baseUrl", "llm.apiKey", "llm.model", "llm.visual"] as const;

function maskKey(key: string | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// GET /api/settings/llm — 返回当前配置（key 打码）
export async function GET() {
  const status = await getLLMStatus();
  const settings = await prisma.setting.findMany({
    where: { key: { in: [...KEYS] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json({
    baseUrl: map["llm.baseUrl"] || status.baseUrl,
    apiKey: maskKey(map["llm.apiKey"]),
    hasKey: !!map["llm.apiKey"],
    model: map["llm.model"] || status.model,
    visual: map["llm.visual"] ? map["llm.visual"] === "true" : status.visual,
    configured: status.configured,
    source: status.source,
  });
}

// PUT /api/settings/llm — 保存配置；apiKey 为空则清除整套 LLM 配置
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, model, visual } = body ?? {};

    if (typeof apiKey === "string" && apiKey.trim() === "") {
      await prisma.setting.deleteMany({ where: { key: { in: [...KEYS] } } });
      return NextResponse.json({ ok: true, cleared: true });
    }

    const upsert = async (key: string, value: string) => {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    };

    if (typeof baseUrl === "string" && baseUrl.trim()) await upsert("llm.baseUrl", baseUrl.trim());
    if (typeof apiKey === "string" && apiKey.trim()) await upsert("llm.apiKey", apiKey.trim());
    if (typeof model === "string" && model.trim()) await upsert("llm.model", model.trim());
    if (typeof visual === "boolean") await upsert("llm.visual", String(visual));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
  }
}

// POST /api/settings/llm?action=test — 用传入配置测试连通性
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    if (action !== "test") {
      return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
    const body = await request.json();
    const result = await testLLMConnection({
      baseUrl: body?.baseUrl || "",
      apiKey: body?.apiKey || "",
      model: body?.model || "",
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, message: "测试失败" }, { status: 500 });
  }
}
