export type NexusBuildMilestoneStatus = "completed" | "active" | "queued" | "blocked";

export interface NexusBuildMilestone {
  label: string;
  status: NexusBuildMilestoneStatus;
}

export const NEXUS_BUILD_MILESTONES: readonly NexusBuildMilestone[] = [
  { label: "Repository and assistant audit", status: "completed" },
  { label: "Server-only Gemini gateway", status: "completed" },
  { label: "Assistant drawer integration", status: "completed" },
  { label: "Validation, safety, and failure tests", status: "completed" },
  { label: "Ground replies in approved property data", status: "queued" },
  { label: "Configure key and verify live model replies", status: "blocked" },
  { label: "Production deployment and operations review", status: "queued" },
];

const completedMilestones = NEXUS_BUILD_MILESTONES.filter(
  (milestone) => milestone.status === "completed"
).length;

export const NEXUS_BUILD_PROGRESS = {
  completedMilestones,
  totalMilestones: NEXUS_BUILD_MILESTONES.length,
  percentComplete: Math.round((completedMilestones / NEXUS_BUILD_MILESTONES.length) * 100),
};

export interface NexusBuildWorkItem {
  role: string;
  agencyRole: string;
  department: string;
  avatar: string;
  status: NexusBuildMilestoneStatus;
  task: string;
  output: string;
  artifact: string;
  file: string;
}

export interface NexusBuildMessage {
  workRole: string;
  senderRole: string;
  recipientRole: string;
  body: string;
  recordedAt: string;
  artifact?: string;
}

export const NEXUS_BUILD_MESSAGES: readonly NexusBuildMessage[] = [];

const NEXUS_REPOSITORY = "https://github.com/nexuseventmanagementorg-cell/nexus.properties.network";

export const NEXUS_BUILD_WORK: readonly NexusBuildWorkItem[] = [
  {
    role: "AI Systems Architect",
    agencyRole: "Backend Architect",
    department: "Apps & Systems Engineering",
    avatar: "backend-architect",
    status: "completed",
    task: "Audited the 54-role registry, assistant routing, and declared backend gaps.",
    output: "Confirmed that the 54-role registry is a design catalogue, not 54 deployed workers. Property records are sample data and need provenance.",
    artifact: `${NEXUS_REPOSITORY}/blob/main/NEXUS_PHASE_1_IMPLEMENTATION_REPORT_v1.0.md`,
    file: "NEXUS_PHASE_1_IMPLEMENTATION_REPORT_v1.0.md",
  },
  {
    role: "Conversation Engineer",
    agencyRole: "Automation Workflow Engineer",
    department: "Apps & Systems Engineering",
    avatar: "automation-workflow-engineer",
    status: "completed",
    task: "Added a server-only Gemini gateway, bounded conversation history, and honest no-key fallback.",
    output: "The drawer uses the gateway for unmatched conversation; exact sample search and FAQ answers stay deterministic. No provider key is in the browser bundle.",
    artifact: `${NEXUS_REPOSITORY}/blob/main/src/server/aiChat.ts`,
    file: "src/server/aiChat.ts",
  },
  {
    role: "Property Intelligence Engineer",
    agencyRole: "Business Analyst",
    department: "Executive & Project Delivery",
    avatar: "business-analyst",
    status: "queued",
    task: "Connect replies to property search evidence without inventing listings.",
    output: "Next: pass only clearly labelled sample or verified records into response context; never upgrade sample data to verified.",
    artifact: `${NEXUS_REPOSITORY}/blob/main/src/utils/propertyIntentParser.ts`,
    file: "src/utils/propertyIntentParser.ts",
  },
  {
    role: "Quality & Safety Engineer",
    agencyRole: "QA Testing Bot",
    department: "Cloud, Quality & Knowledge",
    avatar: "qa-testing-bot",
    status: "completed",
    task: "Added five mocked tests for validation, key isolation, safeguards, and provider failures.",
    output: "All five gateway tests pass without paid API calls. Live provider quality still needs a configured key and human-reviewed evaluations.",
    artifact: `${NEXUS_REPOSITORY}/blob/main/tests/ai-chat.test.ts`,
    file: "tests/ai-chat.test.ts",
  },
  {
    role: "Model Operations",
    agencyRole: "DevOps Cloud Engineer",
    department: "Cloud, Quality & Knowledge",
    avatar: "devops-cloud-engineer",
    status: "blocked",
    task: "Enable live Gemini responses after a server-only API key is configured.",
    output: "No API key was shared or committed. Until NEXUS_GEMINI_API_KEY is configured in server env and Vercel, the assistant remains in local-preview mode.",
    artifact: `${NEXUS_REPOSITORY}/blob/main/.env.example`,
    file: ".env.example",
  },
];