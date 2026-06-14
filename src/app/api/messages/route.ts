import { NextRequest, NextResponse } from "next/server";
import { AgentMode, MessageRole, Prisma } from "@prisma/client";
import { ensureSeedData } from "@/lib/bootstrap";
import { makeId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { toDbEventType } from "@/lib/eventTypes";
import { startRunOrchestration } from "@/lib/runOrchestrator";
import { serializeDates } from "@/lib/serializers";

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json();

  if (typeof body.agentId !== "string" || typeof body.conversationId !== "string" || typeof body.content !== "string") {
    return NextResponse.json({ error: "agentId, conversationId, and content are required" }, { status: 400 });
  }

  const role: MessageRole =
    typeof body.role === "string" && Object.values(MessageRole).includes(body.role) ? body.role : "user";

  const eventType =
    typeof body.eventType === "string"
      ? body.eventType
      : role === "user"
        ? "user.message"
        : role === "assistant"
          ? "agent.message.done"
          : undefined;

  const incomingRunId = typeof body.runId === "string" ? body.runId : undefined;
  const incomingMode: AgentMode =
    typeof body.mode === "string" && Object.values(AgentMode).includes(body.mode) ? body.mode : "chat";

  let result: { runId: string; message: Record<string, unknown> } | undefined;

  await prisma.$transaction(async (tx) => {
    const runId = incomingRunId ?? makeId("run");

    if (!incomingRunId) {
      await tx.run.create({
        data: {
          id: runId,
          agentId: body.agentId,
          conversationId: body.conversationId,
          status: role === "assistant" ? "running" : "queued",
          startedAt: new Date(),
        },
      });
    }

    const message = await tx.message.create({
      data: {
        id: makeId("msg"),
        conversationId: body.conversationId,
        runId,
        role,
        content: body.content,
        metadata:
          body.metadata && typeof body.metadata === "object"
            ? (body.metadata as Prisma.InputJsonValue)
            : undefined,
      },
    });

    await tx.conversation.update({
      where: { id: body.conversationId },
      data: { updatedAt: new Date() },
    });

    if (eventType) {
      await tx.agentEvent.create({
        data: {
          id: makeId("evt"),
          runId,
          agentId: body.agentId,
          conversationId: body.conversationId,
          type: toDbEventType(eventType),
          payload: {
            content: body.content,
          } as Prisma.InputJsonValue,
        },
      });
    }

    if (role === "assistant") {
      await tx.run.update({
        where: { id: runId },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });
    }

    result = {
      runId,
      message: serializeDates(message),
    };
  });

  if (role === "user") {
    startRunOrchestration({
      runId: result!.runId,
      agentId: body.agentId,
      conversationId: body.conversationId,
      content: body.content,
      mode: incomingMode,
      context: body.context && typeof body.context === "object" ? body.context : undefined,
    });
  }

  return NextResponse.json(result, { status: 201 });
}
