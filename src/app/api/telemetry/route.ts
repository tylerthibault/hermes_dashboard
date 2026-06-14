import { NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { getConnectorSettingsForUI, testConnectorHealth } from "@/lib/hermesConnector";

export async function GET() {
  await ensureSeedData();

  const settings = await getConnectorSettingsForUI();
  const checkedAt = new Date().toISOString();

  if (!settings.url) {
    return NextResponse.json({
      checkedAt,
      systemStatus: "offline",
      connector: {
        status: "offline",
        source: settings.source,
        latencyMs: null,
        message: "Connector URL not configured",
      },
    });
  }

  const health = await testConnectorHealth();

  const status = health.ok
    ? "online"
    : settings.url
      ? "degraded"
      : "offline";

  return NextResponse.json({
    checkedAt,
    systemStatus: status,
    connector: {
      status,
      source: settings.source,
      latencyMs: typeof health.elapsedMs === "number" ? health.elapsedMs : null,
      message: health.ok ? "Connector reachable" : health.error ?? "Connector unavailable",
    },
  });
}
