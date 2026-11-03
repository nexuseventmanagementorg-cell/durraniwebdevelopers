import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "../src/app/api/admin/workforce/proposal/route";
import { signToken } from "../src/lib/auth";
import {
  analyzeBusinessRequirements,
  approveBusinessAnalysis,
  buildBusinessAnalysisInput,
} from "../src/lib/business-analysis";
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
  isProposalCurrent,
  reviewProposal,
  validateProposalRecord,
} from "../src/lib/proposal-writer";
import { DataStore } from "../src/lib/store";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import type { Inquiry, Project } from "../src/lib/types";

function finding(text: string, status: CeoStrategyFinding["status"] = "RECOMMENDED"): CeoStrategyFinding {
  return { text, status, evidenceReferences: [] };
}

function createApprovedContext() {
  const project = {
    id: "project-proposal-test",
    inquiryId: "DW-654321",
    clientId: "client-proposal",
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
    id: "DW-654321",
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
    executiveSummary: finding("Prepare a reviewable website proposal from approved sources."),
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
    acceptanceCriteria: [finding("The proposal matches approved project scope.")],
    riskRegister: [{
      risk: finding("Requirements may need further clarification."),
      likelihood: "UNKNOWN",
      impact: "MEDIUM",
      mitigation: finding("Confirm unknown requirements before implementation."),
    }],
    assumptions: [finding("The customer will provide final approved content.", "ASSUMED")],
    unknowns: [finding("Website languages are not recorded.", "UNKNOWN")],
    commercialConsiderations: [finding("The approved price and advance are recorded.")],
    humanApprovalRequirements: [finding("A human must approve this proposal before customer review.")],
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
  return { project, inquiry };
}

test("Proposal Writer uses the existing registry role and only server-validated sources", () => {
  assert.equal(DWD_WORKFORCE_AGENTS.length, 50);
  assert.equal(DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === "proposal-writer")?.role, "Proposal Writer");
  const { project, inquiry } = createApprovedContext();
  const input = buildProposalInput(project, inquiry);
  const proposal = generateProposalDraft(input, 1, "2026-01-04T00:00:00.000Z");
  validateProposalRecord(proposal, project.id);
  assert.equal(proposal.proposalType, "Corporate Website");
  assert.equal(proposal.customerMarket, "PAKISTAN");
  assert.equal(proposal.currency, "PKR");
  assert.equal(proposal.commercialBreakdown.approvedProjectFee, 10000);
  assert.equal(proposal.deliverables[0].evidenceClassification, "NOT_AVAILABLE");
  assert.equal(proposal.deliverables[0].requirementMappingStatus, "NOT_MAPPED");
  assert.ok(proposal.pendingClarifications.length > 0);
  assert.ok(proposal.sourceReferences.some((source) => source.sourcePath === "project.approvedPrice"));
  assert.ok(proposal.sourceReferences.every((source) => source.id.startsWith("proposal-source-")));
  assert.equal(isProposalCurrent(proposal, project, inquiry), true);
  assert.equal(isProposalCurrent(proposal, { ...project, name: "Renamed approved project" }, inquiry), false);

  assert.throws(
    () => buildProposalInput(project, { ...inquiry, convertedProjectId: "another-project" }),
    /matching approved inquiry conversion/i
  );
  assert.throws(
    () => buildProposalInput({ ...project, businessAnalysis: { ...project.businessAnalysis!, status: "AWAITING_REVIEW", approval: null } }, inquiry),
    /separately human-approved Business Analyst/i
  );
});

test("Proposal review and approval are distinct, content-bound, and require explicit open-item acknowledgement", () => {
  const { project, inquiry } = createApprovedContext();
  const draft = generateProposalDraft(buildProposalInput(project, inquiry), 1, "2026-01-04T00:00:00.000Z");
  const reviewed = reviewProposal(draft, project, inquiry, "reviewer@example.test", "2026-01-05T00:00:00.000Z");
  assert.equal(reviewed.status, "ADMIN_REVIEW_REQUIRED");
  assert.throws(
    () => approveProposal(reviewed, project, inquiry, "approver@example.test", false),
    /acknowledged open items/i
  );
  const approved = approveProposal(reviewed, project, inquiry, "approver@example.test", true, "2026-01-06T00:00:00.000Z");
  assert.equal(approved.status, "APPROVED_FOR_CUSTOMER");
  assert.equal(approved.approval?.openItemsAcknowledged, true);
  validateProposalRecord(approved, project.id);

  const tampered = structuredClone(reviewed);
  tampered.proposedSolution.text = "Changed after human review.";
  assert.throws(() => approveProposal(tampered, project, inquiry, "approver@example.test", true), /saved proposal is malformed|review record is invalid/i);
  assert.throws(
    () => approveProposal(reviewed, { ...project, description: "Changed authorized scope." }, inquiry, "approver@example.test", true),
    /current, separately reviewed proposal/i
  );
});

