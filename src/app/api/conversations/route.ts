import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { makeId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  await ensureSeedData();
  const agentId = request.nextUrl.searchParams.get("agentId");
  const conversations = await prisma.conversation.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(conversations.map((conversation) => serializeDates(conversation)));
}

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json();

  if (typeof body.agentId !== "string" || body.agentId.length === 0) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      id: makeId("conv"),
      agentId: body.agentId,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Conversation",
    },
  });

  return NextResponse.json(serializeDates(conversation), { status: 201 });
}
