import { createHash } from "crypto";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  isCeoStrategyProjectApproved,
  validateCeoStrategyOutput,
  type CeoStrategyRecord,
} from "@/lib/ceo-strategy";
import {
  isBusinessAnalysisCurrent,
  validateBusinessAnalysisRecord,
  type BusinessAnalysisRecord,
} from "@/lib/business-analysis";
import {
  isProjectManagerStrategyCurrent,
  validateProjectManagerPlan,
  type ProjectManagerPlan,
} from "@/lib/project-manager";
import {
  isProposalCurrent,
  validateProposalRecord,
  type ProposalRecord,
} from "@/lib/proposal-writer";
import type { Inquiry, Project } from "@/lib/types";
import { DWD_WORKFORCE_AGENTS } from "@/lib/workforce-agents";

export const CLIENT_ONBOARDING_AGENT_ID = "client-onboarding-agent";
export const CLIENT_ONBOARDING_VERSION = 1 as const;
export const CLIENT_ONBOARDING_HISTORY_LIMIT = 20;

export const CLIENT_ONBOARDING_CATEGORIES = [
  "Business websites",
  "Corporate websites",
  "Landing pages",
  "Portfolio websites",
  "Blogs",
  "eCommerce",
  "Booking systems",
  "Membership websites",
  "LMS platforms",
  "Customer portals",
  "Dashboards",
  "SaaS applications",
  "CRM and ERP systems",
  "Custom web applications",
  "AI-powered applications",
] as const;

export type ClientOnboardingCategory = (typeof CLIENT_ONBOARDING_CATEGORIES)[number] | "UNCLASSIFIED";
export type ClientOnboardingStatus =
  | "BLOCKED"
  | "DRAFT"
  | "AWAITING_CUSTOMER_INPUT"
  | "AWAITING_ADMIN_REVIEW"
  | "READY_FOR_HANDOFF"
  | "APPROVED";
export type OnboardingClarificationStatus =
  | "PENDING"
  | "ANSWER_RECORDED"
  | "ADMIN_REVIEW_REQUIRED"
  | "SCOPE_CHANGE_REVIEW_REQUIRED"
  | "RESOLVED";

export interface OnboardingQuestion {
  id: string;
  category: ClientOnboardingCategory;
  question: string;
  required: boolean;
  requirementReferences: string[];
  status: OnboardingClarificationStatus;
  response: {
    text: string;
    recordedBy: string;
    recordedAt: string;
    source: "ADMIN_TRANSCRIPTION";
    scopeChangeReviewRequired: boolean;
  } | null;
  resolutionHistory: Array<{
    status: OnboardingClarificationStatus;
    changedBy: string;
    changedAt: string;
    note: string;
  }>;
}

function onboardingContentFingerprint(record: ClientOnboardingRecord): string {
  return digest(JSON.stringify({
    ...record,
    status: null,
    updatedAt: null,
    humanReview: null,
    auditHistory: null,
  }));
}

export function reviewClientOnboardingAssessment(
  record: ClientOnboardingRecord,
  reviewedBy: string,
  reviewedAt = new Date().toISOString()
): ClientOnboardingRecord {
  validateClientOnboardingRecord(record, record.projectId);
  if (record.status !== "BLOCKED" || !reviewedBy.trim() || !validDate(reviewedAt)) {
    throw new ClientOnboardingValidationError("Only a blocked assessment can be reviewed using this restricted review action.");
  }
  const updated: ClientOnboardingRecord = {
    ...record,
    updatedAt: new Date(reviewedAt).toISOString(),
    humanReview: {
      reviewedBy: reviewedBy.trim(),
      reviewedAt: new Date(reviewedAt).toISOString(),
      recordFingerprint: onboardingContentFingerprint(record),
    },
    auditHistory: [...record.auditHistory, {
      action: "REVIEW_RECORDED" as const,
      actor: reviewedBy.trim(),
      at: new Date(reviewedAt).toISOString(),
      details: "Admin reviewed the blocked readiness assessment; onboarding remains blocked and project start was not authorized.",
    }].slice(-50),
  };
  validateClientOnboardingRecord(updated, record.projectId);
  return updated;
}

export interface ClientOnboardingEligibility {
  eligible: boolean;
  blockers: string[];
  sourceFingerprints: ClientOnboardingFingerprints;
}

export interface ClientOnboardingFingerprints {
  project: string;
  inquiry: string;
  strategy: string;
  projectPlan: string | null;
  businessAnalysis: string;
  proposal: string;
  verifiedPayments: string;
  combined: string;
}

