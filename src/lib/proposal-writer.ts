import { createHash } from "crypto";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  isCeoStrategyProjectApproved,
  validateCeoStrategyOutput,
  type CeoStrategyPlan,
} from "@/lib/ceo-strategy";
import {
  isProjectManagerStrategyCurrent,
  validateProjectManagerPlan,
  type ProjectManagerPlan,
} from "@/lib/project-manager";
import {
  isBusinessAnalysisCurrent,
  validateBusinessAnalysisRecord,
  type BusinessAnalysisEvidence,
  type BusinessAnalysisRecord,
} from "@/lib/business-analysis";
import type { Inquiry, Project } from "@/lib/types";
import { DWD_WORKFORCE_AGENTS } from "@/lib/workforce-agents";

export const PROPOSAL_WRITER_AGENT_ID = "proposal-writer";
export const PROPOSAL_VERSION = 1 as const;
export const PROPOSAL_HISTORY_LIMIT = 20;

export const PROPOSAL_TYPES = [
  "Business Website",
  "Corporate Website",
  "Landing Page",
  "Portfolio Website",
  "Blog / CMS",
  "eCommerce",
  "Multi-vendor Marketplace",
  "WordPress",
  "Shopify",
  "Custom Web Application",
  "SaaS",
  "CRM / ERP",
  "Booking / Reservation",
  "Customer Portal",
  "Mobile Application",
  "AI Application",
  "UI/UX Design",
  "Website Redesign",
  "Website Maintenance",
  "SEO / Digital Marketing",
  "Custom Software",
  "International Client Project",
] as const;

export type ProposalType = (typeof PROPOSAL_TYPES)[number];
export type ProposalStatus =
  | "DRAFT"
  | "NEEDS_INFORMATION"
  | "ADMIN_REVIEW_REQUIRED"
  | "APPROVED_FOR_CUSTOMER";
export type ProposalEvidenceClassification =
  | "CUSTOMER_CONFIRMED"
  | "ADMIN_CONFIRMED"
  | "APPROVED_STRATEGY"
  | "APPROVED_PROJECT_PLAN"
  | "ANALYSIS_CONFIRMED"
  | "ASSUMPTION"
  | "PROVISIONAL"
  | "NEEDS_CLARIFICATION"
  | "NOT_AVAILABLE";

export interface ProposalSourceReference {
  id: string;
  sourcePath: string;
  label: string;
  content: string;
  sourceType:
    | "CUSTOMER_SUBMISSION"
    | "APPROVED_PROJECT_RECORD"
    | "APPROVED_STRATEGY"
    | "APPROVED_PROJECT_PLAN"
    | "APPROVED_BUSINESS_ANALYSIS"
    | "DWD_POLICY";
}

export interface ProposalStatement {
  text: string;
  evidenceClassification: ProposalEvidenceClassification;
  sourceRefId: string | null;
  reviewStatus: "CONFIRMED" | "PROVISIONAL" | "NEEDS_CLARIFICATION" | "NOT_AVAILABLE";
}

export interface ProposalIssue {
  id: string;
  kind: "CLARIFICATION" | "CONFLICT" | "STRATEGY_UNKNOWN";
  text: string;
  status: "OPEN" | "REQUESTED" | "UNRESOLVED";
  sourceRefIds: string[];
  evidenceClassification: "ANALYSIS_CONFIRMED" | "NEEDS_CLARIFICATION";
}

export interface ProposalRecord {
  id: string;
  projectId: string;
  proposalReference: string;
  proposalType: ProposalType;
  customerMarket: "PAKISTAN" | "INTERNATIONAL" | "UNKNOWN";
  currency: "PKR" | "UNKNOWN";
  version: number;
  status: ProposalStatus;
  executiveSummary: ProposalStatement;
  customerRequirements: ProposalStatement[];
  proposedSolution: ProposalStatement;
  businessObjectives: ProposalStatement[];
  functionalScope: ProposalStatement[];
  nonFunctionalScope: ProposalStatement[];
  technicalApproach: ProposalStatement[];
  userRoles: ProposalStatement[];
  features: ProposalStatement[];
  deliverables: Array<ProposalStatement & {
    roleId: string;
    taskId: string;
    requirementMappingStatus: "NOT_MAPPED";
  }>;
  integrations: ProposalStatement[];
  phases: ProposalStatement[];
  milestones: ProposalStatement[];
  timeline: ProposalStatement;
  acceptanceCriteria: ProposalStatement[];
  includedServices: ProposalStatement[];
  excludedServices: ProposalStatement[];
  assumptions: ProposalStatement[];
  pendingClarifications: ProposalIssue[];
  risks: ProposalStatement[];
  commercialBreakdown: {
    status: "ADMIN_CONFIRMED" | "COMMERCIAL_REVIEW_REQUIRED";
    currency: "PKR" | "UNKNOWN";
    approvedProjectFee: number | null;
    advanceRequired: number | null;
    advanceReceived: number | null;
    remainingBalance: number | null;
    items: ProposalStatement[];
    note: string;
  };
  paymentTerms: ProposalStatement[];
  customerResponsibilities: ProposalStatement[];
  supportTerms: ProposalStatement[];
  sourceReferences: ProposalSourceReference[];
  evidenceClassification: Record<ProposalEvidenceClassification, number>;
  sourceFingerprints: {
    strategy: string;
    projectPlan: string | null;
    businessAnalysis: string;
    commercial: string;
    authorizedSources: string;
    combined: string;
  };
  generatedAt: string;
  generatedBy: typeof PROPOSAL_WRITER_AGENT_ID;
  review: { reviewedBy: string; reviewedAt: string; proposalFingerprint: string } | null;
  approval: {
    approvedBy: string;
    approvedAt: string;
    proposalId: string;
    proposalVersion: number;
    proposalFingerprint: string;
    sourceFingerprints: ProposalRecord["sourceFingerprints"];
    openItemsAcknowledged: boolean;
  } | null;
}

export interface ProposalInput {
  projectId: string;
  project: Project;
  inquiry: Inquiry;
  strategy: CeoStrategyPlan;
  analysis: BusinessAnalysisRecord;
  projectPlan: ProjectManagerPlan | null;
  proposalType: ProposalType;
  customerMarket: ProposalRecord["customerMarket"];
  currency: ProposalRecord["currency"];
  sources: ProposalSourceReference[];
  sourceFingerprints: ProposalRecord["sourceFingerprints"];
}

export class ProposalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalValidationError";
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sourceId(projectId: string, path: string): string {
  return `proposal-source-${digest(`${projectId}:${path}`).slice(0, 20)}`;
}

function text(value: unknown, path: string, maximum = 5000): string {
  if (typeof value !== "string" || value.length > maximum) {
    throw new ProposalValidationError(`The authorized ${path} source is invalid or too large.`);
  }
  return value.trim();
}

function addSource(
  sources: ProposalSourceReference[],
  projectId: string,
  path: string,
  label: string,
  value: string,
  sourceType: ProposalSourceReference["sourceType"]
): string {
  const content = text(value, path);
  if (!content) throw new ProposalValidationError(`The authorized ${path} source is empty.`);
  const id = sourceId(projectId, path);
  const existing = sources.find((source) => source.id === id);
  if (existing) {
    if (existing.content !== content || existing.sourceType !== sourceType) {
      throw new ProposalValidationError(`The source reference ${path} is inconsistent.`);
    }
    return id;
  }
  sources.push({ id, sourcePath: path, label, content, sourceType });
  return id;
}

