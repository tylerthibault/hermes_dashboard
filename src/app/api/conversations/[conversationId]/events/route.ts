import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeEvent } from "@/lib/serializers";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { conversationId } = await params;
  const events = await prisma.agentEvent.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(events.map((event) => serializeEvent(event)));
}