test("Proposal API enforces admin auth, rejects client-authored content, and preserves bounded versions", async () => {
  const url = "http://localhost/api/admin/workforce/proposal";
  const unauthenticated = await POST(new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private" }),
  }));
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedRead = await GET(new NextRequest(`${url}?projectId=private`));
  assert.equal(unauthenticatedRead.status, 401);
  const unauthenticatedReview = await PATCH(new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private", proposalId: "proposal-private", action: "review" }),
  }));
  assert.equal(unauthenticatedReview.status, 401);

  const previousSecret = process.env.SESSION_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalGetProject = DataStore.getProjectById;
  const originalUpdateProject = DataStore.updateProject;
  const originalGetInquiry = DataStore.getInquiryById;
  const context = createApprovedContext();
  let project = context.project;
  DataStore.getProjectById = (id) => id === project.id ? project : undefined;
  DataStore.updateProject = (id, updates) => {
    if (id !== project.id) return null;
    project = { ...project, ...updates, updatedAt: new Date().toISOString() };
    return project;
  };
  DataStore.getInquiryById = (id) => id === context.inquiry.id ? context.inquiry : undefined;
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const token = signToken({ email: "proposal-admin@example.test", timestamp: Date.now() });
    const headers = { "Content-Type": "application/json", cookie: `dwd_admin_session=${token}` };
    const forged = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        proposal: { status: "APPROVED_FOR_CUSTOMER", customerRequirements: ["forged"] },
      }),
    }));
    assert.equal(forged.status, 400);

    const isolated = await GET(new NextRequest(`${url}?projectId=another-customer`, { headers }));
    assert.equal(isolated.status, 409);

    const first = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id }),
    }));
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.proposal.version, 1);

    const second = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id }),
    }));
    assert.equal(second.status, 201);
    const secondBody = await second.json();
    assert.equal(secondBody.proposal.version, 2);
    assert.equal(project.proposalHistory?.length, 1);
    assert.equal(project.proposalHistory?.[0].id, firstBody.proposal.id);
    let latestProposal = secondBody.proposal;
    for (let index = 0; index < 20; index += 1) {
      const generated = await POST(new NextRequest(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId: project.id }),
      }));
      assert.equal(generated.status, 201);
      latestProposal = (await generated.json()).proposal;
    }
    assert.equal(latestProposal.version, 22);
    assert.equal(project.proposalHistory?.length, 19);
    assert.equal(project.proposalHistory?.[0].version, 3);

    const forgedReviewer = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        proposalId: latestProposal.id,
        action: "approve",
        openItemsAcknowledged: true,
        approvedBy: "attacker@example.test",
      }),
    }));
    assert.equal(forgedReviewer.status, 400);

    const approveBeforeReview = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        proposalId: latestProposal.id,
        action: "approve",
        openItemsAcknowledged: true,
      }),
    }));
    assert.equal(approveBeforeReview.status, 409);

    const review = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        proposalId: latestProposal.id,
        action: "review",
      }),
    }));
    assert.equal(review.status, 200);
    const reviewedBody = await review.json();
    assert.equal(reviewedBody.proposal.review.reviewedBy, "proposal-admin@example.test");

    const approved = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        projectId: project.id,
        proposalId: latestProposal.id,
        action: "approve",
        openItemsAcknowledged: true,
      }),
    }));
    assert.equal(approved.status, 200);
    const approvedBody = await approved.json();
    assert.equal(approvedBody.proposal.status, "APPROVED_FOR_CUSTOMER");
    assert.equal(approvedBody.proposal.approval.approvedBy, "proposal-admin@example.test");
    assert.equal(approvedBody.proposal.status === "SENT_TO_CUSTOMER", false);
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
