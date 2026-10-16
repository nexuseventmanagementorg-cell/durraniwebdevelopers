import { createHash } from "crypto";
import { getPaymentSupabase } from "@/lib/payment-server";
import { getPakistanDateKey } from "@/lib/dates";

export const VISITOR_ANALYTICS_EVENTS = ["visitor", "calculator", "estimator"] as const;
export type VisitorAnalyticsEvent = (typeof VISITOR_ANALYTICS_EVENTS)[number];

export function isVisitorAnalyticsEvent(value: unknown): value is VisitorAnalyticsEvent {
  return VISITOR_ANALYTICS_EVENTS.some((event) => event === value);
}

export function hashVisitorId(visitorId: string): string {
  return createHash("sha256").update(visitorId).digest("hex");
}

export async function recordVisitorEvent(
  event: VisitorAnalyticsEvent,
  visitorHash: string
): Promise<void> {
  const supabase = getPaymentSupabase();
  const { error } = await supabase.rpc("record_daily_visitor_event", {
    p_day: getPakistanDateKey(),
    p_event: event,
    p_visitor_hash: visitorHash,
  });
  if (error) throw error;
}

export async function getDailyVisitorCounts(): Promise<{
  date: string;
  counts: Record<VisitorAnalyticsEvent, number>;
}> {
  const date = getPakistanDateKey();
  const supabase = getPaymentSupabase();
  const { data, error } = await supabase
    .from("daily_visitor_counts")
    .select("event,visitor_count")
    .eq("day", date);
  if (error) throw error;

  const counts: Record<VisitorAnalyticsEvent, number> = {
    visitor: 0,
    calculator: 0,
    estimator: 0,
  };
  for (const row of data || []) {
    if (isVisitorAnalyticsEvent(row.event)) {
      counts[row.event] = Number(row.visitor_count);
    }
  }
  return { date, counts };
}
