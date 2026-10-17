import type {
  ProjectAutomationWorkflow,
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