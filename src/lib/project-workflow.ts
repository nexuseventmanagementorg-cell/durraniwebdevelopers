import type {
  ProjectAutomationWorkflow,
  PublicProjectProgress,
  PublicProjectMilestoneStatus,
  ProjectWorkflowTask,
  ProjectWorkflowTaskStatus,
} from "@/lib/types";

const WORKFLOW_TASKS: Omit<ProjectWorkflowTask, "status">[] = [
  { id: "scope-review", role: "Requirements Analyst", title: "Review approved inquiry scope", dependsOn: [] },
  { id: "client-assets", role: "Client Intake", title: "Collect approved content and brand assets", dependsOn: ["scope-review"] },
  { id: "build-plan", role: "Solution Architect", title: "Prepare the implementation plan", dependsOn: ["scope-review", "client-assets"] },
  { id: "implementation", role: "Web Developer", title: "Build the approved website scope", dependsOn: ["build-plan"] },
  { id: "quality-assurance", role: "QA Engineer", title: "Test functionality and responsive layouts", dependsOn: ["implementation"] },
  { id: "client-preview", role: "Client Review", title: "Share preview and collect client approval", dependsOn: ["quality-assurance"] },
  { id: "production-release", role: "Release Manager", title: "Approve production deployment and delivery", dependsOn: ["client-preview"], adminApprovalRequired: true },
];

const PUBLIC_MILESTONES = [
  { id: "requirements", label: "Requirements and content", taskIds: ["scope-review", "client-assets"] },
  { id: "planning", label: "Design and technical plan", taskIds: ["build-plan"] },
  { id: "development", label: "Website development", taskIds: ["implementation"] },
  { id: "quality", label: "Quality checks", taskIds: ["quality-assurance"] },
  { id: "preview", label: "Website preview", taskIds: ["client-preview"] },
  { id: "launch", label: "Final launch approval", taskIds: ["production-release"] },
] as const;

function isPublicPreviewUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function buildPublicProjectProgress(
  projectName: string,
  workflow: ProjectAutomationWorkflow,
  deploymentUrl: string | undefined,
  updatedAt: string
): PublicProjectProgress {
  const milestones = PUBLIC_MILESTONES.map((milestone) => {
    const tasks = milestone.taskIds.map((taskId) =>
      workflow.tasks.find((task) => task.id === taskId)
    );
    const complete = tasks.every((task) => task?.status === "completed");
    const awaitingAdmin = tasks.some((task) => task?.status === "awaiting_admin");
    const inProgress = tasks.some((task) => task?.status === "in_progress");
    const ready = tasks.some((task) => task?.status === "ready");
    const status: PublicProjectMilestoneStatus = complete
      ? "completed"
      : awaitingAdmin
        ? "awaiting_admin"
        : inProgress
          ? "active"
          : ready
            ? "ready"
            : "waiting";

    return { id: milestone.id, label: milestone.label, status };
  });

  const completedCount = milestones.filter((milestone) => milestone.status === "completed").length;
  const previewMilestone = milestones.find((milestone) => milestone.id === "preview");

  return {
    projectName,
    milestones,
    percentComplete: Math.round((completedCount / milestones.length) * 100),
    updatedAt,
    ...(previewMilestone?.status === "completed" && isPublicPreviewUrl(deploymentUrl)
      ? { previewUrl: deploymentUrl }
      : {}),
  };
}

export function createProjectAutomationWorkflow(
  sourceInquiryId: string,
  createdAt = new Date().toISOString()
): ProjectAutomationWorkflow {
  const tasks = WORKFLOW_TASKS.map((task, index) => ({
    ...task,
    status: (index === 0 ? "ready" : "blocked") as ProjectWorkflowTaskStatus,
  }));

  return {
    createdAt,
    sourceInquiryId,
    mode: "admin_assisted",
    status: "ready",
    tasks,
  };
}

export function updateProjectWorkflowTask(
  workflow: ProjectAutomationWorkflow,
  taskId: string,
  status: Extract<ProjectWorkflowTaskStatus, "in_progress" | "completed">
): ProjectAutomationWorkflow | null {
  const task = workflow.tasks.find((item) => item.id === taskId);
  if (!task || task.status === "blocked" || task.status === "completed") return null;
  if (task.status === "awaiting_admin" && !(task.adminApprovalRequired && status === "completed")) return null;

  const prerequisitesComplete = task.dependsOn.every((dependencyId) =>
    workflow.tasks.some((dependency) => dependency.id === dependencyId && dependency.status === "completed")
  );
  if (!prerequisitesComplete) return null;

  const updatedTasks = workflow.tasks.map((item) =>
    item.id === taskId ? { ...item, status } : item
  );
  const completedTaskIds = new Set(
    updatedTasks.filter((item) => item.status === "completed").map((item) => item.id)
  );
  const tasks = updatedTasks.map((item) => {
    if (item.status !== "blocked") return item;
    const ready = item.dependsOn.every((dependencyId) => completedTaskIds.has(dependencyId));
    return ready
      ? { ...item, status: item.adminApprovalRequired ? "awaiting_admin" as const : "ready" as const }
      : item;
  });
  const pendingTasks = tasks.some((item) => item.status !== "completed");

  return {
    ...workflow,
    status: !pendingTasks
      ? "completed"
      : tasks.some((item) => item.status === "awaiting_admin")
        ? "awaiting_admin"
        : tasks.some((item) => item.status === "in_progress")
          ? "in_progress"
          : "ready",
    tasks,
  };
}