function addOptionalSource(
  sources: ProposalSourceReference[],
  projectId: string,
  path: string,
  label: string,
  value: string,
  sourceType: ProposalSourceReference["sourceType"]
): string | null {
  return value.trim()
    ? addSource(sources, projectId, path, label, value, sourceType)
    : null;
}

function classifyProposalType(project: Project, inquiry: Inquiry): ProposalType {
  const value = `${project.category} ${inquiry.projectTypes.join(" ")}`.toLowerCase();
  const mappings: Array<[ProposalType, string[]]> = [
    ["Multi-vendor Marketplace", ["multi-vendor", "multivendor", "marketplace"]],
    ["CRM / ERP", ["crm", "erp"]],
    ["Booking / Reservation", ["booking", "reservation", "appointment"]],
    ["Customer Portal", ["customer portal", "client portal", "dashboard"]],
    ["Mobile Application", ["mobile app", "mobile application"]],
    ["AI Application", ["ai application", "ai-powered", "artificial intelligence"]],
    ["Shopify", ["shopify"]],
    ["WordPress", ["wordpress"]],
    ["eCommerce", ["ecommerce", "e-commerce", "online store", "shop"]],
    ["Blog / CMS", ["blog", "cms"]],
    ["Landing Page", ["landing page"]],
    ["Portfolio Website", ["portfolio"]],
    ["Website Redesign", ["redesign", "website upgrade"]],
    ["Website Maintenance", ["maintenance", "support"]],
    ["SEO / Digital Marketing", ["seo", "digital marketing"]],
    ["UI/UX Design", ["ui/ux", "ui ux", "design only"]],
    ["SaaS", ["saas"]],
    ["Corporate Website", ["corporate"]],
    ["Business Website", ["business website", "company website"]],
    ["Custom Web Application", ["web application", "custom web app"]],
  ];
  return mappings.find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)))?.[0]
    || (inquiry.internationalPricing ? "International Client Project" : "Custom Software");
}

function classifyMarket(inquiry: Inquiry): ProposalRecord["customerMarket"] {
  if (inquiry.internationalPricing === true) return "INTERNATIONAL";
  if (/pakistan/i.test(inquiry.cityCountry)) return "PAKISTAN";
  return "UNKNOWN";
}

function validateCommercialRecord(project: Project, inquiry: Inquiry): void {
  const amountValues = [
    project.approvedPrice,
    project.advanceRequired,
    project.advanceReceived,
    project.remainingBalance,
    inquiry.calculation?.estimatedTotal,
    inquiry.calculation?.advanceAmount,
  ];
  if (amountValues.some((amount) => typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) ||
      project.approvedPrice <= 0 ||
      project.advanceRequired <= 0 ||
      project.advanceRequired > project.approvedPrice ||
      project.advanceReceived < project.advanceRequired ||
      project.advanceReceived > project.approvedPrice ||
      project.remainingBalance !== project.approvedPrice - project.advanceReceived ||
      project.approvedPrice !== inquiry.calculation.estimatedTotal ||
      project.advanceRequired !== inquiry.calculation.advanceAmount) {
    throw new ProposalValidationError("The project and inquiry commercial records are inconsistent or lack verified pricing.");
  }
}

function validateSources(project: Project, inquiry: Inquiry): {
  strategy: CeoStrategyPlan;
  analysis: BusinessAnalysisRecord;
  projectPlan: ProjectManagerPlan | null;
} {
  if (!project.inquiryId || project.inquiryId !== inquiry.id || inquiry.convertedProjectId !== project.id ||
      !isCeoStrategyProjectApproved(project, inquiry)) {
    throw new ProposalValidationError("Proposal drafting requires the matching approved inquiry conversion, commercial scope, and verified advance.");
  }
  validateCommercialRecord(project, inquiry);

  const strategyRecord = project.ceoStrategy;
  if (!strategyRecord || strategyRecord.status !== "approved" || !strategyRecord.approval ||
      !nonEmpty(strategyRecord.approval.approvedBy) ||
      !Number.isFinite(Date.parse(strategyRecord.approval.approvedAt)) ||
      !/^[a-f0-9]{64}$/i.test(strategyRecord.sourceHash)) {
    throw new ProposalValidationError("A human-approved CEO strategy is required.");
  }
  const strategyInput = buildCeoStrategyInput(project, inquiry);
  if (hashCeoStrategyInput(strategyInput) !== strategyRecord.sourceHash) {
    throw new ProposalValidationError("The CEO strategy is stale against current project or inquiry sources.");
  }
  const strategy = validateCeoStrategyOutput(strategyRecord.plan, strategyInput);

  const analysis = project.businessAnalysis;
  if (!analysis || analysis.status !== "APPROVED") {
    throw new ProposalValidationError("A separately human-approved Business Analyst record is required.");
  }
  validateBusinessAnalysisRecord(analysis, project.id);
  if (analysis.inquiryId !== inquiry.id ||
      analysis.sourceStrategyHash !== strategyRecord.sourceHash ||
      !isBusinessAnalysisCurrent(analysis, project, inquiry)) {
    throw new ProposalValidationError("The Business Analyst record is stale or bound to different source records.");
  }

  let projectPlan: ProjectManagerPlan | null = null;
  if (project.projectManagerPlan?.status === "APPROVED") {
    validateProjectManagerPlan(project.projectManagerPlan, project.id);
    if (!isProjectManagerStrategyCurrent(project, inquiry, project.projectManagerPlan)) {
      throw new ProposalValidationError("The approved Project Manager plan is stale against the current CEO strategy.");
    }
    projectPlan = project.projectManagerPlan;
  }
  return { strategy, analysis, projectPlan };
}

