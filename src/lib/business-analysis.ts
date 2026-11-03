import { createHash } from "crypto";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  isCeoStrategyProjectApproved,
  validateCeoStrategyOutput,
  type CeoStrategyFinding,
  type CeoStrategyPlan,
} from "@/lib/ceo-strategy";
import {
  isProjectManagerStrategyCurrent,
  validateProjectManagerPlan,
  type ProjectManagerPlan,
} from "@/lib/project-manager";
import type { Inquiry, Project } from "@/lib/types";

export const BUSINESS_ANALYST_AGENT_ID = "business-analyst";
export const BUSINESS_ANALYSIS_VERSION = 1 as const;

export const BUSINESS_ANALYSIS_CATEGORIES = [
  "business",
  "stakeholder",
  "functional",
  "non_functional",
  "technical",
  "ux",
  "security",
  "integration",
  "data",
  "compliance_operations",
] as const;

export const BUSINESS_ANALYST_RESPONSIBILITIES = [
  "Translate authorized customer and approved project sources into a traceable requirements draft.",
  "Expose ambiguity, missing information, scope uncertainty, and explicit conflicts without inventing customer decisions.",
  "Prepare proposed acceptance criteria and verification approaches without claiming tests were executed.",
  "Provide read-only structured references for Agent 1 strategy review, Agent 2 planning, proposal preparation, and customer onboarding.",
] as const;

export const BUSINESS_ANALYSIS_WORKFLOW = [
  "LOAD_APPROVED_PROJECT_AND_INQUIRY",
  "VALIDATE_CURRENT_HUMAN_APPROVED_STRATEGY",
  "BUILD_SOURCE_FINGERPRINT_AND_EVIDENCE_REGISTER",
  "CLASSIFY_REQUIREMENTS_AND_CLARIFICATIONS",
  "SAVE_REVIEW_DRAFT",
  "HUMAN_REVIEW_OR_INTERNAL_CLARIFICATION_REQUEST",
  "HUMAN_APPROVAL_BOUND_TO_ANALYSIS_VERSION",
] as const;

export type BusinessAnalysisCategory = (typeof BUSINESS_ANALYSIS_CATEGORIES)[number];
export type BusinessAnalysisScope = "IN_SCOPE" | "OUT_OF_SCOPE" | "OPTIONAL" | "FUTURE_PHASE" | "NEEDS_CONFIRMATION";
export type BusinessAnalysisSourceType =
  | "CUSTOMER_SUBMISSION"
  | "APPROVED_PROJECT_RECORD"
  | "HUMAN_APPROVED_STRATEGY"
  | "APPROVED_PROJECT_MANAGER_PLAN"
  | "DWD_ANALYSIS_POLICY";

export interface BusinessAnalysisEvidence {
  id: string;
  sourcePath: string;
  label: string;
  content: string;
  sourceType: BusinessAnalysisSourceType;
}

export interface BusinessAnalysisRequirement {
  id: string;
  category: BusinessAnalysisCategory;
  title: string;
  description: string;
  sourceRefId: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNRANKED";
  rationale: string;
  status: "REVIEW_REQUIRED";
  scope: BusinessAnalysisScope;
  acceptanceCriteria: string[];
  verificationApproach: { method: string; status: "NOT_TESTED" };
  dependencies: string[];
  dependencyAssessment: "NOT_ASSESSED";
  relatedObjectiveIds: string[];
}

export interface BusinessAnalysisFeature {
  id: string;
  title: string;
  businessPurpose: string;
  sourceRefId: string;
  scope: BusinessAnalysisScope;
  userRoleIds: string[];
  inputs: string[];
  outputs: string[];
  businessRules: string[];
  validation: string[];
  successScenarios: string[];
  failureScenarios: string[];
  permissions: string[];
  dependencies: string[];
  dependencyAssessment: "NOT_ASSESSED";
  acceptanceCriteria: string[];
  status: "REVIEW_REQUIRED";
}

export interface BusinessAnalysisClarification {
  id: string;
  questionOrIssue: string;
  whyNeeded: string;
  affectedRequirementIds: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
  recommendedQuestion: string;
  status: "OPEN" | "REQUESTED";
  sourceRefIds: string[];
}

export interface BusinessAnalysisConflict {
  id: string;
  issue: string;
  sourceRefIds: string[];
  affectedRequirementIds: string[];
  priority: "HIGH" | "MEDIUM";
  recommendedQuestion: string;
  status: "OPEN";
}

export interface BusinessAnalysisObjective {
  id: string;
  text: string;
  sourceRefId: string;
  evidenceStatus: string;
}

export interface BusinessAnalysisTraceLink {
  sourceRefId: string;
  requirementIds: string[];
}

export interface BusinessAnalysisRequirementFeatureLink {
  requirementId: string;
  featureId: string;
}

export interface BusinessAnalysisRisk {
  id: string;
  description: string;
  sourceRefId: string;
  likelihood: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  impact: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  mitigation: string;
  status: "REVIEW_REQUIRED";
}

export interface BusinessAnalysisAgent2Reference {
  planId: string;
  tasks: Array<{ taskId: string; roleId: string; title: string; sourceRefId: string }>;
  linkageStatus: "NOT_MAPPED";
}

export interface BusinessAnalysisInput {
  projectId: string;
  inquiryId: string;
  sourceFingerprint: string;
  sourceStrategyHash: string;
  evidence: BusinessAnalysisEvidence[];
  objectives: BusinessAnalysisObjective[];
  strategy: CeoStrategyPlan;
  projectCategory: string;
  inquiryCategories: string[];
  selectedFeatureEvidence: Array<{ refId: string; text: string; scope: BusinessAnalysisScope }>;
  customerFlags: {
    needsProductCatalog: boolean;
    acceptOrdersOnline: boolean;
    needsReviewsOrAccounts: boolean;
    adminPanelType: string;
    productFeatures: string[];
    orderFeatures: string[];
    adminFeatures: string[];
    selectedAddons: string[];
  };
  projectManager?: BusinessAnalysisAgent2Reference;
}

export interface BusinessAnalysisRecord {
  id: string;
  version: typeof BUSINESS_ANALYSIS_VERSION;
  agentId: typeof BUSINESS_ANALYST_AGENT_ID;
  projectId: string;
  inquiryId: string;
  generatedAt: string;
  generatedBy: "deterministic_requirements_analyzer";
  sourceFingerprint: string;
  sourceStrategyHash: string;
  status: "AWAITING_REVIEW" | "APPROVED";
  evidence: BusinessAnalysisEvidence[];
  businessObjectives: BusinessAnalysisObjective[];
  requirements: BusinessAnalysisRequirement[];
  features: BusinessAnalysisFeature[];
  userRoles: Array<{
    id: string;
    description: string;
    sourceRefId: string | null;
    status: "CUSTOMER_STATED" | "NEEDS_CONFIRMATION";
    permissions: string[];
  }>;
  clarifications: BusinessAnalysisClarification[];
  conflicts: BusinessAnalysisConflict[];
  assumptions: Array<{ id: string; text: string; sourceRefId: string; status: "ASSUMED" }>;
  risks: BusinessAnalysisRisk[];
  scopeBoundaries: Array<{
    id: string;
    text: string;
    sourceRefId: string;
    scope: BusinessAnalysisScope;
    sourceStatus: string;
  }>;
  categories: Array<{
    category: string;
    relevance: "PRIMARY" | "RELATED" | "NOT_INDICATED" | "NEEDS_CONFIRMATION";
    executionCapability: "NOT_ASSESSED";
  }>;
  traceability: {
    inquiryToRequirements: BusinessAnalysisTraceLink[];
    objectivesToRequirements: BusinessAnalysisTraceLink[];
    requirementsToFeatures: BusinessAnalysisRequirementFeatureLink[];
    projectManagerTasks: BusinessAnalysisAgent2Reference | null;
  };
  clarificationRequests: Array<{
    requestedBy: string;
    requestedAt: string;
    clarificationIds: string[];
    deliveryStatus: "RECORDED_NOT_SENT";
  }>;
  approval: {
    approvedBy: string;
    approvedAt: string;
    analysisId: string;
    sourceFingerprint: string;
  } | null;
}

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: "Business websites", keywords: ["business website", "business site", "company website", "business_website"] },
  { category: "Corporate websites", keywords: ["corporate website", "corporate site", "corporate_business_website"] },
  { category: "Landing pages", keywords: ["landing page", "campaign page", "landing_page"] },
  { category: "Portfolio websites", keywords: ["portfolio website", "portfolio site", "portfolio"] },
  { category: "Blogs", keywords: ["blog", "publishing", "cms_publishing"] },
  { category: "eCommerce", keywords: ["ecommerce", "e-commerce", "online store", "shopify", "checkout", "cart", "advanced_ecommerce"] },
  { category: "Multi-vendor marketplaces", keywords: ["multi-vendor", "multivendor", "marketplace"] },
  { category: "Booking systems", keywords: ["booking", "reservation", "appointment", "booking_reservations"] },
  { category: "Membership platforms", keywords: ["membership", "subscription platform"] },
  { category: "Learning platforms", keywords: ["learning platform", "lms", "online course"] },
  { category: "Customer portals", keywords: ["customer portal", "client portal", "dashboard_customer_portal"] },
  { category: "Admin dashboards", keywords: ["admin dashboard", "admin panel", "dashboard"] },
  { category: "SaaS applications", keywords: ["saas", "saas_application"] },
  { category: "CRM and ERP systems", keywords: ["crm", "erp"] },
  { category: "Custom web applications", keywords: ["custom web application", "web application", "web app", "custom_web_application"] },
  { category: "AI applications", keywords: ["ai application", "artificial intelligence", "machine learning", "ai_powered_application"] },
  { category: "Interactive UI/UX", keywords: ["interactive", "animation", "animated", "scroll-driven", "interactive_animated_website"] },
  { category: "3D and WebGL experiences", keywords: ["3d", "webgl", "three-dimensional", "3d_webgl_experience"] },
];