export interface ClientOnboardingRecord {
  id: string;
  version: typeof CLIENT_ONBOARDING_VERSION;
  recordVersion: number;
  agentId: typeof CLIENT_ONBOARDING_AGENT_ID;
  projectId: string;
  inquiryId: string;
  status: ClientOnboardingStatus;
  generatedAt: string;
  updatedAt: string;
  generatedBy: "deterministic_onboarding_assessment";
  customerProfile: {
    clientId: string;
    sourceReference: string;
  };
  authorizedContact: {
    sourceReference: string;
    authorizationStatus: "NOT_VERIFIED";
  };
  communicationPreferences: {
    preferredContact: string;
    language: "UNKNOWN";
    country: string;
    timezone: "UNKNOWN";
    sourceReference: string;
  };
  project: {
    category: ClientOnboardingCategory;
    categorySourceReference: string;
    objectives: Array<{ text: string; sourceReference: string }>;
    confirmedScopeReferences: [];
    candidateScopeReferences: string[];
    excludedScopeReferences: string[];
    customerResponsibilities: string[];
    dwdResponsibilities: string[];
  };
  questionnaire: OnboardingQuestion[];
  pendingClarifications: OnboardingQuestion[];
  customerAssets: {
    capability: "UNAVAILABLE";
    items: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      size: number;
      storageReference: string;
      reviewStatus: "PENDING" | "REVIEWED" | "REJECTED";
    }>;
  };
  risksAndConflicts: Array<{ text: string; sourceReference: string; status: "REVIEW_REQUIRED" }>;
  commercial: {
    status: "SOURCE_PROJECT_RECORD";
    currency: "PKR";
    projectReference: string;
  };
  customerAcceptance: {
    status: "NOT_AVAILABLE";
    evidenceReference: null;
  };
  agreement: {
    applicability: "UNKNOWN";
    status: "NOT_AVAILABLE";
    evidenceReference: null;
  };
  paymentVerification: {
    status: "VERIFIED" | "NOT_VERIFIED";
    references: Array<{ id: string; amount: number; verifiedAt: string | null }>;
  };
  humanReview: {
    reviewedBy: string;
    reviewedAt: string;
    recordFingerprint: string;
  } | null;
  handoff: {
    status: "BLOCKED" | "READY";
    references: {
      agent1Strategy: string;
      agent2Plan: string | null;
      agent3Analysis: string;
      agent4Proposal: string;
    };
    blockers: string[];
  };
  sourceFingerprints: ClientOnboardingFingerprints;
  auditHistory: Array<{
    action: "ASSESSMENT_CREATED" | "RESPONSE_RECORDED" | "REVIEW_RECORDED" | "STATUS_CHANGED";
    actor: string;
    at: string;
    details: string;
  }>;
}

export interface VerifiedPaymentReference {
  id: string;
  amount: number;
  verifiedAt: string | null;
}

export interface ClientOnboardingInput {
  project: Project;
  inquiry: Inquiry;
  verifiedPayments: VerifiedPaymentReference[];
}

export const ONBOARDING_NOTIFICATION_TEMPLATES = {
  onboardingStarted: {
    status: "PREPARED_NOT_SENT",
    text: "Your project onboarding has been prepared. DWD will confirm the approved scope and next steps with you.",
  },
  additionalInformationRequired: {
    status: "PREPARED_NOT_SENT",
    text: "DWD needs additional information to complete onboarding. Please reply to the questions shared by your authorized project contact.",
  },
  assetsReceived: {
    status: "PREPARED_NOT_SENT",
    text: "DWD has recorded receipt of your project assets. They remain subject to review.",
  },
  onboardingReviewCompleted: {
    status: "PREPARED_NOT_SENT",
    text: "DWD has completed an onboarding review. This does not itself authorize project execution.",
  },
  onboardingBlocked: {
    status: "PREPARED_NOT_SENT",
    text: "Project onboarding is blocked until the listed approvals or evidence are available.",
  },
  awaitingProjectStartAuthorization: {
    status: "PREPARED_NOT_SENT",
    text: "Onboarding is ready for human review. Project work will not begin without separate start authorization.",
  },
} as const;

export class ClientOnboardingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientOnboardingValidationError";
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[_/]+/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function categoryFor(project: Project, inquiry: Inquiry): ClientOnboardingCategory {
  const source = normalized(`${project.category} ${inquiry.projectTypes.join(" ")}`);
  const choices: Array<[ClientOnboardingCategory, string[]]> = [
    ["AI-powered applications", ["ai powered", "artificial intelligence", "machine learning", "ai application"]],
    ["CRM and ERP systems", ["crm", "erp"]],
    ["LMS platforms", ["lms", "learning platform", "online course", "education platform"]],
    ["Membership websites", ["membership", "subscription platform", "member portal"]],
    ["Booking systems", ["booking", "reservation", "appointment"]],
    ["eCommerce", ["ecommerce", "e commerce", "online store", "shopify", "checkout"]],
    ["Customer portals", ["customer portal", "client portal"]],
    ["Dashboards", ["admin dashboard", "dashboard", "admin panel"]],
    ["SaaS applications", ["saas"]],
    ["Blogs", ["blog", "publishing", "cms"]],
    ["Landing pages", ["landing page", "campaign page"]],
    ["Portfolio websites", ["portfolio"]],
    ["Corporate websites", ["corporate"]],
    ["Business websites", ["business website", "company website"]],
    ["Custom web applications", ["custom web application", "web application", "web app"]],
  ];
  return choices.find(([, keywords]) => keywords.some((keyword) => source.includes(keyword)))?.[0]
    || "UNCLASSIFIED";
}

