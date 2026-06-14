import { NeuralLoadCard } from "./NeuralLoadCard";
import { SystemStatusPanel } from "./SystemStatusPanel";

type DashboardCenterPanelProps = {
  telemetry?: any;
};

function formatUptime(seconds?: number) {
  if (!seconds) return "-";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

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

export function DashboardCenterPanel({ telemetry }: DashboardCenterPanelProps) {
  const load = telemetry?.host?.loadavg?.[0] ?? 0;
  const cores = telemetry?.cpu?.cpuCount ?? 1;
  const cpuPercentFromLoad = Math.min(100, Math.round((load / Math.max(cores, 1)) * 100));
  const cpuPercent = telemetry?.cpu?.usagePercent ?? cpuPercentFromLoad;

  const memTotal = telemetry?.memory?.totalBytes ?? 0;
  const memUsed = telemetry?.memory?.usedBytes ?? 0;
  const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

  const rootDisk = telemetry?.disks?.find((d: any) => d.mount === "/");
  const topProc = telemetry?.topProcesses?.[0];

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="CPU Load (1m)" value={`${load.toFixed(2)} / ${cores} logical CPUs`} />
        <MetricCard label="CPU Saturation" value={`${cpuPercent}%`} accent="blue" />
        <MetricCard label="System Uptime" value={formatUptime(telemetry?.host?.uptimeSeconds)} accent="green" />
        <MetricCard label="Root Disk Usage" value={rootDisk?.usePercent ?? "-"} />
      </div>

      <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <NeuralLoadCard coreA={cpuPercent} coreB={memPercent} reserve={Math.max(0, 100 - cpuPercent)} />

        <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="hud-title text-[11px] text-cyan-200">Live Host Snapshot</h4>
          </div>
          <div className="space-y-2 font-mono text-xs text-ink-300">
            <p>MEM: {memPercent}% used</p>
            <p>LOAD: {telemetry?.host?.loadavg?.map((n: number) => n.toFixed(2)).join(", ") ?? "-"}</p>
            <p>ROOT: {rootDisk?.usePercent ?? "-"}</p>
            <p>TOP PROC: {topProc ? `${topProc.command} (${topProc.cpu}%)` : "-"}</p>
          </div>
        </article>
      </div>

      <SystemStatusPanel telemetry={telemetry} />
    </section>
  );
}
