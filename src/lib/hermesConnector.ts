import { prisma } from "@/lib/prisma";

type HermesDispatchRequest = {
  runId: string;
  agentId: string;
  conversationId: string;
  content: string;
  mode?: string;
  context?: Record<string, unknown>;
};

type HermesDispatchResponse = {
  connectorRunId?: string;
  accepted?: boolean;
  events?: Array<{ type: string; payload: Record<string, unknown> }>;
  assistantMessage?: string;
};

type ConnectorConfig = {
  url: string;
  token?: string;
  timeoutMs: number;
  source: "db" | "env" | "none";
};

const KEY_URL = "connector.url";
const KEY_TOKEN = "connector.token";
const KEY_TIMEOUT_MS = "connector.timeoutMs";

function normalizeUrl(raw: string | undefined) {
  return (raw ?? "").trim().replace(/\/$/, "");
}

function parseTimeout(raw: string | number | undefined, fallback = 15000) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getStoredSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [KEY_URL, KEY_TOKEN, KEY_TIMEOUT_MS] } },
  });

  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return {
    url: byKey.get(KEY_URL),
    token: byKey.get(KEY_TOKEN),
    timeoutMs: byKey.get(KEY_TIMEOUT_MS),
  };
}

async function getConnectorConfig(): Promise<ConnectorConfig> {
  const stored = await getStoredSettings();

  const dbUrl = normalizeUrl(stored.url);
  const envUrl = normalizeUrl(process.env.HERMES_CONNECTOR_URL);
  const finalUrl = dbUrl || envUrl;

  const dbToken = stored.token?.trim();
  const envToken = process.env.HERMES_CONNECTOR_TOKEN?.trim();
  const finalToken = dbToken || envToken;

  // Backwards-compatible fallback: if no connector URL is configured, allow
  // the dashboard to talk to a Hermes API-compatible endpoint provided by
  // environment variables. This makes it easy to point the UI at a
  // running Hermes instance (or any assistant-compatible API) without
  // storing settings in the database.
  const apiBaseUrl = normalizeUrl(process.env.HERMES_API_BASE_URL);
  const apiKey = process.env.HERMES_API_KEY?.trim();

  const timeoutMs = dbUrl
    ? parseTimeout(stored.timeoutMs, parseTimeout(process.env.HERMES_CONNECTOR_TIMEOUT_MS, 15000))
    : parseTimeout(process.env.HERMES_CONNECTOR_TIMEOUT_MS, 15000);

  // If no explicit connector URL is present, prefer the API_BASE fallback.
  const resolvedUrl = finalUrl || apiBaseUrl;
  const resolvedToken = finalToken || apiKey;

  const source: ConnectorConfig["source"] = resolvedUrl
    ? dbUrl
      ? "db"
      : envUrl
      ? "env"
      : "env"
    : "none";

  return {
    url: resolvedUrl,
    token: resolvedToken,
    timeoutMs,
    source,
  };
}