const CATEGORY_QUESTIONS: Record<ClientOnboardingCategory, Array<{ id: string; text: string; required: boolean }>> = {
  "Business websites": [
    { id: "business-profile", text: "Confirm the business name, locations, and approved contact details to publish.", required: true },
    { id: "business-content", text: "Which approved services and calls to action should visitors see first?", required: true },
  ],
  "Corporate websites": [
    { id: "corporate-structure", text: "Confirm the approved company profile, departments, and page structure.", required: true },
    { id: "corporate-approvals", text: "Who will provide and approve the final corporate content?", required: true },
  ],
  "Landing pages": [
    { id: "campaign-goal", text: "Confirm the single primary campaign goal and call to action.", required: true },
    { id: "campaign-assets", text: "Which campaign copy and approved visual assets are available?", required: true },
  ],
  "Portfolio websites": [
    { id: "portfolio-items", text: "Which approved work samples and case studies should be featured?", required: true },
    { id: "portfolio-permissions", text: "Confirm that you have permission to publish each supplied work sample.", required: true },
  ],
  "Blogs": [
    { id: "editorial-roles", text: "Who will create, review, and publish blog content?", required: true },
    { id: "editorial-structure", text: "Confirm the approved categories and publishing workflow.", required: true },
  ],
  eCommerce: [
    { id: "catalog-source", text: "How will the approved product catalog, prices, and inventory be supplied?", required: true },
    { id: "order-fulfillment", text: "Confirm the approved delivery, returns, and order-fulfillment rules.", required: true },
    { id: "payment-provider", text: "Which payment provider is included in the approved scope?", required: true },
  ],
  "Booking systems": [
    { id: "booking-resources", text: "What services, staff, resources, and booking durations are in scope?", required: true },
    { id: "booking-rules", text: "Confirm availability, cancellation, rescheduling, and confirmation rules.", required: true },
  ],
  "Membership websites": [
    { id: "membership-tiers", text: "Confirm the included membership levels, benefits, and renewal rules.", required: true },
    { id: "membership-access", text: "Which approved content or features should each membership level access?", required: true },
  ],
  "LMS platforms": [
    { id: "course-structure", text: "Confirm course structure, lesson formats, and learner enrollment rules.", required: true },
    { id: "learning-assessment", text: "Are assessments, certificates, or instructor reviews included in approved scope?", required: false },
  ],
  "Customer portals": [
    { id: "portal-roles", text: "Identify the approved customer and staff roles and their permitted actions.", required: true },
    { id: "portal-data", text: "Which project records should each authorized user be able to access?", required: true },
  ],
  Dashboards: [
    { id: "dashboard-metrics", text: "Confirm the approved dashboard metrics, data sources, and refresh expectations.", required: true },
    { id: "dashboard-roles", text: "Identify the dashboard user roles and access boundaries.", required: true },
  ],
  "SaaS applications": [
    { id: "saas-tenancy", text: "Confirm whether the approved product requires single-tenant or multi-tenant workspaces.", required: true },
    { id: "saas-plans", text: "Confirm subscription tiers, usage limits, and billing provider only if included in approved scope.", required: true },
  ],
  "CRM and ERP systems": [
    { id: "crm-workflows", text: "Confirm the approved business records, lifecycle stages, and user roles.", required: true },
    { id: "crm-import", text: "Identify the authorized source and format of any data to import.", required: true },
  ],
  "Custom web applications": [
    { id: "custom-workflows", text: "Describe the approved primary user workflows and expected outcomes.", required: true },
    { id: "custom-integrations", text: "Confirm which external integrations are explicitly in approved scope.", required: true },
  ],
  "AI-powered applications": [
    { id: "ai-data", text: "Identify approved data sources and any sensitive-data restrictions for the AI feature.", required: true },
    { id: "ai-human-review", text: "Confirm which AI outputs require human review before users can rely on them.", required: true },
  ],
  UNCLASSIFIED: [],
};

function buildFingerprints(input: ClientOnboardingInput): ClientOnboardingFingerprints {
  const { project, inquiry, verifiedPayments } = input;
  const projectFingerprint = digest(JSON.stringify({
    id: project.id,
    inquiryId: project.inquiryId || null,
    clientId: project.clientId,
    status: project.status,
    name: project.name,
    category: project.category,
    description: project.description,
    approvedPrice: project.approvedPrice,
    advanceRequired: project.advanceRequired,
    advanceReceived: project.advanceReceived,
    remainingBalance: project.remainingBalance,
    deliveryTimeline: project.deliveryTimeline,
    selectedFeatures: project.selectedFeatures,
  }));
  const inquiryFingerprint = digest(JSON.stringify(inquiry));
  const strategyFingerprint = digest(JSON.stringify(project.ceoStrategy || null));
  const planFingerprint = project.projectManagerPlan
    ? digest(JSON.stringify(project.projectManagerPlan))
    : null;
  const analysisFingerprint = digest(JSON.stringify(project.businessAnalysis || null));
  const proposalFingerprint = digest(JSON.stringify(project.proposal || null));
  const paymentsFingerprint = digest(JSON.stringify(verifiedPayments));
  const fingerprints = {
    project: projectFingerprint,
    inquiry: inquiryFingerprint,
    strategy: strategyFingerprint,
    projectPlan: planFingerprint,
    businessAnalysis: analysisFingerprint,
    proposal: proposalFingerprint,
    verifiedPayments: paymentsFingerprint,
    combined: "",
  };
  fingerprints.combined = digest(JSON.stringify(fingerprints));
  return fingerprints;
}

