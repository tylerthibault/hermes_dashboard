import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { getConnectorSettingsForUI, testConnectorHealth } from "@/lib/hermesConnector";
import os from "os";
import { execSync } from "child_process";

type CpuTopology = {
  logicalCpuCount: number | null;
  onlineCpuList: string | null;
  threadsPerCore: number | null;
  coresPerSocket: number | null;
  sockets: number | null;
  physicalCoreCount: number | null;
  modelName: string | null;
  maxMHz: number | null;
};

function safeExec(cmd: string) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function parseDf() {
  const out = safeExec("df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs");
  const lines = out.split(/\r?\n/).slice(1).filter(Boolean);
  return lines
    .map((ln) => {
      const parts = ln.trim().split(/\s+/);
      if (parts.length < 7) return null;
      return {
        filesystem: parts[0],
        fstype: parts[1],
        size: parts[2],
        used: parts[3],
        avail: parts[4],
        usePercent: parts[5],
        mount: parts[6],
      };
    })
    .filter(Boolean);
}

function parseInodes() {
  const out = safeExec("df -i --output=source,itotal,iused,iavail,ipcent,target -x tmpfs -x devtmpfs");
  const lines = out.split(/\r?\n/).slice(1).filter(Boolean);
  return lines
    .map((ln) => {
      const parts = ln.trim().split(/\s+/);
      if (parts.length < 6) return null;
      return {
        filesystem: parts[0],
        inodesTotal: parts[1],
        inodesUsed: parts[2],
        inodesAvail: parts[3],
        inodeUsePercent: parts[4],
        mount: parts[5],
      };
    })
    .filter(Boolean);
}

function topProcs(limit = 8) {
  const out = safeExec(`ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n ${limit + 1}`);
  const lines = out.split(/\r?\n/).slice(1).filter(Boolean);
  return lines.map((ln) => {
    const parts = ln.trim().split(/\s+/);
    return {
      pid: Number(parts[0]),
      command: parts[1],
      cpu: Number(parts[2]),
      mem: Number(parts[3]),
    };
  });
}

function parseMeminfo() {
  const out = safeExec("free -b");
  const memLine = out
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("Mem:"));
  const swapLine = out
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("Swap:"));

  const mem = memLine ? memLine.trim().split(/\s+/) : [];
  const swap = swapLine ? swapLine.trim().split(/\s+/) : [];

  return {
    mem: {
      totalBytes: Number(mem[1] ?? 0),
      usedBytes: Number(mem[2] ?? 0),
      freeBytes: Number(mem[3] ?? 0),
      sharedBytes: Number(mem[4] ?? 0),
      buffersCacheBytes: Number(mem[5] ?? 0),
      availableBytes: Number(mem[6] ?? 0),
    },
    swap: {
      totalBytes: Number(swap[1] ?? 0),
      usedBytes: Number(swap[2] ?? 0),
      freeBytes: Number(swap[3] ?? 0),
    },
  };
}

