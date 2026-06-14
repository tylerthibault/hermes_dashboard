import { Agent, ConnectedAccount, UsageLimit } from "@/types/hermes";
import { AccountStatusCard } from "./AccountStatusCard";

type DashboardRightPanelProps = {
  agents: Agent[];
  accounts: ConnectedAccount[];
  usageLimits: UsageLimit[];
};

function findAccount(provider: "github" | "openai" | "codex", accounts: ConnectedAccount[]) {
  return accounts.find((account) => account.provider === provider);
}

function findUsage(provider: "github" | "openai" | "codex", usageLimits: UsageLimit[]) {
  return usageLimits.find((usage) => usage.provider === provider);
}

export function DashboardRightPanel({ agents, accounts, usageLimits }: DashboardRightPanelProps) {
  return (
    <section className="flex h-full flex-col gap-3">
      <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="hud-title text-[11px] text-cyan-200">Agent Roster</h4>
          <span className="text-xs text-ink-400">View all</span>
        </div>
        <div className="space-y-2">
          {agents.slice(0, 6).map((agent, index) => (
            <div key={agent.id} className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-xs">
              <div className="mb-1 flex items-center justify-between text-ink-200">
                <p>
                  {String(index + 1).padStart(2, "0")} · {agent.name}
                </p>
                <span className="text-cyan-200">{agent.status.replaceAll("_", " ")}</span>
              </div>
              <p className="text-ink-500">{agent.role}</p>
            </div>
          ))}
        </div>
      </article>

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
    </section>
  );
}
