import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "../src/app/api/admin/workforce/client-onboarding/route";
import { signToken } from "../src/lib/auth";
import {
  analyzeBusinessRequirements,
  approveBusinessAnalysis,
  buildBusinessAnalysisInput,
} from "../src/lib/business-analysis";
import {
  assessClientOnboarding,
  buildClientOnboardingAssessment,
  CLIENT_ONBOARDING_AGENT_ID,
  CLIENT_ONBOARDING_CATEGORIES,
  isClientOnboardingCurrent,
  ONBOARDING_NOTIFICATION_TEMPLATES,
  recordOnboardingClarificationResponse,
  reviewClientOnboardingAssessment,
  validateClientOnboardingRecord,
  type VerifiedPaymentReference,
} from "../src/lib/client-onboarding";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  validateCeoStrategyOutput,
  type CeoStrategyFinding,
} from "../src/lib/ceo-strategy";
import {
  approveProposal,
  buildProposalInput,
  generateProposalDraft,
  reviewProposal,
} from "../src/lib/proposal-writer";
import { DataStore } from "../src/lib/store";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import type { Inquiry, PaymentRecord, Project } from "../src/lib/types";

function finding(text: string, status: CeoStrategyFinding["status"] = "RECOMMENDED"): CeoStrategyFinding {
  return { text, status, evidenceReferences: [] };
}

function createApprovedContext() {
  const project = {
    id: "project-onboarding-test",
    inquiryId: "DW-807531",
    clientId: "client-onboarding",
    clientName: "Example Customer",
    clientEmail: "customer@example.test",
    clientPhone: "+923001234567",
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
    id: "DW-807531",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "Approved",
    convertedProjectId: project.id,
    customerName: "Example Customer",
    businessName: "Example Business",
    email: "customer@example.test",
    phone: "+923001234567",
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
      basePrice: 10000,
      adminFee: 0,
      addonsTotal: 0,
      selectedAddonDetails: [],
      monthlyAddonTotal: 0,
      contingencyAmount: 0,
      estimatedTotal: 10000,
      advanceAmount: 2000,
      remainingBalance: 8000,
      installmentsCount: 0,
      regularInstallment: 0,
      finalInstallment: 0,
      dailyCost: 0,
    },
    disclaimerAccepted: true,
  } as Inquiry;

  const strategyInput = buildCeoStrategyInput(project, inquiry);
  const strategyPlan = validateCeoStrategyOutput({
    executiveSummary: finding("Prepare an onboarding readiness assessment from approved records."),
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
    technicalArchitecture: finding("Review architecture before implementation."),
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
    approval: { approvedBy: "strategy-admin@example.test", approvedAt: "2026-01-01T00:00:00.000Z" },
  };
  const analysis = analyzeBusinessRequirements(
    buildBusinessAnalysisInput(project, inquiry),
    "2026-01-02T00:00:00.000Z"
  );
  project.businessAnalysis = approveBusinessAnalysis(
    analysis,
    project,
    inquiry,
    "analysis-admin@example.test",
    "2026-01-03T00:00:00.000Z"
  );
  let proposal = generateProposalDraft(buildProposalInput(project, inquiry), 1, "2026-01-04T00:00:00.000Z");
  proposal = reviewProposal(proposal, project, inquiry, "proposal-reviewer@example.test", "2026-01-05T00:00:00.000Z");
  project.proposal = approveProposal(proposal, project, inquiry, "proposal-approver@example.test", true, "2026-01-06T00:00:00.000Z");
  const verifiedPayments: VerifiedPaymentReference[] = [{
    id: "verified-payment-1",
    amount: 2000,
    verifiedAt: "2026-01-01T12:00:00.000Z",
  }];
  return { project, inquiry, verifiedPayments };
}

test("Agent 5 resolves to the existing role and preserves the 50-agent registry", () => {
  assert.equal(DWD_WORKFORCE_AGENTS.length, 50);
  const role = DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === CLIENT_ONBOARDING_AGENT_ID);
  assert.equal(CLIENT_ONBOARDING_AGENT_ID, "client-onboarding-agent");
  assert.equal(role?.role, "Client Onboarding Agent");
  assert.equal(CLIENT_ONBOARDING_CATEGORIES.length, 15);
});

test("Onboarding eligibility requires real acceptance and agreement records beyond Agent 4 approval", () => {
  const context = createApprovedContext();
  const result = assessClientOnboarding(context);
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.some((item) => /customer acceptance evidence is not represented/i.test(item)));
  assert.ok(result.blockers.some((item) => /agreement\/contract applicability/i.test(item)));
  assert.ok(!result.blockers.some((item) => /verified payment references/i.test(item)));

  const withoutPayment = assessClientOnboarding({ ...context, verifiedPayments: [] });
  assert.ok(withoutPayment.blockers.some((item) => /verified payment references/i.test(item)));
  const mismatched = assessClientOnboarding({
    ...context,
    inquiry: { ...context.inquiry, convertedProjectId: "different-project" },
  });
  assert.ok(mismatched.blockers.some((item) => /association is missing or mismatched/i.test(item)));
  assert.ok(mismatched.blockers.some((item) => /Agent 4 proposal is stale/i.test(item)));
});

