import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { signToken } from "../src/lib/auth";
import { GET, PATCH, POST } from "../src/app/api/admin/workforce/project-manager/route";
import {
  buildCeoStrategyInput,
  hashCeoStrategyInput,
  validateCeoStrategyOutput,
  type CeoStrategyFinding,
} from "../src/lib/ceo-strategy";
import {
  approveProjectManagerPlan,
  buildProjectManagerPlan,
  isProjectManagerStrategyCurrent,
  validateProjectManagerPlan,
} from "../src/lib/project-manager";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import { DataStore } from "../src/lib/store";
import type { Inquiry, Project } from "../src/lib/types";

function finding(text: string, status: CeoStrategyFinding["status"] = "RECOMMENDED"): CeoStrategyFinding {
  return { text, status, evidenceReferences: [] };
}

function createApprovedContext() {
  const project = {
    id: "project-pm-test",
    inquiryId: "DW-123456",
    clientId: "client-test",
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
    selectedFeatures: [],
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
    inspirationUrl: "",
    isNewOrUpgrade: "new",
    preferredLaunchDate: "",
    expectedBudgetRange: "Approved fixed scope",
    displayFixedOnly: false,
    needsProductCatalog: false,
    productFeatures: [],
    acceptOrdersOnline: false,
    orderFeatures: [],
    needsReviewsOrAccounts: false,
    adminPanelType: "none",
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
  const summary = finding("Review the approved scope and plan a corporate website.");
  const plan = validateCeoStrategyOutput({
    executiveSummary: summary,
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
    uiUxDirection: finding("Use a clear, accessible information hierarchy."),
    technicalArchitecture: finding("Use the existing project architecture after technical review."),
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
    assumptions: [finding("The customer will provide final approved content.")],
    unknowns: [finding("Target languages have not been recorded.", "UNKNOWN")],
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
    plan,
    approval: { approvedBy: "admin@example.test", approvedAt: "2026-01-01T00:00:00.000Z" },
  };
  return { project, inquiry };
}

test("Project Manager plans only current human-approved Agent 1 scope and keeps tasks blocked", () => {
  const { project, inquiry } = createApprovedContext();
  const plan = buildProjectManagerPlan(project, inquiry);
  assert.equal(plan.status, "AWAITING_APPROVAL");
  assert.equal(plan.sourceStrategyHash, project.ceoStrategy?.sourceHash);
  assert.ok(DWD_WORKFORCE_AGENTS.length === 50);
  assert.ok(DWD_WORKFORCE_AGENTS.some((agent) => agent.avatar === "project-manager"));
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.milestones.length, 1);
  assert.equal(plan.tasks.length, 2);
  assert.equal(plan.tasks.filter((task) => task.parentTaskId === null).length, 1);
  assert.equal(plan.tasks.every((task) =>
    task.projectId === project.id &&
    task.agentRoleId === "frontend-ui-designer" &&
    task.status === "BLOCKED" &&
    task.executionCapability === "EXECUTION_UNAVAILABLE" &&
    task.permissionRequirements.length > 0 &&
    task.humanApprovalRequirements.length > 0
  ), true);
  assert.ok(plan.risks.some((risk) => risk.status === "SYSTEM_DERIVED" && /worker/i.test(risk.description)));
  assert.equal(plan.capabilityDimensions.browserInteraction, false);
  assert.equal(plan.timeline.estimatedDuration, "UNKNOWN");
  validateProjectManagerPlan(plan, project.id);
  assert.equal(isProjectManagerStrategyCurrent(project, inquiry, plan), true);

  const approved = approveProjectManagerPlan(plan, project.id, "reviewer@example.test");
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.approval?.approvedBy, "reviewer@example.test");
  assert.ok(approved.tasks.every((task) => task.status === "BLOCKED"));
});

