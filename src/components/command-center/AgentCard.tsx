import { Agent } from "@/types/hermes";

type AgentCardProps = {
  agent: Agent;
  selected: boolean;
  onSelect: (agentId: string) => void;
};

const statusColor: Record<Agent["status"], string> = {
  online: "bg-emerald-400",
  idle: "bg-sky-400",
  running: "bg-cyan-300",
  waiting_for_approval: "bg-amber-300",
  paused: "bg-yellow-300",
  error: "bg-rose-400",
  offline: "bg-zinc-500",
};

const modeTone: Record<Agent["mode"], string> = {
  chat: "text-sky-200 border-sky-300/30 bg-sky-500/10",
  suggest: "text-amber-200 border-amber-300/30 bg-amber-500/10",
  act: "text-emerald-200 border-emerald-300/30 bg-emerald-500/10",
};

export function AgentCard({ agent, selected, onSelect }: AgentCardProps) {
  return (
    <button
      onClick={() => onSelect(agent.id)}
      className={`hud-panel w-full rounded-2xl border px-3 py-3 text-left transition ${
        selected
          ? "border-cyan-300/45 bg-cyan-500/10 shadow-[0_0_22px_rgba(41,192,255,0.18)]"
          : "border-white/10 bg-black/30 hover:border-cyan-200/30"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-100">{agent.name}</p>
          <p className="truncate text-xs text-ink-400">{agent.role}</p>
        </div>
        <span className={`status-pulse h-2.5 w-2.5 shrink-0 rounded-full ${statusColor[agent.status]}`} />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-wider ${modeTone[agent.mode]}`}>
          {agent.mode}
        </span>
        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[11px] text-ink-300">
          {agent.status.replaceAll("_", " ")}
        </span>
      </div>

      <p className="line-clamp-2 text-xs text-ink-300">{agent.currentTask ?? "No active task."}</p>
      <p className="mt-2 truncate font-mono text-[11px] text-ink-500">{agent.repo ?? "No workspace linked"}</p>
    </button>
  );
}
