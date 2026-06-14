import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData } from "@/lib/bootstrap";
import { testConnectorHealth } from "@/lib/hermesConnector";

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json().catch(() => ({}));

  const overrideUrl = typeof body.url === "string" ? body.url : undefined;
  const overrideToken = typeof body.token === "string" ? body.token : undefined;
  const overrideTimeoutMs =
    typeof body.timeoutMs === "number" ? body.timeoutMs : undefined;

  const result = await testConnectorHealth({
    url: overrideUrl,
    token: overrideToken,
    timeoutMs: overrideTimeoutMs,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
