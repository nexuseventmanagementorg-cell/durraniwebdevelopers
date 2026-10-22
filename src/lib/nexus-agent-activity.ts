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
  { role: "Requirements Analyst", agencyRole: "Business Analyst", department: "Executive & Project Delivery", avatar: "business-analyst", task: "Convert a project brief into a structured, human-reviewable requirements draft." },
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
  const status = completion || (steps.length > 0 && completedSteps === steps.length)
    ? "completed"
    : failed
      ? "failed"
      : working
        ? "working"
        : "idle";

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