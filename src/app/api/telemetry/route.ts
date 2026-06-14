import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { getConnectorSettingsForUI, testConnectorHealth } from "@/lib/hermesConnector";
import os from "os";
import { execSync } from "child_process";

function safeExec(cmd: string) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch (e) {
    return "";
  }
}

function parseDf() {
  const out = safeExec("df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs");
  const lines = out.split(/\r?\n/).slice(1).filter(Boolean);
  return lines.map((ln) => {
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
  }).filter(Boolean);
}

function topProcs(limit = 6) {
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

export async function GET() {
  await ensureSeedData();

  const settings = await getConnectorSettingsForUI();
  const checkedAt = new Date().toISOString();

  // Connector health (existing behavior)
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

  // System telemetry
  const hostname = os.hostname();
  const uptimeSeconds = Math.floor(os.uptime());
  const loadavg = os.loadavg();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Parse human-friendly disk & processes where system tools are useful
  const disks = parseDf();
  const procs = topProcs(6);

  const payload = {
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
      cpuCount: cpus.length,
      model: cpus.length ? cpus[0].model : null,
      speedMHz: cpus.length ? cpus[0].speed : null,
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      totalHuman: `${Math.round(totalMem / (1024 ** 3))}Gi`,
      usedHuman: `${Math.round(usedMem / (1024 ** 2))}Mi`,
    },
    swap: (() => {
      const sw = safeExec("swapon --show --noheading --bytes || true");
      if (!sw) return null;
      // crude parse: show the raw swapon header-free lines
      const lines = sw.split(/\r?\n/).filter(Boolean);
      return lines.map((l) => l.trim());
    })(),
    disks,
    topProcesses: procs,
  };

  return NextResponse.json(payload);
}