export function buildProposalInput(project: Project, inquiry: Inquiry): ProposalInput {
  const { strategy, analysis, projectPlan } = validateSources(project, inquiry);
  const sources: ProposalSourceReference[] = [];
  addOptionalSource(sources, project.id, "project.name", "Approved project name", project.name, "APPROVED_PROJECT_RECORD");
  addOptionalSource(sources, project.id, "project.category", "Approved project category", project.category, "APPROVED_PROJECT_RECORD");
  addOptionalSource(sources, project.id, "project.description", "Approved project description", project.description, "APPROVED_PROJECT_RECORD");
  addOptionalSource(sources, project.id, "inquiry.cityCountry", "Customer-provided target market", inquiry.cityCountry, "CUSTOMER_SUBMISSION");
  addSource(sources, project.id, "project.approvedPrice", "Approved project fee in PKR", String(project.approvedPrice), "APPROVED_PROJECT_RECORD");
  addSource(sources, project.id, "project.advanceRequired", "Approved required advance in PKR", String(project.advanceRequired), "APPROVED_PROJECT_RECORD");
  addSource(sources, project.id, "project.advanceReceived", "Verified received advance in PKR", String(project.advanceReceived), "APPROVED_PROJECT_RECORD");
  addSource(sources, project.id, "project.remainingBalance", "Recorded remaining balance in PKR", String(project.remainingBalance), "APPROVED_PROJECT_RECORD");
  addOptionalSource(sources, project.id, "project.deliveryTimeline", "Recorded project delivery timeline", project.deliveryTimeline, "APPROVED_PROJECT_RECORD");
  addSource(sources, project.id, "strategy.executiveSummary", "Approved strategy executive summary", strategy.executiveSummary.text, "APPROVED_STRATEGY");
  addSource(sources, project.id, "strategy.technicalArchitecture", "Approved strategy technical approach", strategy.technicalArchitecture.text, "APPROVED_STRATEGY");
  const addStrategyFindings = (path: string, findings: Array<{ text: string }>, label: string) =>
    findings.forEach((finding, index) => {
      addSource(sources, project.id, `${path}.${index}`, label, finding.text, "APPROVED_STRATEGY");
    });
  addStrategyFindings("strategy.businessObjectives", strategy.businessObjectives, "Approved strategy objective");
  addStrategyFindings("strategy.acceptanceCriteria", strategy.acceptanceCriteria, "Approved strategy acceptance criterion");
  addStrategyFindings("strategy.unknowns", strategy.unknowns, "Unresolved strategy unknown");
  strategy.requiredIntegrations.forEach((integration, index) => {
    addSource(
      sources,
      project.id,
      `strategy.requiredIntegrations.${index}`,
      `Approved strategy integration recommendation: ${integration.name}`,
      `${integration.name}\n${integration.rationale.text}`,
      "APPROVED_STRATEGY"
    );
  });
  strategy.scopeAndExclusions.scope.forEach((item, index) =>
    addSource(sources, project.id, `strategy.scope.${index}`, "Approved strategy proposed scope", item.text, "APPROVED_STRATEGY")
  );
  strategy.scopeAndExclusions.exclusions.forEach((item, index) =>
    addSource(sources, project.id, `strategy.exclusions.${index}`, "Approved strategy proposed exclusion", item.text, "APPROVED_STRATEGY")
  );
  strategy.assumptions.forEach((item, index) =>
    addSource(sources, project.id, `strategy.assumptions.${index}`, "Approved strategy assumption", item.text, "APPROVED_STRATEGY")
  );
  strategy.riskRegister.forEach((risk, index) => {
    addSource(
      sources,
      project.id,
      `strategy.riskRegister.${index}`,
      "Approved strategy risk and mitigation",
      `${risk.risk.text}\nMitigation: ${risk.mitigation.text}`,
      "APPROVED_STRATEGY"
    );
  });

  const analysisEvidenceRefs = new Map<string, string>();
  for (const item of analysis.evidence) {
    const refId = addSource(
      sources,
      project.id,
      `businessAnalysis.evidence.${item.id}`,
      item.label,
      item.content,
      "APPROVED_BUSINESS_ANALYSIS"
    );
    analysisEvidenceRefs.set(item.id, refId);
  }
  addSource(
    sources,
    project.id,
    "businessAnalysis.approval",
    "Human-approved Business Analyst record",
    `${analysis.id}\n${analysis.approval?.approvedBy || ""}\n${analysis.approval?.approvedAt || ""}\n${analysis.sourceFingerprint}`,
    "APPROVED_BUSINESS_ANALYSIS"
  );
  analysis.requirements.forEach((requirement) => {
    if (!analysisEvidenceRefs.has(requirement.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst requirement ${requirement.id} has no source evidence.`);
    }
  });
  analysis.features.forEach((feature) => {
    if (!analysisEvidenceRefs.has(feature.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst feature ${feature.id} has no source evidence.`);
    }
  });
  analysis.businessObjectives.forEach((objective) => {
    if (!analysisEvidenceRefs.has(objective.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst objective ${objective.id} has no source evidence.`);
    }
  });
  analysis.assumptions.forEach((assumption) => {
    if (!analysisEvidenceRefs.has(assumption.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst assumption ${assumption.id} has no source evidence.`);
    }
  });
  analysis.risks.forEach((risk) => {
    if (!analysisEvidenceRefs.has(risk.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst risk ${risk.id} has no source evidence.`);
    }
  });
  analysis.scopeBoundaries.forEach((boundary) => {
    if (!analysisEvidenceRefs.has(boundary.sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst scope boundary ${boundary.id} has no source evidence.`);
    }
  });
  const analysisClarificationRefs = analysis.clarifications.map((clarification) => ({
    clarification,
    sourceRefId: addSource(
      sources,
      project.id,
      `businessAnalysis.clarifications.${clarification.id}`,
      "Business Analyst unresolved clarification",
      `${clarification.questionOrIssue}\n${clarification.whyNeeded}\n${clarification.recommendedQuestion}`,
      "APPROVED_BUSINESS_ANALYSIS"
    ),
  }));
  analysis.conflicts.forEach((conflict) => {
    addSource(
      sources,
      project.id,
      `businessAnalysis.conflicts.${conflict.id}`,
      "Business Analyst unresolved conflict",
      `${conflict.issue}\n${conflict.recommendedQuestion}`,
      "APPROVED_BUSINESS_ANALYSIS"
    );
  });
  analysis.risks.forEach((risk) => {
    addSource(
      sources,
      project.id,
      `businessAnalysis.risks.${risk.id}`,
      "Business Analyst risk requiring review",
      `${risk.description}\nMitigation: ${risk.mitigation}\nLikelihood: ${risk.likelihood}\nImpact: ${risk.impact}`,
      "APPROVED_BUSINESS_ANALYSIS"
    );
  });
  analysis.scopeBoundaries.forEach((boundary) => {
    addSource(
      sources,
      project.id,
      `businessAnalysis.scopeBoundaries.${boundary.id}`,
      "Business Analyst proposed scope boundary",
      `${boundary.scope}: ${boundary.text}`,
      "APPROVED_BUSINESS_ANALYSIS"
    );
  });
  analysis.assumptions.forEach((assumption) => {
    addSource(
      sources,
      project.id,
      `businessAnalysis.assumptions.${assumption.id}`,
      "Business Analyst assumption requiring review",
      assumption.text,
      "APPROVED_BUSINESS_ANALYSIS"
    );
  });

  let projectPlanFingerprint: string | null = null;
  if (projectPlan) {
    projectPlanFingerprint = digest(JSON.stringify(projectPlan));
    projectPlan.tasks.forEach((task) => {
      addSource(
        sources,
        project.id,
        `projectManagerPlan.tasks.${task.id}`,
        `Approved Project Manager task: ${task.agentRoleId}`,
        `${task.title}\n${task.description}\nDeliverables: ${task.expectedOutputs.join("; ")}\nAcceptance: ${task.acceptanceCriteria.join("; ")}`,
        "APPROVED_PROJECT_PLAN"
      );
    });
    projectPlan.phases.forEach((phase) => {
      addSource(sources, project.id, `projectManagerPlan.phases.${phase.id}`, "Approved Project Manager phase", `${phase.title}\n${phase.outcome}`, "APPROVED_PROJECT_PLAN");
    });
    projectPlan.milestones.forEach((milestone) => {
      addSource(sources, project.id, `projectManagerPlan.milestones.${milestone.id}`, "Approved Project Manager milestone", milestone.title, "APPROVED_PROJECT_PLAN");
    });
    projectPlan.risks.forEach((risk) => {
      addSource(
        sources,
        project.id,
        `projectManagerPlan.risks.${risk.id}`,
        "Approved Project Manager risk",
        `${risk.description}\nMitigation: ${risk.mitigation}`,
        "APPROVED_PROJECT_PLAN"
      );
    });
  }

  const commercialFingerprint = digest(JSON.stringify({
    project: {
      approvedPrice: project.approvedPrice,
      advanceRequired: project.advanceRequired,
      advanceReceived: project.advanceReceived,
      remainingBalance: project.remainingBalance,
    },
    inquiry: {
      estimatedTotal: inquiry.calculation.estimatedTotal,
      advanceAmount: inquiry.calculation.advanceAmount,
      currency: inquiry.currency || null,
      internationalPricing: inquiry.internationalPricing === true,
    },
  }));
  const sourceFingerprints = {
    strategy: digest(JSON.stringify(project.ceoStrategy)),
    projectPlan: projectPlanFingerprint,
    businessAnalysis: digest(JSON.stringify(analysis)),
    commercial: commercialFingerprint,
    authorizedSources: digest(JSON.stringify(sources)),
    combined: "",
  };
  sourceFingerprints.combined = digest(JSON.stringify(sourceFingerprints));

  return {
    projectId: project.id,
    project,
    inquiry,
    strategy,
    analysis,
    projectPlan,
    proposalType: classifyProposalType(project, inquiry),
    customerMarket: classifyMarket(inquiry),
    currency: "PKR",
    sources,
    sourceFingerprints,
  };
}

