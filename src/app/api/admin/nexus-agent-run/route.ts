import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";

export const maxDuration = 60;

function getNexusRunUrl(): string | null {
  const configured = process.env.NEXUS_AGENT_RUN_URL?.trim();
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

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  const goal = body && typeof body === "object" && "goal" in body && typeof body.goal === "string"
    ? body.goal.trim()
    : "";
  if (!goal || goal.length > 1200 || /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){9,}/.test(goal)) {
    return NextResponse.json({ success: false, error: "Enter a project instruction up to 1200 characters without email addresses or phone numbers." }, { status: 400 });
  }

  const url = getNexusRunUrl();
  const token = process.env.NEXUS_AGENT_RUN_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ success: false, error: "The server-side Nexus runner URL and operator token must be configured." }, { status: 503 });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    const result = await response.json();
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Nexus agent runner did not respond." }, { status: 503 });
  }
}