export class BusinessAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessAnalysisValidationError";
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function boundedText(value: unknown, field: string, maximum = 5000): string {
  if (typeof value !== "string" || value.length > maximum) {
    throw new BusinessAnalysisValidationError(`The approved ${field} source is invalid or exceeds its size limit.`);
  }
  return value.trim();
}

function cleanList(value: unknown, field: string, maximumItems = 40): string[] {
  if (!Array.isArray(value) || value.length > maximumItems ||
      value.some((item) => typeof item !== "string" || item.length > 500)) {
    throw new BusinessAnalysisValidationError(`The approved ${field} source is invalid.`);
  }
  return value.map((item: string) => item.trim()).filter(Boolean);
}

function findingSourceId(path: string): string {
  return `source-${digest(path).slice(0, 20)}`;
}

function isNonEmptyFinding(value: CeoStrategyFinding): boolean {
  return Boolean(value && typeof value.text === "string" && value.text.trim());
}

function validateApprovedSources(project: Project, inquiry: Inquiry): {
  strategy: CeoStrategyPlan;
  projectManager?: ProjectManagerPlan;
} {
  if (!isCeoStrategyProjectApproved(project, inquiry)) {
    throw new BusinessAnalysisValidationError("Business analysis requires an approved inquiry conversion, commercial scope, and verified required advance.");
  }
  if (!project.inquiryId || project.inquiryId !== inquiry.id || inquiry.convertedProjectId !== project.id) {
    throw new BusinessAnalysisValidationError("The project and approved source inquiry are not associated.");
  }
  const strategyRecord = project.ceoStrategy;
  if (!strategyRecord || strategyRecord.status !== "approved" || !strategyRecord.approval ||
      typeof strategyRecord.approval.approvedBy !== "string" ||
      !strategyRecord.approval.approvedBy.trim() ||
      typeof strategyRecord.approval.approvedAt !== "string" ||
      !Number.isFinite(Date.parse(strategyRecord.approval.approvedAt)) ||
      !/^[a-f0-9]{64}$/i.test(strategyRecord.sourceHash)) {
    throw new BusinessAnalysisValidationError("A human-approved CEO strategy is required before requirements analysis.");
  }
  const strategyInput = buildCeoStrategyInput(project, inquiry);
  if (hashCeoStrategyInput(strategyInput) !== strategyRecord.sourceHash) {
    throw new BusinessAnalysisValidationError("The approved CEO strategy is stale against the current project and inquiry.");
  }
  const strategy = validateCeoStrategyOutput(strategyRecord.plan, strategyInput);
  let projectManager: ProjectManagerPlan | undefined;
  if (project.projectManagerPlan?.status === "APPROVED") {
    validateProjectManagerPlan(project.projectManagerPlan, project.id);
    if (isProjectManagerStrategyCurrent(project, inquiry, project.projectManagerPlan)) {
      projectManager = project.projectManagerPlan;
    }
  }
  return { strategy, projectManager };
}

export function isBusinessAnalysisProjectEligible(project: Project, inquiry: Inquiry): boolean {
  try {
    validateApprovedSources(project, inquiry);
    return true;
  } catch {
    return false;
  }
}

