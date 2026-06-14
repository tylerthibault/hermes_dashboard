import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let seeded = false;
let seedPromise: Promise<void> | null = null;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function ensureSeedData() {
  if (seeded) {
    return;
  }

  if (seedPromise) {
    await seedPromise;
    return;
  }

  seedPromise = (async () => {
    const agentCount = await prisma.agent.count();
    if (agentCount > 0) {
      seeded = true;
      return;
    }

    const now = new Date();

    await prisma.agent.createMany({
      data: [
        {
          id: "hermes-core",
          name: "Hermes Core",
          role: "General command agent",
          status: "idle",
          mode: "chat",
          currentTask: "Standing by",
        },
        {
          id: "code-agent",
          name: "Code Agent",
          role: "Repository analysis and code planning",
          status: "online",
          mode: "suggest",
          currentTask: "Ready to inspect repositories",
          repo: "gracecitychurch.com",
          branch: "main",
          workingDirectory: "/srv/repos/gracecitychurch.com",
        },
        {
          id: "devops-agent",
          name: "DevOps Agent",
          role: "Homelab and infrastructure operations",
          status: "idle",
          mode: "suggest",
          currentTask: "Monitoring infrastructure context",
        },
        {
          id: "research-agent",
          name: "Research Agent",
          role: "Research, planning, and documentation",
          status: "idle",
          mode: "chat",
          currentTask: "Available for research tasks",
        },
      ],
    });

    const conversations = [
      { id: "conv-hermes-core-1", agentId: "hermes-core", title: "General Ops" },
      { id: "conv-code-agent-1", agentId: "code-agent", title: "Repo Inspection" },
      { id: "conv-devops-agent-1", agentId: "devops-agent", title: "Infrastructure Watch" },
      { id: "conv-research-agent-1", agentId: "research-agent", title: "Research Queue" },
    ];

    await prisma.conversation.createMany({ data: conversations });

    await prisma.message.createMany({
      data: [
        {
          id: "msg-hermes-core-1",
          conversationId: "conv-hermes-core-1",
          role: "assistant",
          content: "Hermes Core online. Ready for command routing.",
        },
        {
          id: "msg-code-agent-1",
          conversationId: "conv-code-agent-1",
          role: "assistant",
          content: "Code Agent ready. I can inspect repository context and propose refactors in Suggest mode.",
        },
        {
          id: "msg-devops-agent-1",
          conversationId: "conv-devops-agent-1",
          role: "assistant",
          content: "DevOps Agent active. Monitoring homelab status baselines.",
        },
        {
          id: "msg-research-agent-1",
          conversationId: "conv-research-agent-1",
          role: "assistant",
          content: "Research Agent standing by for planning and synthesis tasks.",
        },
      ],
    });

    await prisma.connectedAccount.createMany({
      data: [
        {
          id: "acct-github",
          provider: "github",
          accountName: "tyler-t",
          status: "connected",
          metadata: asJson({ repos: 21 }),
        },
        {
          id: "acct-codex",
          provider: "codex",
          accountName: "Hermes Runtime",
          status: "partial",
          metadata: asJson({ note: "Usage details unavailable" }),
        },
      ],
    });

    await prisma.usageLimit.createMany({
      data: [
        {
          id: "usage-github-rate",
          provider: "github",
          kind: "rate_limit",
          remaining: 4421,
          limit: 5000,
          unit: "requests",
          resetAt: new Date(Date.now() + 42 * 60 * 1000),
          status: "ok",
          checkedAt: now,
        },
        {
          id: "usage-codex-partial",
          provider: "codex",
          kind: "unknown",
          status: "unavailable",
          checkedAt: now,
          metadata: asJson({
            message:
              "Usage details are not available for this provider. Connection is active, but exact limits could not be retrieved.",
          }),
        },
      ],
    });

    seeded = true;
  })();

  try {
    await seedPromise;
  } catch (error) {
    seeded = false;
    throw error;
  } finally {
    seedPromise = null;
  }
}
