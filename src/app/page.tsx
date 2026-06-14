"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/command-center/AppShell";
import { ConnectorSettingsModal } from "@/components/command-center/ConnectorSettingsModal";
import { DashboardCenterPanel } from "@/components/command-center/DashboardCenterPanel";
import { DashboardRightPanel } from "@/components/command-center/DashboardRightPanel";
import { TopBar } from "@/components/command-center/TopBar";
import { MainNavSidebar } from "@/components/navigation/MainNavSidebar";
import { Agent, ConnectedAccount, UsageLimit } from "@/types/hermes";

type TelemetryResponse = {
  checkedAt: string;
  systemStatus: "online" | "degraded" | "offline";
  connector: {
    status: "online" | "degraded" | "offline";
    latencyMs: number | null;
    message: string;
    source: "db" | "env" | "none";
  };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${url}`);
  }

  return (await response.json()) as T;
}

export default function DashboardHome() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [usageLimits, setUsageLimits] = useState<UsageLimit[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uiError, setUiError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      setUiError("");
      try {
        const [loadedAgents, loadedAccounts, loadedUsage] = await Promise.all([
          fetchJson<Agent[]>("/api/agents"),
          fetchJson<ConnectedAccount[]>("/api/accounts"),
          fetchJson<UsageLimit[]>("/api/usage"),
        ]);

        setAgents(loadedAgents);
        setAccounts(loadedAccounts);
        setUsageLimits(loadedUsage);
      } catch (error) {
        setUiError(error instanceof Error ? error.message : "Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    let mounted = true;

    const pollTelemetry = async () => {
      try {
        const snapshot = await fetchJson<TelemetryResponse>("/api/telemetry");
        if (mounted) {
          setTelemetry(snapshot);
        }
      } catch {
        if (mounted) {
          setTelemetry((current) =>
            current ?? {
              checkedAt: new Date().toISOString(),
              systemStatus: "offline",
              connector: {
                status: "offline",
                latencyMs: null,
                source: "none",
                message: "Telemetry unavailable",
              },
            },
          );
        }
      }
    };

    void pollTelemetry();
    const interval = window.setInterval(() => {
      void pollTelemetry();
    }, 3000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const githubAccount = accounts.find((account) => account.provider === "github");
  const codexAccount = accounts.find((account) => account.provider === "codex");
  const activeAgents = agents.filter((agent) => agent.status !== "offline").length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-ink-300">
        Loading Hermes Dashboard...
      </div>
    );
  }

  return (
    <>
      <AppShell
        topBar={
          <TopBar
            githubAccount={githubAccount}
            codexAccount={codexAccount}
            systemStatus={telemetry?.systemStatus ?? "offline"}
            activeAgents={activeAgents}
            onOpenSettings={() => setSettingsOpen(true)}
            connectorTelemetry={{
              status: telemetry?.connector.status ?? "offline",
              latencyMs: telemetry?.connector.latencyMs ?? null,
              checkedAt: telemetry?.checkedAt,
            }}
          />
        }
        leftSidebar={<MainNavSidebar />}
        centerPanel={
          <div className="flex h-full flex-col gap-3">
            {uiError ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {uiError}
              </div>
            ) : null}
            <DashboardCenterPanel
              totalQueries="4.2M"
              agentEfficiency="98.4%"
              systemUptime="99.99%"
              securityScans="12,450"
              telemetry={telemetry}
            />
          </div>
        }
        rightSidebar={<DashboardRightPanel agents={agents} accounts={accounts} usageLimits={usageLimits} />}
      />
      <ConnectorSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