export function buildBusinessAnalysisInput(project: Project, inquiry: Inquiry): BusinessAnalysisInput {
  const { strategy, projectManager } = validateApprovedSources(project, inquiry);
  if (typeof inquiry.needsProductCatalog !== "boolean" ||
      typeof inquiry.acceptOrdersOnline !== "boolean" ||
      typeof inquiry.needsReviewsOrAccounts !== "boolean" ||
      !["none", "client_admin"].includes(inquiry.adminPanelType)) {
    throw new BusinessAnalysisValidationError("The authorized inquiry contains malformed feature or access selections.");
  }
  const evidence: BusinessAnalysisEvidence[] = [];
  const addEvidence = (
    sourcePath: string,
    label: string,
    value: string,
    sourceType: BusinessAnalysisSourceType
  ) => {
    const content = boundedText(value, sourcePath);
    if (!content) return null;
    const id = findingSourceId(sourcePath);
    evidence.push({ id, sourcePath, label, content, sourceType });
    return id;
  };
  const projectDescriptionRef = addEvidence("project.description", "Approved project scope description", project.description, "APPROVED_PROJECT_RECORD");
  const projectCategoryRef = addEvidence("project.category", "Approved project category", project.category, "APPROVED_PROJECT_RECORD");
  const customerIntroRef = addEvidence("inquiry.customerIntro", "Customer-provided project introduction", inquiry.customerIntro, "CUSTOMER_SUBMISSION");
  const primaryGoalRef = addEvidence("inquiry.problemToSolve", "Customer-stated business goal", inquiry.problemToSolve, "CUSTOMER_SUBMISSION");
  const audienceRef = addEvidence("inquiry.targetAudience", "Customer-stated target audience", inquiry.targetAudience, "CUSTOMER_SUBMISSION");
  const productsRef = addEvidence("inquiry.productsServices", "Customer-stated products and services", inquiry.productsServices, "CUSTOMER_SUBMISSION");
  const targetMarketRef = addEvidence("inquiry.cityCountry", "Customer-provided market or location", inquiry.cityCountry, "CUSTOMER_SUBMISSION");
  addEvidence("inquiry.inspirationUrl", "Customer-provided reference URL (not retrieved or assessed)", inquiry.inspirationUrl, "CUSTOMER_SUBMISSION");
  addEvidence("inquiry.customFeatureNotes", "Customer-provided custom feature notes", inquiry.customFeatureNotes ?? "", "CUSTOMER_SUBMISSION");
  const budgetRef = addEvidence("inquiry.expectedBudgetRange", "Customer-provided budget range", inquiry.expectedBudgetRange, "CUSTOMER_SUBMISSION");
  const requestedLaunchRef = addEvidence("inquiry.preferredLaunchDate", "Customer-requested launch date", inquiry.preferredLaunchDate, "CUSTOMER_SUBMISSION");
  const timelineRef = addEvidence("project.deliveryTimeline", "Approved project delivery timeline", project.deliveryTimeline, "APPROVED_PROJECT_RECORD");

  const addStrategyEvidence = (path: string, label: string, text: string) =>
    addEvidence(path, label, text, "HUMAN_APPROVED_STRATEGY");
  const objectives = strategy.businessObjectives.filter(isNonEmptyFinding).map((objective, index) => {
    const sourcePath = `project.ceoStrategy.plan.businessObjectives.${index}`;
    const sourceRefId = addStrategyEvidence(sourcePath, "Human-approved strategy objective", objective.text);
    if (!sourceRefId) throw new BusinessAnalysisValidationError("A business objective is missing its source reference.");
    return {
      id: `obj-${digest(`${project.id}:${sourcePath}:${objective.text}`).slice(0, 20)}`,
      text: objective.text,
      sourceRefId,
      evidenceStatus: objective.status,
    };
  });
  const addStrategyFindings = (items: CeoStrategyFinding[], basePath: string, label: string) => {
    items.forEach((finding, index) => {
      addStrategyEvidence(`${basePath}.${index}`, label, finding.text);
    });
  };
  addStrategyEvidence(
    "project.ceoStrategy.plan.technicalArchitecture",
    "Strategy technical architecture recommendation",
    strategy.technicalArchitecture.text
  );
  addStrategyEvidence(
    "project.ceoStrategy.plan.uiUxDirection",
    "Strategy UI/UX recommendation",
    strategy.uiUxDirection.text
  );
  addStrategyFindings(
    strategy.functionalRequirements,
    "project.ceoStrategy.plan.functionalRequirements",
    "Strategy functional requirement"
  );
  addStrategyFindings(
    strategy.scopeAndExclusions.scope,
    "project.ceoStrategy.plan.scopeAndExclusions.scope",
    "Strategy proposed scope boundary"
  );
  addStrategyFindings(
    strategy.scopeAndExclusions.exclusions,
    "project.ceoStrategy.plan.scopeAndExclusions.exclusions",
    "Strategy proposed exclusion"
  );
  addStrategyFindings(
    strategy.assumptions,
    "project.ceoStrategy.plan.assumptions",
    "Strategy assumption"
  );
  addStrategyFindings(
    strategy.commercialConsiderations,
    "project.ceoStrategy.plan.commercialConsiderations",
    "Strategy commercial consideration"
  );
  strategy.requiredIntegrations.forEach((integration, index) => {
    addStrategyEvidence(
      `project.ceoStrategy.plan.requiredIntegrations.${index}`,
      `Strategy integration recommendation: ${integration.name}`,
      integration.rationale.text
    );
  });
  strategy.riskRegister.forEach((risk, index) => {
    addStrategyEvidence(
      `project.ceoStrategy.plan.riskRegister.${index}.risk`,
      "Strategy risk",
      risk.risk.text
    );
    addStrategyEvidence(
      `project.ceoStrategy.plan.riskRegister.${index}.mitigation`,
      "Strategy risk mitigation",
      risk.mitigation.text
    );
  });

  const selectedFeatureEvidence: BusinessAnalysisInput["selectedFeatureEvidence"] = [];
  const projectFeatures = cleanList(project.selectedFeatures, "project selected features");
  projectFeatures.forEach((text, index) => {
    const refId = addEvidence(`project.selectedFeatures.${index}`, "Approved project feature", text, "APPROVED_PROJECT_RECORD");
    if (refId) selectedFeatureEvidence.push({ refId, text, scope: "IN_SCOPE" });
  });
  const inquiryFeatures = [
    ...cleanList(inquiry.productFeatures, "inquiry product features").map((text, index) => ({ path: `inquiry.productFeatures.${index}`, text })),
    ...cleanList(inquiry.orderFeatures, "inquiry order features").map((text, index) => ({ path: `inquiry.orderFeatures.${index}`, text })),
    ...cleanList(inquiry.adminFeatures, "inquiry admin features").map((text, index) => ({ path: `inquiry.adminFeatures.${index}`, text })),
    ...cleanList(inquiry.selectedAddons, "inquiry selected add-ons").map((text, index) => ({ path: `inquiry.selectedAddons.${index}`, text })),
  ];
  inquiryFeatures.forEach(({ path, text }) => {
    const refId = addEvidence(path, "Customer-selected feature or add-on", text, "CUSTOMER_SUBMISSION");
    if (refId) selectedFeatureEvidence.push({ refId, text, scope: "NEEDS_CONFIRMATION" });
  });

  strategy.functionalRequirements.forEach((requirement, index) => {
    const sourcePath = `project.ceoStrategy.plan.functionalRequirements.${index}`;
    const refId = findingSourceId(sourcePath);
    if (evidence.some((item) => item.id === refId)) {
      selectedFeatureEvidence.push({ refId, text: requirement.text, scope: "NEEDS_CONFIRMATION" });
    }
  });

  const customerFlags = {
    needsProductCatalog: inquiry.needsProductCatalog,
    acceptOrdersOnline: inquiry.acceptOrdersOnline,
    needsReviewsOrAccounts: inquiry.needsReviewsOrAccounts,
    adminPanelType: boundedText(inquiry.adminPanelType, "inquiry admin panel type", 80),
    productFeatures: cleanList(inquiry.productFeatures, "inquiry product features"),
    orderFeatures: cleanList(inquiry.orderFeatures, "inquiry order features"),
    adminFeatures: cleanList(inquiry.adminFeatures, "inquiry admin features"),
    selectedAddons: cleanList(inquiry.selectedAddons, "inquiry selected add-ons"),
  };
  addEvidence(
    "analysis.policy.security",
    "DWD analysis policy",
    "Do not infer or grant permissions. Restricted features require human-approved authentication and authorization boundaries.",
    "DWD_ANALYSIS_POLICY"
  );
  addEvidence(
    "analysis.policy.nonfunctional",
    "DWD analysis policy",
    "Do not infer performance, availability, accessibility, backup, or support targets from category labels.",
    "DWD_ANALYSIS_POLICY"
  );
  const strategyHash = project.ceoStrategy!.sourceHash;
  const pmReference = projectManager
    ? {
        planId: projectManager.id,
        tasks: projectManager.tasks.map((task, index) => {
          const sourceRefId = addEvidence(
            `project.projectManagerPlan.tasks.${index}`,
            `Approved Project Manager task: ${task.agentRoleId}`,
            `${task.title}\n${task.expectedOutputs.join("\n")}\n${task.acceptanceCriteria.join("\n")}`,
            "APPROVED_PROJECT_MANAGER_PLAN"
          );
          if (!sourceRefId) throw new BusinessAnalysisValidationError("A Project Manager task is missing its source reference.");
          return {
            taskId: task.id,
            roleId: task.agentRoleId,
            title: task.title,
            sourceRefId,
          };
        }),
        linkageStatus: "NOT_MAPPED" as const,
      }
    : undefined;
  const fingerprintPayload = {
    projectId: project.id,
    inquiryId: inquiry.id,
    projectDescription: boundedText(project.description, "project description"),
    projectCategory: boundedText(project.category, "project category", 250),
    projectSelectedFeatures: projectFeatures,
    projectDeliveryTimeline: boundedText(project.deliveryTimeline, "project delivery timeline", 500),
    customerIntroduction: boundedText(inquiry.customerIntro, "customer introduction"),
    customerInspirationUrl: boundedText(inquiry.inspirationUrl, "customer inspiration URL", 2000),
    customFeatureNotes: boundedText(inquiry.customFeatureNotes ?? "", "customer custom feature notes"),
    customerProjectTypes: cleanList(inquiry.projectTypes, "inquiry project types"),
    customerGoal: boundedText(inquiry.problemToSolve, "inquiry goal"),
    targetAudience: boundedText(inquiry.targetAudience, "inquiry target audience"),
    productsServices: boundedText(inquiry.productsServices, "inquiry products and services"),
    targetMarket: boundedText(inquiry.cityCountry, "inquiry market", 250),
    preferredLaunchDate: boundedText(inquiry.preferredLaunchDate, "inquiry preferred launch date", 250),
    expectedBudgetRange: boundedText(inquiry.expectedBudgetRange, "inquiry budget", 500),
    customerFlags,
    strategyHash,
    strategyApproval: project.ceoStrategy!.approval,
    strategyPlan: strategy,
    projectStatus: project.status,
    approvedPrice: project.approvedPrice,
    advanceRequired: project.advanceRequired,
    advanceReceived: project.advanceReceived,
    inquiryStatus: inquiry.status,
    inquiryConvertedProjectId: inquiry.convertedProjectId,
    inquirySourceSnapshot: {
      needsProductCatalog: customerFlags.needsProductCatalog,
      acceptOrdersOnline: customerFlags.acceptOrdersOnline,
      needsReviewsOrAccounts: customerFlags.needsReviewsOrAccounts,
      adminPanelType: customerFlags.adminPanelType,
      productFeatures: customerFlags.productFeatures,
      orderFeatures: customerFlags.orderFeatures,
      adminFeatures: customerFlags.adminFeatures,
      selectedAddons: customerFlags.selectedAddons,
    },
    projectManagerPlan: projectManager ? {
      reference: pmReference,
      approval: project.projectManagerPlan?.approval,
      status: project.projectManagerPlan?.status,
    } : null,
  };
  const sourceFingerprint = digest(JSON.stringify(fingerprintPayload));

  const evidenceRefs = new Set(evidence.map((item) => item.id));
  const ensureReference = (ref: string | null, label: string) => {
    if (ref && !evidenceRefs.has(ref)) throw new BusinessAnalysisValidationError(`${label} has an invalid source reference.`);
  };
  ensureReference(projectDescriptionRef, "Project description");
  ensureReference(projectCategoryRef, "Project category");
  ensureReference(customerIntroRef, "Customer introduction");
  ensureReference(primaryGoalRef, "Customer goal");
  ensureReference(audienceRef, "Target audience");
  ensureReference(productsRef, "Products and services");
  ensureReference(targetMarketRef, "Target market");
  ensureReference(budgetRef, "Customer budget");
  ensureReference(requestedLaunchRef, "Customer requested launch date");
  ensureReference(timelineRef, "Delivery timeline");

  return {
    projectId: project.id,
    inquiryId: inquiry.id,
    sourceFingerprint,
    sourceStrategyHash: strategyHash,
    evidence,
    objectives,
    strategy,
    projectCategory: boundedText(project.category, "project category", 250),
    inquiryCategories: cleanList(inquiry.projectTypes, "inquiry project types"),
    selectedFeatureEvidence,
    customerFlags,
    projectManager: pmReference,
  };
}

function requirementId(projectId: string, category: BusinessAnalysisCategory, sourceRefId: string, title: string): string {
  return `req-${digest(`${projectId}:${category}:${sourceRefId}:${title.trim().toLowerCase()}`).slice(0, 24)}`;
}

function acceptanceCriteria(description: string): string[] {
  return [
    `Given the approved requirement "${description}", when a reviewer checks the delivered artifact and its evidence, then the evidence demonstrates this requirement is satisfied.`,
  ];
}

function addRequirement(
  requirements: BusinessAnalysisRequirement[],
  input: BusinessAnalysisInput,
  category: BusinessAnalysisCategory,
  title: string,
  description: string,
  sourceRefId: string,
  scope: BusinessAnalysisScope,
  rationale: string,
  relatedObjectiveIds: string[] = []
) {
  const source = input.evidence.find((item) => item.id === sourceRefId);
  if (!source) throw new BusinessAnalysisValidationError("A requirement references evidence outside the authorized source snapshot.");
  const id = requirementId(input.projectId, category, sourceRefId, title);
  requirements.push({
    id,
    category,
    title,
    description,
    sourceRefId,
    priority: "UNRANKED",
    rationale: `${rationale} Customer priority was not independently supplied; human prioritization is required.`,
    status: "REVIEW_REQUIRED",
    scope,
    acceptanceCriteria: acceptanceCriteria(description),
    verificationApproach: {
      method: "Human review of the delivered artifact and linked evidence; no tests have been executed by this analysis.",
      status: "NOT_TESTED",
    },
    dependencies: [],
    dependencyAssessment: "NOT_ASSESSED",
    relatedObjectiveIds,
  });
}

