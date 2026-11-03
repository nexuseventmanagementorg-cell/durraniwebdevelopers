import { createHash } from "crypto";
import { DWD_WORKFORCE_AGENTS } from "@/lib/workforce-agents";
import type { Inquiry, Project } from "@/lib/types";

export const CEO_STRATEGY_AGENT_ID = "ceo-strategist";

export const CEO_STRATEGY_CATEGORIES = [
  "static_website",
  "corporate_business_website",
  "landing_page",
  "portfolio",
  "advanced_ecommerce",
  "multi_vendor_marketplace",
  "saas_application",
  "dashboard_customer_portal",
  "cms_publishing",
  "booking_reservations",
  "interactive_animated_website",
  "scroll_driven_storytelling",
  "3d_webgl_experience",
  "ai_powered_application",
  "custom_web_application",
] as const;

export type CeoStrategyCategory = (typeof CEO_STRATEGY_CATEGORIES)[number];
export type CeoStrategyLabel =
  | "VERIFIED"
  | "UNVERIFIED"
  | "MODEL_INFERENCE"
  | "HUMAN_REVIEW_REQUIRED"
  | "RECOMMENDED"
  | "ASSUMED"
  | "UNKNOWN"
  | "BLOCKED"
  | "NOT TESTED"
  | "COMPLETED";

export interface CeoStrategyEvidence {
  referenceId: string;
  label: string;
  content: string;
  status: "VERIFIED" | "UNKNOWN";
}

export interface CeoStrategyInput {
  projectId: string;
  inquiryId: string;
  evidence: CeoStrategyEvidence[];
  missingInformation: string[];
}

export interface CeoStrategyFinding {
  text: string;
  status: CeoStrategyLabel;
  evidenceReferences: string[];
}

export interface CeoStrategyRisk {
  risk: CeoStrategyFinding;
  likelihood: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  impact: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  mitigation: CeoStrategyFinding;
}

export interface CeoStrategyAssignment {
  projectId: string;
  agentRoleId: string;
  agentRole: string;
  taskTitle: string;
  instructions: string;
  requiredInputs: string[];
  expectedOutputs: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  permissionRequirements: string[];
  humanApprovalRequirements: string[];
  status: "BLOCKED";
  blocker: string;
}

export interface CeoStrategyPlan {
  executiveSummary: CeoStrategyFinding;
  businessObjectives: CeoStrategyFinding[];
  targetAudience: CeoStrategyFinding;
  classification: {
    primaryCategory: CeoStrategyCategory;
    relatedCategories: CeoStrategyCategory[];
    rationale: CeoStrategyFinding;
    capabilityCoverage: Array<{
      category: CeoStrategyCategory;
      capabilities?: {
        PLANNING_AVAILABLE: false;
        GENERATION_AVAILABLE: false;
        BACKEND_AVAILABLE: false;
        INTEGRATION_AVAILABLE: false;
        AUTOMATED_QA_AVAILABLE: false;
        BROWSER_QA_AVAILABLE: false;
        PRODUCTION_READY: false;
      };
      blocker?: string;
    }>;
  };
  scopeAndExclusions: {
    scope: CeoStrategyFinding[];
    exclusions: CeoStrategyFinding[];
  };
  functionalRequirements: CeoStrategyFinding[];
  uiUxDirection: CeoStrategyFinding;
  technicalArchitecture: CeoStrategyFinding;
  requiredIntegrations: Array<{
    name: string;
    rationale: CeoStrategyFinding;
  }>;
  projectPhases: Array<{
    id: string;
    title: string;
    outcome: CeoStrategyFinding;
    taskAssignmentIds: string[];
  }>;
  specialistAssignments: CeoStrategyAssignment[];
  acceptanceCriteria: CeoStrategyFinding[];
  riskRegister: CeoStrategyRisk[];
  assumptions: CeoStrategyFinding[];
  unknowns: CeoStrategyFinding[];
  commercialConsiderations: CeoStrategyFinding[];
  humanApprovalRequirements: CeoStrategyFinding[];
  evidenceReferences: CeoStrategyEvidence[];
  implementationBlockers: CeoStrategyFinding[];
}

export interface CeoStrategyRecord {
  status: "awaiting_human_approval" | "approved";
  generatedAt: string;
  generatedBy: "local_ollama";
  model: string;
  sourceHash: string;
  plan: CeoStrategyPlan;
  approval: { approvedBy: string; approvedAt: string } | null;
}

export function isCeoStrategyAwaitingApproval(
  strategy: Pick<CeoStrategyRecord, "status" | "approval"> | null | undefined
): strategy is CeoStrategyRecord {
  return Boolean(strategy && strategy.status === "awaiting_human_approval" && !strategy.approval);
}

