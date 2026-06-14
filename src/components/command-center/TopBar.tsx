import { ConnectedAccount } from "@/types/hermes";

type TopBarProps = {
  githubAccount?: ConnectedAccount;
  codexAccount?: ConnectedAccount;
  systemStatus: "online" | "degraded" | "offline";
  activeAgents: number;
  onOpenSettings: () => void;
  connectorTelemetry?: {
    status: "online" | "degraded" | "offline";
    latencyMs: number | null;
    checkedAt?: string;
  };
};

const statusTone: Record<TopBarProps["systemStatus"], string> = {
  online: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  degraded: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  offline: "text-rose-300 border-rose-400/30 bg-rose-500/10",
};

function providerLabel(account: ConnectedAccount | undefined, fallback: string) {
  if (!account) {
    return `${fallback}: Disconnected`;
  }
  const state = account.status[0].toUpperCase() + account.status.slice(1);
  return `${fallback}: ${state}`;
}

export function TopBar({
  githubAccount,
  codexAccount,
  systemStatus,
  activeAgents,
  onOpenSettings,
  connectorTelemetry,
}: TopBarProps) {
  return (
    <header className="hud-panel border-b border-white/10 bg-graphite-950/80 backdrop-blur-md">
      <div className="flex h-[74px] items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="signal-bars flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(41,192,255,0.25)]">
            <span className="hud-title text-sm text-glow-cyan">H</span>
          </div>
          <div>
            <p className="hud-title text-sm text-cyan-200/90">Hermes</p>
            <h1 className="text-sm font-semibold text-ink-100 md:text-base">Hermes Agent Command Center</h1>
          </div>
        </div>

        <div className="hidden flex-1 items-center px-4 lg:flex">
          <input
            type="text"
            placeholder="Global command or search..."
            className="w-full rounded-xl border border-cyan-300/20 bg-black/30 px-4 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-cyan-300/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-ink-300 hud-title text-[10px]">
            {providerLabel(githubAccount, "GitHub")}
          </div>
          <div className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-ink-300 hud-title text-[10px]">
            {providerLabel(codexAccount, "Codex")}
          </div>
          <div className={`rounded-lg border px-2.5 py-1.5 hud-title text-[10px] ${statusTone[systemStatus]}`}>
            <span className="status-pulse mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
            Hermes VM: {systemStatus === "online" ? "Online" : systemStatus === "offline" ? "Offline" : "Degraded"}
          </div>
          <div className="signal-bars hidden rounded-lg border border-cyan-300/25 bg-cyan-500/8 px-2.5 py-1.5 text-cyan-100 lg:block">
            <p className="hud-title text-[10px]">Telemetry</p>
            <p className="font-mono text-[11px] text-cyan-100/90">
              {connectorTelemetry?.status ?? "offline"} · {connectorTelemetry?.latencyMs ?? "--"}ms
            </p>
          </div>
          <div className="hidden rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-ink-300 xl:block hud-title text-[10px]">
            Agents: {activeAgents} active
          </div>
          <button
            onClick={onOpenSettings}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-ink-200 transition hover:border-cyan-300/30 hover:text-cyan-200"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
