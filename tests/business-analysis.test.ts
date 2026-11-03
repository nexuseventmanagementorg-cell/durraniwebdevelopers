import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "../src/app/api/admin/workforce/business-analysis/route";
import { signToken } from "../src/lib/auth";
import {
  analyzeBusinessRequirements,
  approveBusinessAnalysis,
  buildBusinessAnalysisInput,
  BUSINESS_ANALYSIS_CATEGORIES,
  isBusinessAnalysisCurrent,
  requestBusinessAnalysisClarifications,
  validateBusinessAnalysisRecord,
} from "../src/lib/business-analysis";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  validateCeoStrategyOutput,
  type CeoStrategyFinding,
} from "../src/lib/ceo-strategy";
import { buildProjectManagerPlan, approveProjectManagerPlan } from "../src/lib/project-manager";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import { DataStore } from "../src/lib/store";
import type { Inquiry, Project } from "../src/lib/types";

function finding(text: string, status: CeoStrategyFinding["status"] = "RECOMMENDED"): CeoStrategyFinding {
  return { text, status, evidenceReferences: [] };
}

function createApprovedContext() {
  const project = {
    id: "project-ba-test",
    inquiryId: "DW-123456",
    clientId: "client-ba",
    clientName: "Example Customer",
    clientEmail: "customer@example.test",
    clientPhone: "",
    name: "Corporate website",
    category: "corporate_business_website",
    description: "An approved corporate website scope.",
    approvedPrice: 10000,
    advanceRequired: 2000,
    advanceReceived: 2000,
    remainingBalance: 8000,
    status: "Approved",
    deliveryTimeline: "To be agreed after review",
    selectedFeatures: ["approved contact form"],
    adminNotes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Project;
  const inquiry = {
    id: "DW-123456",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "Approved",
    convertedProjectId: project.id,
    customerName: "Example Customer",
    businessName: "Example Business",
    email: "customer@example.test",
    phone: "",
    cityCountry: "Pakistan",
    preferredContact: "email",
    customerIntro: "",
    projectTypes: ["corporate website"],
    problemToSolve: "Present the approved business offering online.",
    targetAudience: "Business customers",
    productsServices: "Business services",
    inspirationUrl: "https://example.test/brand-reference",
    isNewOrUpgrade: "new",
    preferredLaunchDate: "",
    expectedBudgetRange: "Approved fixed scope",
    displayFixedOnly: false,
    needsProductCatalog: false,
    productFeatures: [],
    acceptOrdersOnline: false,
    orderFeatures: [],
    needsReviewsOrAccounts: false,
    adminPanelType: "none" as const,
    adminFeatures: [],
    selectedAddons: [],
    calculation: {
      basePrice: 0,
      adminFee: 0,
      addonsTotal: 0,
      selectedAddonDetails: [],
      monthlyAddonTotal: 0,
      contingencyAmount: 0,
      estimatedTotal: 0,
      advanceAmount: 0,
      remainingBalance: 0,
      installmentsCount: 0,
      regularInstallment: 0,
      finalInstallment: 0,
      dailyCost: 0,
    },
    disclaimerAccepted: true,
  } as Inquiry;
  const strategyInput = buildCeoStrategyInput(project, inquiry);
  const strategyFinding = finding("Review approved business scope and customer requirements.");
  const strategyPlan = validateCeoStrategyOutput({
    executiveSummary: strategyFinding,
    businessObjectives: [finding("Present the approved business offering.")],
    targetAudience: finding("Serve business customers."),
    classification: {
      primaryCategory: "corporate_business_website",
      relatedCategories: [],
      rationale: finding("The approved scope describes a corporate website."),
    },
    scopeAndExclusions: {
      scope: [finding("Use the approved corporate website scope.")],
      exclusions: [finding("No extra integrations are approved.", "UNKNOWN")],
    },
    functionalRequirements: [finding("Provide approved company information.")],
    uiUxDirection: finding("Use a clear information hierarchy."),
    technicalArchitecture: finding("Review the existing architecture before implementation."),
    requiredIntegrations: [{ name: "None identified", rationale: finding("No integration was specified.") }],
    projectPhases: [{
      title: "Plan the approved website",
      outcome: finding("Prepare a reviewable project plan."),
      taskAssignmentIds: ["frontend-ui-designer"],
    }],
    specialistAssignments: [{
      projectId: project.id,
      agentRoleId: "frontend-ui-designer",
      agentRole: "Frontend UI Designer",
      taskTitle: "Prepare interface recommendations",
      instructions: "Review approved scope and prepare a reviewable interface recommendation.",
      requiredInputs: ["Approved project scope"],
      expectedOutputs: ["Interface recommendation"],
      acceptanceCriteria: ["Recommendation aligns with approved scope."],
      dependencies: [],
      permissionRequirements: [],
      humanApprovalRequirements: [],
      status: "BLOCKED",
      blocker: "No customer-project execution adapter is available.",
    }],
    acceptanceCriteria: [finding("The plan matches approved project scope.")],
    riskRegister: [{
      risk: finding("Requirements may need further clarification."),
      likelihood: "UNKNOWN",
      impact: "MEDIUM",
      mitigation: finding("Confirm unknown requirements before implementation."),
    }],
    assumptions: [finding("The customer will provide final approved content.", "ASSUMED")],
    unknowns: [finding("Website languages are not recorded.", "UNKNOWN")],
    commercialConsiderations: [finding("The approved price and advance are recorded.")],
    humanApprovalRequirements: [finding("A human must approve this project plan.")],
    implementationBlockers: [],
  }, strategyInput);
  project.ceoStrategy = {
    status: "approved",
    generatedAt: "2026-01-01T00:00:00.000Z",
    generatedBy: "local_ollama",
    model: "test-model",
    sourceHash: hashCeoStrategyInput(strategyInput),
    plan: strategyPlan,
    approval: { approvedBy: "admin@example.test", approvedAt: "2026-01-01T00:00:00.000Z" },
  };
  return { project, inquiry };
}

function generateAnalysis(project: Project, inquiry: Inquiry) {
  return analyzeBusinessRequirements(buildBusinessAnalysisInput(project, inquiry), "2026-01-02T00:00:00.000Z");
}

test("Business Analyst maps to the existing registry role and generates traceable review requirements", () => {
  assert.equal(DWD_WORKFORCE_AGENTS.length, 50);
  const role = DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === "business-analyst");
  assert.equal(role?.role, "Business Analyst");
  assert.equal(role?.task, "Translating needs into scope");
  assert.equal(BUSINESS_ANALYSIS_CATEGORIES.length, 10);

  const { project, inquiry } = createApprovedContext();
  const input = buildBusinessAnalysisInput(project, inquiry);
  const analysis = analyzeBusinessRequirements(input, "2026-01-02T00:00:00.000Z");
  assert.equal(analysis.agentId, "business-analyst");
  assert.equal(analysis.status, "AWAITING_REVIEW");
  assert.equal(analysis.categories.length, 18);
  assert.equal(analysis.categories.find((category) => category.category === "Corporate websites")?.relevance, "PRIMARY");
  assert.ok(analysis.categories.every((category) => category.executionCapability === "NOT_ASSESSED"));
  assert.ok(analysis.requirements.some((requirement) => requirement.category === "functional"));
  assert.ok(analysis.requirements.some((requirement) => requirement.category === "security"));
  assert.ok(analysis.requirements.some((requirement) => requirement.category === "non_functional"));
  assert.ok(analysis.requirements.some((requirement) => /target market/i.test(requirement.title)));
  assert.ok(analysis.evidence.some((item) => item.sourcePath === "inquiry.expectedBudgetRange"));
  assert.ok(analysis.evidence.some((item) =>
    item.sourcePath === "inquiry.inspirationUrl" && /not retrieved or assessed/i.test(item.label)
  ));
  assert.ok(analysis.requirements.every((requirement) =>
    requirement.status === "REVIEW_REQUIRED" &&
    requirement.priority === "UNRANKED" &&
    requirement.acceptanceCriteria[0].startsWith("Given ") &&
    requirement.verificationApproach.status === "NOT_TESTED"
  ));
  assert.ok(analysis.requirements.every((requirement) =>
    analysis.evidence.some((item) => item.id === requirement.sourceRefId)
  ));
  assert.ok(analysis.clarifications.some((item) => /languages/i.test(item.questionOrIssue)));
  assert.ok(analysis.clarifications.some((item) => /user roles/i.test(item.questionOrIssue)));
  assert.ok(analysis.assumptions.every((item) => item.status === "ASSUMED"));
  assert.ok(analysis.risks.every((risk) =>
    risk.status === "REVIEW_REQUIRED" &&
    analysis.evidence.some((item) => item.id === risk.sourceRefId)
  ));
  assert.ok(analysis.scopeBoundaries.some((item) => item.scope === "NEEDS_CONFIRMATION"));
  assert.ok(analysis.traceability.inquiryToRequirements.length > 0);
  validateBusinessAnalysisRecord(analysis, project.id);

  const repeated = generateAnalysis(project, inquiry);
  assert.deepEqual(
    repeated.requirements.map((requirement) => requirement.id),
    analysis.requirements.map((requirement) => requirement.id)
  );
});