const PRIVATE_LITERAL =
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){10,}|(?:api[_ -]?key|password|secret|token|private[_ -]?key)\s*[:=]\s*\S+/i;
const APPROVED_INQUIRY_STATUSES = new Set(["Approved", "In Development"]);
const REGISTERED_ROLES = new Map(
  DWD_WORKFORCE_AGENTS
    .filter((agent) => agent.avatar !== CEO_STRATEGY_AGENT_ID)
    .map((agent) => [agent.avatar, agent])
);

export function isCeoStrategyProjectApproved(
  project: Pick<Project, "id" | "inquiryId" | "status" | "approvedPrice" | "advanceRequired" | "advanceReceived">,
  inquiry: Pick<Inquiry, "id" | "convertedProjectId" | "status"> | null | undefined
): boolean {
  return Boolean(
    inquiry &&
    project.inquiryId === inquiry.id &&
    inquiry.convertedProjectId === project.id &&
    APPROVED_INQUIRY_STATUSES.has(inquiry.status) &&
    ["Approved", "In Development"].includes(project.status) &&
    Number.isFinite(project.approvedPrice) &&
    project.approvedPrice > 0 &&
    Number.isFinite(project.advanceRequired) &&
    Number.isFinite(project.advanceReceived) &&
    project.advanceRequired > 0 &&
    project.advanceRequired <= project.approvedPrice &&
    project.advanceReceived >= project.advanceRequired
  );
}

export function isCeoStrategyCategory(value: unknown): value is CeoStrategyCategory {
  return typeof value === "string" &&
    (CEO_STRATEGY_CATEGORIES as readonly string[]).includes(value);
}

export function buildCeoStrategyInput(
  project: Project,
  inquiry: Inquiry
): CeoStrategyInput {
  const evidence: CeoStrategyEvidence[] = [];
  const missingInformation: string[] = [];
  const addEvidence = (
    referenceId: string,
    label: string,
    content: string | null | undefined,
    status: "VERIFIED" | "UNKNOWN" = "VERIFIED"
  ) => {
    const value = typeof content === "string" ? content.trim() : "";
    if (!value) {
      missingInformation.push(label);
      return;
    }
    evidence.push({ referenceId, label, content: value, status });
  };
  const list = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

  addEvidence("project.category", "Approved project category", project.category);
  addEvidence("project.description", "Approved project scope description", project.description);
  addEvidence("inquiry.project-types", "Customer-requested project types", list(inquiry.projectTypes).join(", "));
  addEvidence("inquiry.primary-goal", "Customer-stated primary goal", inquiry.problemToSolve);
  addEvidence("inquiry.target-audience", "Customer-stated target audience", inquiry.targetAudience);
  addEvidence("inquiry.products-services", "Customer-stated products and services", inquiry.productsServices);
  addEvidence("inquiry.requested-features", "Customer-selected features", [
    ...list(inquiry.productFeatures),
    ...list(inquiry.orderFeatures),
    ...list(inquiry.adminFeatures),
    ...list(inquiry.selectedAddons),
    ...list(project.selectedFeatures),
  ].join(", "));
  addEvidence("inquiry.target-market", "Customer-provided market/location", inquiry.cityCountry);
  addEvidence("inquiry.expected-budget", "Customer-provided budget range", inquiry.expectedBudgetRange);
  missingInformation.push("Website target languages");
  addEvidence(
    "project.approved-budget",
    "Human-approved project budget",
    Number.isFinite(project.approvedPrice) ? `PKR ${project.approvedPrice}` : ""
  );
  addEvidence("project.delivery-timeline", "Human-approved delivery timeline", project.deliveryTimeline);
  addEvidence("inquiry.preferred-launch-date", "Customer-requested launch date", inquiry.preferredLaunchDate);
  if (project.projectBuildBrief?.content) {
    addEvidence(
      "project.build-brief",
      "Existing DWD project build brief (approval status not recorded)",
      project.projectBuildBrief.content,
      "UNKNOWN"
    );
  }
  const workflowTasks = Array.isArray(project.automationWorkflow?.tasks)
    ? project.automationWorkflow.tasks
    : [];
  const existingWorkflowTasks = workflowTasks
    ?.filter((task) => typeof task.title === "string" && typeof task.status === "string")
    .map((task) => `${task.role}: ${task.title} [${task.status}]`) || [];
  addEvidence(
    "project.workflow",
    "Existing DWD project workflow tasks",
    existingWorkflowTasks.join("; ")
  );
  missingInformation.push("Authorized customer attachments");

  return {
    projectId: project.id,
    inquiryId: inquiry.id,
    evidence,
    missingInformation: Array.from(new Set(missingInformation)),
  };
}