function currentApprovedRecords(project: Project, inquiry: Inquiry): {
  strategy: CeoStrategyRecord | null;
  plan: ProjectManagerPlan | null;
  analysis: BusinessAnalysisRecord | null;
  proposal: ProposalRecord | null;
  blockers: string[];
} {
  const blockers: string[] = [];
  let strategy: CeoStrategyRecord | null = null;
  let plan: ProjectManagerPlan | null = null;
  let analysis: BusinessAnalysisRecord | null = null;
  let proposal: ProposalRecord | null = null;

  if (!project.inquiryId || project.inquiryId !== inquiry.id || inquiry.convertedProjectId !== project.id) {
    blockers.push("Project and approved inquiry association is missing or mismatched.");
  }
  if (!isCeoStrategyProjectApproved(project, inquiry)) {
    blockers.push("Commercially approved project conversion and required verified advance are not established.");
  }
  if (project.ceoStrategy?.status === "approved" && project.ceoStrategy.approval) {
    try {
      const input = buildCeoStrategyInput(project, inquiry);
      if (hashCeoStrategyInput(input) !== project.ceoStrategy.sourceHash) {
        blockers.push("Agent 1 CEO strategy is stale.");
      } else {
        validateCeoStrategyOutput(project.ceoStrategy.plan, input);
        strategy = project.ceoStrategy;
      }
    } catch {
      blockers.push("Agent 1 CEO strategy is invalid or cannot be verified against current sources.");
    }
  } else {
    blockers.push("A human-approved Agent 1 CEO strategy is required.");
  }
  if (project.projectManagerPlan?.status === "APPROVED") {
    try {
      validateProjectManagerPlan(project.projectManagerPlan, project.id);
      if (!isProjectManagerStrategyCurrent(project, inquiry, project.projectManagerPlan)) {
        blockers.push("The saved Agent 2 project plan is stale.");
      } else {
        plan = project.projectManagerPlan;
      }
    } catch {
      blockers.push("The saved Agent 2 project plan is invalid.");
    }
  }
  if (project.businessAnalysis?.status === "APPROVED") {
    try {
      validateBusinessAnalysisRecord(project.businessAnalysis, project.id);
      if (!isBusinessAnalysisCurrent(project.businessAnalysis, project, inquiry)) {
        blockers.push("Agent 3 requirements analysis is stale.");
      } else {
        analysis = project.businessAnalysis;
      }
    } catch {
      blockers.push("Agent 3 requirements analysis is invalid.");
    }
  } else {
    blockers.push("A separately human-approved Agent 3 requirements analysis is required.");
  }
  if (project.proposal?.status === "APPROVED_FOR_CUSTOMER") {
    try {
      validateProposalRecord(project.proposal, project.id);
      if (!isProposalCurrent(project.proposal, project, inquiry)) {
        blockers.push("Agent 4 proposal is stale.");
      } else {
        proposal = project.proposal;
      }
    } catch {
      blockers.push("Agent 4 proposal is invalid.");
    }
  } else {
    blockers.push("A current Agent 4 proposal approved for customer review is required.");
  }
  return { strategy, plan, analysis, proposal, blockers: Array.from(new Set(blockers)) };
}

export function assessClientOnboarding(input: ClientOnboardingInput): ClientOnboardingEligibility {
  const { project, inquiry, verifiedPayments } = input;
  const blockers = currentApprovedRecords(project, inquiry).blockers;
  if (categoryFor(project, inquiry) === "UNCLASSIFIED") {
    blockers.push("The approved project category is not supported by the onboarding questionnaire.");
  }
  if (typeof project.clientId !== "string" || !project.clientId.trim()) {
    blockers.push("A project-linked customer profile is unavailable.");
  }
  if (!inquiry.email.trim() && !inquiry.phone.trim()) {
    blockers.push("No customer contact channel is recorded in the source inquiry.");
  }
  if (!Number.isFinite(project.approvedPrice) || project.approvedPrice <= 0 ||
      !Number.isFinite(project.advanceRequired) || project.advanceRequired <= 0 ||
      project.approvedPrice < project.advanceRequired) {
    blockers.push("Approved commercial scope or required advance is invalid.");
  }
  const verifiedAmount = verifiedPayments.reduce((sum, item) =>
    sum + (Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0), 0);
  if (!verifiedPayments.length || verifiedAmount < project.advanceRequired) {
    blockers.push("No matching, server-verified payment references prove the required advance.");
  }
  blockers.push("Customer acceptance evidence is not represented by the existing proposal or project records; Agent 4 approval is not customer acceptance.");
  blockers.push("Agreement/contract applicability and signed evidence are not represented by the existing project records.");
  const fingerprints = buildFingerprints(input);
  return {
    eligible: blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
    sourceFingerprints: fingerprints,
  };
}