test("Business Analyst rejects unapproved or mismatched projects and detects explicit conflicts", () => {
  const { project, inquiry } = createApprovedContext();
  assert.throws(
    () => buildBusinessAnalysisInput({ ...project, status: "Awaiting Advance" }, inquiry),
    /approved inquiry conversion, commercial scope, and verified required advance/i
  );
  assert.throws(
    () => buildBusinessAnalysisInput(project, { ...inquiry, convertedProjectId: "another-project" }),
    /approved inquiry conversion, commercial scope, and verified required advance/i
  );
  assert.throws(
    () => buildBusinessAnalysisInput({ ...project, ceoStrategy: undefined }, inquiry),
    /human-approved CEO strategy is required/i
  );
  assert.throws(
    () => buildBusinessAnalysisInput({ ...project, description: "Changed after strategy approval." }, inquiry),
    /CEO strategy is stale/i
  );

  const conflictingInquiry = {
    ...inquiry,
    orderFeatures: ["checkout"],
    acceptOrdersOnline: false,
    productFeatures: ["variants"],
    needsProductCatalog: false,
    adminFeatures: ["manage catalog"],
    adminPanelType: "none" as const,
  };
  const currentStrategyInput = buildCeoStrategyInput(project, conflictingInquiry);
  project.ceoStrategy = {
    ...project.ceoStrategy!,
    sourceHash: hashCeoStrategyInput(currentStrategyInput),
  };
  const analysis = generateAnalysis(project, conflictingInquiry);
  assert.equal(analysis.conflicts.length, 3);
  assert.ok(analysis.conflicts.every((conflict) =>
    conflict.sourceRefIds.every((id) => analysis.evidence.some((evidence) => evidence.id === id))
  ));
});