function statement(
  textValue: string,
  evidenceClassification: ProposalEvidenceClassification,
  sourceRefId: string | null,
  reviewStatus: ProposalStatement["reviewStatus"]
): ProposalStatement {
  return { text: textValue, evidenceClassification, sourceRefId, reviewStatus };
}

function sourceClass(source: ProposalSourceReference): ProposalEvidenceClassification {
  switch (source.sourceType) {
    case "CUSTOMER_SUBMISSION": return "NEEDS_CLARIFICATION";
    case "APPROVED_PROJECT_RECORD": return "ADMIN_CONFIRMED";
    case "APPROVED_STRATEGY": return "APPROVED_STRATEGY";
    case "APPROVED_PROJECT_PLAN": return "APPROVED_PROJECT_PLAN";
    case "APPROVED_BUSINESS_ANALYSIS": return "ANALYSIS_CONFIRMED";
    case "DWD_POLICY": return "PROVISIONAL";
  }
}

function resolveReference(input: ProposalInput, id: string): ProposalSourceReference {
  const source = input.sources.find((item) => item.id === id);
  if (!source) throw new ProposalValidationError("A proposal statement points to evidence outside the authorized sources.");
  return source;
}

function sourceStatement(input: ProposalInput, refId: string, reviewStatus?: ProposalStatement["reviewStatus"]): ProposalStatement {
  const source = resolveReference(input, refId);
  const classification = sourceClass(source);
  const derivedReviewStatus = reviewStatus || (
    classification === "ADMIN_CONFIRMED" ? "CONFIRMED"
      : classification === "NEEDS_CLARIFICATION" ? "NEEDS_CLARIFICATION"
        : "PROVISIONAL"
  );
  return statement(source.content, classification, source.id, derivedReviewStatus);
}

function sourceRefFor(input: ProposalInput, path: string): string | null {
  return input.sources.find((source) => source.sourcePath === path)?.id || null;
}

function countEvidenceClasses(proposal: Omit<ProposalRecord, "evidenceClassification">): Record<ProposalEvidenceClassification, number> {
  const counts: Record<ProposalEvidenceClassification, number> = {
    CUSTOMER_CONFIRMED: 0,
    ADMIN_CONFIRMED: 0,
    APPROVED_STRATEGY: 0,
    APPROVED_PROJECT_PLAN: 0,
    ANALYSIS_CONFIRMED: 0,
    ASSUMPTION: 0,
    PROVISIONAL: 0,
    NEEDS_CLARIFICATION: 0,
    NOT_AVAILABLE: 0,
  };
  const statements: ProposalStatement[] = [
    proposal.executiveSummary,
    ...proposal.customerRequirements,
    proposal.proposedSolution,
    ...proposal.businessObjectives,
    ...proposal.functionalScope,
    ...proposal.nonFunctionalScope,
    ...proposal.technicalApproach,
    ...proposal.userRoles,
    ...proposal.features,
    ...proposal.deliverables,
    ...proposal.integrations,
    ...proposal.phases,
    ...proposal.milestones,
    proposal.timeline,
    ...proposal.acceptanceCriteria,
    ...proposal.includedServices,
    ...proposal.excludedServices,
    ...proposal.assumptions,
    ...proposal.pendingClarifications.map((item) => statement(
      item.text,
      item.evidenceClassification,
      item.sourceRefIds[0] || null,
      "NEEDS_CLARIFICATION"
    )),
    ...proposal.risks,
    ...proposal.commercialBreakdown.items,
    ...proposal.paymentTerms,
    ...proposal.customerResponsibilities,
    ...proposal.supportTerms,
  ];
  statements.forEach((item) => { counts[item.evidenceClassification] += 1; });
  return counts;
}

