import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getNexusActivityUrl(): string | null {
  const configured = process.env.NEXUS_AGENT_ACTIVITY_URL?.trim();
  const value = configured || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3001/api/agents/run" : "");
  if (!value) return null;
  try {
    const url = new URL(value);
    const localHttp = process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.protocol === "http:";
    if (url.protocol !== "https:" && !localHttp) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const url = getNexusActivityUrl();
  const token = process.env.NEXUS_AGENT_ACTIVITY_TOKEN || process.env.NEXUS_AGENT_RUN_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ events: [], available: false, error: "Nexus agent activity connection is not configured." }, { status: 503 });
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.events)) {
      return NextResponse.json({ events: [], available: false, error: "Nexus agent activity is unavailable." }, { status: 503 });
    }
    return NextResponse.json({ events: payload.events, available: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ events: [], available: false, error: "Nexus agent activity is unavailable." }, { status: 503 });
  }
}