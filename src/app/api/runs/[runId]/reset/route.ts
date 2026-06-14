import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { sendRunControlToConnector } from "@/lib/hermesConnector";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

type Params = { params: Promise<{ runId: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { runId } = await params;
  try {
    const existing = await prisma.run.findUnique({ where: { id: runId } });
    if (existing?.connectorRunId) {
      await sendRunControlToConnector(existing.connectorRunId, "reset");
    }

    const run = await prisma.run.update({
      where: { id: runId },
      data: { status: "queued", completedAt: null, error: null },
    });
    return NextResponse.json(serializeDates(run));
  } catch {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
}
