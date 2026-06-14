import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { conversationId } = await params;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages.map((message) => serializeDates(message)));
}