function sourceReference(projectId: string, agent: string, recordId: string): string {
  return `${projectId}:${agent}:${recordId}`;
}

export function buildClientOnboardingAssessment(
  input: ClientOnboardingInput,
  generatedAt = new Date().toISOString()
): ClientOnboardingRecord {
  if (!validDate(generatedAt)) {
    throw new ClientOnboardingValidationError("The onboarding assessment timestamp is invalid.");
  }
  const { project, inquiry, verifiedPayments } = input;
  const eligibility = assessClientOnboarding(input);
  const approved = currentApprovedRecords(project, inquiry);
  const category = categoryFor(project, inquiry);
  const analysis = approved.analysis;
  const requirements = analysis?.requirements || [];
  const requirementsNeedingClarification = requirements.filter((requirement) =>
    requirement.status === "REVIEW_REQUIRED" || requirement.scope === "NEEDS_CONFIRMATION"
  );
  const questions = CATEGORY_QUESTIONS[category].map((item) => ({
    id: `onboarding-question-${digest(`${project.id}:${item.id}`).slice(0, 20)}`,
    category,
    question: item.text,
    required: item.required,
    requirementReferences: requirementsNeedingClarification
      .filter((requirement) => normalized(item.text).split(" ").some((word) =>
        word.length > 4 && normalized(`${requirement.title} ${requirement.description}`).includes(word)
      ))
      .map((requirement) => requirement.id),
    status: "PENDING" as const,
    response: null,
    resolutionHistory: [],
  }));
  const analysisQuestions = (analysis?.clarifications || []).map((item) => ({
    id: `onboarding-${item.id}`,
    category,
    question: `${item.questionOrIssue} ${item.recommendedQuestion}`.trim(),
    required: item.priority === "HIGH",
    requirementReferences: item.affectedRequirementIds,
    status: "PENDING" as const,
    response: null,
    resolutionHistory: [],
  }));
  const strategyQuestions = (approved.strategy?.plan.unknowns || []).map((item, index) => ({
    id: `onboarding-strategy-unknown-${index + 1}`,
    category,
    question: item.text,
    required: true,
    requirementReferences: [] as string[],
    status: "PENDING" as const,
    response: null,
    resolutionHistory: [],
  }));
  const sourceQuestions = [...analysisQuestions, ...strategyQuestions];
  const strategy = approved.strategy;
  const references = {
    agent1Strategy: strategy
      ? sourceReference(project.id, "agent-1", `${strategy.sourceHash}`)
      : "UNAVAILABLE",
    agent2Plan: approved.plan
      ? sourceReference(project.id, "agent-2", approved.plan.id)
      : null,
    agent3Analysis: analysis
      ? sourceReference(project.id, "agent-3", analysis.id)
      : "UNAVAILABLE",
    agent4Proposal: approved.proposal
      ? sourceReference(project.id, "agent-4", approved.proposal.id)
      : "UNAVAILABLE",
  };
  const riskRefs = [
    ...(approved.strategy?.plan.riskRegister || []).map((risk, index) => ({
      text: risk.risk.text,
      sourceReference: `agent-1:${strategy?.sourceHash}:riskRegister.${index}`,
      status: "REVIEW_REQUIRED" as const,
    })),
    ...(analysis?.risks || []).map((risk) => ({
      text: risk.description,
      sourceReference: `agent-3:${risk.id}`,
      status: "REVIEW_REQUIRED" as const,
    })),
    ...(analysis?.conflicts || []).map((conflict) => ({
      text: conflict.issue,
      sourceReference: `agent-3:${conflict.id}`,
      status: "REVIEW_REQUIRED" as const,
    })),
  ];
  const sourceFingerprints = eligibility.sourceFingerprints;
  const record: ClientOnboardingRecord = {
    id: `onboarding-${digest(`${project.id}:${sourceFingerprints.combined}`).slice(0, 24)}`,
    version: CLIENT_ONBOARDING_VERSION,
    recordVersion: 1,
    agentId: CLIENT_ONBOARDING_AGENT_ID,
    projectId: project.id,
    inquiryId: inquiry.id,
    status: eligibility.eligible ? "DRAFT" : "BLOCKED",
    generatedAt: new Date(generatedAt).toISOString(),
    updatedAt: new Date(generatedAt).toISOString(),
    generatedBy: "deterministic_onboarding_assessment",
    customerProfile: {
      clientId: project.clientId,
      sourceReference: `project:${project.id}:clientId`,
    },
    authorizedContact: {
      sourceReference: `inquiry:${inquiry.id}:contact`,
      authorizationStatus: "NOT_VERIFIED",
    },
    communicationPreferences: {
      preferredContact: inquiry.preferredContact || "UNKNOWN",
      language: "UNKNOWN",
      country: inquiry.cityCountry || "UNKNOWN",
      timezone: "UNKNOWN",
      sourceReference: `inquiry:${inquiry.id}:communication`,
    },
    project: {
      category,
      categorySourceReference: `project:${project.id}:category;inquiry:${inquiry.id}:projectTypes`,
      objectives: strategy?.plan.businessObjectives.map((objective, index) => ({
        text: objective.text,
        sourceReference: `agent-1:${strategy.sourceHash}:businessObjectives.${index}`,
      })) || [],
      confirmedScopeReferences: [],
      candidateScopeReferences: (analysis?.scopeBoundaries || [])
        .filter((item) => item.scope === "IN_SCOPE")
        .map((item) => `agent-3:${item.id}`),
      excludedScopeReferences: (analysis?.scopeBoundaries || [])
        .filter((item) => item.scope === "OUT_OF_SCOPE")
        .map((item) => `agent-3:${item.id}`),
      customerResponsibilities: [],
      dwdResponsibilities: [
        "DWD responsibilities remain limited to the approved project scope and separately authorized execution workflow.",
      ],
    },
    questionnaire: [...questions, ...sourceQuestions],
    pendingClarifications: [...questions, ...sourceQuestions],
    customerAssets: { capability: "UNAVAILABLE", items: [] },
    risksAndConflicts: riskRefs,
    commercial: {
      status: "SOURCE_PROJECT_RECORD",
      currency: "PKR",
      projectReference: `project:${project.id}:commercial`,
    },
    customerAcceptance: { status: "NOT_AVAILABLE", evidenceReference: null },
    agreement: {
      applicability: "UNKNOWN",
      status: "NOT_AVAILABLE",
      evidenceReference: null,
    },
    paymentVerification: {
      status: verifiedPayments.reduce((sum, item) => sum + item.amount, 0) >= project.advanceRequired
        ? "VERIFIED"
        : "NOT_VERIFIED",
      references: verifiedPayments.map((item) => ({ ...item })),
    },
    humanReview: null,
    handoff: {
      status: eligibility.eligible ? "READY" : "BLOCKED",
      references,
      blockers: eligibility.blockers,
    },
    sourceFingerprints,
    auditHistory: [{
      action: "ASSESSMENT_CREATED",
      actor: CLIENT_ONBOARDING_AGENT_ID,
      at: new Date(generatedAt).toISOString(),
      details: eligibility.eligible
        ? "Onboarding assessment prepared; customer contact and project-start authorization have not occurred."
        : "BLOCKED readiness assessment saved; the customer onboarding workflow has not started.",
    }],
  };
  validateClientOnboardingRecord(record, project.id);
  return record;
}