function buildCategories(input: BusinessAnalysisInput) {
  const sources = [
    input.projectCategory,
    ...input.inquiryCategories,
    ...input.evidence
      .filter((item) => item.sourceType === "CUSTOMER_SUBMISSION" || item.sourceType === "APPROVED_PROJECT_RECORD")
      .map((item) => item.content),
  ].join(" ").toLowerCase();
  const primaryKeywords = `${input.projectCategory} ${input.inquiryCategories.join(" ")}`.toLowerCase();
  return CATEGORY_KEYWORDS.map(({ category, keywords }) => {
    const primary = keywords.some((keyword) => primaryKeywords.includes(keyword));
    const related = !primary && keywords.some((keyword) => sources.includes(keyword));
    return {
      category,
      relevance: primary ? "PRIMARY" as const : related ? "RELATED" as const : "NOT_INDICATED" as const,
      executionCapability: "NOT_ASSESSED" as const,
    };
  });
}

function buildClarifications(
  input: BusinessAnalysisInput,
  requirements: BusinessAnalysisRequirement[],
  audienceRefId: string | undefined
): BusinessAnalysisClarification[] {
  const questions: Array<{
    key: string;
    issue: string;
    why: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    question: string;
    sourceRefs: string[];
  }> = [];
  const add = (
    key: string,
    issue: string,
    why: string,
    priority: "HIGH" | "MEDIUM" | "LOW",
    question: string,
    sourceRefs: string[] = []
  ) => questions.push({ key, issue, why, priority, question, sourceRefs });

  add("website-languages", "Website content languages are not explicitly recorded.", "Communication language is not proof of the required website languages.", "HIGH", "Which languages must the website or application support?");
  const sourceFor = (path: string) => input.evidence.find((item) => item.sourcePath === path);
  if (!sourceFor("inquiry.targetAudience")) {
    add("target-audience", "A target audience is not recorded.", "No stakeholder characteristics can be derived from an absent customer source.", "HIGH", "Who are the intended users or audiences for this project?");
  }
  if (!sourceFor("inquiry.problemToSolve")) {
    add("business-goal", "A customer-stated business goal is not recorded.", "The expected outcome is needed to validate priorities and acceptance.", "HIGH", "What business problem should the approved project solve?");
  }
  if (!sourceFor("inquiry.cityCountry")) {
    add("target-market", "A target market or location is not recorded.", "Market and jurisdiction affect languages, operations, data handling, and compliance questions.", "MEDIUM", "Which markets or jurisdictions should the project serve?");
  }
  if (!sourceFor("inquiry.productsServices")) {
    add("products-services", "Customer products or services are not recorded.", "Content and domain requirements cannot be inferred without an authorized source.", "MEDIUM", "Which products or services must the project represent?");
  }
  add("user-roles", "No confirmed application user roles or permission matrix is recorded.", "Target audience descriptions do not establish authenticated roles or access permissions.", "HIGH", "Which user roles need access, and what may each role view or change?", audienceRefId ? [audienceRefId] : []);
  if (!input.customerFlags.orderFeatures.length && !input.customerFlags.acceptOrdersOnline) {
    add("payment-operations", "Payment and order operations are not confirmed.", "No payment provider, order lifecycle, or refund rules should be assumed.", "MEDIUM", "Are online payments or orders required? If so, which provider and order/refund rules are approved?");
  } else if (input.customerFlags.acceptOrdersOnline) {
    add("payment-provider", "Payment provider and order operations are unspecified.", "Online ordering does not identify a selected provider or business rules.", "HIGH", "Which payment provider, payment methods, order statuses, and refund rules should apply?", []);
  }
  if (!input.strategy.requiredIntegrations.some((item) => item.name.trim() && !/^none identified$/i.test(item.name.trim()))) {
    add("integrations", "No specific third-party integration has been confirmed.", "Provider selection, credentials ownership, and data exchange rules affect scope and access.", "MEDIUM", "Are any integrations required? For each, identify the provider, data exchanged, and account owner.");
  }
  if (!input.customerFlags.productFeatures.length && !input.customerFlags.adminFeatures.length) {
    add("business-rules", "Project-specific business rules are not recorded.", "Feature behavior, validation, and exception handling cannot be safely inferred.", "MEDIUM", "What business rules, validation, and failure handling should apply to the approved features?");
  }
  add("nonfunctional", "Non-functional targets are not explicit.", "Performance, availability, accessibility, backup, and support targets affect design and acceptance.", "MEDIUM", "What performance, availability, accessibility, backup, and support targets are required?");
  add("compliance-data", "Data retention and applicable compliance requirements are not confirmed.", "The project must not assume a jurisdiction, retention period, or legal obligation.", "MEDIUM", "What personal or sensitive data will be processed, where should it be stored, and what retention/compliance rules apply?");
  if (!input.customerFlags.adminFeatures.length && input.customerFlags.adminPanelType === "client_admin") {
    add("admin-capabilities", "The requested client admin panel has no confirmed capabilities.", "An admin-panel selection alone does not define permitted actions.", "HIGH", "Which admin actions, data views, and permission levels are required?");
  }

  const relevantRequirements = requirements.filter((requirement) =>
    requirement.category === "functional" || requirement.category === "security" ||
    requirement.category === "integration" || requirement.category === "data"
  );
  return questions.map((question) => {
    const id = `clar-${digest(`${input.projectId}:${question.key}`).slice(0, 20)}`;
    return {
      id,
      questionOrIssue: question.issue,
      whyNeeded: question.why,
      affectedRequirementIds: relevantRequirements.map((requirement) => requirement.id),
      priority: question.priority,
      recommendedQuestion: question.question,
      status: "OPEN",
      sourceRefIds: question.sourceRefs,
    };
  });
}

function detectConflicts(input: BusinessAnalysisInput): BusinessAnalysisConflict[] {
  const conflicts: BusinessAnalysisConflict[] = [];
  const hasOrderFeatures = input.customerFlags.orderFeatures.length > 0;
  if (!input.customerFlags.acceptOrdersOnline && hasOrderFeatures) {
    const refs = input.evidence.filter((item) =>
      item.sourcePath.startsWith("inquiry.orderFeatures.")
    ).map((item) => item.id);
    conflicts.push({
      id: `conf-${digest(`${input.projectId}:online-orders`).slice(0, 20)}`,
      issue: "Online ordering is marked disabled, but order features are selected.",
      sourceRefIds: refs,
      affectedRequirementIds: [],
      priority: "HIGH",
      recommendedQuestion: "Should online ordering be enabled, or should the selected order features be removed?",
      status: "OPEN",
    });
  }
  if (!input.customerFlags.needsProductCatalog && input.customerFlags.productFeatures.length) {
    conflicts.push({
      id: `conf-${digest(`${input.projectId}:product-catalog`).slice(0, 20)}`,
      issue: "Product catalog is marked disabled, but product catalog features are selected.",
      sourceRefIds: input.evidence.filter((item) => item.sourcePath.startsWith("inquiry.productFeatures.")).map((item) => item.id),
      affectedRequirementIds: [],
      priority: "MEDIUM",
      recommendedQuestion: "Is a product catalog required? Confirm whether to enable the catalog or remove the selected product features.",
      status: "OPEN",
    });
  }
  if (input.customerFlags.adminPanelType === "none" && input.customerFlags.adminFeatures.length) {
    conflicts.push({
      id: `conf-${digest(`${input.projectId}:admin-panel`).slice(0, 20)}`,
      issue: "Admin panel is marked absent, but admin features are selected.",
      sourceRefIds: input.evidence.filter((item) => item.sourcePath.startsWith("inquiry.adminFeatures.")).map((item) => item.id),
      affectedRequirementIds: [],
      priority: "HIGH",
      recommendedQuestion: "Is an admin panel required, or should the selected admin features be removed?",
      status: "OPEN",
    });
  }
  return conflicts;
}

