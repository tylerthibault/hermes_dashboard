import { Agent, AgentEvent, Conversation, Message } from "@/types/hermes";
import { ApprovalCard } from "./ApprovalCard";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ToolEventCard } from "./ToolEventCard";

type ChatPanelProps = {
  agent: Agent;
  conversations: Conversation[];
  selectedConversationId: string;
  messages: Message[];
  events: AgentEvent[];
  approvalDecisions: Record<string, "approved" | "rejected">;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: (content: string) => void;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
};

type TimelineItem =
  | { kind: "message"; createdAt: string; message: Message }
  | { kind: "event"; createdAt: string; event: AgentEvent };

export function ChatPanel({
  agent,
  conversations,
  selectedConversationId,
  messages,
  events,
  approvalDecisions,
  onSelectConversation,
  onSendMessage,
  onApprove,
  onReject,
}: ChatPanelProps) {
  const timeline: TimelineItem[] = [
    ...messages.map((message) => ({ kind: "message" as const, createdAt: message.createdAt, message })),
    ...events.map((event) => ({ kind: "event" as const, createdAt: event.createdAt, event })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <section className="hud-panel flex h-full flex-col rounded-2xl border border-white/10 bg-graphite-900/65 p-3 backdrop-blur-xl">
      <header className="hud-panel shrink-0 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="hud-title text-[11px] text-cyan-200">Selected Agent</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink-100">{agent.name}</h2>
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-ink-300">
            {agent.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="text-sm text-ink-400">{agent.currentTask ?? "Standing by"}</p>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                conversation.id === selectedConversationId
                  ? "border-cyan-300/40 bg-cyan-500/10 text-cyan-100"
                  : "border-white/15 bg-black/25 text-ink-300 hover:border-white/30"
              }`}
            >
              {conversation.title}
            </button>
          ))}
        </div>
      </header>

      <div className="hud-panel mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
        {timeline.length > 0 ? (
          timeline.map((item) => {
            if (item.kind === "message") {
              return <MessageBubble key={item.message.id} message={item.message} />;
            }

            if (item.event.type === "approval.required") {
              return (
                <ApprovalCard
                  key={item.event.id}
                  event={item.event}
                  decision={approvalDecisions[item.event.id]}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              );
            }

            return <ToolEventCard key={item.event.id} event={item.event} />;
          })
        ) : (
          <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-center text-sm text-ink-400">
            Start a conversation with this agent.
          </div>
        )}
      </div>

      <MessageInput onSubmit={onSendMessage} disabled={agent.status === "offline"} />
    </section>
  );
}
