import { createHash } from "crypto";
import { DWD_WORKFORCE_AGENTS } from "@/lib/workforce-agents";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  isCeoStrategyProjectApproved,
  validateCeoStrategyOutput,
  type CeoStrategyRecord,
  type CeoStrategyRisk,
} from "@/lib/ceo-strategy";
import type { Inquiry, Project } from "@/lib/types";

export const PROJECT_MANAGER_AGENT_ID = "project-manager";
export const PROJECT_MANAGER_PLAN_VERSION = 1 as const;

export type ProjectManagerTaskStatus =
  | "DRAFT"
  | "PLANNED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "READY"
  | "BLOCKED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "COMPLETED"
  | "VERIFIED";

export type ProjectManagerExecutionCapability =
  | "PLANNING_ONLY"
  | "EXECUTION_SUPPORTED"
  | "EXECUTION_UNAVAILABLE"
  | "VERIFICATION_UNAVAILABLE";

export interface ProjectManagerTask {
  id: string;
  projectId: string;
  phaseId: string;
  milestoneId: string;
  parentTaskId: string | null;
  subtaskIds: string[];
  title: string;
  description: string;
  agentRoleId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dependencies: string[];
  permissionRequirements: string[];
  humanApprovalRequirements: string[];
  estimatedEffort: { status: "UNKNOWN"; minHours: null; maxHours: null; basis: string };
  requiredInputs: string[];
  expectedOutputs: string[];
  acceptanceCriteria: string[];
  executionCapability: ProjectManagerExecutionCapability;
  verificationRequirements: string[];
  status: ProjectManagerTaskStatus;
}

export interface ProjectManagerPhase {
  id: string;
  title: string;
  outcome: string;
  milestoneIds: string[];
  taskIds: string[];
  status: "PLANNED" | "BLOCKED";
}

export interface ProjectManagerMilestone {
  id: string;
  phaseId: string;
  title: string;
  taskIds: string[];
  targetDate: null;
  status: "PLANNED" | "BLOCKED";
}

export interface ProjectManagerRisk {
  id: string;
  projectId: string;
  description: string;
  probability: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  impact: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  severity: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  affectedTaskIds: string[];
  mitigation: string;
  responsibleRoleId: string;
  status: "MODEL_GENERATED" | "SYSTEM_DERIVED" | "HUMAN_CONFIRMED" | "MITIGATED";
}

export interface ProjectManagerPlan {
  id: string;
  version: typeof PROJECT_MANAGER_PLAN_VERSION;
  projectId: string;
  agentId: typeof PROJECT_MANAGER_AGENT_ID;
  sourceStrategyId: string;
  sourceStrategyVersion: string;
  sourceStrategyHash: string;
  status: "AWAITING_APPROVAL" | "APPROVED" | "NEEDS_INPUT";
  generatedAt: string;
  generatedBy: "deterministic_planner";
  phases: ProjectManagerPhase[];
  milestones: ProjectManagerMilestone[];
  tasks: ProjectManagerTask[];
  risks: ProjectManagerRisk[];
  timeline: {
    estimatedDuration: "UNKNOWN";
    dependencyWaitingTime: "UNKNOWN";
    humanApprovalWaitingTime: "UNKNOWN";
    actualElapsedTime: "NOT_STARTED";
    explanation: string;
  };
  capabilityDimensions: {
    planning: true;
    codeGeneration: false;
    frontendImplementation: false;
    backendImplementation: false;
    databaseImplementation: false;
    apiIntegration: false;
    browserInteraction: false;
    automatedQA: false;
    productionDeployment: false;
    independentVerification: false;
  };
  approval: { approvedBy: string; approvedAt: string } | null;
  blockers: string[];
}

const ROLE_BY_ID = new Map(DWD_WORKFORCE_AGENTS.map((agent) => [agent.avatar, agent]));
const ROLE_BY_NAME = new Map(DWD_WORKFORCE_AGENTS.map((agent) => [agent.role, agent]));

