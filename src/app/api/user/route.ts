import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    let user = await prisma.user.findFirst();

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: body,
      });
    } else {
      user = await prisma.user.create({ data: body });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "更新用户信息失败" },
      { status: 500 }
    );
  }
}