export function analyzeBusinessRequirements(input: BusinessAnalysisInput, generatedAt = new Date().toISOString()): BusinessAnalysisRecord {
  validateBusinessAnalysisInput(input);
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new BusinessAnalysisValidationError("The analysis generation timestamp is invalid.");
  }
  const requirements: BusinessAnalysisRequirement[] = [];
  const inquiryLinks: BusinessAnalysisTraceLink[] = [];
  const objectiveLinks: BusinessAnalysisTraceLink[] = [];
  const featureLinks: BusinessAnalysisRequirementFeatureLink[] = [];

  for (const objective of input.objectives) {
    const id = requirementId(input.projectId, "business", objective.sourceRefId, objective.text);
    addRequirement(requirements, input, "business", objective.text, objective.text, objective.sourceRefId,
      "NEEDS_CONFIRMATION", "Business objective carried forward from the human-approved Agent 1 strategy.", [objective.id]);
    objectiveLinks.push({ sourceRefId: objective.sourceRefId, requirementIds: [id] });
  }

  const goalRef = input.evidence.find((item) => item.sourcePath === "inquiry.problemToSolve");
  const projectDescription = input.evidence.find((item) => item.sourcePath === "project.description");
  if (projectDescription) {
    addRequirement(requirements, input, "business", "Approved project scope description", projectDescription.content,
      projectDescription.id, "IN_SCOPE", "Copied from the approved project record; this analysis does not expand or renegotiate that scope.");
  }
  const customerIntro = input.evidence.find((item) => item.sourcePath === "inquiry.customerIntro");
  if (customerIntro) {
    addRequirement(requirements, input, "business", "Customer-provided project introduction", customerIntro.content,
      customerIntro.id, "NEEDS_CONFIRMATION", "Customer-submitted context is preserved as supplied and requires human confirmation against approved scope.");
    inquiryLinks.push({
      sourceRefId: customerIntro.id,
      requirementIds: [requirementId(input.projectId, "business", customerIntro.id, "Customer-provided project introduction")],
    });
  }
  if (goalRef) {
    addRequirement(requirements, input, "business", "Customer-stated business goal", goalRef.content, goalRef.id,
      "NEEDS_CONFIRMATION", "Customer-stated goal; included for human baseline review.");
    inquiryLinks.push({ sourceRefId: goalRef.id, requirementIds: [requirementId(input.projectId, "business", goalRef.id, "Customer-stated business goal")] });
  }
  const audienceRef = input.evidence.find((item) => item.sourcePath === "inquiry.targetAudience");
  if (audienceRef) {
    addRequirement(requirements, input, "stakeholder", "Customer-stated target audience", audienceRef.content, audienceRef.id,
      "NEEDS_CONFIRMATION", "Customer-stated audience; specific user roles and access rights remain unconfirmed.");
    inquiryLinks.push({ sourceRefId: audienceRef.id, requirementIds: [requirementId(input.projectId, "stakeholder", audienceRef.id, "Customer-stated target audience")] });
  }
  const securityPolicy = input.evidence.find((item) => item.sourcePath === "analysis.policy.security");
  if (securityPolicy) {
    addRequirement(requirements, input, "security", "Confirm access and authorization boundaries", securityPolicy.content,
      securityPolicy.id, "NEEDS_CONFIRMATION",
      "DWD analysis policy recommendation; this is not a customer-approved feature or completed security review.");
  }
  const nonfunctionalPolicy = input.evidence.find((item) => item.sourcePath === "analysis.policy.nonfunctional");
  if (nonfunctionalPolicy) {
    addRequirement(requirements, input, "non_functional", "Confirm non-functional targets", nonfunctionalPolicy.content,
      nonfunctionalPolicy.id, "NEEDS_CONFIRMATION",
      "DWD analysis policy recommendation; project-specific targets are not present in the authorized source.");
  }
  const technical = input.strategy.technicalArchitecture;
  const technicalRef = input.evidence.find((item) => item.sourcePath === "project.ceoStrategy.plan.technicalArchitecture");
  if (technicalRef && isNonEmptyFinding(technical)) {
    addRequirement(requirements, input, "technical", "Strategy technical architecture recommendation", technical.text, technicalRef.id,
      "NEEDS_CONFIRMATION", "This is an Agent 1 recommendation, not an implemented or verified architecture.");
  }
  const uxRef = input.evidence.find((item) => item.sourcePath === "project.ceoStrategy.plan.uiUxDirection");
  if (uxRef) {
    addRequirement(requirements, input, "ux", "Strategy UI/UX direction", uxRef.content, uxRef.id,
      "NEEDS_CONFIRMATION", "This is a strategy recommendation and requires specialist/human review.");
  }
  input.strategy.requiredIntegrations.forEach((integration, index) => {
    if (!integration.name.trim() || /^none identified$/i.test(integration.name.trim())) return;
    const refId = findingSourceId(`project.ceoStrategy.plan.requiredIntegrations.${index}`);
    const evidence = input.evidence.find((item) => item.id === refId);
    if (evidence) {
      addRequirement(requirements, input, "integration", integration.name, integration.rationale.text, evidence.id,
        "NEEDS_CONFIRMATION", "Integration is a strategy recommendation; provider, credentials, data boundaries, and approval remain unconfirmed.");
    }
  });
  const productsRef = input.evidence.find((item) => item.sourcePath === "inquiry.productsServices");
  if (productsRef) {
    addRequirement(requirements, input, "data", "Customer-described products and services", productsRef.content, productsRef.id,
      "NEEDS_CONFIRMATION", "Describes customer-provided content/data; data fields, ownership, retention, and processing rules are not inferred.");
    inquiryLinks.push({ sourceRefId: productsRef.id, requirementIds: [requirementId(input.projectId, "data", productsRef.id, "Customer-described products and services")] });
  }
  const targetMarket = input.evidence.find((item) => item.sourcePath === "inquiry.cityCountry");
  if (targetMarket) {
    addRequirement(requirements, input, "business", "Customer-provided target market or location", targetMarket.content,
      targetMarket.id, "NEEDS_CONFIRMATION", "Customer-provided location is not a verified jurisdiction, language, or compliance requirement.");
    inquiryLinks.push({
      sourceRefId: targetMarket.id,
      requirementIds: [requirementId(input.projectId, "business", targetMarket.id, "Customer-provided target market or location")],
    });
  }
  for (const [sourcePath, title, rationale] of [
    ["inquiry.expectedBudgetRange", "Customer-provided budget constraint", "Customer-stated budget is not a confirmed final quotation or feasibility assessment."],
    ["inquiry.preferredLaunchDate", "Customer-requested launch date", "Requested date is not a verified delivery commitment or schedule."],
  ]) {
    const commercialEvidence = input.evidence.find((item) => item.sourcePath === sourcePath);
    if (commercialEvidence) {
      addRequirement(requirements, input, "business", title, commercialEvidence.content, commercialEvidence.id,
        "NEEDS_CONFIRMATION", rationale);
      inquiryLinks.push({
        sourceRefId: commercialEvidence.id,
        requirementIds: [requirementId(input.projectId, "business", commercialEvidence.id, title)],
      });
    }
  }
  input.strategy.commercialConsiderations.forEach((finding, index) => {
    const refId = findingSourceId(`project.ceoStrategy.plan.commercialConsiderations.${index}`);
    const commercialEvidence = input.evidence.find((item) => item.id === refId);
    if (commercialEvidence) {
      addRequirement(requirements, input, "business", "Agent 1 commercial recommendation", finding.text,
        commercialEvidence.id, "NEEDS_CONFIRMATION", "This is a human-approved strategy recommendation, not an independently verified commercial fact.");
    }
  });
  const timelineRef = input.evidence.find((item) => item.sourcePath === "project.deliveryTimeline");
  if (timelineRef) {
    addRequirement(requirements, input, "compliance_operations", "Approved project delivery timeline", timelineRef.content, timelineRef.id,
      "IN_SCOPE", "Copied from the approved project record; feasibility and operational readiness are not re-verified here.");
  }

  const features: BusinessAnalysisFeature[] = input.selectedFeatureEvidence.map((item) => {
    const id = `feature-${digest(`${input.projectId}:${item.refId}:${item.text.toLowerCase()}`).slice(0, 22)}`;
    return {
      id,
      title: item.text,
      businessPurpose: item.text,
      sourceRefId: item.refId,
      scope: item.scope,
      userRoleIds: [],
      inputs: ["Not specified in the authorized source; clarification required."],
      outputs: ["Not specified in the authorized source; clarification required."],
      businessRules: ["No project-specific business rules are recorded."],
      validation: ["No validation rules are recorded."],
      successScenarios: ["No feature-specific success scenario is confirmed."],
      failureScenarios: ["No feature-specific failure scenario is confirmed."],
      permissions: ["No permissions are inferred; confirm roles and access boundaries."],
      dependencies: [],
      dependencyAssessment: "NOT_ASSESSED",
      acceptanceCriteria: [],
      status: "REVIEW_REQUIRED",
    };
  });

  for (const item of input.selectedFeatureEvidence) {
    if (item.scope === "IN_SCOPE") {
      addRequirement(requirements, input, "functional", item.text, item.text, item.refId, item.scope,
        "Copied from an approved project feature; behavior and detailed rules remain subject to baseline review.");
    } else {
      addRequirement(requirements, input, "functional", item.text, item.text, item.refId, "NEEDS_CONFIRMATION",
        "Customer-selected or strategy-recommended feature; commercial inclusion and detailed behavior are not inferred.");
    }
  }
  for (const feature of features) {
    const linked = requirements.find((requirement) => requirement.sourceRefId === feature.sourceRefId && requirement.category === "functional");
    if (linked) {
      feature.acceptanceCriteria = linked.acceptanceCriteria;
      featureLinks.push({ requirementId: linked.id, featureId: feature.id });
    }
  }

  const scopeBoundaries: BusinessAnalysisRecord["scopeBoundaries"] = [];
  const scopeSource = input.strategy.scopeAndExclusions;
  scopeSource.scope.forEach((finding, index) => {
    const sourceRefId = findingSourceId(`project.ceoStrategy.plan.scopeAndExclusions.scope.${index}`);
    const source = input.evidence.find((item) => item.id === sourceRefId);
    if (!source) throw new BusinessAnalysisValidationError("An approved scope item has no valid evidence reference.");
    scopeBoundaries.push({
      id: `scope-${digest(`${input.projectId}:${sourceRefId}`).slice(0, 20)}`,
      text: finding.text,
      sourceRefId,
      scope: finding.status === "VERIFIED" ? "IN_SCOPE" : "NEEDS_CONFIRMATION",
      sourceStatus: finding.status,
    });
  });
  scopeSource.exclusions.forEach((finding, index) => {
    const sourceRefId = findingSourceId(`project.ceoStrategy.plan.scopeAndExclusions.exclusions.${index}`);
    const source = input.evidence.find((item) => item.id === sourceRefId);
    if (!source) throw new BusinessAnalysisValidationError("An approved exclusion has no valid evidence reference.");
    scopeBoundaries.push({
      id: `scope-${digest(`${input.projectId}:${sourceRefId}`).slice(0, 20)}`,
      text: finding.text,
      sourceRefId,
      scope: finding.status === "VERIFIED" ? "OUT_OF_SCOPE" : "NEEDS_CONFIRMATION",
      sourceStatus: finding.status,
    });
  });

  const assumptions = input.strategy.assumptions.map((item, index) => {
    const sourceRefId = findingSourceId(`project.ceoStrategy.plan.assumptions.${index}`);
    if (!input.evidence.some((item) => item.id === sourceRefId)) {
      throw new BusinessAnalysisValidationError("An assumption has no valid strategy source reference.");
    }
    return {
      id: `assumption-${digest(`${input.projectId}:${sourceRefId}`).slice(0, 20)}`,
      text: item.text,
      sourceRefId,
      status: "ASSUMED" as const,
    };
  });
  const risks: BusinessAnalysisRisk[] = input.strategy.riskRegister.map((risk, index) => {
    const sourceRefId = findingSourceId(`project.ceoStrategy.plan.riskRegister.${index}.risk`);
    const mitigationRefId = findingSourceId(`project.ceoStrategy.plan.riskRegister.${index}.mitigation`);
    const source = input.evidence.find((item) => item.id === sourceRefId);
    const mitigation = input.evidence.find((item) => item.id === mitigationRefId);
    if (!source || !mitigation) {
      throw new BusinessAnalysisValidationError("A strategy risk or mitigation has no valid evidence reference.");
    }
    return {
      id: `risk-${digest(`${input.projectId}:${sourceRefId}`).slice(0, 20)}`,
      description: risk.risk.text,
      sourceRefId,
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation: mitigation.content,
      status: "REVIEW_REQUIRED",
    };
  });
  const conflicts = detectConflicts(input).map((conflict) => ({
    ...conflict,
    affectedRequirementIds: requirements
      .filter((requirement) => conflict.sourceRefIds.includes(requirement.sourceRefId))
      .map((requirement) => requirement.id),
  }));
  const clarifications = buildClarifications(input, requirements, audienceRef?.id);

  const userRoles: BusinessAnalysisRecord["userRoles"] = [];
  const traceByInquiry = new Map<string, Set<string>>();
  for (const link of inquiryLinks) {
    const ids = traceByInquiry.get(link.sourceRefId) || new Set<string>();
    link.requirementIds.forEach((id) => ids.add(id));
    traceByInquiry.set(link.sourceRefId, ids);
  }
  const dedupedInquiryLinks = Array.from(traceByInquiry, ([sourceRefId, requirementIds]) => ({
    sourceRefId,
    requirementIds: Array.from(requirementIds),
  }));

  const analysis: BusinessAnalysisRecord = {
    id: `ba-${digest(`${input.projectId}:${input.sourceFingerprint}`).slice(0, 24)}`,
    version: BUSINESS_ANALYSIS_VERSION,
    agentId: BUSINESS_ANALYST_AGENT_ID,
    projectId: input.projectId,
    inquiryId: input.inquiryId,
    generatedAt,
    generatedBy: "deterministic_requirements_analyzer",
    sourceFingerprint: input.sourceFingerprint,
    sourceStrategyHash: input.sourceStrategyHash,
    status: "AWAITING_REVIEW",
    evidence: input.evidence,
    businessObjectives: input.objectives,
    requirements,
    features,
    userRoles,
    clarifications,
    conflicts,
    assumptions,
    risks,
    scopeBoundaries,
    categories: buildCategories(input),
    traceability: {
      inquiryToRequirements: dedupedInquiryLinks,
      objectivesToRequirements: objectiveLinks,
      requirementsToFeatures: featureLinks,
      projectManagerTasks: input.projectManager || null,
    },
    clarificationRequests: [],
    approval: null,
  };
  validateBusinessAnalysisRecord(analysis, input.projectId);
  return analysis;
}

