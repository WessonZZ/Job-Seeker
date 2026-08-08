import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ industries });
  } catch {
    return NextResponse.json({ industries: [] });
  }
}