export class ProjectManagerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectManagerValidationError";
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function strategyIdentity(strategy: CeoStrategyRecord) {
  const strategyId = `strategy-${digest(`${strategy.sourceHash}:${strategy.generatedAt}:${strategy.model}`).slice(0, 24)}`;
  const strategyVersion = digest(JSON.stringify({
    sourceHash: strategy.sourceHash,
    generatedAt: strategy.generatedAt,
    plan: strategy.plan,
  }));
  return { strategyId, strategyVersion };
}

function validateApprovedStrategy(project: Project, inquiry: Inquiry): {
  strategy: CeoStrategyRecord;
  strategyId: string;
  strategyVersion: string;
} {
  const strategy = project.ceoStrategy;
  if (!strategy || strategy.status !== "approved" || !strategy.approval ||
      !strategy.approval.approvedBy.trim() ||
      !Number.isFinite(Date.parse(strategy.approval.approvedAt)) ||
      !strategy.generatedAt || !strategy.model || !/^[a-f0-9]{64}$/i.test(strategy.sourceHash)) {
    throw new ProjectManagerValidationError("A human-approved, complete CEO strategy is required.");
  }
  if (!isCeoStrategyProjectApproved(project, inquiry)) {
    throw new ProjectManagerValidationError("The project inquiry conversion, commercial approval, or verified advance is no longer valid.");
  }
  const input = buildCeoStrategyInput(project, inquiry);
  if (hashCeoStrategyInput(input) !== strategy.sourceHash) {
    throw new ProjectManagerValidationError("The CEO strategy is outdated because the approved project scope changed.");
  }
  validateCeoStrategyOutput(strategy.plan, input);
  const { strategyId, strategyVersion } = strategyIdentity(strategy);
  return { strategy, strategyId, strategyVersion };
}

function taskId(projectId: string, version: string, assignmentId: string): string {
  return `wbs-${digest(`${projectId}:${version}:${assignmentId}`).slice(0, 20)}`;
}

function severity(probability: ProjectManagerRisk["probability"], impact: ProjectManagerRisk["impact"]): ProjectManagerRisk["severity"] {
  if (probability === "UNKNOWN" || impact === "UNKNOWN") return "UNKNOWN";
  const score = ({ LOW: 1, MEDIUM: 2, HIGH: 3 }[probability] || 1) *
    ({ LOW: 1, MEDIUM: 2, HIGH: 3 }[impact] || 1);
  return score >= 6 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
}

function riskFromStrategy(
  projectId: string,
  risk: CeoStrategyRisk,
  affectedTaskIds: string[],
  index: number
): ProjectManagerRisk {
  return {
    id: `risk-${digest(`${projectId}:${index}:${risk.risk.text}`).slice(0, 16)}`,
    projectId,
    description: risk.risk.text,
    probability: risk.likelihood,
    impact: risk.impact,
    severity: severity(risk.likelihood, risk.impact),
    affectedTaskIds,
    mitigation: risk.mitigation.text,
    responsibleRoleId: "project-manager",
    status: "MODEL_GENERATED",
  };
}

