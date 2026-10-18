export type NexusAgentEventKind = "dispatched" | "replied" | "failed" | "completed";

export interface NexusAgentActivityEvent {
  runId: string;
  step: number;
  kind: NexusAgentEventKind;
  senderRole: string;
  recipientRole: string;
  instruction?: string;
  reply?: string;
  artifact?: string;
  createdAt: string;
}

export const NEXUS_AGENT_ROLES = [
  { role: "Property Matching AI", department: "Research & Insights", avatar: "business-analyst", task: "Review property discovery and matching requirements." },
  { role: "Listing Auditor AI", department: "Cloud, Quality & Knowledge", avatar: "cybersecurity-guardian", task: "Check listing, ownership, and verification claims against available evidence." },
  { role: "QA Testing Bot", department: "Cloud, Quality & Knowledge", avatar: "qa-testing-bot", task: "Prepare acceptance checks and identify unresolved blockers." },
] as const;

export type NexusAgentStepStatus = "queued" | "working" | "completed" | "failed";

export interface NexusAgentStepActivity {
  step: number;
  role: string;
  department: string;
  avatar: string;
  task: string;
  status: NexusAgentStepStatus;
  dispatch?: NexusAgentActivityEvent;
  response?: NexusAgentActivityEvent;
}

export interface NexusAgentRunActivity {
  runId?: string;
  status: "idle" | "working" | "completed" | "failed";
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  lastUpdated?: string;
  steps: NexusAgentStepActivity[];
}

export function summarizeNexusAgentActivity(events: NexusAgentActivityEvent[]): NexusAgentRunActivity {
  const ordered = [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const runId = ordered[0]?.runId;
  if (!runId) {
    return { status: "idle", completedSteps: 0, totalSteps: NEXUS_AGENT_ROLES.length, percentComplete: 0, steps: [] };
  }

  const runEvents = ordered.filter((event) => event.runId === runId);
  const completion = runEvents.find((event) => event.kind === "completed");
  const steps = NEXUS_AGENT_ROLES.map((agent, index): NexusAgentStepActivity => {
    const stepEvents = runEvents.filter((event) => event.step === index + 1);
    const dispatch = stepEvents.find((event) => event.kind === "dispatched");
    const response = stepEvents.find((event) => event.kind === "replied" || event.kind === "failed");
    return {
      step: index + 1,
      ...agent,
      status: response?.kind === "failed" ? "failed" : response ? "completed" : dispatch ? "working" : "queued",
      ...(dispatch ? { dispatch } : {}),
      ...(response ? { response } : {}),
    };
  });
  const completedSteps = steps.filter((step) => step.status === "completed").length;
  const failed = steps.some((step) => step.status === "failed");
  const working = steps.some((step) => step.status === "working");
  const status = completion ? "completed" : failed ? "failed" : working ? "working" : "idle";

  return {
    runId,
    status,
    completedSteps,
    totalSteps: steps.length,
    percentComplete: Math.round((completedSteps / steps.length) * 100),
    lastUpdated: runEvents[0]?.createdAt,
    steps,
  };
}