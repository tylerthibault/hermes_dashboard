import { Message } from "@/types/hermes";

type MessageBubbleProps = {
  message: Message;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system" || message.role === "tool";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`hud-panel max-w-[82%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-50"
            : isSystem
              ? "border-amber-300/25 bg-amber-500/10 font-mono text-amber-100"
              : "border-white/15 bg-white/5 text-ink-100"
        }`}
      >
        <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-ink-400">{message.role}</p>
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
      </article>
    </div>
  );
}
