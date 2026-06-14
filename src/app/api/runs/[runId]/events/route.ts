import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ensureSeedData } from "@/lib/bootstrap";
import { makeId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { toDbEventType } from "@/lib/eventTypes";
import { serializeEvent } from "@/lib/serializers";

type Params = { params: Promise<{ runId: string }> };

export const dynamic = "force-dynamic";

function sseFrame(data: unknown, event?: string) {
  const lines = [] as string[];
  if (event) {
    lines.push(`event: ${event}`);
  }
  lines.push(`data: ${JSON.stringify(data)}`);
  lines.push("\n");
  return lines.join("\n");
}

export async function GET(request: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { runId } = await params;

  const run = await prisma.run.findUnique({ where: { id: runId } });
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const sentEventIds = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        controller.close();
      };

      request.signal.addEventListener("abort", close);
      controller.enqueue(encoder.encode("retry: 1000\n\n"));

      const pushPendingEvents = async () => {
        const events = await prisma.agentEvent.findMany({
          where: { runId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });

        for (const event of events) {
          if (sentEventIds.has(event.id)) {
            continue;
          }
          sentEventIds.add(event.id);
          controller.enqueue(encoder.encode(sseFrame(serializeEvent(event), "run.event")));
        }
      };

      await pushPendingEvents();

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          await pushPendingEvents();

          const latestRun = await prisma.run.findUnique({ where: { id: runId } });
          if (!latestRun) {
            controller.enqueue(encoder.encode(sseFrame({ status: "not_found" }, "run.end")));
            clearInterval(interval);
            close();
            return;
          }

          if (["completed", "failed", "stopped"].includes(latestRun.status)) {
            controller.enqueue(
              encoder.encode(
                sseFrame({ status: latestRun.status, completedAt: latestRun.completedAt?.toISOString() }, "run.end"),
              ),
            );
            clearInterval(interval);
            close();
            return;
          }

          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(interval);
          controller.enqueue(encoder.encode(sseFrame({ error: "stream_failure" }, "run.error")));
          close();
        }
      }, 500);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { runId } = await params;
  const body = await request.json();

  if (
    typeof body.agentId !== "string" ||
    typeof body.conversationId !== "string" ||
    typeof body.type !== "string" ||
    typeof body.payload !== "object"
  ) {
    return NextResponse.json(
      { error: "agentId, conversationId, type, and payload are required" },
      { status: 400 },
    );
  }

  const event = await prisma.agentEvent.create({
    data: {
      id: makeId("evt"),
      runId,
      agentId: body.agentId,
      conversationId: body.conversationId,
      type: toDbEventType(body.type),
      payload: body.payload as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(serializeEvent(event), { status: 201 });
}
