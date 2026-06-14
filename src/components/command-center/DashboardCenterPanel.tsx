import { NeuralLoadCard } from "./NeuralLoadCard";

type DashboardCenterPanelProps = {
  totalQueries: string;
  agentEfficiency: string;
  systemUptime: string;
  securityScans: string;
};

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: "cyan" | "blue" | "green" }) {
  const tone =
    accent === "blue"
      ? "text-blue-200"
      : accent === "green"
        ? "text-emerald-200"
        : "text-cyan-100";

  return (
    <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
      <p className="hud-title text-[10px] text-ink-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
    </article>
  );
}

export function DashboardCenterPanel({
  totalQueries,
  agentEfficiency,
  systemUptime,
  securityScans,
}: DashboardCenterPanelProps) {
  return (
    <section className="flex h-full flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Metric_01 / Total Queries" value={totalQueries} />
        <MetricCard label="Metric_02 / Agent Efficiency" value={agentEfficiency} accent="blue" />
        <MetricCard label="Metric_03 / System Uptime" value={systemUptime} accent="green" />
        <MetricCard label="Metric_04 / Security Scans" value={securityScans} />
      </div>

      <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <NeuralLoadCard coreA={45} coreB={30} reserve={25} />

        <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="hud-title text-[11px] text-cyan-200">Live Stream</h4>
            <span className="font-mono text-[10px] text-cyan-300/70">T+04:22</span>
          </div>
          <div className="space-y-2 font-mono text-xs text-ink-300">
            <p>[10:42:01] NODE: Flux stabilized at 0.94.</p>
            <p>[10:42:04] SYS: Auto-correcting vector 7.</p>
            <p>[10:42:09] DATA: Ingested 45MB payload.</p>
            <p>[10:42:12] AGENT_CORE: Awaiting instruction.</p>
            <p>[10:42:18] SYNC: Heartbeat confirmed.</p>
            <p>[10:42:22] SYS: Allocating thread 4A.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