export function validateClientOnboardingRecord(
  record: ClientOnboardingRecord,
  projectId: string
): void {
  const statuses: ClientOnboardingStatus[] = [
    "BLOCKED", "DRAFT", "AWAITING_CUSTOMER_INPUT", "AWAITING_ADMIN_REVIEW", "READY_FOR_HANDOFF", "APPROVED",
  ];
  if (!record || typeof record !== "object" || record.projectId !== projectId ||
      record.agentId !== CLIENT_ONBOARDING_AGENT_ID ||
      record.version !== CLIENT_ONBOARDING_VERSION ||
      !Number.isInteger(record.recordVersion) || record.recordVersion < 1 ||
      !record.id || record.id !== `onboarding-${digest(`${projectId}:${record.sourceFingerprints?.combined}`).slice(0, 24)}` ||
      !record.inquiryId || !statuses.includes(record.status) ||
      !validDate(record.generatedAt) || !validDate(record.updatedAt) ||
      record.generatedBy !== "deterministic_onboarding_assessment" ||
      !nonEmpty(record.customerProfile?.clientId) || !nonEmpty(record.customerProfile.sourceReference) ||
      !nonEmpty(record.authorizedContact?.sourceReference) || record.authorizedContact.authorizationStatus !== "NOT_VERIFIED" ||
      !nonEmpty(record.communicationPreferences?.preferredContact) ||
      typeof record.communicationPreferences.country !== "string" ||
      record.communicationPreferences.language !== "UNKNOWN" ||
      record.communicationPreferences.timezone !== "UNKNOWN" ||
      !nonEmpty(record.communicationPreferences.sourceReference) ||
      (!(CLIENT_ONBOARDING_CATEGORIES as readonly string[]).includes(record.project?.category) &&
        record.project?.category !== "UNCLASSIFIED") ||
      !nonEmpty(record.project.categorySourceReference) ||
      !Array.isArray(record.project.objectives) ||
      record.project.objectives.some((item) => !item || !nonEmpty(item.text) || !nonEmpty(item.sourceReference)) ||
      !Array.isArray(record.project.confirmedScopeReferences) ||
      record.project.confirmedScopeReferences.length !== 0 ||
      !Array.isArray(record.project.candidateScopeReferences) ||
      record.project.candidateScopeReferences.some((item) => !nonEmpty(item)) ||
      !Array.isArray(record.project.excludedScopeReferences) ||
      record.project.excludedScopeReferences.some((item) => !nonEmpty(item)) ||
      !Array.isArray(record.project.customerResponsibilities) ||
      record.project.customerResponsibilities.some((item) => !nonEmpty(item)) ||
      !Array.isArray(record.project.dwdResponsibilities) ||
      record.project.dwdResponsibilities.some((item) => !nonEmpty(item)) ||
      !Array.isArray(record.questionnaire) ||
      !Array.isArray(record.pendingClarifications) ||
      record.customerAssets?.capability !== "UNAVAILABLE" ||
      !Array.isArray(record.customerAssets.items) || record.customerAssets.items.length !== 0 ||
      record.customerAcceptance?.status !== "NOT_AVAILABLE" ||
      record.customerAcceptance.evidenceReference !== null ||
      record.agreement?.applicability !== "UNKNOWN" ||
      record.agreement.status !== "NOT_AVAILABLE" ||
      record.agreement.evidenceReference !== null ||
      !record.paymentVerification ||
      !["VERIFIED", "NOT_VERIFIED"].includes(record.paymentVerification.status) ||
      !Array.isArray(record.paymentVerification.references) ||
      !record.handoff || !["BLOCKED", "READY"].includes(record.handoff.status) ||
      !Array.isArray(record.handoff.blockers) ||
      record.handoff.blockers.some((item) => !nonEmpty(item)) ||
      !record.risksAndConflicts ||
      !Array.isArray(record.risksAndConflicts) ||
      record.risksAndConflicts.some((item) =>
        !item || !nonEmpty(item.text) || !nonEmpty(item.sourceReference) || item.status !== "REVIEW_REQUIRED"
      ) ||
      !record.commercial ||
      record.commercial.status !== "SOURCE_PROJECT_RECORD" ||
      record.commercial.currency !== "PKR" ||
      !nonEmpty(record.commercial.projectReference) ||
      !Array.isArray(record.auditHistory) || record.auditHistory.length === 0 ||
      !record.sourceFingerprints || !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.project) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.inquiry) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.strategy) ||
      !(record.sourceFingerprints.projectPlan === null || /^[a-f0-9]{64}$/i.test(record.sourceFingerprints.projectPlan)) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.businessAnalysis) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.proposal) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.verifiedPayments) ||
      !/^[a-f0-9]{64}$/i.test(record.sourceFingerprints.combined) ||
      record.sourceFingerprints.combined !== digest(JSON.stringify({
        ...record.sourceFingerprints,
        combined: "",
      }))) {
    throw new ClientOnboardingValidationError("The onboarding record is malformed, stale-shaped, or bound to another project.");
  }
  const questionIds = new Set<string>();
  for (const question of record.questionnaire) {
    if (!question || !nonEmpty(question.id) || questionIds.has(question.id) ||
        (!(CLIENT_ONBOARDING_CATEGORIES as readonly string[]).includes(question.category) &&
          question.category !== "UNCLASSIFIED") ||
        !nonEmpty(question.question) || typeof question.required !== "boolean" ||
        !Array.isArray(question.requirementReferences) ||
        !["PENDING", "ANSWER_RECORDED", "ADMIN_REVIEW_REQUIRED", "SCOPE_CHANGE_REVIEW_REQUIRED", "RESOLVED"].includes(question.status) ||
        (question.response !== null && (
          !question.response || !nonEmpty(question.response.text) || !nonEmpty(question.response.recordedBy) ||
          !validDate(question.response.recordedAt) ||
          question.response.source !== "ADMIN_TRANSCRIPTION" ||
          typeof question.response.scopeChangeReviewRequired !== "boolean"
        )) ||
        !Array.isArray(question.resolutionHistory) ||
        question.resolutionHistory.some((event) =>
          !event || !nonEmpty(event.changedBy) || !validDate(event.changedAt) || !nonEmpty(event.note)
        ) ||
        (question.status === "SCOPE_CHANGE_REVIEW_REQUIRED" &&
          question.response?.scopeChangeReviewRequired !== true) ||
        (question.status === "RESOLVED" && !question.response)) {
      throw new ClientOnboardingValidationError("An onboarding question or response is malformed.");
    }
    questionIds.add(question.id);
  }
  if (record.pendingClarifications.some((item) => !questionIds.has(item.id))) {
    throw new ClientOnboardingValidationError("The pending clarification list contains a question outside the questionnaire.");
  }
  if (record.paymentVerification.references.some((reference) =>
    !reference.id || !Number.isFinite(reference.amount) || reference.amount <= 0 ||
    (reference.verifiedAt !== null && !validDate(reference.verifiedAt))
  )) {
    throw new ClientOnboardingValidationError("A payment verification reference is invalid.");
  }
  if (record.sourceFingerprints.verifiedPayments !== digest(JSON.stringify(record.paymentVerification.references)) ||
      (record.paymentVerification.status === "VERIFIED" && record.paymentVerification.references.length === 0) ||
      (record.paymentVerification.status === "NOT_VERIFIED" && record.paymentVerification.references.length > 0)) {
    throw new ClientOnboardingValidationError("Payment evidence does not match the saved payment source fingerprint.");
  }
  if (record.auditHistory.length > 50 || record.auditHistory.some((event) =>
    !event || !["ASSESSMENT_CREATED", "RESPONSE_RECORDED", "REVIEW_RECORDED", "STATUS_CHANGED"].includes(event.action) ||
    !nonEmpty(event.actor) || !validDate(event.at) || !nonEmpty(event.details)
  )) {
    throw new ClientOnboardingValidationError("The audit history is malformed.");
  }
  if (record.status === "APPROVED" || record.status === "READY_FOR_HANDOFF" ||
      record.handoff.status === "READY") {
    throw new ClientOnboardingValidationError("Agent 5 cannot authorize onboarding completion or project-start handoff without customer acceptance, agreement evidence, and separate human authorization.");
  }
  if (record.humanReview && (!nonEmpty(record.humanReview.reviewedBy) ||
      !validDate(record.humanReview.reviewedAt) ||
      !/^[a-f0-9]{64}$/i.test(record.humanReview.recordFingerprint) ||
      record.humanReview.recordFingerprint !== onboardingContentFingerprint(record))) {
    throw new ClientOnboardingValidationError("The human review is malformed or no longer matches onboarding content.");
  }
  if (record.customerAcceptance.status !== "NOT_AVAILABLE" ||
      record.agreement.status !== "NOT_AVAILABLE") {
    throw new ClientOnboardingValidationError("Customer acceptance and agreement evidence must come from authorized existing records.");
  }
}

