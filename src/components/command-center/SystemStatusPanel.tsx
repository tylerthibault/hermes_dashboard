type Disk = {
  filesystem: string;
  fstype: string;
  size: string;
  used: string;
  avail: string;
  usePercent: string;
  mount: string;
  // Optional IO fields (bytes since boot or sample window) exposed by Hermes connector
  readBytes?: number;
  writeBytes?: number;
  readIops?: number | null;
  writeIops?: number | null;
};

type Inode = {
  filesystem: string;
  inodesTotal: string;
  inodesUsed: string;
  inodesAvail: string;
  inodeUsePercent: string;
  mount: string;
};

type Proc = {
  pid: number;
  command: string;
  cpu: number;
  mem: number;
};

type NetIf = {
  iface: string;
  rxBytes: number;
  txBytes: number;
};

type Telemetry = {
  checkedAt?: string;
  host?: {
    hostname?: string;
    platform?: string;
    release?: string;
    arch?: string;
    uptimeSeconds?: number;
    loadavg?: number[];
  };
  cpu?: {
    cpuCount?: number;
    logicalCpuCount?: number;
    physicalCoreCount?: number | null;
    sockets?: number | null;
    coresPerSocket?: number | null;
    threadsPerCore?: number | null;
    onlineCpuList?: string | null;
    model?: string | null;
    speedMHz?: number | null;
    maxMHz?: number | null;
    usagePercent?: number | null;
  };
  memory?: {
    totalBytes?: number;
    usedBytes?: number;
    freeBytes?: number;
    availableBytes?: number;
    totalHuman?: string;
    usedHuman?: string;
    freeHuman?: string;
    availableHuman?: string;
  };
  swap?: {
    totalBytes?: number;
    usedBytes?: number;
    freeBytes?: number;
    totalHuman?: string;
    usedHuman?: string;
    freeHuman?: string;
  } | null;
  processCount?: number | null;
  disks?: Disk[];
  inodeUsage?: Inode[];
  topProcesses?: Proc[];
  network?: NetIf[];
  networkInterfaces?: Array<{ iface: string; family: string; address: string; internal: boolean }>;
  ping?: { gatewayMs: number | null; internetMs: number | null };
  defaultGateway?: string | null;
};

type SystemStatusPanelProps = { telemetry?: Telemetry | null };

function pct(value?: number, total?: number) {
  if (!value || !total) return 0;
  return Math.round((value / total) * 100);
}