test("Business Analyst validates evidence, traceability, stale approval, and clarification status transitions", () => {
  const { project, inquiry } = createApprovedContext();
  const analysis = generateAnalysis(project, inquiry);
  const missingEvidence = structuredClone(analysis);
  missingEvidence.requirements[0].sourceRefId = "forged-source";
  assert.throws(() => validateBusinessAnalysisRecord(missingEvidence, project.id), /invalid, untraceable/i);

  const overclaimedCategory = structuredClone(analysis);
  Reflect.set(overclaimedCategory.categories[0], "executionCapability", "PRODUCTION_READY");
  assert.throws(
    () => validateBusinessAnalysisRecord(overclaimedCategory, project.id),
    /overstates implementation capability/i
  );
  const incompleteCategories = structuredClone(analysis);
  incompleteCategories.categories.pop();
  assert.throws(
    () => validateBusinessAnalysisRecord(incompleteCategories, project.id),
    /category assessment is incomplete/i
  );

  const forgedTrace = structuredClone(analysis);
  forgedTrace.traceability.inquiryToRequirements[0].requirementIds = ["forged-requirement"];
  assert.throws(() => validateBusinessAnalysisRecord(forgedTrace, project.id), /forged reference/i);

  const requested = requestBusinessAnalysisClarifications(
    analysis,
    [analysis.clarifications[0].id],
    "reviewer@example.test",
    "2026-01-03T00:00:00.000Z"
  );
  assert.equal(requested.clarifications[0].status, "REQUESTED");
  assert.equal(requested.clarificationRequests[0].deliveryStatus, "RECORDED_NOT_SENT");
  assert.throws(
    () => requestBusinessAnalysisClarifications(requested, [analysis.clarifications[0].id], "reviewer@example.test"),
    /only unresolved clarification records/i
  );
  assert.throws(
    () => requestBusinessAnalysisClarifications(analysis, ["forged-clarification"], "reviewer@example.test"),
    /only unresolved clarification records/i
  );

  const approved = approveBusinessAnalysis(analysis, project, inquiry, "reviewer@example.test");
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.approval?.analysisId, approved.id);
  assert.equal(approved.approval?.sourceFingerprint, approved.sourceFingerprint);
  assert.throws(() => approveBusinessAnalysis(approved, project, inquiry, "reviewer@example.test"), /only a current, pending/i);
  assert.throws(
    () => approveBusinessAnalysis(analysis, { ...project, approvedPrice: 12000 }, inquiry, "reviewer@example.test"),
    /only a current, pending/i
  );
  assert.equal(isBusinessAnalysisCurrent(analysis, { ...project, description: "Changed scope." }, inquiry), false);
  assert.equal(isBusinessAnalysisCurrent(analysis, project, { ...inquiry, customerIntro: "New customer context." }), false);
});