function parseCpuUsagePercent() {
  const raw = safeExec("top -bn1 | awk '/^%Cpu/{print 100-$8}'");
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

function parseProcessCount() {
  const out = safeExec("ps -e --no-headers | wc -l");
  const count = Number.parseInt(out, 10);
  return Number.isFinite(count) ? count : null;
}

function parseNetwork() {
  const out = safeExec("cat /proc/net/dev");
  const lines = out.split(/\r?\n/).slice(2).filter(Boolean);
  return lines
    .map((ln) => {
      const [ifacePart, dataPart] = ln.split(":");
      if (!ifacePart || !dataPart) return null;
      const iface = ifacePart.trim();
      const cols = dataPart.trim().split(/\s+/);
      if (cols.length < 16) return null;
      const rxBytes = Number(cols[0]);
      const txBytes = Number(cols[8]);
      return {
        iface,
        rxBytes,
        txBytes,
      };
    })
    .filter(Boolean);
}

function parseLscpu(): CpuTopology {
  const out = safeExec("lscpu");
  const map: Record<string, string> = {};
  for (const line of out.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map[key] = value;
  }

  const logicalCpuCount = Number.parseInt(map["CPU(s)"] ?? "", 10);
  const threadsPerCore = Number.parseInt(map["Thread(s) per core"] ?? "", 10);
  const coresPerSocket = Number.parseInt(map["Core(s) per socket"] ?? "", 10);
  const sockets = Number.parseInt(map["Socket(s)"] ?? "", 10);
  const maxMHz = Number.parseFloat(map["CPU max MHz"] ?? "");

  const physicalCoreCount =
    Number.isFinite(coresPerSocket) && Number.isFinite(sockets) && coresPerSocket > 0 && sockets > 0
      ? coresPerSocket * sockets
      : null;

  return {
    logicalCpuCount: Number.isFinite(logicalCpuCount) ? logicalCpuCount : null,
    onlineCpuList: map["On-line CPU(s) list"] ?? null,
    threadsPerCore: Number.isFinite(threadsPerCore) ? threadsPerCore : null,
    coresPerSocket: Number.isFinite(coresPerSocket) ? coresPerSocket : null,
    sockets: Number.isFinite(sockets) ? sockets : null,
    physicalCoreCount,
    modelName: map["Model name"] ?? null,
    maxMHz: Number.isFinite(maxMHz) ? maxMHz : null,
  };
}

function parseNetworkInterfaces() {
  const nics = os.networkInterfaces() as Record<string, Array<{ family: string | number; address: string; internal: boolean }> | undefined>;
  const rows: Array<{ iface: string; family: string; address: string; internal: boolean }> = [];
  for (const [iface, addrs] of Object.entries(nics)) {
    for (const addr of addrs ?? []) {
      rows.push({
        iface,
        family: typeof addr.family === "string" ? addr.family : String(addr.family),
        address: addr.address,
        internal: addr.internal,
      });
    }
  }
  return rows;
}

function pingMs(host: string) {
  const raw = safeExec(`ping -c 1 -W 1 ${host} | awk -F'time=' '/time=/{print $2}' | awk '{print $1}'`);
  if (!raw) return null;
  const v = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function parseDefaultGateway() {
  const out = safeExec("ip route | awk '/default/ {print $3; exit}'");
  return out || null;
}

function bytesToHuman(bytes: number) {
  if (!bytes) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)}${units[idx]}`;
}

export async function GET() {
  await ensureSeedData();

  const settings = await getConnectorSettingsForUI();
  const checkedAt = new Date().toISOString();

  let connectorInfo = {
    status: "offline" as "online" | "degraded" | "offline",
    source: settings.source,
    latencyMs: null as number | null,
    message: "Connector URL not configured",
  };

  if (settings.url) {
    const health = await testConnectorHealth();
    const status = health.ok ? "online" : "degraded";
    connectorInfo = {
      status,
      source: settings.source,
      latencyMs: typeof health.elapsedMs === "number" ? health.elapsedMs : null,
      message: health.ok ? "Connector reachable" : health.error ?? "Connector unavailable",
    };
  }

  const hostname = os.hostname();
  const uptimeSeconds = Math.floor(os.uptime());
  const loadavg = os.loadavg();
  const cpus = os.cpus();
  const cpuTopology = parseLscpu();

  const meminfo = parseMeminfo();
  const cpuUsagePercent = parseCpuUsagePercent();
  const processCount = parseProcessCount();
  const disks = parseDf();
  const inodeUsage = parseInodes();
  const procs = topProcs(8);
  const network = parseNetwork();
  const networkInterfaces = parseNetworkInterfaces();
  const defaultGateway = parseDefaultGateway();
  const ping = {
    gatewayMs: defaultGateway ? pingMs(defaultGateway) : null,
    internetMs: pingMs("1.1.1.1"),
  };

  return NextResponse.json({
    checkedAt,
    systemStatus: "online",
    connector: connectorInfo,
    host: {
      hostname,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds,
      loadavg,
    },
    cpu: {
      cpuCount: cpuTopology.logicalCpuCount ?? cpus.length,
      logicalCpuCount: cpuTopology.logicalCpuCount ?? cpus.length,
      physicalCoreCount: cpuTopology.physicalCoreCount,
      sockets: cpuTopology.sockets,
      coresPerSocket: cpuTopology.coresPerSocket,
      threadsPerCore: cpuTopology.threadsPerCore,
      onlineCpuList: cpuTopology.onlineCpuList,
      model: cpuTopology.modelName ?? (cpus.length ? cpus[0].model : null),
      speedMHz: cpus.length ? cpus[0].speed : null,
      maxMHz: cpuTopology.maxMHz,
      usagePercent: cpuUsagePercent,
    },
    memory: {
      ...meminfo.mem,
      totalHuman: bytesToHuman(meminfo.mem.totalBytes),
      usedHuman: bytesToHuman(meminfo.mem.usedBytes),
      freeHuman: bytesToHuman(meminfo.mem.freeBytes),
      availableHuman: bytesToHuman(meminfo.mem.availableBytes),
    },
    swap: {
      ...meminfo.swap,
      totalHuman: bytesToHuman(meminfo.swap.totalBytes),
      usedHuman: bytesToHuman(meminfo.swap.usedBytes),
      freeHuman: bytesToHuman(meminfo.swap.freeBytes),
    },
    processCount,
    disks,
    inodeUsage,
    topProcesses: procs,
    network,
    networkInterfaces,
    ping,
    defaultGateway,
  });
}