export function buildProjectManagerPlan(project: Project, inquiry: Inquiry): ProjectManagerPlan {
  const { strategy, strategyId, strategyVersion } = validateApprovedStrategy(project, inquiry);
  const roleAssignments = strategy.plan.specialistAssignments;
  const idsByRole = new Map(roleAssignments.map((assignment) => [
    assignment.agentRoleId,
    taskId(project.id, strategyVersion, assignment.agentRoleId),
  ]));
  const phases: ProjectManagerPhase[] = strategy.plan.projectPhases.map((phase) => {
    const id = `phase-${digest(`${project.id}:${strategyVersion}:${phase.id}`).slice(0, 16)}`;
    return {
      id,
      title: phase.title,
      outcome: phase.outcome.text,
      milestoneIds: [`milestone-${digest(`${project.id}:${strategyVersion}:${phase.id}`).slice(0, 16)}`],
      taskIds: [],
      status: "PLANNED",
    };
  });
  const phaseByRole = new Map<string, ProjectManagerPhase>();
  for (let index = 0; index < strategy.plan.projectPhases.length; index += 1) {
    const phase = strategy.plan.projectPhases[index];
    for (const roleId of phase.taskAssignmentIds) {
      if (!phaseByRole.has(roleId)) phaseByRole.set(roleId, phases[index]);
    }
  }
  const parentTasks: ProjectManagerTask[] = roleAssignments.map((assignment) => {
    const role = ROLE_BY_ID.get(assignment.agentRoleId);
    if (!role || role.role !== assignment.agentRole || !ROLE_BY_NAME.has(role.role)) {
      throw new ProjectManagerValidationError("The approved strategy references a role outside the current 50-agent registry.");
    }
    const phase = phaseByRole.get(assignment.agentRoleId);
    if (!phase) throw new ProjectManagerValidationError(`The assignment ${assignment.agentRoleId} is not linked to a project phase.`);
    const id = idsByRole.get(assignment.agentRoleId)!;
    return {
      id,
      projectId: project.id,
      phaseId: phase.id,
      milestoneId: phase.milestoneIds[0],
      parentTaskId: null,
      subtaskIds: [],
      title: assignment.taskTitle,
      description: assignment.instructions,
      agentRoleId: role.avatar,
      priority: "MEDIUM",
      dependencies: assignment.dependencies.map((dependency) => idsByRole.get(dependency)!).sort(),
      permissionRequirements: [...assignment.permissionRequirements],
      humanApprovalRequirements: [...assignment.humanApprovalRequirements],
      estimatedEffort: {
        status: "UNKNOWN",
        minHours: null,
        maxHours: null,
        basis: "No verified estimation dataset or worker throughput is available.",
      },
      requiredInputs: [...assignment.requiredInputs],
      expectedOutputs: [...assignment.expectedOutputs],
      acceptanceCriteria: [...assignment.acceptanceCriteria],
      executionCapability: "EXECUTION_UNAVAILABLE",
      verificationRequirements: ["Independent artifact and acceptance-criteria verification required; no customer-project verifier is connected."],
      status: "BLOCKED",
    };
  });
  const subtasks = parentTasks.flatMap((parent) => {
    const assignment = roleAssignments.find((item) => item.agentRoleId === parent.agentRoleId);
    if (!assignment) throw new ProjectManagerValidationError("A generated task lost its source assignment.");
    const children = assignment.expectedOutputs.map((output, index) => {
      const id = `wbs-${digest(`${parent.id}:deliverable:${index}`).slice(0, 20)}`;
      return {
        id,
        projectId: project.id,
        phaseId: parent.phaseId,
        milestoneId: parent.milestoneId,
        parentTaskId: parent.id,
        subtaskIds: [],
        title: `Deliverable: ${output}`,
        description: `Produce ${output} as a planning subtask of ${parent.title}.`,
        agentRoleId: parent.agentRoleId,
        priority: parent.priority,
        dependencies: [parent.id],
        permissionRequirements: [...parent.permissionRequirements],
        humanApprovalRequirements: [...parent.humanApprovalRequirements],
        estimatedEffort: { ...parent.estimatedEffort },
        requiredInputs: [...parent.requiredInputs],
        expectedOutputs: [output],
        acceptanceCriteria: [...parent.acceptanceCriteria],
        executionCapability: "EXECUTION_UNAVAILABLE" as const,
        verificationRequirements: [...parent.verificationRequirements],
        status: "BLOCKED" as const,
      };
    });
    parent.subtaskIds = children.map((child) => child.id);
    return children;
  });
  const tasks = [...parentTasks, ...subtasks];
  const taskByRole = new Map(roleAssignments.map((assignment) => [
    assignment.agentRoleId,
    parentTasks.find((task) => task.agentRoleId === assignment.agentRoleId)!,
  ]));
  for (let index = 0; index < strategy.plan.projectPhases.length; index += 1) {
    const phase = strategy.plan.projectPhases[index];
    const phaseTasks = phase.taskAssignmentIds
      .map((roleId: string) => taskByRole.get(roleId))
      .filter((task): task is ProjectManagerTask => Boolean(task))
      .flatMap((task) => [task, ...subtasks.filter((child) => child.parentTaskId === task.id)]);
    phases[index].taskIds = phaseTasks.map((task) => task.id);
  }
  const milestones: ProjectManagerMilestone[] = strategy.plan.projectPhases.map((phase, index) => ({
    id: phases[index].milestoneIds[0],
    phaseId: phases[index].id,
    title: phase.title,
    taskIds: [...phases[index].taskIds],
    targetDate: null,
    status: "BLOCKED",
  }));
  const allTaskIds = tasks.map((task) => task.id);
  const risks = strategy.plan.riskRegister.map((risk, index) =>
    riskFromStrategy(project.id, risk, allTaskIds, index)
  );
  if (strategy.plan.unknowns.length) {
    risks.push({
      id: `risk-${digest(`${project.id}:${strategyVersion}:unknowns`).slice(0, 16)}`,
      projectId: project.id,
      description: `Unresolved customer and project information: ${strategy.plan.unknowns.map((item) => item.text).join("; ")}`,
      probability: "UNKNOWN",
      impact: "UNKNOWN",
      severity: "UNKNOWN",
      affectedTaskIds: allTaskIds,
      mitigation: "Obtain and approve the missing customer requirements before execution.",
      responsibleRoleId: PROJECT_MANAGER_AGENT_ID,
      status: "SYSTEM_DERIVED",
    });
  }
  if (tasks.length) {
    risks.push({
      id: `risk-${digest(`${project.id}:${strategyVersion}:worker-adapter`).slice(0, 16)}`,
      projectId: project.id,
      description: "Customer-project execution and independent artifact verification are not connected to the existing local worker.",
      probability: "HIGH",
      impact: "HIGH",
      severity: "HIGH",
      affectedTaskIds: allTaskIds,
      mitigation: "Keep tasks blocked until an authorized project worker adapter and independent evidence verifier are implemented and reviewed.",
      responsibleRoleId: PROJECT_MANAGER_AGENT_ID,
      status: "SYSTEM_DERIVED",
    });
  }
  const blockerSet = new Set([
    ...strategy.plan.implementationBlockers.map((item) => item.text),
    ...tasks.map((task) => `Execution and independent verification adapters are unavailable for ${task.agentRoleId}.`),
  ]);
  return {
    id: `pm-${digest(`${project.id}:${strategyId}:${strategyVersion}`).slice(0, 24)}`,
    version: PROJECT_MANAGER_PLAN_VERSION,
    projectId: project.id,
    agentId: PROJECT_MANAGER_AGENT_ID,
    sourceStrategyId: strategyId,
    sourceStrategyVersion: strategyVersion,
    sourceStrategyHash: strategy.sourceHash,
    status: "AWAITING_APPROVAL",
    generatedAt: new Date().toISOString(),
    generatedBy: "deterministic_planner",
    phases,
    milestones,
    tasks,
    risks,
    timeline: {
      estimatedDuration: "UNKNOWN",
      dependencyWaitingTime: "UNKNOWN",
      humanApprovalWaitingTime: "UNKNOWN",
      actualElapsedTime: "NOT_STARTED",
      explanation: "No delivery dates or effort estimates are promised without verified workload, availability, and approval-wait data.",
    },
    capabilityDimensions: {
      planning: true,
      codeGeneration: false,
      frontendImplementation: false,
      backendImplementation: false,
      databaseImplementation: false,
      apiIntegration: false,
      browserInteraction: false,
      automatedQA: false,
      productionDeployment: false,
      independentVerification: false,
    },
    approval: null,
    blockers: Array.from(blockerSet),
  };
}