export function validateCeoStrategyInput(input: CeoStrategyInput): void {
  if (!input || typeof input.projectId !== "string" || !input.projectId.trim() ||
      typeof input.inquiryId !== "string" || !input.inquiryId.trim() ||
      !Array.isArray(input.evidence) || input.evidence.length > 40 ||
      !Array.isArray(input.missingInformation) || input.missingInformation.length > 30) {
    throw new TypeError("The approved project strategy input is invalid.");
  }
  const references = new Set<string>();
  for (const item of input.evidence) {
    if (!item.referenceId.trim() || item.referenceId.length > 100 ||
        references.has(item.referenceId) ||
        !item.label.trim() || item.label.length > 160 ||
        !item.content.trim() || item.content.length > 5000 ||
        !["VERIFIED", "UNKNOWN"].includes(item.status) ||
        PRIVATE_LITERAL.test(item.content)) {
      throw new TypeError("Project strategy evidence is invalid or contains private contact or credential data.");
    }
    references.add(item.referenceId);
  }
  for (const missing of input.missingInformation) {
    if (typeof missing !== "string" || !missing.trim() || missing.length > 200) {
      throw new TypeError("The CEO strategy missing-information list is invalid.");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function transformStrategyFindings(value: unknown, transform: (status: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformStrategyFindings(item, transform));
  }
  if (!isRecord(value)) return value;
  const isFinding = typeof value.text === "string" && Array.isArray(value.evidenceReferences);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    isFinding && key === "status" && typeof item === "string"
      ? transform(item)
      : transformStrategyFindings(item, transform),
  ]));
}

export function sanitizeCeoStrategyForReview(value: unknown): unknown {
  return transformStrategyFindings(value, (status) =>
    status === "VERIFIED" || status === "COMPLETED" ? "HUMAN_REVIEW_REQUIRED" : status
  );
}

export function hasUnreviewedCeoStrategyClaims(value: unknown): boolean {
  let found = false;
  transformStrategyFindings(value, (status) => {
    if (status === "VERIFIED" || status === "COMPLETED") found = true;
    return status;
  });
  return found;
}

function safeText(value: unknown, field: string, maximum = 1200): string {
  if (typeof value !== "string") throw new TypeError(`The CEO strategy ${field} is invalid.`);
  const text = value.replace(/[\r\n\t]+/g, " ").trim();
  if (!text || text.length > maximum || PRIVATE_LITERAL.test(text)) {
    throw new TypeError(`The CEO strategy ${field} is empty, too long, or contains private data.`);
  }
  return text;
}

function textList(value: unknown, field: string, maximumItems = 12): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(`The CEO strategy ${field} list is invalid.`);
  }
  return value.map((item) => safeText(item, field, 500));
}

function finding(value: unknown, field: string, evidenceByReference: Map<string, CeoStrategyEvidence>): CeoStrategyFinding {
  if (!isRecord(value) ||
      !["VERIFIED", "UNVERIFIED", "MODEL_INFERENCE", "HUMAN_REVIEW_REQUIRED", "RECOMMENDED", "ASSUMED", "UNKNOWN", "BLOCKED", "NOT TESTED", "COMPLETED"].includes(String(value.status)) ||
      !Array.isArray(value.evidenceReferences) || value.evidenceReferences.length > 12) {
    throw new TypeError(`The CEO strategy ${field} finding is invalid.`);
  }
  const evidenceReferences = value.evidenceReferences.map((reference) => {
    const evidence = typeof reference === "string" ? evidenceByReference.get(reference) : undefined;
    if (!evidence) {
      throw new TypeError(`The CEO strategy ${field} references unknown evidence.`);
    }
    if (evidence.status !== "VERIFIED") {
      throw new TypeError(`The CEO strategy ${field} references evidence that is not verified.`);
    }
    return reference;
  });
  if (value.status === "COMPLETED" || value.status === "VERIFIED") {
    throw new TypeError(`The CEO strategy ${field} cannot be model-verified or marked completed.`);
  }
  return {
    text: safeText(value.text, field),
    status: value.status as CeoStrategyLabel,
    evidenceReferences: Array.from(new Set(evidenceReferences)),
  };
}

