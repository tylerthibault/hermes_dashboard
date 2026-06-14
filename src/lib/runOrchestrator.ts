import { AgentMode, Prisma, RunStatus } from "@prisma/client";
import { dispatchRunToConnector, hermesConnectorConfigured } from "@/lib/hermesConnector";
import { makeId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { toDbEventType } from "@/lib/eventTypes";

type StartRunParams = {
  runId: string;
  agentId: string;
  conversationId: string;
  content: string;
  mode: AgentMode;
  context?: Record<string, unknown>;
};

const mockResponseByAgent: Record<string, string> = {
  "hermes-core":
    "Routing complete. I can coordinate a scoped action plan across your specialized agents while preserving approval gates.",
  "code-agent":
    "I am scanning repository structure and surfacing high-impact refactor opportunities. Next I will propose a patch plan before any file modifications.",
  "devops-agent":
    "I am checking homelab runtime health and service dependencies. I can draft a remediation sequence if connector latency increases.",
  "research-agent":
    "I have started collecting relevant implementation strategies and risks. I can produce a concise execution brief with tradeoffs.",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createEvent(
  runId: string,
  agentId: string,
  conversationId: string,
  type: Parameters<typeof toDbEventType>[0],
  payload: Record<string, unknown>,
) {
  return prisma.agentEvent.create({
    data: {
      id: makeId("evt"),
      runId,
      agentId,
      conversationId,
      type: toDbEventType(type),
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

async function updateRunAndAgent(
  runId: string,
  runStatus: RunStatus,
  agentId: string,
  agentStatus: "online" | "idle" | "running" | "waiting_for_approval" | "paused" | "error" | "offline",
  currentTask: string,
  extraRunData?: { completedAt?: Date; error?: string | null; connectorRunId?: string | null },
) {
  await prisma.run.update({
    where: { id: runId },
    data: {
      status: runStatus,
      completedAt: extraRunData?.completedAt,
      error: extraRunData?.error,
      connectorRunId: extraRunData?.connectorRunId,
    },
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: agentStatus,
      currentTask,
    },
  });
}

async function persistAssistantMessage(runId: string, conversationId: string, content: string) {
  return prisma.message.create({
    data: {
      id: makeId("msg"),
      runId,
      conversationId,
      role: "assistant",
      content,
    },
  });
}

async function simulateRun(params: StartRunParams) {
  const { runId, agentId, conversationId, content, mode } = params;

  await updateRunAndAgent(runId, "running", agentId, "running", "Processing operator request");

  await createEvent(runId, agentId, conversationId, "tool.started", {
    tool: "workspace.inspect",
    label: "Inspecting active workspace context",
  });

  await delay(280);

  const fullText = mockResponseByAgent[agentId] ?? "Acknowledged. I can continue once you provide the next command.";
  for (let cursor = 0; cursor < fullText.length; cursor += 8) {
    await createEvent(runId, agentId, conversationId, "agent.message.delta", {
      content: fullText.slice(cursor, Math.min(cursor + 8, fullText.length)),
    });
    await delay(60);
  }

  const savedMessage = await persistAssistantMessage(runId, conversationId, fullText);
  await createEvent(runId, agentId, conversationId, "agent.message.done", {
    messageId: savedMessage.id,
    content: fullText,
  });

  await createEvent(runId, agentId, conversationId, "tool.output", {
    tool: "workspace.inspect",
    details: `Context scan complete for prompt: ${content.slice(0, 120)}`,
  });

  if (mode === "suggest" || mode === "act") {
    await createEvent(runId, agentId, conversationId, "approval.required", {
      action: "modify_files",
      reason: "The agent wants to update 3 files based on the current analysis.",
      riskLevel: mode === "act" ? "high" : "medium",
      resources: ["src/components/Header.tsx", "src/components/Hero.tsx", "src/app/page.tsx"],
    });

    await updateRunAndAgent(runId, "waiting_for_approval", agentId, "waiting_for_approval", "Awaiting operator approval");
    return;
  }

  await createEvent(runId, agentId, conversationId, "run.completed", { status: "completed" });
  await updateRunAndAgent(runId, "completed", agentId, "idle", "Standing by", {
    completedAt: new Date(),
    error: null,
  });
}

async function runViaConnector(params: StartRunParams) {
  const { runId, agentId, conversationId, content, mode, context } = params;

  await updateRunAndAgent(runId, "running", agentId, "running", "Dispatching to Hermes connector");

  await createEvent(runId, agentId, conversationId, "tool.started", {
    tool: "hermes.connector.dispatch",
    label: "Dispatching run to Hermes VM connector",
  });

  const response = await dispatchRunToConnector({
    runId,
    agentId,
    conversationId,
    content,
    mode,
    context,
  });

  await prisma.run.update({
    where: { id: runId },
    data: {
      connectorRunId: response.connectorRunId ?? null,
      status: "running",
    },
  });

  await createEvent(runId, agentId, conversationId, "tool.output", {
    tool: "hermes.connector.dispatch",
    details: "Hermes connector accepted run.",
    connectorRunId: response.connectorRunId,
  });

  if (Array.isArray(response.events) && response.events.length > 0) {
    for (const event of response.events) {
      if (typeof event.type === "string" && event.payload && typeof event.payload === "object") {
        await createEvent(runId, agentId, conversationId, event.type as Parameters<typeof toDbEventType>[0], event.payload);
      }
    }
  }

  if (typeof response.assistantMessage === "string" && response.assistantMessage.length > 0) {
    for (let cursor = 0; cursor < response.assistantMessage.length; cursor += 10) {
      await createEvent(runId, agentId, conversationId, "agent.message.delta", {
        content: response.assistantMessage.slice(cursor, Math.min(cursor + 10, response.assistantMessage.length)),
      });
      await delay(40);
    }

    const saved = await persistAssistantMessage(runId, conversationId, response.assistantMessage);
    await createEvent(runId, agentId, conversationId, "agent.message.done", {
      messageId: saved.id,
      content: response.assistantMessage,
    });

    await createEvent(runId, agentId, conversationId, "run.completed", { status: "completed" });
    await updateRunAndAgent(runId, "completed", agentId, "idle", "Standing by", {
      completedAt: new Date(),
      error: null,
      connectorRunId: response.connectorRunId ?? null,
    });
    return;
  }

  await createEvent(runId, agentId, conversationId, "run.completed", { status: "completed" });
  await updateRunAndAgent(runId, "completed", agentId, "idle", "Standing by", {
    completedAt: new Date(),
    error: null,
    connectorRunId: response.connectorRunId ?? null,
  });
}

async function markFailed(runId: string, agentId: string, conversationId: string, errorMessage: string) {
  await createEvent(runId, agentId, conversationId, "tool.error", {
    tool: "hermes.connector.dispatch",
    error: errorMessage,
  });
  await createEvent(runId, agentId, conversationId, "run.failed", { error: errorMessage });
  await updateRunAndAgent(runId, "failed", agentId, "error", "Connector dispatch failed", {
    completedAt: new Date(),
    error: errorMessage,
  });
}

export function startRunOrchestration(params: StartRunParams) {
  void (async () => {
    try {
      if (await hermesConnectorConfigured()) {
        await runViaConnector(params);
      } else {
        await simulateRun(params);
      }
    } catch (error) {
      await markFailed(
        params.runId,
        params.agentId,
        params.conversationId,
        error instanceof Error ? error.message : "Unknown orchestration error",
      );
    }
  })();
}