export function generateProposalDraft(
  input: ProposalInput,
  version: number,
  generatedAt = new Date().toISOString()
): ProposalRecord {
  if (!Number.isInteger(version) || version < 1 || !Number.isFinite(Date.parse(generatedAt))) {
    throw new ProposalValidationError("The proposal version or generation time is invalid.");
  }
  const project = input.project;
  const analysis = input.analysis;
  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const evidenceRefsForAnalysis = new Map(
    analysis.evidence.map((item: BusinessAnalysisEvidence) => [
      item.id,
      input.sources.find((source) => source.sourcePath === `businessAnalysis.evidence.${item.id}`)?.id || "",
    ])
  );
  const analysisRequirements = analysis.requirements.map((requirement) => {
    const sourceRefId = evidenceRefsForAnalysis.get(requirement.sourceRefId);
    if (!sourceRefId || !sourceById.has(sourceRefId)) {
      throw new ProposalValidationError(`Business Analyst requirement ${requirement.id} is not traceable.`);
    }
    const relatedClarification = analysis.clarifications.some((clarification) =>
      clarification.affectedRequirementIds.includes(requirement.id)
    );
    const base = sourceStatement(input, sourceRefId,
      relatedClarification || requirement.status === "REVIEW_REQUIRED" ? "NEEDS_CLARIFICATION" : undefined);
    return { requirement, statement: { ...base, text: requirement.description } };
  });
  const strategyObjectiveStatements = input.strategy.businessObjectives.map((objective, index) => {
    const id = sourceRefFor(input, `strategy.businessObjectives.${index}`);
    if (!id) throw new ProposalValidationError("An approved strategy objective lacks an evidence reference.");
    return sourceStatement(input, id, "PROVISIONAL");
  });
  const analysisObjectiveStatements = input.analysis.businessObjectives.map((objective) => {
    const refId = evidenceRefsForAnalysis.get(objective.sourceRefId);
    if (!refId) throw new ProposalValidationError(`Business Analyst objective ${objective.id} is not traceable.`);
    return statement(objective.text, "ANALYSIS_CONFIRMED", refId, "PROVISIONAL");
  });
  const integrationStatements = input.strategy.requiredIntegrations.flatMap((integration, index) => {
    if (!integration.name.trim() || /^none identified$/i.test(integration.name.trim())) return [];
    const id = sourceRefFor(input, `strategy.requiredIntegrations.${index}`);
    if (!id) throw new ProposalValidationError("An integration recommendation lacks an evidence reference.");
    return statement(`${integration.name}: ${integration.rationale.text}`, "APPROVED_STRATEGY", id, "PROVISIONAL");
  });
  const includedServices = input.strategy.scopeAndExclusions.scope.map((item, index) => {
    const id = sourceRefFor(input, `strategy.scope.${index}`);
    if (!id) throw new ProposalValidationError("An included-scope recommendation lacks an evidence reference.");
    return statement(item.text, "APPROVED_STRATEGY", id,
      item.status === "VERIFIED" ? "PROVISIONAL" : "NEEDS_CLARIFICATION");
  });
  const excludedServices = input.strategy.scopeAndExclusions.exclusions.map((item, index) => {
    const id = sourceRefFor(input, `strategy.exclusions.${index}`);
    if (!id) throw new ProposalValidationError("An exclusion recommendation lacks an evidence reference.");
    return statement(item.text, "APPROVED_STRATEGY", id,
      item.status === "VERIFIED" ? "PROVISIONAL" : "NEEDS_CLARIFICATION");
  });
  const assumptions = input.strategy.assumptions.map((item, index) => {
    const id = sourceRefFor(input, `strategy.assumptions.${index}`);
    if (!id) throw new ProposalValidationError("An assumption lacks an evidence reference.");
    return statement(item.text, "ASSUMPTION", id, "NEEDS_CLARIFICATION");
  });
  const analysisScopeStatements = input.analysis.scopeBoundaries.map((boundary) => {
    const id = sourceRefFor(input, `businessAnalysis.scopeBoundaries.${boundary.id}`);
    if (!id) throw new ProposalValidationError(`Business Analyst scope boundary ${boundary.id} lacks an evidence reference.`);
    const needsClarification = boundary.scope === "NEEDS_CONFIRMATION" || boundary.scope === "OPTIONAL";
    return statement(
      `${boundary.scope.replace(/_/g, " ")}: ${boundary.text}`,
      "ANALYSIS_CONFIRMED",
      id,
      needsClarification ? "NEEDS_CLARIFICATION" : "PROVISIONAL"
    );
  });
  const analysisAssumptions = input.analysis.assumptions.map((assumption) => {
    const id = sourceRefFor(input, `businessAnalysis.assumptions.${assumption.id}`);
    if (!id) throw new ProposalValidationError(`Business Analyst assumption ${assumption.id} lacks an evidence reference.`);
    return statement(assumption.text, "ASSUMPTION", id, "NEEDS_CLARIFICATION");
  });
  const pendingClarifications: ProposalIssue[] = [];
  input.analysis.clarifications.forEach((item) => {
    const refId = sourceRefFor(input, `businessAnalysis.clarifications.${item.id}`);
    if (!refId) throw new ProposalValidationError("An Agent 3 clarification lacks an evidence reference.");
    pendingClarifications.push({
      id: item.id,
      kind: "CLARIFICATION",
      text: `${item.questionOrIssue} Ask: ${item.recommendedQuestion}`,
      status: item.status === "REQUESTED" ? "REQUESTED" : "OPEN",
      sourceRefIds: [refId, ...item.sourceRefIds.map((id) => evidenceRefsForAnalysis.get(id)).filter((id): id is string => Boolean(id))],
      evidenceClassification: "NEEDS_CLARIFICATION",
    });
  });
  input.analysis.conflicts.forEach((item) => {
    const refId = sourceRefFor(input, `businessAnalysis.conflicts.${item.id}`);
    if (!refId) throw new ProposalValidationError("An Agent 3 conflict lacks an evidence reference.");
    pendingClarifications.push({
      id: item.id,
      kind: "CONFLICT",
      text: `${item.issue} Ask: ${item.recommendedQuestion}`,
      status: "UNRESOLVED",
      sourceRefIds: [refId, ...item.sourceRefIds.map((id) => evidenceRefsForAnalysis.get(id)).filter((id): id is string => Boolean(id))],
      evidenceClassification: "NEEDS_CLARIFICATION",
    });
  });
  input.strategy.unknowns.forEach((item, index) => {
    const refId = sourceRefFor(input, `strategy.unknowns.${index}`);
    if (!refId) throw new ProposalValidationError("An Agent 1 unknown lacks an evidence reference.");
    pendingClarifications.push({
      id: `strategy-unknown-${index + 1}`,
      kind: "STRATEGY_UNKNOWN",
      text: item.text,
      status: "UNRESOLVED",
      sourceRefIds: [refId],
      evidenceClassification: "NEEDS_CLARIFICATION",
    });
  });

  const planTaskStatements = (input.projectPlan?.tasks || []).flatMap((task) => {
    const refId = sourceRefFor(input, `projectManagerPlan.tasks.${task.id}`);
    if (!refId) throw new ProposalValidationError(`Project Manager deliverable ${task.id} lacks an evidence reference.`);
    return task.expectedOutputs.map((output) => ({
      ...statement(output, "APPROVED_PROJECT_PLAN", refId, "PROVISIONAL"),
      roleId: task.agentRoleId,
      taskId: task.id,
      requirementMappingStatus: "NOT_MAPPED" as const,
    }));
  });
  const phaseStatements = (input.projectPlan?.phases || []).map((phase) => {
    const refId = sourceRefFor(input, `projectManagerPlan.phases.${phase.id}`);
    if (!refId) throw new ProposalValidationError(`Project Manager phase ${phase.id} lacks an evidence reference.`);
    return statement(`${phase.title}: ${phase.outcome}`, "APPROVED_PROJECT_PLAN", refId, "PROVISIONAL");
  });
  const milestoneStatements = (input.projectPlan?.milestones || []).map((milestone) => {
    const refId = sourceRefFor(input, `projectManagerPlan.milestones.${milestone.id}`);
    if (!refId) throw new ProposalValidationError(`Project Manager milestone ${milestone.id} lacks an evidence reference.`);
    return statement(`${milestone.title} (target date not set)`, "APPROVED_PROJECT_PLAN", refId, "PROVISIONAL");
  });
  const requirements = analysisRequirements.map((item) => item.statement);
  const unavailable = (message: string) => statement(message, "NOT_AVAILABLE", null, "NOT_AVAILABLE");
  const projectFeeRef = sourceRefFor(input, "project.approvedPrice");
  const advanceRef = sourceRefFor(input, "project.advanceRequired");
  const receivedRef = sourceRefFor(input, "project.advanceReceived");
  const balanceRef = sourceRefFor(input, "project.remainingBalance");
  const timelineRef = sourceRefFor(input, "project.deliveryTimeline");
  if (!projectFeeRef || !advanceRef || !receivedRef || !balanceRef) {
    throw new ProposalValidationError("The approved commercial source references are incomplete.");
  }
  const proposal: ProposalRecord = {
    id: `proposal-${digest(`${input.projectId}:${version}:${input.sourceFingerprints.combined}`).slice(0, 24)}`,
    projectId: input.projectId,
    proposalReference: `DWD-${input.projectId}-V${version}`,
    proposalType: input.proposalType,
    customerMarket: input.customerMarket,
    currency: input.currency,
    version,
    status: pendingClarifications.length ? "NEEDS_INFORMATION" : "DRAFT",
    executiveSummary: statement(input.strategy.executiveSummary.text, "APPROVED_STRATEGY", sourceRefFor(input, "strategy.executiveSummary"), "PROVISIONAL"),
    customerRequirements: requirements,
    proposedSolution: statement(input.strategy.executiveSummary.text, "APPROVED_STRATEGY", sourceRefFor(input, "strategy.executiveSummary"), "PROVISIONAL"),
    businessObjectives: [...strategyObjectiveStatements, ...analysisObjectiveStatements],
    functionalScope: analysisRequirements.filter((item) => item.requirement.category === "functional").map((item) => item.statement),
    nonFunctionalScope: analysisRequirements.filter((item) => item.requirement.category === "non_functional").map((item) => item.statement),
    technicalApproach: [sourceStatement(input, sourceRefFor(input, "strategy.technicalArchitecture") || "", "PROVISIONAL")],
    userRoles: analysis.userRoles.length ? analysis.userRoles.map((role) => role.sourceRefId
      ? statement(role.description, "ANALYSIS_CONFIRMED", evidenceRefsForAnalysis.get(role.sourceRefId) || null, "NEEDS_CLARIFICATION")
      : unavailable(`${role.description} (not traceable to authorized customer evidence)`))
      : [unavailable("No user roles are confirmed in the approved analysis.")],
    features: analysis.features.length ? analysis.features.map((feature) => {
      const refId = evidenceRefsForAnalysis.get(feature.sourceRefId);
      if (!refId) throw new ProposalValidationError(`Feature ${feature.id} is not traceable.`);
      return statement(`${feature.title}: ${feature.businessPurpose}`, "ANALYSIS_CONFIRMED", refId, "NEEDS_CLARIFICATION");
    }) : [unavailable("No features are confirmed in the approved analysis.")],
    deliverables: planTaskStatements.length ? planTaskStatements : [{
      ...unavailable("No current approved Agent 2 deliverables are available; deliverables require human planning."),
      roleId: "",
      taskId: "",
      requirementMappingStatus: "NOT_MAPPED",
    }],
    integrations: integrationStatements.length ? integrationStatements : [unavailable("No third-party integration is confirmed in the approved sources.")],
    phases: phaseStatements.length ? phaseStatements : [unavailable("No current approved Agent 2 phases are available.")],
    milestones: milestoneStatements.length ? milestoneStatements : [unavailable("No current approved Agent 2 milestones are available; target dates are not set.")],
    timeline: timelineRef
      ? statement(
          `Recorded project timeline: ${input.project.deliveryTimeline}. This is not a guaranteed delivery date.`,
          "ADMIN_CONFIRMED",
          timelineRef,
          "PROVISIONAL"
        )
      : unavailable("No delivery timeline is recorded in the approved project."),
    acceptanceCriteria: [
      ...analysisRequirements.flatMap(({ requirement, statement: requirementStatement }) =>
        requirement.acceptanceCriteria.map((criterion) => statement(
          criterion,
          requirementStatement.evidenceClassification,
          requirementStatement.sourceRefId,
          "NEEDS_CLARIFICATION"
        ))
      ),
      ...input.strategy.acceptanceCriteria.map((item, index) => {
        const refId = sourceRefFor(input, `strategy.acceptanceCriteria.${index}`);
        if (!refId) throw new ProposalValidationError("A strategy acceptance criterion lacks evidence.");
        return statement(item.text, "APPROVED_STRATEGY", refId, "PROVISIONAL");
      }),
    ],
    includedServices: [...includedServices, ...analysisScopeStatements.filter((item) => !item.text.startsWith("OUT OF SCOPE:"))].length
      ? [...includedServices, ...analysisScopeStatements.filter((item) => !item.text.startsWith("OUT OF SCOPE:"))]
      : [unavailable("No included services were enumerated in the approved sources.")],
    excludedServices: [...excludedServices, ...analysisScopeStatements.filter((item) => item.text.startsWith("OUT OF SCOPE:"))].length
      ? [...excludedServices, ...analysisScopeStatements.filter((item) => item.text.startsWith("OUT OF SCOPE:"))]
      : [unavailable("No exclusions were enumerated in the approved sources.")],
    assumptions: [...assumptions, ...analysisAssumptions],
    pendingClarifications,
    risks: [
      ...input.strategy.riskRegister.map((risk, index) => {
        const refId = sourceRefFor(input, `strategy.riskRegister.${index}`);
        if (!refId) throw new ProposalValidationError("A strategy risk lacks evidence.");
        return statement(`${risk.risk.text} Mitigation: ${risk.mitigation.text}`, "APPROVED_STRATEGY", refId, "PROVISIONAL");
      }),
      ...input.projectPlan?.risks.map((risk) => {
        const refId = sourceRefFor(input, `projectManagerPlan.risks.${risk.id}`);
        if (!refId) throw new ProposalValidationError(`Project Manager risk ${risk.id} lacks an evidence reference.`);
        return statement(
          `${risk.description} Mitigation: ${risk.mitigation} Status: ${risk.status}.`,
          "APPROVED_PROJECT_PLAN",
          refId,
          "PROVISIONAL"
        );
      }) || [],
      ...input.analysis.risks.map((risk) => {
        const refId = sourceRefFor(input, `businessAnalysis.risks.${risk.id}`);
        if (!refId) throw new ProposalValidationError(`Business Analyst risk ${risk.id} lacks an evidence reference.`);
        return statement(
          `${risk.description} Mitigation: ${risk.mitigation} Likelihood: ${risk.likelihood}; impact: ${risk.impact}.`,
          "ANALYSIS_CONFIRMED",
          refId,
          "NEEDS_CLARIFICATION"
        );
      }),
    ],
    commercialBreakdown: {
      status: "ADMIN_CONFIRMED",
      currency: "PKR",
      approvedProjectFee: project.approvedPrice,
      advanceRequired: project.advanceRequired,
      advanceReceived: project.advanceReceived,
      remainingBalance: project.remainingBalance,
      items: [statement(`Approved project fee: PKR ${project.approvedPrice}`, "ADMIN_CONFIRMED", projectFeeRef, "CONFIRMED")],
      note: input.customerMarket === "INTERNATIONAL"
        ? "The approved project record uses the canonical PKR base amount. No exchange rate, regional conversion, tax, or international payment availability is included."
        : "Only the approved project fee is included. No tax, discount, third-party cost, or additional payment schedule is inferred.",
    },
    paymentTerms: [
      statement(`Recorded required advance: PKR ${project.advanceRequired}.`, "ADMIN_CONFIRMED", advanceRef, "CONFIRMED"),
      statement(`Recorded verified advance received: PKR ${project.advanceReceived}.`, "ADMIN_CONFIRMED", receivedRef, "CONFIRMED"),
      statement(`Recorded remaining balance: PKR ${project.remainingBalance}.`, "ADMIN_CONFIRMED", balanceRef, "CONFIRMED"),
      unavailable("No additional installment schedule or payment method is authorized by this proposal workflow."),
    ],
    customerResponsibilities: [unavailable("Customer responsibilities require explicit human agreement; none are inferred.")],
    supportTerms: [unavailable("Support, warranty, and maintenance terms require separate commercial approval.")],
    sourceReferences: input.sources,
    evidenceClassification: {} as ProposalRecord["evidenceClassification"],
    sourceFingerprints: input.sourceFingerprints,
    generatedAt: new Date(generatedAt).toISOString(),
    generatedBy: PROPOSAL_WRITER_AGENT_ID,
    review: null,
    approval: null,
  };
  proposal.evidenceClassification = countEvidenceClasses(proposal);
  validateProposalRecord(proposal, input.projectId);
  return proposal;
}

