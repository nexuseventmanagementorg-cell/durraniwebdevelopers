"use client";

import type { VisitorAnalyticsEvent } from "@/lib/visitor-analytics";
import { getPakistanDateKey } from "@/lib/dates";

const STORAGE_KEY = "dwd_daily_visitor_id";

function getDailyVisitorId(): string {
  const today = getPakistanDateKey();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const value: unknown = JSON.parse(saved);
      if (
        typeof value === "object" &&
        value !== null &&
        "date" in value &&
        value.date === today &&
        "visitorId" in value &&
        typeof value.visitorId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.visitorId)
      ) {
        return value.visitorId;
      }
    } catch (error) {
      console.error("Could not read the daily analytics identifier", error);
    }
  }

  const visitorId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, visitorId }));
  return visitorId;
}

export async function trackVisitorEvent(event: VisitorAnalyticsEvent): Promise<void> {
  const response = await fetch("/api/public/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, visitorId: getDailyVisitorId() }),
    keepalive: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Analytics tracking failed (HTTP ${response.status}).`);
  }
}