test("Project Manager rejects unapproved and stale strategies and malformed execution claims", () => {
  const { project, inquiry } = createApprovedContext();
  const plan = buildProjectManagerPlan(project, inquiry);

  const unapproved = { ...project, ceoStrategy: { ...project.ceoStrategy!, status: "awaiting_human_approval" as const, approval: null } };
  assert.throws(() => buildProjectManagerPlan(unapproved, inquiry), /human-approved/i);

  const changedScope = { ...project, description: "Changed after strategy approval." };
  assert.equal(isProjectManagerStrategyCurrent(changedScope, inquiry, plan), false);

  const claimsExecution = structuredClone(plan);
  claimsExecution.tasks[0].executionCapability = "EXECUTION_SUPPORTED";
  assert.throws(() => validateProjectManagerPlan(claimsExecution, project.id), /task is invalid/i);

  const missingDependency = structuredClone(plan);
  missingDependency.tasks[0].dependencies = ["missing-task"];
  assert.throws(() => validateProjectManagerPlan(missingDependency, project.id), /missing or invalid dependency/i);

  const cyclic = structuredClone(plan);
  const parentTask = cyclic.tasks.find((task) => task.parentTaskId === null)!;
  const childTask = cyclic.tasks.find((task) => task.parentTaskId === parentTask.id)!;
  parentTask.dependencies = [childTask.id];
  assert.throws(() => validateProjectManagerPlan(cyclic, project.id), /contain a cycle/i);

  assert.throws(
    () => buildProjectManagerPlan(project, { ...inquiry, convertedProjectId: "another-project" }),
    /inquiry conversion, commercial approval, or verified advance/i
  );

  const forgedApproval = structuredClone(plan);
  forgedApproval.status = "APPROVED";
  assert.throws(() => validateProjectManagerPlan(forgedApproval, project.id), /approval record/i);
});

test("Project Manager API requires admin authentication and rejects client-authored plans", async () => {
  const url = "http://localhost/api/admin/workforce/project-manager";
  const unauthenticatedGet = await GET(new NextRequest(`${url}?projectId=private`));
  const unauthenticatedPost = await POST(new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private" }),
  }));
  const unauthenticatedPatch = await PATCH(new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "private", planId: "plan-private" }),
  }));
  assert.equal(unauthenticatedGet.status, 401);
  assert.equal(unauthenticatedPost.status, 401);
  assert.equal(unauthenticatedPatch.status, 401);

  const previousSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  try {
    const token = signToken({ email: "admin@example.test", timestamp: Date.now() });
    const headers = {
      "Content-Type": "application/json",
      cookie: `dwd_admin_session=${token}`,
    };
    const clientPlan = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: "private", plan: { status: "APPROVED" } }),
    }));
    const clientApproval = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ projectId: "private", planId: "plan-private", approvedBy: "attacker" }),
    }));
    assert.equal(clientPlan.status, 400);
    assert.equal(clientApproval.status, 400);
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test("Project Manager API persists a server-generated plan, requires separate approval, and detects stale scope", async () => {
  const { project: initialProject, inquiry } = createApprovedContext();
  const originalGetProject = DataStore.getProjectById;
  const originalUpdateProject = DataStore.updateProject;
  const originalGetInquiry = DataStore.getInquiryById;
  const previousSecret = process.env.SESSION_SECRET;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    const token = signToken({ email: "planner-admin@example.test", timestamp: Date.now() });
    const headers = {
      "Content-Type": "application/json",
      cookie: `dwd_admin_session=${token}`,
    };
    const url = "http://localhost/api/admin/workforce/project-manager";
    const unapproved = {
      ...project,
      ceoStrategy: { ...project.ceoStrategy!, status: "awaiting_human_approval" as const, approval: null },
    };
    project = unapproved;
    const rejected = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id }),
    }));
    assert.equal(rejected.status, 409);
    assert.equal(project.projectManagerPlan, undefined);

    project = initialProject;
    const generated = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId: project.id }),
    }));
    assert.equal(generated.status, 201);
    const generatedBody = await generated.json();
    assert.equal(generatedBody.plan.status, "AWAITING_APPROVAL");
    assert.equal(project.projectManagerPlan?.status, "AWAITING_APPROVAL");
    const jsonRoundTrip = JSON.parse(JSON.stringify(project.projectManagerPlan));
    validateProjectManagerPlan(jsonRoundTrip, project.id);

    const approved = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ projectId: project.id, planId: project.projectManagerPlan?.id }),
    }));
    assert.equal(approved.status, 200);
    assert.equal(project.projectManagerPlan?.status, "APPROVED");
    assert.equal(project.projectManagerPlan?.approval?.approvedBy, "planner-admin@example.test");
    assert.ok(project.projectManagerPlan?.tasks.every((task) => task.status === "BLOCKED"));

    project = { ...project, description: "Scope changed after plan approval." };
    const stale = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ projectId: project.id, planId: project.projectManagerPlan?.id }),
    }));
    assert.equal(stale.status, 409);
    const current = await GET(new NextRequest(`${url}?projectId=${project.id}`, { headers }));
    assert.equal(current.status, 200);
    assert.equal((await current.json()).current, false);
  } finally {
    DataStore.getProjectById = originalGetProject;
    DataStore.updateProject = originalUpdateProject;
    DataStore.getInquiryById = originalGetInquiry;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousSupabaseKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseKey;
  }
});