export function validateProposalRecord(proposal: ProposalRecord, projectId: string): void {
  const arrayFields = [
    "customerRequirements", "businessObjectives", "functionalScope", "nonFunctionalScope",
    "technicalApproach", "userRoles", "features", "deliverables", "integrations", "phases",
    "milestones", "acceptanceCriteria", "includedServices", "excludedServices", "assumptions",
    "pendingClarifications", "risks", "paymentTerms", "customerResponsibilities", "supportTerms",
    "sourceReferences",
  ] as const;
  if (!proposal || typeof proposal !== "object" || proposal.projectId !== projectId ||
      proposal.generatedBy !== PROPOSAL_WRITER_AGENT_ID ||
      typeof proposal.id !== "string" || !proposal.id ||
      typeof proposal.proposalReference !== "string" || !proposal.proposalReference ||
      !PROPOSAL_TYPES.includes(proposal.proposalType) ||
      !["PAKISTAN", "INTERNATIONAL", "UNKNOWN"].includes(proposal.customerMarket) ||
      !["PKR", "UNKNOWN"].includes(proposal.currency) ||
      !Number.isInteger(proposal.version) || proposal.version < 1 ||
      !["DRAFT", "NEEDS_INFORMATION", "ADMIN_REVIEW_REQUIRED", "APPROVED_FOR_CUSTOMER"].includes(proposal.status) ||
      !Number.isFinite(Date.parse(proposal.generatedAt)) ||
      arrayFields.some((field) => !Array.isArray(proposal[field])) ||
      !proposal.commercialBreakdown || !Array.isArray(proposal.commercialBreakdown.items) ||
      !proposal.sourceFingerprints || typeof proposal.sourceFingerprints !== "object" ||
      !/^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.strategy) ||
      !(proposal.sourceFingerprints.projectPlan === null || /^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.projectPlan)) ||
      !/^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.businessAnalysis) ||
      !/^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.commercial) ||
      !/^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.authorizedSources) ||
      !/^[a-f0-9]{64}$/i.test(proposal.sourceFingerprints.combined) ||
      proposal.sourceFingerprints.combined !== digest(JSON.stringify({
        ...proposal.sourceFingerprints,
        combined: "",
      })) ||
      proposal.id !== `proposal-${digest(`${projectId}:${proposal.version}:${proposal.sourceFingerprints.combined}`).slice(0, 24)}` ||
      proposal.proposalReference !== `DWD-${projectId}-V${proposal.version}`) {
    throw new ProposalValidationError("The saved proposal is malformed or bound to another project.");
  }
  const sourceRefs = new Set<string>();
  const sourceTypesById = new Map<string, ProposalSourceReference["sourceType"]>();
  for (const reference of proposal.sourceReferences) {
    if (!reference || typeof reference.id !== "string" || !reference.id || sourceRefs.has(reference.id) ||
        reference.id !== sourceId(projectId, reference.sourcePath) ||
        typeof reference.sourcePath !== "string" || !reference.sourcePath ||
        typeof reference.label !== "string" || !reference.label.trim() ||
        typeof reference.content !== "string" || !reference.content.trim() ||
        !["CUSTOMER_SUBMISSION", "APPROVED_PROJECT_RECORD", "APPROVED_STRATEGY", "APPROVED_PROJECT_PLAN", "APPROVED_BUSINESS_ANALYSIS", "DWD_POLICY"].includes(reference.sourceType)) {
      throw new ProposalValidationError("A proposal source reference is malformed or duplicated.");
    }
    sourceRefs.add(reference.id);
    sourceTypesById.set(reference.id, reference.sourceType);
  }
  if (proposal.pendingClarifications.some((item) => !item || typeof item.id !== "string" ||
      !item.id || typeof item.text !== "string" || !item.text.trim() ||
      !["CLARIFICATION", "CONFLICT", "STRATEGY_UNKNOWN"].includes(item.kind) ||
      !["OPEN", "REQUESTED", "UNRESOLVED"].includes(item.status) ||
      !["ANALYSIS_CONFIRMED", "NEEDS_CLARIFICATION"].includes(item.evidenceClassification) ||
      !Array.isArray(item.sourceRefIds) || item.sourceRefIds.length === 0 ||
      item.sourceRefIds.some((id) => !sourceRefs.has(id)))) {
    throw new ProposalValidationError("A proposal clarification or conflict is malformed or lost.");
  }
  if (!["ADMIN_CONFIRMED", "COMMERCIAL_REVIEW_REQUIRED"].includes(proposal.commercialBreakdown.status) ||
      !["PKR", "UNKNOWN"].includes(proposal.commercialBreakdown.currency) ||
      !Number.isFinite(proposal.commercialBreakdown.approvedProjectFee) ||
      !Number.isFinite(proposal.commercialBreakdown.advanceRequired) ||
      !Number.isFinite(proposal.commercialBreakdown.advanceReceived) ||
      !Number.isFinite(proposal.commercialBreakdown.remainingBalance) ||
      (proposal.commercialBreakdown.approvedProjectFee ?? -1) <= 0 ||
      (proposal.commercialBreakdown.advanceRequired ?? -1) <= 0 ||
      (proposal.commercialBreakdown.advanceReceived ?? -1) < (proposal.commercialBreakdown.advanceRequired ?? 0) ||
      (proposal.commercialBreakdown.remainingBalance ?? -1) < 0 ||
      (proposal.commercialBreakdown.approvedProjectFee ?? 0) !==
        (proposal.commercialBreakdown.advanceReceived ?? 0) + (proposal.commercialBreakdown.remainingBalance ?? 0) ||
      typeof proposal.commercialBreakdown.note !== "string" || !proposal.commercialBreakdown.note.trim()) {
    throw new ProposalValidationError("The proposal commercial breakdown is incomplete or invalid.");
  }
  const validateStatement = (item: ProposalStatement) => {
    const sourceType = item?.sourceRefId ? sourceTypesById.get(item.sourceRefId) : undefined;
    const permittedClassifications: Partial<Record<
      ProposalSourceReference["sourceType"],
      ProposalEvidenceClassification[]
    >> = {
      CUSTOMER_SUBMISSION: ["NEEDS_CLARIFICATION"],
      APPROVED_PROJECT_RECORD: ["ADMIN_CONFIRMED", "PROVISIONAL", "NEEDS_CLARIFICATION"],
      APPROVED_STRATEGY: ["APPROVED_STRATEGY", "ASSUMPTION", "PROVISIONAL", "NEEDS_CLARIFICATION"],
      APPROVED_PROJECT_PLAN: ["APPROVED_PROJECT_PLAN", "PROVISIONAL", "NEEDS_CLARIFICATION"],
      APPROVED_BUSINESS_ANALYSIS: ["ANALYSIS_CONFIRMED", "ASSUMPTION", "PROVISIONAL", "NEEDS_CLARIFICATION"],
      DWD_POLICY: ["PROVISIONAL"],
    };
    if (!item || typeof item.text !== "string" || !item.text.trim() ||
        !["CUSTOMER_CONFIRMED", "ADMIN_CONFIRMED", "APPROVED_STRATEGY", "APPROVED_PROJECT_PLAN", "ANALYSIS_CONFIRMED", "ASSUMPTION", "PROVISIONAL", "NEEDS_CLARIFICATION", "NOT_AVAILABLE"].includes(item.evidenceClassification) ||
        !["CONFIRMED", "PROVISIONAL", "NEEDS_CLARIFICATION", "NOT_AVAILABLE"].includes(item.reviewStatus) ||
        (item.sourceRefId !== null && !sourceRefs.has(item.sourceRefId)) ||
        (item.evidenceClassification === "NOT_AVAILABLE" && (item.sourceRefId !== null || item.reviewStatus !== "NOT_AVAILABLE")) ||
        (item.evidenceClassification !== "NOT_AVAILABLE" && item.sourceRefId === null) ||
        item.evidenceClassification === "CUSTOMER_CONFIRMED" ||
        (item.evidenceClassification !== "NOT_AVAILABLE" &&
          (!sourceType || !permittedClassifications[sourceType]?.includes(item.evidenceClassification))) ||
        (item.reviewStatus === "CONFIRMED" && item.evidenceClassification !== "ADMIN_CONFIRMED")) {
      throw new ProposalValidationError("A proposal statement is empty, falsely classified, or not traceable.");
    }
  };
  const statements = [
    proposal.executiveSummary,
    ...proposal.customerRequirements,
    proposal.proposedSolution,
    ...proposal.businessObjectives,
    ...proposal.functionalScope,
    ...proposal.nonFunctionalScope,
    ...proposal.technicalApproach,
    ...proposal.userRoles,
    ...proposal.features,
    ...proposal.deliverables,
    ...proposal.integrations,
    ...proposal.phases,
    ...proposal.milestones,
    proposal.timeline,
    ...proposal.acceptanceCriteria,
    ...proposal.includedServices,
    ...proposal.excludedServices,
    ...proposal.assumptions,
    ...proposal.risks,
    ...proposal.commercialBreakdown.items,
    ...proposal.paymentTerms,
    ...proposal.customerResponsibilities,
    ...proposal.supportTerms,
  ];
  if (statements.some((item) => !item)) throw new ProposalValidationError("A required proposal section is malformed.");
  statements.forEach(validateStatement);
  const expectedEvidenceCounts = countEvidenceClasses(proposal);
  if (!proposal.evidenceClassification ||
      Object.keys(expectedEvidenceCounts).some((key) =>
        proposal.evidenceClassification[key as ProposalEvidenceClassification] !==
        expectedEvidenceCounts[key as ProposalEvidenceClassification]
      )) {
    throw new ProposalValidationError("The proposal evidence summary does not match its saved statements.");
  }
  if (proposal.deliverables.some((item) =>
    item.requirementMappingStatus !== "NOT_MAPPED" ||
    (item.taskId === "" && item.roleId !== "")
  )) {
    throw new ProposalValidationError("Agent 2 deliverables must retain their unmapped status.");
  }
  if (proposal.status === "APPROVED_FOR_CUSTOMER" && (
      !proposal.review || !proposal.approval ||
      proposal.approval.proposalId !== proposal.id ||
      proposal.approval.proposalVersion !== proposal.version ||
      !nonEmpty(proposal.approval.approvedBy) ||
      !Number.isFinite(Date.parse(proposal.approval.approvedAt)) ||
      proposal.approval.proposalFingerprint !== proposal.review.proposalFingerprint ||
      proposal.approval.proposalFingerprint !== proposalFingerprint(proposal) ||
      !proposal.approval.sourceFingerprints ||
      (Object.keys(proposal.sourceFingerprints) as Array<keyof ProposalRecord["sourceFingerprints"]>)
        .some((key) => proposal.approval?.sourceFingerprints[key] !== proposal.sourceFingerprints[key]) ||
      (proposal.pendingClarifications.length > 0 && proposal.approval.openItemsAcknowledged !== true)
  )) {
    throw new ProposalValidationError("Proposal approval is missing a current, explicit review or open-items acknowledgement.");
  }
  if (proposal.review && (!nonEmpty(proposal.review.reviewedBy) ||
      !Number.isFinite(Date.parse(proposal.review.reviewedAt)) ||
      !/^[a-f0-9]{64}$/i.test(proposal.review.proposalFingerprint) ||
      proposal.review.proposalFingerprint !== proposalFingerprint(proposal))) {
    throw new ProposalValidationError("The proposal review record is invalid.");
  }
  if (proposal.status !== "APPROVED_FOR_CUSTOMER" && proposal.approval !== null) {
    throw new ProposalValidationError("A non-approved proposal cannot contain an approval record.");
  }
}

