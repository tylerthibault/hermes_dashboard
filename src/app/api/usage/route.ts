import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

export async function GET() {
  await ensureSeedData();
  const usage = await prisma.usageLimit.findMany({ orderBy: { checkedAt: "desc" } });
  return NextResponse.json(usage.map((entry) => serializeDates(entry)));
}
