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