import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { conversationId } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(serializeDates(conversation));
}
