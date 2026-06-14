import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

export async function GET() {
  await ensureSeedData();
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(agents.map((agent) => serializeDates(agent)));
}