function proposalFingerprint(proposal: ProposalRecord): string {
  return digest(JSON.stringify({ ...proposal, status: null, review: null, approval: null }));
}

export function isProposalCurrent(proposal: ProposalRecord, project: Project, inquiry: Inquiry): boolean {
  try {
    validateProposalRecord(proposal, project.id);
    const currentInput = buildProposalInput(project, inquiry);
    return proposal.sourceFingerprints.combined === currentInput.sourceFingerprints.combined;
  } catch {
    return false;
  }
}

export function reviewProposal(
  proposal: ProposalRecord,
  project: Project,
  inquiry: Inquiry,
  reviewedBy: string,
  reviewedAt = new Date().toISOString()
): ProposalRecord {
  validateProposalRecord(proposal, project.id);
  if (!["DRAFT", "NEEDS_INFORMATION", "ADMIN_REVIEW_REQUIRED"].includes(proposal.status) ||
      !nonEmpty(reviewedBy) || !Number.isFinite(Date.parse(reviewedAt)) ||
      !isProposalCurrent(proposal, project, inquiry)) {
    throw new ProposalValidationError("Only a current, unapproved proposal can be marked reviewed.");
  }
  return {
    ...proposal,
    status: "ADMIN_REVIEW_REQUIRED",
    review: {
      reviewedBy: reviewedBy.trim(),
      reviewedAt: new Date(reviewedAt).toISOString(),
      proposalFingerprint: proposalFingerprint(proposal),
    },
    approval: null,
  };
}