export function isClientOnboardingCurrent(
  record: ClientOnboardingRecord,
  input: ClientOnboardingInput
): boolean {
  try {
    validateClientOnboardingRecord(record, input.project.id);
    return record.sourceFingerprints.combined === assessClientOnboarding(input).sourceFingerprints.combined;
  } catch {
    return false;
  }
}

export function recordOnboardingClarificationResponse(
  record: ClientOnboardingRecord,
  questionId: string,
  responseText: string,
  recordedBy: string,
  scopeChangeReviewRequired: boolean,
  recordedAt = new Date().toISOString()
): ClientOnboardingRecord {
  validateClientOnboardingRecord(record, record.projectId);
  if (!["DRAFT", "AWAITING_CUSTOMER_INPUT", "AWAITING_ADMIN_REVIEW"].includes(record.status)) {
    throw new ClientOnboardingValidationError("Clarification responses cannot be recorded while onboarding is blocked or closed.");
  }
  const question = record.questionnaire.find((item) => item.id === questionId);
  if (!question || !responseText.trim() || responseText.length > 4000 ||
      !recordedBy.trim() || !validDate(recordedAt)) {
    throw new ClientOnboardingValidationError("A valid onboarding question, response, administrator, and timestamp are required.");
  }
  const nextStatus: OnboardingClarificationStatus = scopeChangeReviewRequired
    ? "SCOPE_CHANGE_REVIEW_REQUIRED"
    : "ADMIN_REVIEW_REQUIRED";
  const event = {
    status: nextStatus,
    changedBy: recordedBy.trim(),
    changedAt: new Date(recordedAt).toISOString(),
    note: scopeChangeReviewRequired
      ? "Customer response recorded as an admin transcription; a possible scope change requires separate scope approval."
      : "Customer response recorded as an admin transcription; human review is required.",
  };
  const updatedQuestion: OnboardingQuestion = {
    ...question,
    status: nextStatus,
    response: {
      text: responseText.trim(),
      recordedBy: recordedBy.trim(),
      recordedAt: new Date(recordedAt).toISOString(),
      source: "ADMIN_TRANSCRIPTION",
      scopeChangeReviewRequired,
    },
    resolutionHistory: [...question.resolutionHistory, event].slice(-20),
  };
  const questionnaire = record.questionnaire.map((item) =>
    item.id === questionId ? updatedQuestion : item
  );
  const updated: ClientOnboardingRecord = {
    ...record,
    recordVersion: record.recordVersion + 1,
    updatedAt: new Date(recordedAt).toISOString(),
    status: "AWAITING_ADMIN_REVIEW",
    questionnaire,
    pendingClarifications: questionnaire.filter((item) => item.status !== "RESOLVED"),
    auditHistory: [...record.auditHistory, {
      action: "RESPONSE_RECORDED" as const,
      actor: recordedBy.trim(),
      at: new Date(recordedAt).toISOString(),
      details: `An admin-transcribed response was recorded for ${questionId}; no approved scope was changed.`,
    }].slice(-50),
  };
  validateClientOnboardingRecord(updated, record.projectId);
  return updated;
}

export function getClientOnboardingRole() {
  return DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === CLIENT_ONBOARDING_AGENT_ID) || null;
}

export function getOnboardingCustomerContact(inquiry: Inquiry): {
  name: string;
  email: string;
  phone: string;
} {
  return {
    name: inquiry.customerName,
    email: inquiry.email,
    phone: inquiry.phone,
  };
}
