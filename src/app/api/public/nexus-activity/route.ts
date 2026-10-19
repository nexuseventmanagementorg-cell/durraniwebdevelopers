import { NextResponse } from "next/server";
import { getLatestPublicNexusAgentRun } from "@/lib/nexus-agent-storage";
import type { NexusAgentActivityEvent } from "@/lib/nexus-agent-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const run = await getLatestPublicNexusAgentRun();
    if (!run) {
      return NextResponse.json(
        { events: [], available: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const eventBase = {
      runId: run.id,
      step: 1,
      senderRole: "Nexus Orchestrator",
      recipientRole: "Requirements Analyst",
      createdAt: run.updated_at,
    };
    const events: NexusAgentActivityEvent[] = [
      { ...eventBase, kind: "dispatched", createdAt: run.created_at },
      ...(run.status === "completed"
        ? [{ ...eventBase, kind: "replied" as const }]
        : run.status === "failed"
          ? [{ ...eventBase, kind: "failed" as const }]
          : []),
    ];

    return NextResponse.json(
      { events, available: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        events: [],
        available: false,
        error: "Agent activity storage is unavailable. Review and apply supabase/agent-workforce.sql, then verify server-side Supabase configuration.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