function fmtUptime(seconds?: number) {
  if (!seconds) return "-";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function humanBytes(bytes?: number) {
  if (!bytes) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

export function SystemStatusPanel({ telemetry }: SystemStatusPanelProps) {
  if (!telemetry) {
    return (
      <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
        <h4 className="hud-title text-[11px] text-cyan-200">Hardware Status</h4>
        <p className="text-sm text-ink-400">No telemetry available</p>
      </article>
    );
  }

  const mem = telemetry.memory ?? {};
  const cpu = telemetry.cpu ?? {};
  const host = telemetry.host ?? {};
  const disks = telemetry.disks ?? [];
  const inodes = telemetry.inodeUsage ?? [];
  const procs = telemetry.topProcesses ?? [];
  const nets = telemetry.network ?? [];
  const interfaces = telemetry.networkInterfaces ?? [];

  const memUsedPct = pct(mem.usedBytes, mem.totalBytes);
  const swapUsedPct = pct(telemetry.swap?.usedBytes, telemetry.swap?.totalBytes);

  return (
    <article className="hud-panel rounded-xl border border-cyan-300/20 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="hud-title text-[11px] text-cyan-200">Hardware Status</h4>
        <span className="font-mono text-[10px] text-cyan-300/70">
          {telemetry.checkedAt ? new Date(telemetry.checkedAt).toLocaleString() : "-"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-ink-500">CPU</p>
          <p className="text-sm text-ink-300">
            Logical: {cpu.logicalCpuCount ?? cpu.cpuCount ?? "-"} • Physical: {cpu.physicalCoreCount ?? "-"}
          </p>
          <p className="text-xs text-ink-500">
            Sockets: {cpu.sockets ?? "-"} • Cores/socket: {cpu.coresPerSocket ?? "-"} • Threads/core: {cpu.threadsPerCore ?? "-"}
          </p>
          <p className="text-xs text-ink-500">Usage: {cpu.usagePercent ?? "-"}%</p>
          <p className="text-xs text-ink-500">Online CPUs: {cpu.onlineCpuList ?? "-"}</p>
          <p className="text-xs text-ink-500">Load: {host.loadavg?.map((n) => n.toFixed(2)).join(", ") ?? "-"}</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">Memory</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${memUsedPct}%` }} className="h-full bg-cyan-400" />
          </div>
          <p className="mt-1 text-xs text-ink-300">{mem.usedHuman ?? "-"} / {mem.totalHuman ?? "-"} ({memUsedPct}%)</p>
          <p className="text-xs text-ink-500">Free: {mem.freeHuman ?? "-"}</p>
          <p className="text-xs text-ink-500">Available: {mem.availableHuman ?? "-"}</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">Swap</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
            <div style={{ width: `${swapUsedPct}%` }} className="h-full bg-amber-400" />
          </div>
          <p className="mt-1 text-xs text-ink-300">{telemetry.swap?.usedHuman ?? "0B"} / {telemetry.swap?.totalHuman ?? "0B"} ({swapUsedPct}%)</p>
        </div>

        <div>
          <p className="text-xs text-ink-500">Host</p>
          <p className="text-sm text-ink-300">{host.hostname ?? "-"}</p>
          <p className="text-xs text-ink-500">{host.platform} {host.release} ({host.arch})</p>
          <p className="text-xs text-ink-500">Uptime: {fmtUptime(host.uptimeSeconds)}</p>
          <p className="text-xs text-ink-500">Processes: {telemetry.processCount ?? "-"}</p>
          <p className="text-xs text-ink-500">Gateway: {telemetry.defaultGateway ?? "-"}</p>
          <p className="text-xs text-ink-500">
            Ping gateway: {telemetry.ping?.gatewayMs ?? "-"} ms • Ping internet: {telemetry.ping?.internetMs ?? "-"} ms
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="hud-subtitle text-xs text-ink-500">IP Addresses</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs text-ink-300">
          {interfaces.map((intf) => (
            <div key={`${intf.iface}-${intf.family}-${intf.address}`} className="rounded border border-white/10 px-2 py-1">
              <div>{intf.iface} • {intf.family}</div>
              <div className="text-ink-500">{intf.address}{intf.internal ? " (internal)" : ""}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="hud-subtitle text-xs text-ink-500">Disk Usage</p>
          <div className="mt-2 space-y-2">
            {disks.map((d) => (
              <div key={`${d.filesystem}-${d.mount}`} className="text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-ink-300">{d.mount} ({d.fstype}) {d.used}/{d.size}</p>
                  <p className="text-ink-400">{d.usePercent}</p>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
                  <div style={{ width: d.usePercent }} className="h-full bg-rose-400" />
                </div>
                <p className="mt-1 text-[10px] text-ink-500">Free: {d.avail}</p>
                {/* Optional IO details from connector */}
                {(d.readBytes || d.writeBytes) && (
                  <p className="mt-1 text-[10px] text-ink-400">Read: {d.readBytes ? humanBytes(d.readBytes) : "-"} • Write: {d.writeBytes ? humanBytes(d.writeBytes) : "-"}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="hud-subtitle text-xs text-ink-500">Inode Usage</p>
          <div className="mt-2 space-y-2">
            {inodes.map((inode) => (
              <div key={`${inode.filesystem}-${inode.mount}`} className="text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-ink-300">{inode.mount}</p>
                  <p className="text-ink-400">{inode.inodeUsePercent}</p>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/5">
                  <div style={{ width: inode.inodeUsePercent }} className="h-full bg-fuchsia-400" />
                </div>
                <p className="mt-1 text-[10px] text-ink-500">Used {inode.inodesUsed} / {inode.inodesTotal}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="hud-subtitle text-xs text-ink-500">Top Processes (CPU)</p>
          <div className="mt-2 space-y-2 font-mono text-xs text-ink-300">
            {procs.map((p) => (
              <div key={p.pid} className="rounded border border-white/10 px-2 py-1">
                <div>{p.command} <span className="text-ink-500">#{p.pid}</span></div>
                <div className="text-ink-500">CPU {p.cpu}% • MEM {p.mem}%</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="hud-subtitle text-xs text-ink-500">Network Interfaces (bytes)</p>
          <div className="mt-2 space-y-2 font-mono text-xs text-ink-300">
            {nets.map((n) => (
              <div key={n.iface} className="rounded border border-white/10 px-2 py-1">
                <div>{n.iface}</div>
                <div className="text-ink-500">RX {humanBytes(n.rxBytes)} • TX {humanBytes(n.txBytes)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