export function validateProjectManagerPlan(
  plan: ProjectManagerPlan,
  projectId: string
): void {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
      plan.projectId !== projectId || plan.agentId !== PROJECT_MANAGER_AGENT_ID ||
      plan.version !== PROJECT_MANAGER_PLAN_VERSION || typeof plan.id !== "string" || !plan.id.trim() ||
      typeof plan.sourceStrategyId !== "string" || !plan.sourceStrategyId ||
      typeof plan.sourceStrategyHash !== "string" || !/^[a-f0-9]{64}$/i.test(plan.sourceStrategyHash) ||
      typeof plan.sourceStrategyVersion !== "string" || !/^[a-f0-9]{64}$/i.test(plan.sourceStrategyVersion) ||
      typeof plan.generatedAt !== "string" || !Number.isFinite(Date.parse(plan.generatedAt)) ||
      plan.generatedBy !== "deterministic_planner" ||
      !["AWAITING_APPROVAL", "APPROVED", "NEEDS_INPUT"].includes(plan.status) ||
      !Array.isArray(plan.phases) || !plan.phases.length ||
      !Array.isArray(plan.milestones) || !plan.milestones.length ||
      !Array.isArray(plan.tasks) || !plan.tasks.length ||
      !Array.isArray(plan.risks) || !plan.risks.length ||
      !Array.isArray(plan.blockers) || !plan.blockers.length ||
      plan.blockers.some((blocker) => typeof blocker !== "string" || !blocker.trim())) {
    throw new ProjectManagerValidationError("The Project Manager plan is missing required fields or has an invalid project/version binding.");
  }
  const approval = plan.approval;
  const approvalIsValid = Boolean(approval && typeof approval === "object" &&
    typeof approval.approvedBy === "string" && approval.approvedBy.trim() &&
    typeof approval.approvedAt === "string" && Number.isFinite(Date.parse(approval.approvedAt)));
  if ((plan.status === "APPROVED" && !approvalIsValid) ||
      (plan.status !== "APPROVED" && plan.approval !== null)) {
    throw new ProjectManagerValidationError("The Project Manager approval record does not match the plan status.");
  }
  const capabilities = plan.capabilityDimensions;
  if (!capabilities || typeof capabilities !== "object" || capabilities.planning !== true ||
      Object.entries(capabilities).some(([key, value]) => key !== "planning" && value !== false) ||
      plan.timeline?.estimatedDuration !== "UNKNOWN" ||
      plan.timeline?.dependencyWaitingTime !== "UNKNOWN" ||
      plan.timeline?.humanApprovalWaitingTime !== "UNKNOWN" ||
      plan.timeline?.actualElapsedTime !== "NOT_STARTED" ||
      typeof plan.timeline?.explanation !== "string" || !plan.timeline.explanation.trim()) {
    throw new ProjectManagerValidationError("The plan claims unavailable capabilities or an unverified timeline.");
  }
  if (plan.phases.some((phase) => !phase || typeof phase.id !== "string" ||
        typeof phase.title !== "string" || typeof phase.outcome !== "string" ||
        !Array.isArray(phase.milestoneIds) ||
        !Array.isArray(phase.taskIds) || !["PLANNED", "BLOCKED"].includes(phase.status)) ||
      plan.milestones.some((milestone) => !milestone || typeof milestone.id !== "string" ||
        typeof milestone.title !== "string" || !Array.isArray(milestone.taskIds))) {
    throw new ProjectManagerValidationError("A Project Manager phase or milestone is malformed.");
  }
  const phaseIds = new Set(plan.phases.map((phase) => phase.id));
  const milestoneIds = new Set(plan.milestones.map((milestone) => milestone.id));
  if (phaseIds.size !== plan.phases.length || milestoneIds.size !== plan.milestones.length ||
      plan.phases.some((phase) => !phase.id.trim() || !phase.title.trim() ||
        !phase.outcome.trim() ||
        phase.milestoneIds.some((id) => typeof id !== "string") ||
        phase.taskIds.some((id) => typeof id !== "string")) ||
      plan.milestones.some((milestone) =>
        !milestone.id.trim() || !milestone.title.trim() ||
        typeof milestone.phaseId !== "string" || !phaseIds.has(milestone.phaseId) ||
        milestone.taskIds.some((id) => typeof id !== "string") ||
        milestone.targetDate !== null || milestone.status !== "BLOCKED"
      )) {
    throw new ProjectManagerValidationError("A Project Manager phase or milestone is invalid.");
  }
  const ids = new Set<string>();
  for (const task of plan.tasks) {
    if (!task || typeof task !== "object" ||
        typeof task.projectId !== "string" || typeof task.id !== "string" ||
        typeof task.title !== "string" || typeof task.description !== "string" ||
        typeof task.agentRoleId !== "string" || !Array.isArray(task.requiredInputs) ||
        !Array.isArray(task.permissionRequirements) ||
        !Array.isArray(task.humanApprovalRequirements) ||
        !Array.isArray(task.expectedOutputs) || !Array.isArray(task.acceptanceCriteria) ||
        !Array.isArray(task.verificationRequirements) ||
        task.permissionRequirements.some((value) => typeof value !== "string") ||
        task.humanApprovalRequirements.some((value) => typeof value !== "string") ||
        task.requiredInputs.some((value) => typeof value !== "string") ||
        task.expectedOutputs.some((value) => typeof value !== "string") ||
        task.acceptanceCriteria.some((value) => typeof value !== "string") ||
        task.verificationRequirements.some((value) => typeof value !== "string")) {
      throw new ProjectManagerValidationError("A Project Manager task is malformed.");
    }
    const role = ROLE_BY_ID.get(task.agentRoleId);
    if (task.projectId !== projectId || !task.id || ids.has(task.id) ||
        !role || !task.title.trim() || !task.description.trim() ||
        !phaseIds.has(task.phaseId) || !milestoneIds.has(task.milestoneId) ||
        !Array.isArray(task.subtaskIds) || !Array.isArray(task.dependencies) ||
        !task.requiredInputs.length || !task.expectedOutputs.length ||
        !task.acceptanceCriteria.length || !task.verificationRequirements.length ||
        !task.permissionRequirements.length || !task.humanApprovalRequirements.length ||
        task.permissionRequirements.some((value) => !value.trim()) ||
        task.humanApprovalRequirements.some((value) => !value.trim()) ||
        task.requiredInputs.some((value) => !value.trim()) ||
        task.expectedOutputs.some((value) => !value.trim()) ||
        task.acceptanceCriteria.some((value) => !value.trim()) ||
        task.verificationRequirements.some((value) => !value.trim()) ||
        !["LOW", "MEDIUM", "HIGH"].includes(task.priority) ||
        task.status !== "BLOCKED" || task.executionCapability !== "EXECUTION_UNAVAILABLE" ||
        task.estimatedEffort?.status !== "UNKNOWN" || task.estimatedEffort.minHours !== null ||
        task.estimatedEffort.maxHours !== null ||
        typeof task.estimatedEffort.basis !== "string" || !task.estimatedEffort.basis.trim() ||
        task.subtaskIds.some((subtaskId) => typeof subtaskId !== "string") ||
        task.dependencies.some((dependency) => typeof dependency !== "string") ||
        (task.parentTaskId !== null && typeof task.parentTaskId !== "string")) {
      throw new ProjectManagerValidationError("A Project Manager task is invalid, duplicated, or assigned to an unregistered role.");
    }
    ids.add(task.id);
  }
  for (const task of plan.tasks) {
    if (task.dependencies.some((dependency) => !ids.has(dependency) || dependency === task.id) ||
        (task.parentTaskId !== null && !ids.has(task.parentTaskId)) ||
        task.subtaskIds.some((subtaskId) => !ids.has(subtaskId))) {
      throw new ProjectManagerValidationError(`Task ${task.id} has a missing or invalid dependency.`);
    }
  }
  const taskById = new Map(plan.tasks.map((task) => [task.id, task]));
  for (const task of plan.tasks) {
    if (task.parentTaskId && !taskById.get(task.parentTaskId)?.subtaskIds.includes(task.id)) {
      throw new ProjectManagerValidationError(`Task ${task.id} is not linked from its parent task.`);
    }
    if (task.subtaskIds.some((id) => taskById.get(id)?.parentTaskId !== task.id)) {
      throw new ProjectManagerValidationError(`Task ${task.id} has an invalid subtask link.`);
    }
  }
  for (const phase of plan.phases) {
    if (phase.milestoneIds.some((id) => !milestoneIds.has(id)) ||
        phase.taskIds.some((id) => !ids.has(id))) {
      throw new ProjectManagerValidationError(`Phase ${phase.id} references a missing milestone or task.`);
    }
  }
  for (const milestone of plan.milestones) {
    if (milestone.taskIds.some((id) => !ids.has(id))) {
      throw new ProjectManagerValidationError(`Milestone ${milestone.id} references a missing task.`);
    }
  }
  const riskIds = new Set<string>();
  for (const risk of plan.risks) {
    if (!risk || typeof risk.id !== "string" || typeof risk.description !== "string" ||
        typeof risk.mitigation !== "string" || typeof risk.responsibleRoleId !== "string" ||
        !Array.isArray(risk.affectedTaskIds) ||
        risk.affectedTaskIds.some((id) => typeof id !== "string") ||
        risk.projectId !== projectId || !risk.id.trim() || riskIds.has(risk.id) ||
        !risk.description.trim() || !risk.mitigation.trim() || !ROLE_BY_ID.has(risk.responsibleRoleId) ||
        risk.affectedTaskIds.some((id) => !ids.has(id)) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(risk.probability) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(risk.impact) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(risk.severity) ||
        !["MODEL_GENERATED", "SYSTEM_DERIVED", "HUMAN_CONFIRMED", "MITIGATED"].includes(risk.status)) {
      throw new ProjectManagerValidationError("The Project Manager risk register contains an invalid entry.");
    }
    riskIds.add(risk.id);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new ProjectManagerValidationError("The Project Manager task dependencies contain a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of taskById.get(id)?.dependencies || []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  ids.forEach(visit);
  for (const milestone of plan.milestones) {
    if (milestone.taskIds.some((id) =>
      !ids.has(id) || taskById.get(id)?.milestoneId !== milestone.id ||
      taskById.get(id)?.phaseId !== milestone.phaseId
    )) {
      throw new ProjectManagerValidationError(`Milestone ${milestone.id} references a missing task.`);
    }
  }
  for (const phase of plan.phases) {
    if (phase.taskIds.some((id) => taskById.get(id)?.phaseId !== phase.id)) {
      throw new ProjectManagerValidationError(`Phase ${phase.id} references a task assigned to another phase.`);
    }
  }
}

export function approveProjectManagerPlan(
  plan: ProjectManagerPlan,
  projectId: string,
  approvedBy: string,
  approvedAt = new Date().toISOString()
): ProjectManagerPlan {
  validateProjectManagerPlan(plan, projectId);
  if (plan.status !== "AWAITING_APPROVAL" || plan.approval ||
      !approvedBy.trim() || !Number.isFinite(Date.parse(approvedAt)) ||
      plan.tasks.some((task) => task.status !== "BLOCKED")) {
    throw new ProjectManagerValidationError("Only a pending, blocked Project Manager plan can be explicitly approved.");
  }
  return {
    ...plan,
    status: "APPROVED",
    approval: { approvedBy: approvedBy.trim(), approvedAt: new Date(approvedAt).toISOString() },
  };
}

export function isProjectManagerStrategyCurrent(
  project: Project,
  inquiry: Inquiry,
  plan: ProjectManagerPlan
): boolean {
  try {
    const { strategyVersion, strategyId } = validateApprovedStrategy(project, inquiry);
    return plan.projectId === project.id &&
      plan.sourceStrategyVersion === strategyVersion &&
      plan.sourceStrategyId === strategyId &&
      plan.sourceStrategyHash === project.ceoStrategy?.sourceHash;
  } catch {
    return false;
  }
}