test("Category questionnaire follows approved project category and preserves requirements as references", () => {
  const context = createApprovedContext();
  const record = buildClientOnboardingAssessment(context, "2026-01-07T00:00:00.000Z");
  validateClientOnboardingRecord(record, context.project.id);
  assert.equal(record.status, "BLOCKED");
  assert.equal(record.handoff.status, "BLOCKED");
  assert.equal(record.project.category, "Corporate websites");
  assert.ok(record.questionnaire.some((item) => /corporate content/i.test(item.question)));
  assert.ok(record.questionnaire.every((item) => item.response === null));
  assert.equal(record.customerAssets.capability, "UNAVAILABLE");
  assert.equal(record.customerAssets.items.length, 0);
  assert.equal(record.customerAcceptance.evidenceReference, null);
  assert.equal(record.agreement.evidenceReference, null);
  assert.equal(record.paymentVerification.status, "VERIFIED");
  assert.ok(record.handoff.blockers.some((item) => /customer acceptance/i.test(item)));
  assert.ok(!record.handoff.blockers.some((item) => /Agent 4 proposal is stale/i.test(item)));

  const unknownCategory = buildClientOnboardingAssessment({
    ...context,
    project: { ...context.project, category: "unrecognized project type" },
    inquiry: { ...context.inquiry, projectTypes: ["special unknown"] },
  });
  assert.equal(unknownCategory.project.category, "UNCLASSIFIED");
  assert.equal(unknownCategory.questionnaire.length, 0);
  assert.ok(unknownCategory.handoff.blockers.some((item) => /category is not supported/i.test(item)));
});

test("Clarification responses stay admin-transcribed and scope changes require separate review", () => {
  const context = createApprovedContext();
  const base = buildClientOnboardingAssessment(context, "2026-01-07T00:00:00.000Z");
  const hypotheticalDraft = { ...base, status: "DRAFT" as const };
  const question = hypotheticalDraft.questionnaire[0];
  const response = recordOnboardingClarificationResponse(
    hypotheticalDraft,
    question.id,
    "Please add an unpriced payment integration.",
    "admin@example.test",
    true,
    "2026-01-08T00:00:00.000Z"
  );
  assert.equal(response.status, "AWAITING_ADMIN_REVIEW");
  assert.equal(response.questionnaire[0].status, "SCOPE_CHANGE_REVIEW_REQUIRED");
  assert.equal(response.questionnaire[0].response?.source, "ADMIN_TRANSCRIPTION");
  assert.equal(response.questionnaire[0].response?.scopeChangeReviewRequired, true);
  assert.equal(response.questionnaire[0].resolutionHistory.length, 1);
  assert.ok(response.auditHistory.at(-1)?.details.includes("no approved scope was changed"));
  assert.throws(
    () => recordOnboardingClarificationResponse(base, question.id, "response", "admin@example.test", false),
    /while onboarding is blocked/i
  );
});

test("Admin review cannot claim onboarding completion, customer acceptance, agreement, or assets", () => {
  const context = createApprovedContext();
  const base = buildClientOnboardingAssessment(context, "2026-01-07T00:00:00.000Z");
  const reviewed = reviewClientOnboardingAssessment(base, "admin@example.test", "2026-01-08T00:00:00.000Z");
  assert.equal(reviewed.status, "BLOCKED");
  assert.equal(reviewed.handoff.status, "BLOCKED");
  assert.equal(reviewed.humanReview?.reviewedBy, "admin@example.test");
  assert.throws(() => validateClientOnboardingRecord({
    ...reviewed,
    status: "APPROVED",
    handoff: { ...reviewed.handoff, status: "READY", blockers: [] },
  }, context.project.id), /cannot authorize onboarding completion/i);
  assert.throws(() => validateClientOnboardingRecord({
    ...base,
    customerAssets: {
      capability: "UNAVAILABLE",
      items: [{
        id: "untrusted",
        fileName: "asset.pdf",
        mimeType: "application/pdf",
        size: 100,
        storageReference: "public://example",
        reviewStatus: "PENDING",
      }],
    },
  }, context.project.id), /malformed/i);
});

