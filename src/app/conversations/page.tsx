"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentContextPanel } from "@/components/command-center/AgentContextPanel";
import { AgentSidebar } from "@/components/command-center/AgentSidebar";
import { AppShell } from "@/components/command-center/AppShell";
import { ChatPanel } from "@/components/command-center/ChatPanel";
import { ConnectorSettingsModal } from "@/components/command-center/ConnectorSettingsModal";
import { TopBar } from "@/components/command-center/TopBar";
import { MainNavSidebar } from "@/components/navigation/MainNavSidebar";
import { Agent, AgentEvent, ConnectedAccount, Conversation, Message, UsageLimit } from "@/types/hermes";

type CreateMessageResponse = {
  runId: string;
  message: Message;
};

type TelemetryResponse = {
  checkedAt: string;
  systemStatus: "online" | "degraded" | "offline";
  connector: {
    status: "online" | "degraded" | "offline";
    latencyMs: number | null;
    message: string;
    source: "db" | "env" | "none";
  };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${url}`);
  }

  return (await response.json()) as T;
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedConversationByAgent, setSelectedConversationByAgent] = useState<Record<string, string>>({});
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [eventsByConversation, setEventsByConversation] = useState<Record<string, AgentEvent[]>>({});
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [usageLimits, setUsageLimits] = useState<UsageLimit[]>([]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, "approved" | "rejected">>({});
  const [activeRunByConversation, setActiveRunByConversation] = useState<Record<string, string | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [uiError, setUiError] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);

  const eventSourceByRunRef = useRef<Record<string, EventSource>>({});
  const streamedMessageIdByRunRef = useRef<Record<string, string>>({});

  const closeRunStream = (runId: string) => {
    const source = eventSourceByRunRef.current[runId];
    if (source) {
      source.close();
      delete eventSourceByRunRef.current[runId];
    }
    delete streamedMessageIdByRunRef.current[runId];
  };

  useEffect(() => {
    return () => {
      Object.values(eventSourceByRunRef.current).forEach((source) => source.close());
      eventSourceByRunRef.current = {};
      streamedMessageIdByRunRef.current = {};
    };
  }, []);

  const appendMessage = (conversationId: string, message: Message) => {
    setMessagesByConversation((current) => {
      const existing = current[conversationId] ?? [];
      if (existing.some((entry) => entry.id === message.id)) {
        return {
          ...current,
          [conversationId]: existing.map((entry) => (entry.id === message.id ? message : entry)),
        };
      }

      return {
        ...current,
        [conversationId]: [...existing, message],
      };
    });
  };

  const appendEvent = (conversationId: string, event: AgentEvent) => {
    setEventsByConversation((current) => {
      const existing = current[conversationId] ?? [];
      if (existing.some((entry) => entry.id === event.id)) {
        return current;
      }
      return {
        ...current,
        [conversationId]: [...existing, event],
      };
    });
  };

  const patchAgentLocal = (agentId: string, partial: Partial<Agent>) => {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId ? { ...agent, ...partial, updatedAt: new Date().toISOString() } : agent,
      ),
    );
  };

  const patchAgentRemote = async (agentId: string, partial: Partial<Agent>) => {
    try {
      await fetchJson(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(partial),
      });
    } catch {
      setUiError("Could not sync agent state to backend.");
    }
  };

  const openRunStream = (runId: string, conversationId: string, agentId: string) => {
    closeRunStream(runId);

    const streamMessageId = `stream-${runId}`;
    streamedMessageIdByRunRef.current[runId] = streamMessageId;

    appendMessage(conversationId, {
      id: streamMessageId,
      conversationId,
      runId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });

    const source = new EventSource(`/api/runs/${runId}/events`);
    eventSourceByRunRef.current[runId] = source;

    source.addEventListener("run.event", (rawEvent) => {
      try {
        const parsed = JSON.parse((rawEvent as MessageEvent).data) as AgentEvent;

        // Handle streaming deltas and final assistant message in-place and
        // avoid adding them to the visible events timeline so the UI doesn't
        // expose internal streaming chunks.
        if (parsed.type === "agent.message.delta") {
          const chunk = typeof parsed.payload.content === "string" ? parsed.payload.content : "";
          const currentStreamMessageId = streamedMessageIdByRunRef.current[runId] ?? streamMessageId;
          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: (current[conversationId] ?? []).map((message) =>
              message.id === currentStreamMessageId
                ? { ...message, content: `${message.content}${chunk}` }
                : message,
            ),
          }));

          // Do not append the delta event to events timeline
          return;
        }

        if (parsed.type === "agent.message.done") {
          const content = typeof parsed.payload.content === "string" ? parsed.payload.content : "";
          const messageId = typeof parsed.payload.messageId === "string" ? parsed.payload.messageId : streamMessageId;
          const currentStreamMessageId = streamedMessageIdByRunRef.current[runId] ?? streamMessageId;

          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: (current[conversationId] ?? []).map((message) =>
              message.id === currentStreamMessageId
                ? {
                    ...message,
                    id: messageId,
                    content,
                  }
                : message,
            ),
          }));
          streamedMessageIdByRunRef.current[runId] = messageId;

          // Do not append the done event to events timeline
          return;
        }

        // For all other event types, append to the events timeline so they are visible
        appendEvent(conversationId, parsed);

        if (parsed.type === "approval.required") {
          patchAgentLocal(agentId, {
            status: "waiting_for_approval",
            currentTask: "Awaiting operator approval",
          });
        }

        if (parsed.type === "run.completed") {
          patchAgentLocal(agentId, {
            status: "idle",
            currentTask: "Standing by",
          });
          setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
        }

        if (parsed.type === "run.failed") {
          patchAgentLocal(agentId, {
            status: "error",
            currentTask: "Run failed",
          });
          setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
        }

        if (parsed.type === "run.stopped") {
          patchAgentLocal(agentId, {
            status: "idle",
            currentTask: "Run stopped by operator",
          });
          setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
        }
      } catch {
        setUiError("Could not parse streamed run event.");
      }
    });

    source.addEventListener("run.end", () => {
      closeRunStream(runId);
      setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
    });

    source.addEventListener("run.error", () => {
      setUiError("Run stream disconnected unexpectedly.");
      closeRunStream(runId);
      setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
    });

    source.onerror = () => {
      setUiError("Streaming disconnected. Confirm Hermes connector is reachable.");
      closeRunStream(runId);
      setActiveRunByConversation((current) => ({ ...current, [conversationId]: undefined }));
    };
  };

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      setUiError("");
      try {
        const [loadedAgents, loadedAccounts, loadedUsage] = await Promise.all([
          fetchJson<Agent[]>("/api/agents"),
          fetchJson<ConnectedAccount[]>("/api/accounts"),
          fetchJson<UsageLimit[]>("/api/usage"),
        ]);

        setAgents(loadedAgents);
        setAccounts(loadedAccounts);
        setUsageLimits(loadedUsage);

        if (loadedAgents.length > 0) {
          setSelectedAgentId((current) => current || loadedAgents[0].id);
        }
      } catch (error) {
        setUiError(error instanceof Error ? error.message : "Failed to load command center data.");
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    let mounted = true;

    const pollTelemetry = async () => {
      try {
        const snapshot = await fetchJson<TelemetryResponse>("/api/telemetry");
        if (mounted) {
          setTelemetry(snapshot);
        }
      } catch {
        if (mounted) {
          setTelemetry((current) =>
            current ?? {
              checkedAt: new Date().toISOString(),
              systemStatus: "offline",
              connector: {
                status: "offline",
                latencyMs: null,
                source: "none",
                message: "Telemetry unavailable",
              },
            },
          );
        }
      }
    };

    void pollTelemetry();
    const interval = window.setInterval(() => {
      void pollTelemetry();
    }, 12000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    const loadConversations = async () => {
      try {
        const loaded = await fetchJson<Conversation[]>(`/api/conversations?agentId=${selectedAgent.id}`);

        setConversations((current) => {
          const others = current.filter((conversation) => conversation.agentId !== selectedAgent.id);
          return [...others, ...loaded];
        });

        setSelectedConversationByAgent((current) => {
          if (current[selectedAgent.id]) {
            return current;
          }
          const fallback = loaded[0]?.id;
          return fallback ? { ...current, [selectedAgent.id]: fallback } : current;
        });
      } catch {
        setUiError("Could not load conversations for selected agent.");
      }
    };

    void loadConversations();
  }, [selectedAgent]);

  const conversationsForAgent = useMemo(
    () => conversations.filter((conversation) => conversation.agentId === selectedAgent?.id),
    [conversations, selectedAgent?.id],
  );

  const selectedConversationId = selectedAgent
    ? selectedConversationByAgent[selectedAgent.id] ?? conversationsForAgent[0]?.id ?? ""
    : "";

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const loadTimeline = async () => {
      try {
        const [messages, events] = await Promise.all([
          fetchJson<Message[]>(`/api/conversations/${selectedConversationId}/messages`),
          fetchJson<AgentEvent[]>(`/api/conversations/${selectedConversationId}/events`),
        ]);

        setMessagesByConversation((current) => ({ ...current, [selectedConversationId]: messages }));
        setEventsByConversation((current) => ({ ...current, [selectedConversationId]: events }));
      } catch {
        setUiError("Could not load conversation timeline.");
      }
    };

    void loadTimeline();
  }, [selectedConversationId]);

  const selectedMessages = useMemo(
    () => messagesByConversation[selectedConversationId] ?? [],
    [messagesByConversation, selectedConversationId],
  );
  const selectedEvents = useMemo(
    () => eventsByConversation[selectedConversationId] ?? [],
    [eventsByConversation, selectedConversationId],
  );

  const pendingApprovals = useMemo(
    () =>
      selectedEvents.filter(
        (event) => event.type === "approval.required" && approvalDecisions[event.id] === undefined,
      ),
    [approvalDecisions, selectedEvents],
  );

  const recentToolEvents = useMemo(
    () =>
      selectedEvents
        .filter((event) => event.type.startsWith("tool.") || event.type.startsWith("command."))
        .slice(-5)
        .reverse(),
    [selectedEvents],
  );

  const githubAccount = accounts.find((account) => account.provider === "github");
  const codexAccount = accounts.find((account) => account.provider === "codex");
  const activeAgents = agents.filter((agent) => agent.status !== "offline").length;

  const persistEvent = async (
    runId: string,
    conversationId: string,
    type: AgentEvent["type"],
    payload: Record<string, unknown>,
  ) => {
    if (!selectedAgent) {
      return;
    }

    try {
      const event = await fetchJson<AgentEvent>(`/api/runs/${runId}/events`, {
        method: "POST",
        body: JSON.stringify({
          agentId: selectedAgent.id,
          conversationId,
          type,
          payload,
        }),
      });
      appendEvent(conversationId, event);
    } catch {
      setUiError("Could not persist run event.");
    }
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const ensureConversationForSelectedAgent = async () => {
    if (!selectedAgent) {
      throw new Error("No agent selected");
    }

    const existingConversationId = selectedConversationByAgent[selectedAgent.id] ?? conversationsForAgent[0]?.id;
    if (existingConversationId) {
      return existingConversationId;
    }

    const created = await fetchJson<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({
        agentId: selectedAgent.id,
        title: "New Conversation",
      }),
    });

    setConversations((current) => [...current, created]);
    setSelectedConversationByAgent((current) => ({ ...current, [selectedAgent.id]: created.id }));
    setMessagesByConversation((current) => ({ ...current, [created.id]: [] }));
    setEventsByConversation((current) => ({ ...current, [created.id]: [] }));

    return created.id;
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedAgent) {
      return;
    }

    setUiError("");

    try {
      const conversationId = await ensureConversationForSelectedAgent();

      const created = await fetchJson<CreateMessageResponse>("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          agentId: selectedAgent.id,
          conversationId,
          content,
          role: "user",
          mode: selectedAgent.mode,
          context: {
            repo: selectedAgent.repo,
            branch: selectedAgent.branch,
            workingDirectory: selectedAgent.workingDirectory,
            mode: selectedAgent.mode,
          },
        }),
      });

      appendMessage(conversationId, created.message);
      setActiveRunByConversation((current) => ({ ...current, [conversationId]: created.runId }));

      patchAgentLocal(selectedAgent.id, {
        status: "running",
        currentTask: "Dispatching to Hermes runtime",
      });
      void patchAgentRemote(selectedAgent.id, {
        status: "running",
        currentTask: "Dispatching to Hermes runtime",
      });

      openRunStream(created.runId, conversationId, selectedAgent.id);
    } catch {
      setUiError("Could not send message.");
    }
  };

  const handleApprovalDecision = async (eventId: string, decision: "approved" | "rejected") => {
    if (!selectedAgent || !selectedConversationId) {
      return;
    }

    const runId = activeRunByConversation[selectedConversationId];
    if (!runId) {
      return;
    }

    setApprovalDecisions((current) => ({ ...current, [eventId]: decision }));

    await persistEvent(
      runId,
      selectedConversationId,
      decision === "approved" ? "approval.approved" : "approval.rejected",
      { approvalId: eventId },
    );

    if (decision === "approved") {
      await persistEvent(runId, selectedConversationId, "run.completed", { status: "completed" });
      patchAgentLocal(selectedAgent.id, {
        status: "idle",
        currentTask: "Approval granted. Standing by.",
      });
      void patchAgentRemote(selectedAgent.id, {
        status: "idle",
        currentTask: "Approval granted. Standing by.",
      });
    } else {
      await persistEvent(runId, selectedConversationId, "run.stopped", { status: "stopped" });
      await fetchJson(`/api/runs/${runId}/stop`, { method: "POST" });
      patchAgentLocal(selectedAgent.id, {
        status: "idle",
        currentTask: "Approval rejected.",
      });
      void patchAgentRemote(selectedAgent.id, {
        status: "idle",
        currentTask: "Approval rejected.",
      });
    }

    closeRunStream(runId);
    setActiveRunByConversation((current) => ({ ...current, [selectedConversationId]: undefined }));
  };

  const handlePauseRun = async () => {
    if (!selectedAgent || !selectedConversationId) {
      return;
    }
    const runId = activeRunByConversation[selectedConversationId];
    if (!runId) {
      return;
    }

    await fetchJson(`/api/runs/${runId}/pause`, { method: "POST" });
    await persistEvent(runId, selectedConversationId, "run.paused", { status: "paused" });

    patchAgentLocal(selectedAgent.id, {
      status: "paused",
      currentTask: "Run paused by operator",
    });
    void patchAgentRemote(selectedAgent.id, {
      status: "paused",
      currentTask: "Run paused by operator",
    });
  };

  const handleStopRun = async () => {
    if (!selectedAgent || !selectedConversationId) {
      return;
    }
    const runId = activeRunByConversation[selectedConversationId];
    if (!runId) {
      return;
    }

    await fetchJson(`/api/runs/${runId}/stop`, { method: "POST" });
    await persistEvent(runId, selectedConversationId, "run.stopped", { status: "stopped" });

    patchAgentLocal(selectedAgent.id, {
      status: "idle",
      currentTask: "Run stopped by operator",
    });
    void patchAgentRemote(selectedAgent.id, {
      status: "idle",
      currentTask: "Run stopped by operator",
    });

    closeRunStream(runId);
    setActiveRunByConversation((current) => ({ ...current, [selectedConversationId]: undefined }));
  };

  const handleResetRun = async () => {
    if (!selectedAgent || !selectedConversationId) {
      return;
    }
    const runId = activeRunByConversation[selectedConversationId];
    if (!runId) {
      return;
    }

    await fetchJson(`/api/runs/${runId}/reset`, { method: "POST" });

    patchAgentLocal(selectedAgent.id, {
      status: "idle",
      currentTask: "Run state reset",
    });
    void patchAgentRemote(selectedAgent.id, {
      status: "idle",
      currentTask: "Run state reset",
    });

    closeRunStream(runId);
    setActiveRunByConversation((current) => ({ ...current, [selectedConversationId]: undefined }));
  };

  const handleNewConversation = async () => {
    if (!selectedAgent) {
      return;
    }

    const created = await fetchJson<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({
        agentId: selectedAgent.id,
        title: `Conversation ${conversationsForAgent.length + 1}`,
      }),
    });

    setConversations((current) => [...current, created]);
    setSelectedConversationByAgent((current) => ({ ...current, [selectedAgent.id]: created.id }));
    setMessagesByConversation((current) => ({ ...current, [created.id]: [] }));
    setEventsByConversation((current) => ({ ...current, [created.id]: [] }));
  };

  if (isLoading || !selectedAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-ink-300">
        Loading Hermes Agent Command Center...
      </div>
    );
  }

  return (
    <>
      <AppShell
      topBar={
        <TopBar
          githubAccount={githubAccount}
          codexAccount={codexAccount}
          systemStatus={telemetry?.systemStatus ?? "offline"}
          activeAgents={activeAgents}
          onOpenSettings={() => setSettingsOpen(true)}
          connectorTelemetry={{
            status: telemetry?.connector.status ?? "offline",
            latencyMs: telemetry?.connector.latencyMs ?? null,
            checkedAt: telemetry?.checkedAt,
          }}
        />
      }
      leftSidebar={
        <MainNavSidebar />
      }
      centerPanel={
        <div className="grid h-full gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="hidden xl:block">
            <AgentSidebar
              agents={agents}
              selectedAgentId={selectedAgent.id}
              onSelectAgent={handleSelectAgent}
            />
          </div>

          <div className="flex h-full flex-col gap-2">
            <div className="xl:hidden">
              <AgentSidebar
                agents={agents}
                selectedAgentId={selectedAgent.id}
                onSelectAgent={handleSelectAgent}
              />
            </div>

            {uiError ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {uiError}
              </div>
            ) : null}
            <ChatPanel
              agent={selectedAgent}
              conversations={conversationsForAgent}
              selectedConversationId={selectedConversationId}
              messages={selectedMessages}
              events={selectedEvents}
              approvalDecisions={approvalDecisions}
              onSelectConversation={(conversationId) =>
                setSelectedConversationByAgent((current) => ({
                  ...current,
                  [selectedAgent.id]: conversationId,
                }))
              }
              onSendMessage={(content) => {
                void handleSendMessage(content);
              }}
              onApprove={(eventId) => {
                void handleApprovalDecision(eventId, "approved");
              }}
              onReject={(eventId) => {
                void handleApprovalDecision(eventId, "rejected");
              }}
            />
          </div>
        </div>
      }
      rightSidebar={
        <AgentContextPanel
          agent={selectedAgent}
          pendingApprovals={pendingApprovals}
          recentToolEvents={recentToolEvents}
          accounts={accounts}
          usageLimits={usageLimits}
          onPause={() => {
            void handlePauseRun();
          }}
          onStop={() => {
            void handleStopRun();
          }}
          onReset={() => {
            void handleResetRun();
          }}
          onNewConversation={() => {
            void handleNewConversation();
          }}
        />
      }
      />
      <ConnectorSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
