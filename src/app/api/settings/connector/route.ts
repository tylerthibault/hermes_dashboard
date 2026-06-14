import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import {
  getConnectorSettingsForUI,
  updateConnectorSettings,
} from "@/lib/hermesConnector";

export async function GET() {
  await ensureSeedData();
  const settings = await getConnectorSettingsForUI();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json();

  if (
    body.url !== undefined &&
    body.url !== null &&
    typeof body.url !== "string"
  ) {
    return NextResponse.json({ error: "url must be a string" }, { status: 400 });
  }

  if (
    body.timeoutMs !== undefined &&
    body.timeoutMs !== null &&
    typeof body.timeoutMs !== "number"
  ) {
    return NextResponse.json({ error: "timeoutMs must be a number" }, { status: 400 });
  }

  if (
    body.token !== undefined &&
    body.token !== null &&
    typeof body.token !== "string"
  ) {
    return NextResponse.json({ error: "token must be a string" }, { status: 400 });
  }

  const updated = await updateConnectorSettings({
    url: body.url,
    timeoutMs: body.timeoutMs,
    token: body.token,
    clearToken: body.clearToken === true,
  });

  return NextResponse.json(updated);
}