export function validateBusinessAnalysisInput(input: BusinessAnalysisInput): void {
  if (!input || typeof input !== "object" || typeof input.projectId !== "string" ||
      !input.projectId.trim() || input.projectId.length > 100 ||
      typeof input.inquiryId !== "string" || !input.inquiryId.trim() ||
      input.inquiryId.length > 100 ||
      !/^[a-f0-9]{64}$/i.test(input.sourceFingerprint) ||
      !/^[a-f0-9]{64}$/i.test(input.sourceStrategyHash) ||
      !Array.isArray(input.evidence) || !input.evidence.length || input.evidence.length > 200 ||
      !Array.isArray(input.objectives) || !input.objectives.length ||
      !Array.isArray(input.selectedFeatureEvidence) || input.selectedFeatureEvidence.length > 100 ||
      !Array.isArray(input.inquiryCategories) || input.inquiryCategories.length > 40 ||
      typeof input.projectCategory !== "string" || !input.projectCategory.trim() ||
      !input.customerFlags || !input.strategy ||
      !Array.isArray(input.strategy.businessObjectives) ||
      !Array.isArray(input.strategy.functionalRequirements) ||
      !Array.isArray(input.strategy.requiredIntegrations) ||
      !Array.isArray(input.strategy.scopeAndExclusions?.scope) ||
      !Array.isArray(input.strategy.scopeAndExclusions?.exclusions) ||
      !Array.isArray(input.strategy.assumptions)) {
    throw new BusinessAnalysisValidationError("The authorized Business Analyst input is malformed.");
  }
  const refs = new Set<string>();
  for (const evidence of input.evidence) {
    if (!evidence || typeof evidence.id !== "string" || !evidence.id.trim() ||
        refs.has(evidence.id) || typeof evidence.sourcePath !== "string" ||
        !evidence.sourcePath.trim() || typeof evidence.label !== "string" ||
        !evidence.label.trim() || typeof evidence.content !== "string" ||
        !evidence.content.trim() || evidence.content.length > 5000 ||
        !["CUSTOMER_SUBMISSION", "APPROVED_PROJECT_RECORD", "HUMAN_APPROVED_STRATEGY", "APPROVED_PROJECT_MANAGER_PLAN", "DWD_ANALYSIS_POLICY"].includes(evidence.sourceType)) {
      throw new BusinessAnalysisValidationError("A Business Analyst evidence reference is invalid or duplicated.");
    }
    refs.add(evidence.id);
  }
  for (const objective of input.objectives) {
    if (!objective || typeof objective.id !== "string" || !objective.id ||
        typeof objective.text !== "string" || !objective.text.trim() ||
        typeof objective.sourceRefId !== "string" || !refs.has(objective.sourceRefId) ||
        typeof objective.evidenceStatus !== "string") {
      throw new BusinessAnalysisValidationError("A business objective is missing a source-bound identifier.");
    }
  }
  for (const feature of input.selectedFeatureEvidence) {
    if (!feature || typeof feature.refId !== "string" || !refs.has(feature.refId) ||
        typeof feature.text !== "string" || !feature.text.trim() ||
        !["IN_SCOPE", "OUT_OF_SCOPE", "OPTIONAL", "FUTURE_PHASE", "NEEDS_CONFIRMATION"].includes(feature.scope)) {
      throw new BusinessAnalysisValidationError("A selected feature is missing a valid authorized source or scope label.");
    }
  }
  for (const flag of [
    input.customerFlags.needsProductCatalog,
    input.customerFlags.acceptOrdersOnline,
    input.customerFlags.needsReviewsOrAccounts,
  ]) {
    if (typeof flag !== "boolean") throw new BusinessAnalysisValidationError("A customer feature flag is invalid.");
  }
  if (!["none", "client_admin"].includes(input.customerFlags.adminPanelType)) {
    throw new BusinessAnalysisValidationError("The customer admin-panel selection is invalid.");
  }
  if (typeof input.customerFlags.adminPanelType !== "string" ||
      !Array.isArray(input.customerFlags.productFeatures) ||
      !Array.isArray(input.customerFlags.orderFeatures) ||
      !Array.isArray(input.customerFlags.adminFeatures) ||
      !Array.isArray(input.customerFlags.selectedAddons)) {
    throw new BusinessAnalysisValidationError("The authorized customer feature snapshot is malformed.");
  }
  if (input.projectManager && (
      input.projectManager.linkageStatus !== "NOT_MAPPED" ||
      !input.projectManager.planId ||
      !Array.isArray(input.projectManager.tasks) ||
      input.projectManager.tasks.some((task) =>
        !task || typeof task.taskId !== "string" || !task.taskId ||
        typeof task.roleId !== "string" || !task.roleId ||
        typeof task.title !== "string" || !task.title.trim() ||
        typeof task.sourceRefId !== "string" || !refs.has(task.sourceRefId))
  )) {
    throw new BusinessAnalysisValidationError("The Project Manager traceability source is malformed.");
  }
}