function createAssignment(
  value: unknown,
  projectId: string
): CeoStrategyAssignment {
  if (!isRecord(value)) throw new TypeError("The CEO strategy assignment is invalid.");
  const agentRoleId = safeText(value.agentRoleId, "agent role ID", 80);
  const registeredRole = REGISTERED_ROLES.get(agentRoleId);
  if (!registeredRole || value.agentRole !== registeredRole.role) {
    throw new TypeError("The CEO strategy assigned a role outside the DWD workforce registry.");
  }
  const dependencies = textList(value.dependencies, "assignment dependencies", 20);
  const requiredInputs = textList(value.requiredInputs, "required inputs");
  const expectedOutputs = textList(value.expectedOutputs, "expected outputs");
  const acceptanceCriteria = textList(value.acceptanceCriteria, "acceptance criteria");
  if (!requiredInputs.length || !expectedOutputs.length || !acceptanceCriteria.length) {
    throw new TypeError("Each CEO strategy assignment requires inputs, outputs, and acceptance criteria.");
  }
  return {
    projectId,
    agentRoleId,
    agentRole: registeredRole.role,
    taskTitle: safeText(value.taskTitle, "task title", 180),
    instructions: safeText(value.instructions, "task instructions", 2000),
    requiredInputs,
    expectedOutputs,
    acceptanceCriteria,
    dependencies,
    permissionRequirements: ["No filesystem or terminal access is granted by this assignment."],
    humanApprovalRequirements: ["Human approval of the strategy and task scope is required before execution."],
    status: "BLOCKED",
    blocker: "No approved customer-project worker adapter is connected to the local workforce pipeline.",
  };
}