test("Business Analyst can read current Agent 2 planning references without inventing task links", () => {
  const { project, inquiry } = createApprovedContext();
  const plan = buildProjectManagerPlan(project, inquiry);
  project.projectManagerPlan = approveProjectManagerPlan(plan, project.id, "pm-reviewer@example.test");
  const analysis = generateAnalysis(project, inquiry);
  assert.equal(analysis.traceability.projectManagerTasks?.planId, plan.id);
  assert.equal(analysis.traceability.projectManagerTasks?.linkageStatus, "NOT_MAPPED");
  assert.ok(analysis.traceability.projectManagerTasks?.tasks.every((task) =>
    analysis.evidence.some((item) => item.id === task.sourceRefId)
  ));
});

test("Business Analyst API enforces admin auth, server source loading, version-bound approval, and project isolation", async () => {
  const url = "http://localhost/api/admin/workforce/business-analysis";
  const unauthenticated = await POST(new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private" }),
  }));
  assert.equal(unauthenticated.status, 401);

  const previousSecret = process.env.SESSION_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalGetProject = DataStore.getProjectById;
  const originalUpdateProject = DataStore.updateProject;
  const originalGetInquiry = DataStore.getInquiryById;
  const { project: initialProject, inquiry } = createApprovedContext();
  let project = initialProject;
  DataStore.getProjectById = (id) => id === project.id ? project : undefined;
  DataStore.updateProject = (id, updates) => {
    if (id !== project.id) return null;
    project = { ...project, ...updates, updatedAt: new Date().toISOString() };
    return project;
  };
  DataStore.getInquiryById = (id) => id === inquiry.id ? inquiry : undefined;
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const token = signToken({ email: "ba-admin@example.test", timestamp: Date.now() });
    const headers = { "Content-Type": "application/json", cookie: `dwd_admin_session=${token}` };
    const forged = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        evidence: [{ id: "forged", content: "client-supplied" }],
      }),
    }));
    assert.equal(forged.status, 400);

    const privateProject = await GET(new NextRequest(`${url}?projectId=another-customer`, { headers }));
    assert.equal(privateProject.status, 409);

    const generated = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id }),
    }));
    assert.equal(generated.status, 201);
    const result = await generated.json();
    assert.equal(result.analysis.status, "AWAITING_REVIEW");

    const invalidApproval = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        analysisId: result.analysis.id,
        action: "approve",
        approvedBy: "attacker@example.test",
      }),
    }));
    assert.equal(invalidApproval.status, 400);

    const clarification = result.analysis.clarifications[0];
    const requestFollowup = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        analysisId: result.analysis.id,
        action: "request_clarification",
        clarificationIds: [clarification.id],
      }),
    }));
    assert.equal(requestFollowup.status, 200);
    assert.equal((await requestFollowup.json()).analysis.clarificationRequests[0].deliveryStatus, "RECORDED_NOT_SENT");

    const approved = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        analysisId: result.analysis.id,
        action: "approve",
      }),
    }));
    assert.equal(approved.status, 200);
    const approvedBody = await approved.json();
    assert.equal(approvedBody.analysis.status, "APPROVED");
    assert.equal(approvedBody.analysis.approval.approvedBy, "ba-admin@example.test");

    project = { ...project, description: "The approved scope was changed." };
    const staleApproval = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        analysisId: result.analysis.id,
        action: "approve",
      }),
    }));
    assert.equal(staleApproval.status, 409);
  } finally {
    DataStore.getProjectById = originalGetProject;
    DataStore.updateProject = originalUpdateProject;
    DataStore.getInquiryById = originalGetInquiry;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