export function approveProposal(
  proposal: ProposalRecord,
  project: Project,
  inquiry: Inquiry,
  approvedBy: string,
  acknowledgeOpenItems: boolean,
  approvedAt = new Date().toISOString()
): ProposalRecord {
  validateProposalRecord(proposal, project.id);
  if (proposal.status !== "ADMIN_REVIEW_REQUIRED" || !proposal.review ||
      !nonEmpty(approvedBy) || !Number.isFinite(Date.parse(approvedAt)) ||
      (proposal.pendingClarifications.length > 0 && acknowledgeOpenItems !== true) ||
      !isProposalCurrent(proposal, project, inquiry)) {
    throw new ProposalValidationError("Only a current, separately reviewed proposal with acknowledged open items can be approved for customer review.");
  }
  return {
    ...proposal,
    status: "APPROVED_FOR_CUSTOMER",
    approval: {
      approvedBy: approvedBy.trim(),
      approvedAt: new Date(approvedAt).toISOString(),
      proposalId: proposal.id,
      proposalVersion: proposal.version,
      proposalFingerprint: proposalFingerprint(proposal),
      sourceFingerprints: proposal.sourceFingerprints,
      openItemsAcknowledged: acknowledgeOpenItems,
    },
  };
}

export function getProposalWriterRole() {
  return DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === PROPOSAL_WRITER_AGENT_ID) || null;
}