function buildHeaders(token: string | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Hermes gateway API shape:
//   POST /v1/runs  { input: string }  →  { run_id, status: "started" }
//   GET  /v1/runs/:run_id             →  { run_id, status, output, ... }
// We post the message as `input`, then poll until status is completed/failed.
// ---------------------------------------------------------------------------

type HermesRunStarted = { run_id: string; status: string };
type HermesRunResult = {
  run_id: string;
  status: string;
  output?: string;
  last_event?: string;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function dispatchRunToConnector(payload: HermesDispatchRequest): Promise<HermesDispatchResponse> {
  const config = await getConnectorConfig();

  if (!config.url) {
    throw new Error("Hermes connector is not configured.");
  }

  const headers = buildHeaders(config.token);

  // Step 1: start the run — gateway expects { input: string }
  const startController = new AbortController();
  const startTimeout = setTimeout(() => startController.abort(), config.timeoutMs);

  let runId: string;
  try {
    const startResp = await fetch(`${config.url}/v1/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ input: payload.content }),
      signal: startController.signal,
    });

    if (!startResp.ok) {
      const details = await safeJson(startResp);
      throw new Error(`Connector dispatch failed (${startResp.status}): ${JSON.stringify(details)}`);
    }

    const started = (await startResp.json()) as HermesRunStarted;
    runId = started.run_id;
    if (!runId) {
      throw new Error("Connector did not return a run_id");
    }
  } finally {
    clearTimeout(startTimeout);
  }

  // Step 2: poll GET /v1/runs/:run_id until completed or failed
  // Total polling window matches the connector timeout (default 30 s).
  const pollDeadline = Date.now() + Math.max(config.timeoutMs, 60_000);
  let pollIntervalMs = 800;

  while (Date.now() < pollDeadline) {
    await sleep(pollIntervalMs);
    // Back off gently so we don't hammer the gateway
    pollIntervalMs = Math.min(pollIntervalMs * 1.4, 4000);

    const pollController = new AbortController();
    const pollTimeout = setTimeout(() => pollController.abort(), 10_000);

    let result: HermesRunResult;
    try {
      const pollResp = await fetch(`${config.url}/v1/runs/${runId}`, {
        method: "GET",
        headers,
        signal: pollController.signal,
      });

      if (!pollResp.ok) {
        // transient error — keep polling
        continue;
      }

      result = (await pollResp.json()) as HermesRunResult;
    } finally {
      clearTimeout(pollTimeout);
    }

    if (result.status === "completed") {
      return {
        connectorRunId: runId,
        accepted: true,
        assistantMessage: typeof result.output === "string" ? result.output : undefined,
      };
    }

    if (result.status === "failed" || result.status === "stopped") {
      throw new Error(`Hermes run ${result.status}: ${result.last_event ?? "unknown"}`);
    }
    // status is "running" or "started" — keep polling
  }

  // Deadline exceeded — return partial (the run may still complete on the gateway)
  return {
    connectorRunId: runId,
    accepted: true,
    assistantMessage: undefined,
  };
}

export async function sendRunControlToConnector(
  connectorRunId: string,
  action: "pause" | "stop" | "reset",
): Promise<void> {
  const config = await getConnectorConfig();

  if (!config.url) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.url}/v1/runs/${connectorRunId}/${action}`, {
      method: "POST",
      headers: buildHeaders(config.token),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await safeJson(response);
      throw new Error(`Connector ${action} failed (${response.status}): ${JSON.stringify(details)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function hermesConnectorConfigured() {
  const config = await getConnectorConfig();
  return config.url.length > 0;
}

export async function getConnectorSettingsForUI() {
  const config = await getConnectorConfig();
  const stored = await getStoredSettings();

  return {
    url: config.url,
    timeoutMs: config.timeoutMs,
    tokenConfigured: Boolean((stored.token ?? "").trim() || (process.env.HERMES_CONNECTOR_TOKEN ?? "").trim()),
    source: config.source,
  };
}

export async function updateConnectorSettings(input: {
  url?: string | null;
  timeoutMs?: number | null;
  token?: string | null;
  clearToken?: boolean;
}) {
  if (input.url !== undefined) {
    const normalized = normalizeUrl(input.url ?? "");
    if (normalized) {
      await prisma.systemSetting.upsert({
        where: { key: KEY_URL },
        update: { value: normalized },
        create: { key: KEY_URL, value: normalized },
      });
    } else {
      await prisma.systemSetting.deleteMany({ where: { key: KEY_URL } });
    }
  }

  if (input.timeoutMs !== undefined && input.timeoutMs !== null) {
    await prisma.systemSetting.upsert({
      where: { key: KEY_TIMEOUT_MS },
      update: { value: String(parseTimeout(input.timeoutMs, 15000)) },
      create: { key: KEY_TIMEOUT_MS, value: String(parseTimeout(input.timeoutMs, 15000)) },
    });
  }

  if (input.clearToken === true) {
    await prisma.systemSetting.deleteMany({ where: { key: KEY_TOKEN } });
  } else if (input.token !== undefined && input.token !== null) {
    const token = input.token.trim();
    if (token) {
      await prisma.systemSetting.upsert({
        where: { key: KEY_TOKEN },
        update: { value: token },
        create: { key: KEY_TOKEN, value: token },
      });
    }
  }

  return getConnectorSettingsForUI();
}

export async function testConnectorHealth(overrides?: {
  url?: string;
  token?: string;
  timeoutMs?: number;
}) {
  const config = await getConnectorConfig();
  const url = normalizeUrl(overrides?.url ?? config.url);
  const token = overrides?.token ?? config.token;
  const timeoutMs = parseTimeout(overrides?.timeoutMs ?? config.timeoutMs, 15000);

  if (!url) {
    return { ok: false, error: "Connector URL is not configured." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: buildHeaders(token),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await safeJson(response);
      return {
        ok: false,
        error: `Health check failed (${response.status})`,
        elapsedMs: Date.now() - startedAt,
        details,
      };
    }

    const body = await safeJson(response);
    return {
      ok: true,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown health check error",
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Telemetry fetch helper
// ---------------------------------------------------------------------------
/**
 * Fetch telemetry from a configured Hermes connector (/v1/telemetry).
 * Returns an object similar to testConnectorHealth: { ok, body, elapsedMs, error }
 */
export async function fetchConnectorTelemetry(overrides?: { url?: string; token?: string; timeoutMs?: number }) {
  const config = await getConnectorConfig();
  const url = normalizeUrl(overrides?.url ?? config.url);
  const token = overrides?.token ?? config.token;
  const timeoutMs = parseTimeout(overrides?.timeoutMs ?? config.timeoutMs, 15000);

  if (!url) {
    return { ok: false, error: "Connector URL is not configured.", elapsedMs: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${url}/v1/telemetry`, {
      method: "GET",
      headers: buildHeaders(token),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await safeJson(response);
      return {
        ok: false,
        error: `Telemetry fetch failed (${response.status})`,
        elapsedMs: Date.now() - startedAt,
        details,
      };
    }

    const body = await safeJson(response);
    return {
      ok: true,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown telemetry fetch error",
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}