test("Stale Agent 1–4 sources invalidate onboarding and do not modify those records", () => {
  const context = createApprovedContext();
  const record = buildClientOnboardingAssessment(context, "2026-01-07T00:00:00.000Z");
  assert.equal(isClientOnboardingCurrent(record, context), true);
  assert.equal(isClientOnboardingCurrent(record, {
    ...context,
    project: { ...context.project, description: "Changed after proposal approval." },
  }), false);
  assert.equal(
    record.sourceFingerprints.strategy,
    createHash("sha256").update(JSON.stringify(context.project.ceoStrategy)).digest("hex")
  );
  assert.equal(record.handoff.references.agent3Analysis, `${context.project.id}:agent-3:${context.project.businessAnalysis?.id}`);
  assert.equal(record.handoff.references.agent4Proposal, `${context.project.id}:agent-4:${context.project.proposal?.id}`);
});

test("Onboarding API is admin-only, project-scoped, forged-field resistant, and records blocked assessment only", async () => {
  const url = "http://localhost/api/admin/workforce/client-onboarding";
  const unauthenticatedRead = await GET(new NextRequest(`${url}?projectId=private`));
  assert.equal(unauthenticatedRead.status, 401);
  const unauthenticatedWrite = await POST(new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private", action: "prepare_assessment" }),
  }));
  assert.equal(unauthenticatedWrite.status, 401);
  const unauthenticatedReview = await PATCH(new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private", recordId: "fake", action: "review" }),
  }));
  assert.equal(unauthenticatedReview.status, 401);

  const previousSecret = process.env.SESSION_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalGetProject = DataStore.getProjectById;
  const originalUpdateProject = DataStore.updateProject;
  const originalGetInquiry = DataStore.getInquiryById;
  const originalGetPayments = DataStore.getPayments;
  const context = createApprovedContext();
  let project = context.project;
  const originalStrategy = project.ceoStrategy;
  const originalAnalysis = project.businessAnalysis;
  const originalProposal = project.proposal;
  DataStore.getProjectById = (id) => id === project.id ? project : undefined;
  DataStore.updateProject = (id, updates) => {
    if (id !== project.id) return null;
    project = { ...project, ...updates, updatedAt: new Date().toISOString() };
    return project;
  };
  DataStore.getInquiryById = (id) => id === context.inquiry.id ? context.inquiry : undefined;
  DataStore.getPayments = () => [{
    id: "verified-payment-1",
    projectId: project.id,
    projectName: project.name,
    clientId: project.clientId,
    clientName: project.clientName,
    amount: 2000,
    method: "Bank Transfer",
    transactionRef: "tx-onboarding",
    paymentDate: "2026-01-01T12:00:00.000Z",
    status: "Paid",
    verifiedByAdmin: true,
    adminNotes: "Verified bank record",
    createdAt: "2026-01-01T12:00:00.000Z",
  } as PaymentRecord];
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const token = signToken({ email: "onboarding-admin@example.test", timestamp: Date.now() });
    const headers = { "Content-Type": "application/json", cookie: `dwd_admin_session=${token}` };
    const crossProject = await GET(new NextRequest(`${url}?projectId=another-customer`, { headers }));
    assert.equal(crossProject.status, 409);

    const forged = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        action: "prepare_assessment",
        customerAcceptance: { status: "ACCEPTED", approvedBy: "customer" },
        paymentVerified: true,
      }),
    }));
    assert.equal(forged.status, 400);

    const generated = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id, action: "prepare_assessment" }),
    }));
    assert.equal(generated.status, 201);
    const result = await generated.json();
    assert.equal(result.record.status, "BLOCKED");
    assert.ok(result.blockers.some((item: string) => /customer acceptance/i.test(item)));
    assert.equal(project.ceoStrategy, originalStrategy);
    assert.equal(project.businessAnalysis, originalAnalysis);
    assert.equal(project.proposal, originalProposal);

    const reviewed = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ projectId: project.id, recordId: result.record.id, action: "review" }),
    }));
    assert.equal(reviewed.status, 200);
    const reviewedBody = await reviewed.json();
    assert.equal(reviewedBody.record.status, "BLOCKED");

    const getResponse = await GET(new NextRequest(`${url}?projectId=${project.id}`, { headers }));
    assert.equal(getResponse.status, 200);
    const body = await getResponse.json();
    assert.equal(body.customerAuthenticationAvailable, false);
    assert.equal(body.secureProjectAssetUploadAvailable, false);
    assert.equal(body.customerAcceptanceEvidenceAvailable, false);
    assert.equal(body.record.humanReview.reviewedBy, "onboarding-admin@example.test");
  } finally {
    DataStore.getProjectById = originalGetProject;
    DataStore.updateProject = originalUpdateProject;
    DataStore.getInquiryById = originalGetInquiry;
    DataStore.getPayments = originalGetPayments;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("Onboarding notification templates are prepared but are never sent by Agent 5", () => {
  const templates = Object.values(ONBOARDING_NOTIFICATION_TEMPLATES);
  assert.equal(templates.length, 6);
  assert.ok(templates.every((template) => template.status === "PREPARED_NOT_SENT"));
  assert.ok(templates.every((template) => !/project development has started/i.test(template.text)));
});
