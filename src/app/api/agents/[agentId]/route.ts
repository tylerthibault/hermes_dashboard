import { NextRequest, NextResponse } from "next/server";
import { AgentMode, AgentStatus } from "@prisma/client";
import { ensureSeedData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { serializeDates } from "@/lib/serializers";

type Params = { params: Promise<{ agentId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { agentId } = await params;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json(serializeDates(agent));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  await ensureSeedData();
  const { agentId } = await params;
  const body = await request.json();

  const updateData: {
    name?: string;
    role?: string;
    description?: string | null;
    status?: AgentStatus;
    mode?: AgentMode;
    currentTask?: string | null;
    repo?: string | null;
    branch?: string | null;
    workingDirectory?: string | null;
  } = {};

  if (typeof body.name === "string") updateData.name = body.name;
  if (typeof body.role === "string") updateData.role = body.role;
  if (typeof body.description === "string" || body.description === null) updateData.description = body.description;
  if (typeof body.currentTask === "string" || body.currentTask === null) updateData.currentTask = body.currentTask;
  if (typeof body.repo === "string" || body.repo === null) updateData.repo = body.repo;
  if (typeof body.branch === "string" || body.branch === null) updateData.branch = body.branch;
  if (typeof body.workingDirectory === "string" || body.workingDirectory === null) {
    updateData.workingDirectory = body.workingDirectory;
  }
  if (typeof body.status === "string" && Object.values(AgentStatus).includes(body.status)) {
    updateData.status = body.status;
  }
  if (typeof body.mode === "string" && Object.values(AgentMode).includes(body.mode)) {
    updateData.mode = body.mode;
  }

  try {
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
    });
    return NextResponse.json(serializeDates(updated));
  } catch {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
}
