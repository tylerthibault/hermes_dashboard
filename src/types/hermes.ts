export type AgentStatus =
  | "online"
  | "idle"
  | "running"
  | "waiting_for_approval"
  | "paused"
  | "error"
  | "offline";

export type AgentMode = "chat" | "suggest" | "act";

export type Agent = {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: AgentStatus;
  mode: AgentMode;
  currentTask?: string;
  repo?: string;
  branch?: string;
  workingDirectory?: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type Message = {
  id: string;
  conversationId: string;
  runId?: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type RunStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "paused"
  | "stopped"
  | "completed"
  | "failed";

export type Run = {
  id: string;
  agentId: string;
  conversationId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
};

export type AgentEventType =
  | "user.message"
  | "agent.message.delta"
  | "agent.message.done"
  | "tool.started"
  | "tool.output"
  | "tool.error"
  | "file.read"
  | "file.changed"
  | "command.started"
  | "command.completed"
  | "approval.required"
  | "approval.approved"
  | "approval.rejected"
  | "run.paused"
  | "run.stopped"
  | "run.completed"
  | "run.failed";

export type AgentEvent = {
  id: string;
  runId: string;
  agentId: string;
  conversationId: string;
  type: AgentEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ConnectedProvider = "github" | "openai" | "codex";

export type ConnectedAccountStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "partial";

export type ConnectedAccount = {
  id: string;
  provider: ConnectedProvider;
  accountName?: string;
  status: ConnectedAccountStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UsageUnit =
  | "requests"
  | "points"
  | "tokens"
  | "credits"
  | "usd"
  | "messages"
  | "unknown";

export type UsageKind = "rate_limit" | "usage" | "credits" | "tokens" | "unknown";

export type UsageStatus = "ok" | "limited" | "exhausted" | "unknown" | "unavailable";

export type UsageLimit = {
  id: string;
  provider: ConnectedProvider;
  kind: UsageKind;
  remaining?: number;
  limit?: number;
  used?: number;
  unit?: UsageUnit;
  resetAt?: string;
  status: UsageStatus;
  checkedAt: string;
  metadata?: Record<string, unknown>;
};
