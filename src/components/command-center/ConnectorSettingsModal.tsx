"use client";

import { FormEvent, useEffect, useState } from "react";

type ConnectorSettings = {
  url: string;
  timeoutMs: number;
  tokenConfigured: boolean;
  source: "db" | "env" | "none";
};

type ConnectorSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${url}: ${JSON.stringify(data)}`);
  }

  return data;
}

export function ConnectorSettingsModal({ open, onClose }: ConnectorSettingsModalProps) {
  const [url, setUrl] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("90000");
  const [token, setToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [source, setSource] = useState<ConnectorSettings["source"]>("none");
  const [clearToken, setClearToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadSettings = async () => {
      setBusy(true);
      setStatus("");
      try {
        const settings = await fetchJson<ConnectorSettings>("/api/settings/connector");
        setUrl(settings.url ?? "");
        setTimeoutMs(String(settings.timeoutMs ?? 30000));
        setToken("");
        setTokenConfigured(settings.tokenConfigured);
        setSource(settings.source);
        setClearToken(false);
      } catch {
        setStatus("Could not load connector settings.");
      } finally {
        setBusy(false);
      }
    };

    void loadSettings();
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      const updated = await fetchJson<ConnectorSettings>("/api/settings/connector", {
        method: "PATCH",
        body: JSON.stringify({
          url,
          timeoutMs: Number(timeoutMs),
          token: token.trim() ? token : undefined,
          clearToken,
        }),
      });

      setToken("");
      setTokenConfigured(updated.tokenConfigured);
      setSource(updated.source);
      setClearToken(false);
      setStatus("Connector settings saved.");
    } catch {
      setStatus("Could not save connector settings.");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setStatus("");

    try {
      const result = await fetchJson<{ ok: boolean; status?: number; error?: string }>(
        "/api/settings/connector/test",
        {
          method: "POST",
          body: JSON.stringify({
            url,
            timeoutMs: Number(timeoutMs),
            token: token.trim() ? token : undefined,
          }),
        },
      );

      if (result.ok) {
        setStatus(`Connector reachable (HTTP ${result.status ?? 200}).`);
      } else {
        setStatus(result.error ?? "Connector test failed.");
      }
    } catch {
      setStatus("Connector test failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="hud-panel relative w-full max-w-xl rounded-2xl border border-cyan-300/25 bg-graphite-950 p-5 shadow-[0_0_50px_rgba(4,18,28,0.75)]">
        <div className="scanline-overlay pointer-events-none absolute inset-0 rounded-2xl" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="hud-title text-[11px] text-cyan-200">Settings</p>
            <h3 className="text-lg font-semibold text-ink-100 text-glow-cyan">Hermes Connector</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-ink-300 transition hover:border-cyan-300/35 hover:text-cyan-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 relative z-10">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-300 hud-title">Connector URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="http://192.168.x.x:8080"
              className="w-full rounded-lg border border-cyan-300/20 bg-black/35 px-3 py-2 text-sm text-ink-100 focus:border-cyan-300/45 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-300 hud-title">Timeout (ms)</span>
            <input
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-lg border border-cyan-300/20 bg-black/35 px-3 py-2 text-sm text-ink-100 focus:border-cyan-300/45 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-300 hud-title">Connector token</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={tokenConfigured ? "Token already configured. Enter new token to rotate." : "Bearer token"}
              className="w-full rounded-lg border border-cyan-300/20 bg-black/35 px-3 py-2 text-sm text-ink-100 focus:border-cyan-300/45 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-ink-300">
            <input
              type="checkbox"
              checked={clearToken}
              onChange={(event) => setClearToken(event.target.checked)}
            />
            Clear existing token
          </label>

          <div className="signal-bars rounded-lg border border-cyan-300/20 bg-cyan-500/8 px-3 py-2 text-xs text-ink-200">
            Source: {source} · Token configured: {tokenConfigured ? "yes" : "no"}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="rounded-md border border-amber-300/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
        </form>

        {status ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-ink-200">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