export function validateCeoStrategyOutput(
  value: unknown,
  input: CeoStrategyInput
): CeoStrategyPlan {
  validateCeoStrategyInput(input);
  if (!isRecord(value) || !isRecord(value.classification) ||
      !isCeoStrategyCategory(value.classification.primaryCategory)) {
    throw new TypeError("The CEO strategy output or website category is invalid.");
  }
  const evidenceByReference = new Map(input.evidence.map((item) => [item.referenceId, item]));
  const categories = value.classification.relatedCategories;
  if (!Array.isArray(categories) || categories.length > CEO_STRATEGY_CATEGORIES.length ||
      categories.some((category) => !isCeoStrategyCategory(category))) {
    throw new TypeError("The CEO strategy related categories are invalid.");
  }

  const assignmentsValue = value.specialistAssignments;
  if (!Array.isArray(assignmentsValue) || assignmentsValue.length === 0 ||
      assignmentsValue.length > DWD_WORKFORCE_AGENTS.length) {
    throw new TypeError("The CEO strategy specialist assignments are invalid.");
  }
  const specialistAssignments = assignmentsValue.map((assignment) =>
    createAssignment(assignment, input.projectId)
  );
  const assignmentIds = new Set(specialistAssignments.map((assignment) => assignment.agentRoleId));
  if (assignmentIds.size !== specialistAssignments.length) {
    throw new TypeError("The CEO strategy assigned a specialist more than once.");
  }
  for (const assignment of specialistAssignments) {
    if (assignment.dependencies.some((dependency) =>
      !assignmentIds.has(dependency) || dependency === assignment.agentRoleId
    )) {
      throw new TypeError("The CEO strategy assignment has an invalid dependency.");
    }
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const byId = new Map(specialistAssignments.map((assignment) => [assignment.agentRoleId, assignment]));
  const visit = (id: string) => {
    if (visiting.has(id)) throw new TypeError("The CEO strategy assignment dependencies contain a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies || []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  assignmentIds.forEach(visit);

  const relatedCategories = Array.from(new Set([
    value.classification.primaryCategory,
    ...categories,
  ])) as CeoStrategyCategory[];
  const mappedFinding = (item: unknown, field: string) => finding(item, field, evidenceByReference);
  const findingList = (items: unknown, field: string, max = 12) => {
    if (!Array.isArray(items) || items.length === 0 || items.length > max) {
      throw new TypeError(`The CEO strategy ${field} list must contain substantive content.`);
    }
    return items.map((item, index) => mappedFinding(item, `${field} ${index + 1}`));
  };
  const optionalFindingList = (items: unknown, field: string, max = 12) => {
    if (!Array.isArray(items) || items.length > max) {
      throw new TypeError(`The CEO strategy ${field} list is invalid.`);
    }
    return items.map((item, index) => mappedFinding(item, `${field} ${index + 1}`));
  };

  if (!isRecord(value.scopeAndExclusions) ||
      !Array.isArray(value.scopeAndExclusions.scope) ||
      !Array.isArray(value.scopeAndExclusions.exclusions) ||
      !Array.isArray(value.requiredIntegrations) || value.requiredIntegrations.length > 20 ||
      !Array.isArray(value.projectPhases) || value.projectPhases.length < 1 || value.projectPhases.length > 12 ||
      !Array.isArray(value.riskRegister) || value.riskRegister.length < 1 || value.riskRegister.length > 20) {
    throw new TypeError("The CEO strategy scope, integrations, phases, or risk register is invalid.");
  }

  const capabilityCoverage = CEO_STRATEGY_CATEGORIES.map((category) => ({
    category,
    capabilities: {
      PLANNING_AVAILABLE: false as const,
      GENERATION_AVAILABLE: false as const,
      BACKEND_AVAILABLE: false as const,
      INTEGRATION_AVAILABLE: false as const,
      AUTOMATED_QA_AVAILABLE: false as const,
      BROWSER_QA_AVAILABLE: false as const,
      PRODUCTION_READY: false as const,
    },
    blocker: "No category-specific customer-project adapter and independent verification path are connected.",
  }));
  const riskRegister = value.riskRegister.map((risk, index) => {
    if (!isRecord(risk) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(String(risk.likelihood)) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(String(risk.impact))) {
      throw new TypeError(`The CEO strategy risk ${index + 1} is invalid.`);
    }
    return {
      risk: mappedFinding(risk.risk, `risk ${index + 1}`),
      likelihood: risk.likelihood as "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN",
      impact: risk.impact as "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN",
      mitigation: mappedFinding(risk.mitigation, `risk mitigation ${index + 1}`),
    };
  });
  const projectPhases = value.projectPhases.map((phase, index) => {
    if (!isRecord(phase)) throw new TypeError(`The CEO strategy phase ${index + 1} is invalid.`);
    const taskAssignmentIds = textList(phase.taskAssignmentIds, "phase assignment IDs", 20);
    if (!taskAssignmentIds.length || taskAssignmentIds.some((id) => !assignmentIds.has(id))) {
      throw new TypeError(`The CEO strategy phase ${index + 1} references an unassigned role.`);
    }
    return {
      id: `phase-${index + 1}`,
      title: safeText(phase.title, "phase title", 160),
      outcome: mappedFinding(phase.outcome, `phase ${index + 1} outcome`),
      taskAssignmentIds,
    };
  });

  return {
    executiveSummary: mappedFinding(value.executiveSummary, "executive summary"),
    businessObjectives: findingList(value.businessObjectives, "business objectives"),
    targetAudience: mappedFinding(value.targetAudience, "target audience"),
    classification: {
      primaryCategory: value.classification.primaryCategory,
      relatedCategories,
      rationale: mappedFinding(value.classification.rationale, "classification rationale"),
      capabilityCoverage,
    },
    scopeAndExclusions: {
      scope: findingList(value.scopeAndExclusions.scope, "scope", 30),
      exclusions: findingList(value.scopeAndExclusions.exclusions, "scope exclusions", 30),
    },
    functionalRequirements: findingList(value.functionalRequirements, "functional requirements", 30),
    uiUxDirection: mappedFinding(value.uiUxDirection, "UI/UX direction"),
    technicalArchitecture: mappedFinding(value.technicalArchitecture, "technical architecture"),
    requiredIntegrations: value.requiredIntegrations.map((integration, index) => {
      if (!isRecord(integration)) throw new TypeError(`The CEO strategy integration ${index + 1} is invalid.`);
      return {
        name: safeText(integration.name, "integration name", 160),
        rationale: mappedFinding(integration.rationale, `integration ${index + 1} rationale`),
      };
    }),
    projectPhases,
    specialistAssignments,
    acceptanceCriteria: findingList(value.acceptanceCriteria, "acceptance criteria", 30),
    riskRegister,
    assumptions: findingList(value.assumptions, "assumptions", 30),
    unknowns: findingList(value.unknowns, "unknowns", 30),
    commercialConsiderations: findingList(value.commercialConsiderations, "commercial considerations", 20),
    humanApprovalRequirements: findingList(value.humanApprovalRequirements, "human approval requirements", 20),
    evidenceReferences: input.evidence,
    implementationBlockers: [
      ...optionalFindingList(value.implementationBlockers, "implementation blockers", 20),
      ...relatedCategories.map((category): CeoStrategyFinding => ({
        text: `${category}: no category-specific customer-project adapter and independent verification path are available.`,
        status: "BLOCKED",
        evidenceReferences: [],
      })),
    ],
  };
}

export function hashCeoStrategyInput(input: CeoStrategyInput): string {
  return createHash("sha256").update(JSON.stringify({
    projectId: input.projectId,
    inquiryId: input.inquiryId,
    evidence: input.evidence,
    missingInformation: input.missingInformation,
  })).digest("hex");
}
