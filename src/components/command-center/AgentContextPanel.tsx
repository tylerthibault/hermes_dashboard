import { Agent, AgentEvent, ConnectedAccount, UsageLimit } from "@/types/hermes";
import { AccountStatusCard } from "./AccountStatusCard";
import { NeuralLoadCard } from "./NeuralLoadCard";

type AgentContextPanelProps = {
  agent: Agent;
  pendingApprovals: AgentEvent[];
  recentToolEvents: AgentEvent[];
  accounts: ConnectedAccount[];
  usageLimits: UsageLimit[];
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onNewConversation: () => void;
};

function findAccount(provider: "github" | "openai" | "codex", accounts: ConnectedAccount[]) {
  return accounts.find((account) => account.provider === provider);
}

function findUsage(provider: "github" | "openai" | "codex", usageLimits: UsageLimit[]) {
  return usageLimits.find((usage) => usage.provider === provider);
}

export function AgentContextPanel({
  agent,
  pendingApprovals,
  recentToolEvents,
  accounts,
  usageLimits,
  onPause,
  onStop,
  onReset,
  onNewConversation,
}: AgentContextPanelProps) {
  return (
    <section className="hud-panel flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-graphite-900/65 p-3 backdrop-blur-xl">
      <header className="hud-panel rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="hud-title text-[11px] text-cyan-200">Agent Context</p>
        <h3 className="mt-1 text-base font-semibold text-ink-100">{agent.name}</h3>
        <p className="text-sm text-ink-400">{agent.role}</p>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-300">
          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">Status: {agent.status}</div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">Mode: {agent.mode}</div>
          <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
            Task: {agent.currentTask ?? "No active task"}
          </div>
          <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
            Repo: {agent.repo ?? "Not set"}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">Branch: {agent.branch ?? "-"}</div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">Workspace: {agent.workingDirectory ?? "-"}</div>
        </div>
      </header>

      <NeuralLoadCard coreA={45} coreB={30} reserve={25} />

      <div className="hud-panel rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="hud-title mb-2 text-[11px] text-cyan-200">Controls</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onPause} className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">
            Pause
          </button>
          <button onClick={onStop} className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-100">
            Stop
          </button>
          <button onClick={onReset} className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-ink-200">
            Reset
          </button>
          <button onClick={onNewConversation} className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-2 py-1.5 text-xs text-cyan-100">
            New Conversation
          </button>
        </div>
      </div>

      <div className="hud-panel rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="hud-title mb-2 text-[11px] text-cyan-200">Pending Approvals</p>
        {pendingApprovals.length > 0 ? (
          <ul className="space-y-1 text-xs text-amber-100">
            {pendingApprovals.map((approval) => (
              <li key={approval.id} className="rounded-md border border-amber-300/25 bg-amber-500/10 px-2 py-1">
                {String(approval.payload.action ?? "approval.required")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No pending approvals.</p>
        )}
      </div>

      <div className="hud-panel rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="hud-title mb-2 text-[11px] text-cyan-200">Recent Tool Calls</p>
        {recentToolEvents.length > 0 ? (
          <ul className="space-y-1 text-xs text-ink-300">
            {recentToolEvents.map((event) => (
              <li key={event.id} className="rounded-md border border-white/10 bg-black/20 px-2 py-1">
                {event.type} · {new Date(event.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No tool calls yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <AccountStatusCard
          title="GitHub API"
          account={findAccount("github", accounts)}
          usage={findUsage("github", usageLimits)}
        />
        <AccountStatusCard
          title="OpenAI/Codex Usage"
          account={findAccount("codex", accounts) ?? findAccount("openai", accounts)}
          usage={findUsage("codex", usageLimits) ?? findUsage("openai", usageLimits)}
        />
      </div>
    </section>
  );
}