export function validateBusinessAnalysisRecord(record: BusinessAnalysisRecord, projectId: string): void {
  if (!record || typeof record !== "object" || record.agentId !== BUSINESS_ANALYST_AGENT_ID ||
      record.version !== BUSINESS_ANALYSIS_VERSION || record.projectId !== projectId ||
      typeof record.inquiryId !== "string" || !record.inquiryId.trim() ||
      typeof record.id !== "string" || !record.id.trim() ||
      typeof record.generatedAt !== "string" || !Number.isFinite(Date.parse(record.generatedAt)) ||
      record.generatedBy !== "deterministic_requirements_analyzer" ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprint) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceStrategyHash) ||
      !["AWAITING_REVIEW", "APPROVED"].includes(record.status) ||
      !Array.isArray(record.evidence) || !Array.isArray(record.requirements) ||
      !record.requirements.length || !Array.isArray(record.features) ||
      !Array.isArray(record.businessObjectives) || !Array.isArray(record.clarifications) ||
      !Array.isArray(record.conflicts) || !Array.isArray(record.assumptions) ||
      !Array.isArray(record.risks) || !record.risks.length ||
      !Array.isArray(record.scopeBoundaries) || !record.scopeBoundaries.length ||
      !Array.isArray(record.categories) ||
      !Array.isArray(record.userRoles) || !record.traceability ||
      !Array.isArray(record.clarificationRequests)) {
    throw new BusinessAnalysisValidationError("The saved Business Analyst document is malformed or bound to another project.");
  }
  if (record.status === "APPROVED") {
    if (!record.approval || typeof record.approval.approvedBy !== "string" ||
        typeof record.approval.approvedAt !== "string" ||
        typeof record.approval.analysisId !== "string" ||
        typeof record.approval.sourceFingerprint !== "string" ||
        record.approval.analysisId !== record.id ||
        record.approval.sourceFingerprint !== record.sourceFingerprint ||
        !record.approval.approvedBy.trim() || !Number.isFinite(Date.parse(record.approval.approvedAt))) {
      throw new BusinessAnalysisValidationError("The approval is not bound to this exact analysis version and source fingerprint.");
    }
  } else if (record.approval !== null) {
    throw new BusinessAnalysisValidationError("A pending analysis cannot contain an approval record.");
  }
  const evidenceIds = new Set<string>();
  for (const item of record.evidence) {
    if (!item || typeof item.id !== "string" || !item.id || evidenceIds.has(item.id) ||
        typeof item.sourcePath !== "string" || !item.sourcePath ||
        typeof item.label !== "string" || typeof item.content !== "string" ||
        !item.label.trim() || !item.content.trim() ||
        !["CUSTOMER_SUBMISSION", "APPROVED_PROJECT_RECORD", "HUMAN_APPROVED_STRATEGY", "APPROVED_PROJECT_MANAGER_PLAN", "DWD_ANALYSIS_POLICY"].includes(item.sourceType)) {
      throw new BusinessAnalysisValidationError("The analysis evidence register contains an invalid entry.");
    }
    evidenceIds.add(item.id);
  }
  const requirementIds = new Set<string>();
  for (const requirement of record.requirements) {
    if (!requirement || typeof requirement.id !== "string" || !requirement.id ||
        requirementIds.has(requirement.id) ||
        !BUSINESS_ANALYSIS_CATEGORIES.includes(requirement.category) ||
        typeof requirement.title !== "string" || typeof requirement.description !== "string" ||
        !requirement.title.trim() || !requirement.description.trim() ||
        !evidenceIds.has(requirement.sourceRefId) ||
        !["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNRANKED"].includes(requirement.priority) ||
        !requirement.rationale.trim() || requirement.status !== "REVIEW_REQUIRED" ||
        !["IN_SCOPE", "OUT_OF_SCOPE", "OPTIONAL", "FUTURE_PHASE", "NEEDS_CONFIRMATION"].includes(requirement.scope) ||
        !Array.isArray(requirement.acceptanceCriteria) || !requirement.acceptanceCriteria.length ||
        requirement.acceptanceCriteria.some((criterion) => typeof criterion !== "string" || !criterion.trim()) ||
        requirement.verificationApproach?.status !== "NOT_TESTED" ||
        typeof requirement.verificationApproach.method !== "string" ||
        !requirement.verificationApproach.method.trim() ||
        !Array.isArray(requirement.dependencies) ||
        requirement.dependencies.some((id) => typeof id !== "string") ||
        requirement.dependencyAssessment !== "NOT_ASSESSED" ||
        !Array.isArray(requirement.relatedObjectiveIds) ||
        requirement.relatedObjectiveIds.some((id) => typeof id !== "string")) {
      throw new BusinessAnalysisValidationError("A requirement is invalid, untraceable, or falsely marked as tested.");
    }
    requirementIds.add(requirement.id);
  }
  const objectiveIds = new Set(record.businessObjectives.map((objective) => objective.id));
  for (const requirement of record.requirements) {
    if (!evidenceIds.has(requirement.sourceRefId) ||
        requirement.relatedObjectiveIds.some((id) => !objectiveIds.has(id)) ||
        requirement.dependencies.some((id) => !requirementIds.has(id))) {
      throw new BusinessAnalysisValidationError(`Requirement ${requirement.id} has a missing traceability reference.`);
    }
  }
  const featureIds = new Set<string>();
  for (const feature of record.features) {
    if (!feature || typeof feature.id !== "string" || !feature.id ||
        featureIds.has(feature.id) ||
        typeof feature.title !== "string" || typeof feature.businessPurpose !== "string" ||
        !feature.title.trim() || !feature.businessPurpose.trim() ||
        !evidenceIds.has(feature.sourceRefId) ||
        !["IN_SCOPE", "OUT_OF_SCOPE", "OPTIONAL", "FUTURE_PHASE", "NEEDS_CONFIRMATION"].includes(feature.scope) ||
        !Array.isArray(feature.userRoleIds) ||
        !Array.isArray(feature.inputs) || !Array.isArray(feature.outputs) ||
        !Array.isArray(feature.businessRules) || !Array.isArray(feature.validation) ||
        !Array.isArray(feature.successScenarios) || !Array.isArray(feature.failureScenarios) ||
        !Array.isArray(feature.permissions) || !Array.isArray(feature.dependencies) ||
        !Array.isArray(feature.acceptanceCriteria) || feature.status !== "REVIEW_REQUIRED" ||
        feature.dependencies.some((id) => typeof id !== "string") ||
        feature.dependencyAssessment !== "NOT_ASSESSED" ||
        feature.acceptanceCriteria.some((criterion) => typeof criterion !== "string" || !criterion.trim()) ||
        [...feature.userRoleIds, ...feature.inputs, ...feature.outputs, ...feature.businessRules,
          ...feature.validation, ...feature.successScenarios, ...feature.failureScenarios, ...feature.permissions]
          .some((value) => typeof value !== "string" || !value.trim())) {
      throw new BusinessAnalysisValidationError("A feature analysis is invalid or not traceable.");
    }
    featureIds.add(feature.id);
  }
  for (const clarification of record.clarifications) {
    if (!clarification || typeof clarification.id !== "string" ||
        typeof clarification.questionOrIssue !== "string" ||
        typeof clarification.whyNeeded !== "string" ||
        typeof clarification.recommendedQuestion !== "string" ||
        !clarification.id || !clarification.questionOrIssue.trim() ||
        !clarification.whyNeeded.trim() || !clarification.recommendedQuestion.trim() ||
        !["HIGH", "MEDIUM", "LOW"].includes(clarification.priority) ||
        !["OPEN", "REQUESTED"].includes(clarification.status) ||
        !Array.isArray(clarification.affectedRequirementIds) ||
        clarification.affectedRequirementIds.some((id) => !requirementIds.has(id)) ||
        !Array.isArray(clarification.sourceRefIds) ||
        clarification.sourceRefIds.some((id) => !evidenceIds.has(id))) {
      throw new BusinessAnalysisValidationError("A clarification contains an invalid or fabricated traceability reference.");
    }
  }
  for (const conflict of record.conflicts) {
    if (!conflict || typeof conflict.id !== "string" ||
        typeof conflict.issue !== "string" || typeof conflict.recommendedQuestion !== "string" ||
        !conflict.id || !conflict.issue.trim() || !conflict.recommendedQuestion.trim() ||
        !["HIGH", "MEDIUM"].includes(conflict.priority) ||
        !Array.isArray(conflict.sourceRefIds) || !Array.isArray(conflict.affectedRequirementIds) ||
        conflict.sourceRefIds.some((id) => !evidenceIds.has(id)) ||
        conflict.affectedRequirementIds.some((id) => !requirementIds.has(id))) {
      throw new BusinessAnalysisValidationError("A conflict contains an invalid source or requirement reference.");
    }
  }
  for (const scope of record.scopeBoundaries) {
    if (!scope || typeof scope.id !== "string" || !scope.id ||
        typeof scope.text !== "string" || !scope.text.trim() ||
        !evidenceIds.has(scope.sourceRefId) ||
        !["IN_SCOPE", "OUT_OF_SCOPE", "OPTIONAL", "FUTURE_PHASE", "NEEDS_CONFIRMATION"].includes(scope.scope) ||
        !["VERIFIED", "RECOMMENDED", "ASSUMED", "UNKNOWN", "UNVERIFIED", "MODEL_INFERENCE", "HUMAN_REVIEW_REQUIRED", "BLOCKED", "NOT TESTED", "COMPLETED"].includes(scope.sourceStatus)) {
      throw new BusinessAnalysisValidationError("A scope boundary is invalid or has no source evidence.");
    }
  }
  for (const traceList of [record.traceability.inquiryToRequirements, record.traceability.objectivesToRequirements]) {
    if (!Array.isArray(traceList) || traceList.some((link) =>
      !link || typeof link.sourceRefId !== "string" ||
      !evidenceIds.has(link.sourceRefId) ||
      !Array.isArray(link.requirementIds) ||
      link.requirementIds.some((id) => !requirementIds.has(id))
    )) {
      throw new BusinessAnalysisValidationError("The analysis traceability matrix contains a forged reference.");
    }
  }
  if (!Array.isArray(record.traceability.requirementsToFeatures)) {
    throw new BusinessAnalysisValidationError("The requirement-to-feature traceability matrix is malformed.");
  }
  for (const link of record.traceability.requirementsToFeatures) {
    if (!link || !requirementIds.has(link.requirementId) ||
        !featureIds.has(link.featureId)) {
      throw new BusinessAnalysisValidationError("A requirement-to-feature link has a fabricated reference.");
    }
  }
  const objectiveIdsUnique = new Set<string>();
  for (const objective of record.businessObjectives) {
    if (!objective || typeof objective.id !== "string" || !objective.id ||
        objectiveIdsUnique.has(objective.id) ||
        typeof objective.text !== "string" || !objective.text.trim() ||
        typeof objective.sourceRefId !== "string" || !evidenceIds.has(objective.sourceRefId) ||
        !["VERIFIED", "RECOMMENDED", "ASSUMED", "UNKNOWN", "UNVERIFIED", "MODEL_INFERENCE", "HUMAN_REVIEW_REQUIRED", "BLOCKED", "NOT TESTED", "COMPLETED"].includes(objective.evidenceStatus)) {
      throw new BusinessAnalysisValidationError("A business objective is invalid or untraceable.");
    }
    objectiveIdsUnique.add(objective.id);
  }
  const assumptionIds = new Set<string>();
  for (const assumption of record.assumptions) {
    if (!assumption || typeof assumption.id !== "string" || !assumption.id ||
        assumptionIds.has(assumption.id) || typeof assumption.text !== "string" ||
        !assumption.text.trim() || !evidenceIds.has(assumption.sourceRefId) ||
        assumption.status !== "ASSUMED") {
      throw new BusinessAnalysisValidationError("An assumption is invalid or not traceable to its source.");
    }
    assumptionIds.add(assumption.id);
  }
  const categoryNames = new Set<string>();
  for (const category of record.categories) {
    if (!category || typeof category.category !== "string" || !category.category.trim() ||
        categoryNames.has(category.category) ||
        !["PRIMARY", "RELATED", "NOT_INDICATED", "NEEDS_CONFIRMATION"].includes(category.relevance) ||
        category.executionCapability !== "NOT_ASSESSED") {
      throw new BusinessAnalysisValidationError("A category claim is invalid or overstates implementation capability.");
    }
    categoryNames.add(category.category);
  }
  if (categoryNames.size !== CATEGORY_KEYWORDS.length ||
      CATEGORY_KEYWORDS.some(({ category }) => !categoryNames.has(category))) {
    throw new BusinessAnalysisValidationError("The category assessment is incomplete or contains unsupported categories.");
  }
  for (const userRole of record.userRoles) {
    if (!userRole || typeof userRole.id !== "string" || !userRole.id ||
        typeof userRole.description !== "string" || !userRole.description.trim() ||
        (userRole.sourceRefId !== null && !evidenceIds.has(userRole.sourceRefId)) ||
        !["CUSTOMER_STATED", "NEEDS_CONFIRMATION"].includes(userRole.status) ||
        !Array.isArray(userRole.permissions) ||
        userRole.permissions.some((permission) => typeof permission !== "string" || !permission.trim())) {
      throw new BusinessAnalysisValidationError("A user-role statement is invalid or untraceable.");
    }
  }
  const riskIds = new Set<string>();
  for (const risk of record.risks) {
    if (!risk || typeof risk.id !== "string" || !risk.id || riskIds.has(risk.id) ||
        typeof risk.description !== "string" || !risk.description.trim() ||
        typeof risk.sourceRefId !== "string" || !evidenceIds.has(risk.sourceRefId) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(risk.likelihood) ||
        !["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(risk.impact) ||
        typeof risk.mitigation !== "string" || !risk.mitigation.trim() ||
        risk.status !== "REVIEW_REQUIRED") {
      throw new BusinessAnalysisValidationError("The analysis risk register contains an invalid entry.");
    }
    riskIds.add(risk.id);
  }
  if (record.traceability.projectManagerTasks) {
    const projectManager = record.traceability.projectManagerTasks;
    if (typeof projectManager.planId !== "string" || !projectManager.planId.trim() ||
        projectManager.linkageStatus !== "NOT_MAPPED" || !Array.isArray(projectManager.tasks) ||
        projectManager.tasks.some((task) =>
          !task || typeof task.taskId !== "string" || !task.taskId.trim() ||
          typeof task.roleId !== "string" || !task.roleId.trim() ||
          typeof task.title !== "string" || !task.title.trim() ||
          !evidenceIds.has(task.sourceRefId)
        )) {
      throw new BusinessAnalysisValidationError("Project Manager task traceability includes an invalid source.");
    }
  }
  for (const request of record.clarificationRequests) {
    if (!request || typeof request.requestedBy !== "string" || !request.requestedBy.trim() ||
        typeof request.requestedAt !== "string" || !Number.isFinite(Date.parse(request.requestedAt)) ||
        !Array.isArray(request.clarificationIds) ||
        request.deliveryStatus !== "RECORDED_NOT_SENT" ||
        request.clarificationIds.some((id) => !record.clarifications.some((item) => item.id === id && item.status === "REQUESTED"))) {
      throw new BusinessAnalysisValidationError("A clarification request has invalid status or references.");
    }
  }
}

