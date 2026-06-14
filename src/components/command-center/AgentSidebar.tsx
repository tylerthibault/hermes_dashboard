import { Agent } from "@/types/hermes";
import { AgentCard } from "./AgentCard";

type AgentSidebarProps = {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
};

export function AgentSidebar({ agents, selectedAgentId, onSelectAgent }: AgentSidebarProps) {
  return (
    <section className="hud-panel flex h-full flex-col rounded-2xl border border-white/10 bg-graphite-900/65 p-3 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="hud-title text-xs text-cyan-200">Agents</h2>
        <button className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-ink-300 hover:border-cyan-300/35 hover:text-cyan-200">
          Create Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/25 p-4 text-sm text-ink-400">
          No Hermes agents are configured yet.
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={agent.id === selectedAgentId}
              onSelect={onSelectAgent}
            />
          ))}
        </div>
      )}
    </section>
  );
}
