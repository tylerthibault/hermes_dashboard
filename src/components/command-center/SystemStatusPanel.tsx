type SystemStatusPanelProps = { telemetry?: any };

export function SystemStatusPanel({ telemetry }: SystemStatusPanelProps) {
  if (!telemetry) {
    return (
      <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
        <h4 className="hud-title text-[11px] text-cyan-200">System Status</h4>
        <p className="text-sm text-ink-400">No telemetry available</p>
      </article>
    );
  }

  const mem = telemetry.memory ?? {};
  const cpu = telemetry.cpu ?? {};
  const host = telemetry.host ?? {};
  const disks = telemetry.disks ?? [];
  const procs = telemetry.topProcesses ?? [];

  const usedPercent = mem.totalBytes ? Math.round((mem.usedBytes / mem.totalBytes) * 100) : 0;

  return (
    <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="hud-title text-[11px] text-cyan-200">System Status</h4>
        <span className="font-mono text-[10px] text-cyan-300/70">{new Date(telemetry.checkedAt).toLocaleString()}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-500">Host</p>
          <p className="text-sm text-ink-300">{host.hostname} • {host.platform} {host.release} • {host.arch}</p>
          <p className="mt-1 text-xs text-ink-500">Uptime: {Math.floor((host.uptimeSeconds||0)/3600)}h {(Math.floor((host.uptimeSeconds||0)%3600/60))}m</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">CPU</p>
          <p className="text-sm text-ink-300">{cpu.cpuCount} cores • {cpu.model ?? ""} • {cpu.speedMHz ?? ""} MHz</p>
          <p className="mt-1 text-xs text-ink-500">Load: {telemetry.host?.loadavg?.slice(0,3).map((n:number)=>n.toFixed(2)).join(', ')}</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">Memory</p>
          <div className="mt-1 h-3 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${usedPercent}%` }} className="h-full bg-cyan-400" />
          </div>
          <p className="mt-1 text-xs text-ink-300">{mem.usedHuman ?? "-"} / {mem.totalHuman ?? "-"} • {usedPercent}%</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">Swap</p>
          <p className="text-sm text-ink-300">{telemetry.swap ? telemetry.swap.join(' | ') : 'none'}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="hud-subtitle text-xs text-ink-500">Disks</p>
          <div className="space-y-2 mt-2">
            {disks.map((d:any) => (
              <div key={d.mount} className="text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-ink-300">{d.mount} ({d.size})</p>
                  <p className="text-ink-400">{d.usePercent}</p>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
                  <div style={{ width: d.usePercent }} className="h-full bg-rose-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="hud-subtitle text-xs text-ink-500">Top Processes</p>
          <div className="mt-2 space-y-2 font-mono text-xs text-ink-300">
            {procs.map((p:any) => (
              <div key={p.pid} className="flex items-center justify-between">
                <div>
                  <div className="text-ink-300">{p.command} <span className="text-ink-500">#{p.pid}</span></div>
                  <div className="text-ink-500">CPU {p.cpu}% • MEM {p.mem}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
