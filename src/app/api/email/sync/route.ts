import { NextResponse } from "next/server";
import { syncEmails } from "@/lib/email-importer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, customHost } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "请输入邮箱地址和密码" },
        { status: 400 }
      );
    }

    console.log(`[Email] 开始同步: ${email}`);

    const result = await syncEmails(email, password, customHost);

    console.log(
      `[Email] 完成: ${result.totalEmails} 封邮件, ` +
      `${result.jobRelated} 封求职相关, ` +
      `${result.matched} 条匹配, ${result.created} 个事件创建`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Email] 同步失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "同步失败",
      },
      { status: 500 }
    );
  }
}