export function isBusinessAnalysisCurrent(
  record: BusinessAnalysisRecord,
  project: Project,
  inquiry: Inquiry
): boolean {
  try {
    validateBusinessAnalysisRecord(record, project.id);
    const currentInput = buildBusinessAnalysisInput(project, inquiry);
    return record.inquiryId === inquiry.id &&
      record.sourceFingerprint === currentInput.sourceFingerprint &&
      record.sourceStrategyHash === currentInput.sourceStrategyHash;
  } catch {
    return false;
  }
}

export function approveBusinessAnalysis(
  record: BusinessAnalysisRecord,
  project: Project,
  inquiry: Inquiry,
  approvedBy: string,
  approvedAt = new Date().toISOString()
): BusinessAnalysisRecord {
  validateBusinessAnalysisRecord(record, project.id);
  if (record.status !== "AWAITING_REVIEW" || record.approval ||
      !approvedBy.trim() || !Number.isFinite(Date.parse(approvedAt)) ||
      !isBusinessAnalysisCurrent(record, project, inquiry)) {
    throw new BusinessAnalysisValidationError("Only a current, pending Business Analyst document can be explicitly approved.");
  }
  return {
    ...record,
    status: "APPROVED",
    approval: {
      approvedBy: approvedBy.trim(),
      approvedAt: new Date(approvedAt).toISOString(),
      analysisId: record.id,
      sourceFingerprint: record.sourceFingerprint,
    },
  };
}

export function requestBusinessAnalysisClarifications(
  record: BusinessAnalysisRecord,
  clarificationIds: string[],
  requestedBy: string,
  requestedAt = new Date().toISOString()
): BusinessAnalysisRecord {
  validateBusinessAnalysisRecord(record, record.projectId);
  if (record.status !== "AWAITING_REVIEW" || record.approval ||
      !requestedBy.trim() || !Number.isFinite(Date.parse(requestedAt)) ||
      !Array.isArray(clarificationIds) || !clarificationIds.length ||
      new Set(clarificationIds).size !== clarificationIds.length) {
    throw new BusinessAnalysisValidationError("A clarification request requires a pending analysis and valid open clarification IDs.");
  }
  const selected = new Set(clarificationIds);
  if (record.clarifications.some((item) => selected.has(item.id) && item.status !== "OPEN") ||
      clarificationIds.some((id) => !record.clarifications.some((item) => item.id === id))) {
    throw new BusinessAnalysisValidationError("Only unresolved clarification records from this analysis can be requested.");
  }
  return {
    ...record,
    clarifications: record.clarifications.map((item) =>
      selected.has(item.id) ? { ...item, status: "REQUESTED" } : item
    ),
    clarificationRequests: [
      ...record.clarificationRequests,
      {
        requestedBy: requestedBy.trim(),
        requestedAt: new Date(requestedAt).toISOString(),
        clarificationIds,
        deliveryStatus: "RECORDED_NOT_SENT" as const,
      },
    ].slice(-20),
  };
}
