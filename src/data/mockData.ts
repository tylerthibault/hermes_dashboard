import {
  Agent,
  AgentEvent,
  ConnectedAccount,
  Conversation,
  Message,
  UsageLimit,
} from "@/types/hermes";

const isoNow = () => new Date().toISOString();

export const mockAgents: Agent[] = [
  {
    id: "hermes-core",
    name: "Hermes Core",
    role: "General command agent",
    status: "idle",
    mode: "chat",
    currentTask: "Standing by",
    createdAt: isoNow(),
    updatedAt: isoNow(),
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
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "devops-agent",
    name: "DevOps Agent",
    role: "Homelab and infrastructure operations",
    status: "idle",
    mode: "suggest",
    currentTask: "Monitoring infrastructure context",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "research-agent",
    name: "Research Agent",
    role: "Research, planning, and documentation",
    status: "idle",
    mode: "chat",
    currentTask: "Available for research tasks",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-hermes-core-1",
    agentId: "hermes-core",
    title: "General Ops",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "conv-code-agent-1",
    agentId: "code-agent",
    title: "Repo Inspection",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "conv-devops-agent-1",
    agentId: "devops-agent",
    title: "Infrastructure Watch",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "conv-research-agent-1",
    agentId: "research-agent",
    title: "Research Queue",
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
];

export const mockMessagesByConversation: Record<string, Message[]> = {
  "conv-hermes-core-1": [
    {
      id: "msg-hermes-core-1",
      conversationId: "conv-hermes-core-1",
      role: "assistant",
      content: "Hermes Core online. Ready for command routing.",
      createdAt: isoNow(),
    },
  ],
  "conv-code-agent-1": [
    {
      id: "msg-code-agent-1",
      conversationId: "conv-code-agent-1",
      role: "assistant",
      content:
        "Code Agent ready. I can inspect repository context and propose refactors in Suggest mode.",
      createdAt: isoNow(),
    },
  ],
  "conv-devops-agent-1": [
    {
      id: "msg-devops-agent-1",
      conversationId: "conv-devops-agent-1",
      role: "assistant",
      content: "DevOps Agent active. Monitoring homelab status baselines.",
      createdAt: isoNow(),
    },
  ],
  "conv-research-agent-1": [
    {
      id: "msg-research-agent-1",
      conversationId: "conv-research-agent-1",
      role: "assistant",
      content: "Research Agent standing by for planning and synthesis tasks.",
      createdAt: isoNow(),
    },
  ],
};

export const mockEventsByConversation: Record<string, AgentEvent[]> = {
  "conv-hermes-core-1": [],
  "conv-code-agent-1": [
    {
      id: "evt-code-agent-1",
      runId: "run-seed-code-agent",
      agentId: "code-agent",
      conversationId: "conv-code-agent-1",
      type: "tool.output",
      payload: {
        tool: "repo.scan",
        label: "Indexed 182 files in gracecitychurch.com",
        details: "Completed baseline repository structure scan.",
      },
      createdAt: isoNow(),
    },
  ],
  "conv-devops-agent-1": [],
  "conv-research-agent-1": [],
};

export const mockAccounts: ConnectedAccount[] = [
  {
    id: "acct-github",
    provider: "github",
    accountName: "tyler-t",
    status: "connected",
    metadata: { repos: 21 },
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  {
    id: "acct-codex",
    provider: "codex",
    accountName: "Hermes Runtime",
    status: "partial",
    metadata: { note: "Usage details unavailable" },
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
];

export const mockUsageLimits: UsageLimit[] = [
  {
    id: "usage-github-rate",
    provider: "github",
    kind: "rate_limit",
    remaining: 4421,
    limit: 5000,
    unit: "requests",
    resetAt: new Date(Date.now() + 42 * 60 * 1000).toISOString(),
    status: "ok",
    checkedAt: isoNow(),
  },
  {
    id: "usage-codex-partial",
    provider: "codex",
    kind: "unknown",
    status: "unavailable",
    checkedAt: isoNow(),
    metadata: {
      message:
        "Usage details are not available for this provider. Connection is active, but exact limits could not be retrieved.",
    },
  },
];
