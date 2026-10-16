"use client";

import type { VisitorAnalyticsEvent } from "@/lib/visitor-analytics";

const STORAGE_KEY = "dwd_visitor_id";
const LEGACY_STORAGE_KEY = "dwd_daily_visitor_id";
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getVisitorId(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && VISITOR_ID_PATTERN.test(saved)) return saved;

  const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacySaved) {
    try {
      const value: unknown = JSON.parse(legacySaved);
      if (
        typeof value === "object" &&
        value !== null &&
        "visitorId" in value &&
        typeof value.visitorId === "string" &&
        VISITOR_ID_PATTERN.test(value.visitorId)
      ) {
        localStorage.setItem(STORAGE_KEY, value.visitorId);
        return value.visitorId;
      }
    } catch (error) {
      console.error("Could not read the analytics identifier", error);
    }
  }

  const visitorId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, visitorId);
  return visitorId;
}

export async function trackVisitorEvent(event: VisitorAnalyticsEvent): Promise<void> {
  const response = await fetch("/api/public/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, visitorId: getVisitorId() }),
    keepalive: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Analytics tracking failed (HTTP ${response.status}).`);
  }
}
