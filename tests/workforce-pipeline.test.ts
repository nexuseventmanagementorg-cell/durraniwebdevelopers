import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import test from "node:test";
import {
  generateWorkforceAgentBrief,
  generateTemplateConcepts,
  listOllamaModels,
  selectDailyConceptTargets,
} from "../src/lib/ollama-provider";
import { generateWorkforceTemplateArtifacts } from "../src/lib/workforce-template-generator";
import type { WorkforceBatch } from "../src/lib/workforce-pipeline";
import { getWorkforceRoleRegistry } from "../src/lib/workforce-pipeline";
import { readAgentReadiness, setAgentReadiness } from "../src/lib/workforce-agent-readiness";
import {
  CEO_STRATEGY_CATEGORIES,
  hasUnreviewedCeoStrategyClaims,
  isCeoStrategyProjectApproved,
  isCeoStrategyAwaitingApproval,
  sanitizeCeoStrategyForReview,
  validateCeoStrategyInput,
  validateCeoStrategyOutput,
  type CeoStrategyFinding,
  type CeoStrategyInput,
} from "../src/lib/ceo-strategy";
import { isFinalProjectDeliveryStatus } from "../src/lib/project-workflow";

const strategyInput: CeoStrategyInput = {
  projectId: "project-test",
  inquiryId: "DW-123456",
  evidence: [{
    referenceId: "project.description",
    label: "Approved scope",
    content: "A corporate website for an established organization.",
    status: "VERIFIED",
  }],
  missingInformation: ["Website target languages", "Authorized customer attachments"],
};

function strategyFinding(
  text: string,
  status: CeoStrategyFinding["status"] = "RECOMMENDED",
  evidenceReferences: string[] = []
): CeoStrategyFinding {
  return { text, status, evidenceReferences };
}

function validCeoStrategyOutput() {
  const finding = strategyFinding("Review the proposed project scope.");
  return {
    executiveSummary: finding,
    businessObjectives: [finding],
    targetAudience: finding,
    classification: {
      primaryCategory: "corporate_business_website",
      relatedCategories: ["landing_page"],
      rationale: finding,
    },
    scopeAndExclusions: {
      scope: [strategyFinding("Review the approved website scope.")],
      exclusions: [strategyFinding("No approved exclusions are recorded.", "UNKNOWN")],
    },
    functionalRequirements: [finding],
    uiUxDirection: finding,
    technicalArchitecture: finding,
    requiredIntegrations: [{ name: "None identified", rationale: finding }],
    projectPhases: [{
      title: "Plan approved scope",
      outcome: finding,
      taskAssignmentIds: ["frontend-ui-designer"] as string[],
    }],
    specialistAssignments: [{
      projectId: "model-supplied-value-is-ignored",
      agentRoleId: "frontend-ui-designer",
      agentRole: "Frontend UI Designer",
      taskTitle: "Prepare design direction",
      instructions: "Review the approved project description and recommend an interface direction.",
      requiredInputs: ["Approved project description"],
      expectedOutputs: ["Reviewable interface recommendation"],
      acceptanceCriteria: ["Recommendation cites approved scope"],
      dependencies: [] as string[],
      permissionRequirements: ["arbitrary"],
      humanApprovalRequirements: ["arbitrary"],
      status: "COMPLETED",
      blocker: "model-supplied blocker is ignored",
    }],
    acceptanceCriteria: [finding],
    riskRegister: [{
      risk: finding,
      likelihood: "UNKNOWN",
      impact: "MEDIUM",
      mitigation: finding,
    }],
    assumptions: [strategyFinding("Delivery dates may depend on customer content readiness.", "ASSUMED")],
    unknowns: [strategyFinding("Target languages are not provided.", "UNKNOWN")],
    commercialConsiderations: [finding],
    humanApprovalRequirements: [finding],
    implementationBlockers: [],
  };
}

test("CEO strategy contract keeps missing requirements explicit and blocks execution claims", () => {
  const plan = validateCeoStrategyOutput(validCeoStrategyOutput(), strategyInput);
  assert.deepEqual(plan.unknowns.map((item) => item.text), ["Target languages are not provided."]);
  assert.equal(plan.specialistAssignments[0].projectId, strategyInput.projectId);
  assert.equal(plan.specialistAssignments[0].status, "BLOCKED");
  assert.match(plan.specialistAssignments[0].blocker, /no approved customer-project worker adapter/i);
  assert.deepEqual(plan.specialistAssignments[0].permissionRequirements, [
    "No filesystem or terminal access is granted by this assignment.",
  ]);
  assert.equal(plan.classification.capabilityCoverage.length, CEO_STRATEGY_CATEGORIES.length);
  assert.ok(plan.classification.capabilityCoverage.every((item) =>
    item.capabilities &&
    Object.values(item.capabilities).every((available) => available === false) &&
    Boolean(item.blocker)
  ));
});

test("CEO strategy validation rejects malformed evidence, unregistered roles, and dependency cycles", () => {
  assert.throws(() => validateCeoStrategyInput({
    ...strategyInput,
    evidence: [{ ...strategyInput.evidence[0], content: "invalid customer evidence: token=secret" }],
  }), /private contact or credential data/);
  assert.throws(() => validateCeoStrategyInput({
    ...strategyInput,
    missingInformation: [" ".repeat(2)],
  }), /missing-information list is invalid/);

  const unregistered = validCeoStrategyOutput();
  unregistered.specialistAssignments[0].agentRoleId = "unknown-role";
  unregistered.specialistAssignments[0].agentRole = "Unknown Role";
  assert.throws(() => validateCeoStrategyOutput(unregistered, strategyInput), /outside the DWD workforce registry/);

  const cyclic = validCeoStrategyOutput();
  cyclic.specialistAssignments.push({
    ...cyclic.specialistAssignments[0],
    agentRoleId: "backend-architect",
    agentRole: "Backend Architect",
    dependencies: ["frontend-ui-designer"],
  });
  cyclic.specialistAssignments[0].dependencies = ["backend-architect"];
  cyclic.projectPhases[0].taskAssignmentIds.push("backend-architect");
  assert.throws(() => validateCeoStrategyOutput(cyclic, strategyInput), /contain a cycle/);

  const unsupportedVerification = validCeoStrategyOutput();
  unsupportedVerification.executiveSummary = strategyFinding(
    "The customer project has been completed.",
    "COMPLETED"
  );
  assert.throws(() => validateCeoStrategyOutput(unsupportedVerification, strategyInput), /cannot be model-verified or marked completed/);

  const modelVerified = validCeoStrategyOutput();
  modelVerified.executiveSummary = strategyFinding("The evidence proves a claim.", "VERIFIED", ["project.description"]);
  assert.throws(() => validateCeoStrategyOutput(modelVerified, strategyInput), /cannot be model-verified/);

  const unsupportedEvidence = validCeoStrategyOutput();
  unsupportedEvidence.executiveSummary = strategyFinding("This is established by an unverified source.", "MODEL_INFERENCE", ["project.description"]);
  assert.throws(() => validateCeoStrategyOutput(unsupportedEvidence, {
    ...strategyInput,
    evidence: [{ ...strategyInput.evidence[0], status: "UNKNOWN" }],
  }), /evidence that is not verified/);

  const unsupportedCategory = validCeoStrategyOutput();
  unsupportedCategory.classification.primaryCategory = "unsupported_category";
  assert.throws(() => validateCeoStrategyOutput(unsupportedCategory, strategyInput), /website category is invalid/);
});

test("CEO strategy rejects empty mandatory sections and reports all categories unavailable", () => {
  const emptyObjectives = validCeoStrategyOutput();
  emptyObjectives.businessObjectives = [];
  assert.throws(() => validateCeoStrategyOutput(emptyObjectives, strategyInput), /business objectives list must contain substantive content/);

  const emptyScope = validCeoStrategyOutput();
  emptyScope.scopeAndExclusions.scope = [];
  assert.throws(() => validateCeoStrategyOutput(emptyScope, strategyInput), /scope list must contain substantive content/);

  const emptyRiskRegister = validCeoStrategyOutput();
  emptyRiskRegister.riskRegister = [];
  assert.throws(() => validateCeoStrategyOutput(emptyRiskRegister, strategyInput), /scope, integrations, phases, or risk register is invalid/);

  const emptyAssumptions = validCeoStrategyOutput();
  emptyAssumptions.assumptions = [];
  assert.throws(() => validateCeoStrategyOutput(emptyAssumptions, strategyInput), /assumptions list must contain substantive content/);

  const emptyApprovals = validCeoStrategyOutput();
  emptyApprovals.humanApprovalRequirements = [];
  assert.throws(() => validateCeoStrategyOutput(emptyApprovals, strategyInput), /human approval requirements list must contain substantive content/);

  const emptyAssignments = validCeoStrategyOutput();
  emptyAssignments.specialistAssignments = [];
  assert.throws(() => validateCeoStrategyOutput(emptyAssignments, strategyInput), /specialist assignments are invalid/);

  const plan = validateCeoStrategyOutput(validCeoStrategyOutput(), strategyInput);
  assert.ok(plan.classification.capabilityCoverage.every((category) =>
    Object.values(category.capabilities || {}).every((available) => available === false)
  ));

  const legacyStrategy = {
    plan: {
      executiveSummary: strategyFinding("Old model claim.", "VERIFIED", ["project.description"]),
      evidenceReferences: [{ ...strategyInput.evidence[0] }],
    },
  };
  assert.equal(hasUnreviewedCeoStrategyClaims(legacyStrategy.plan), true);
  assert.deepEqual(sanitizeCeoStrategyForReview(legacyStrategy), {
    plan: {
      executiveSummary: {
        text: "Old model claim.",
        status: "HUMAN_REVIEW_REQUIRED",
        evidenceReferences: ["project.description"],
      },
      evidenceReferences: [{ ...strategyInput.evidence[0] }],
    },
  });
});

test("final project delivery statuses require a separate verified delivery path", () => {
  assert.equal(isFinalProjectDeliveryStatus("Delivered"), true);
  assert.equal(isFinalProjectDeliveryStatus("Completed"), true);
  assert.equal(isFinalProjectDeliveryStatus("Pending Delivery Review"), false);
  assert.equal(isFinalProjectDeliveryStatus("Testing"), false);
});

test("CEO strategy eligibility requires an approved conversion, scope, and verified advance", () => {
  const project = {
    id: "project-test",
    inquiryId: "DW-123456",
    status: "Approved" as const,
    approvedPrice: 100_000,
    advanceRequired: 25_000,
    advanceReceived: 25_000,
  };
  const inquiry = {
    id: "DW-123456",
    convertedProjectId: "project-test",
    status: "Approved" as const,
  };
  assert.equal(isCeoStrategyProjectApproved(project, inquiry), true);
  assert.equal(isCeoStrategyProjectApproved(project, { ...inquiry, convertedProjectId: undefined }), false);
  assert.equal(isCeoStrategyProjectApproved(project, { ...inquiry, status: "Under Review" }), false);
  assert.equal(isCeoStrategyProjectApproved({ ...project, advanceReceived: 24_999 }, inquiry), false);
  assert.equal(isCeoStrategyProjectApproved({ ...project, approvedPrice: 0 }, inquiry), false);
  assert.equal(isCeoStrategyAwaitingApproval({
    status: "awaiting_human_approval",
    approval: null,
  }), true);
  assert.equal(isCeoStrategyAwaitingApproval({
    status: "approved",
    approval: { approvedBy: "admin@example.invalid", approvedAt: "2026-10-30T00:00:00.000Z" },
  }), false);
});

test("daily target selection is deterministic and rotates five distinct categories", () => {
  const first = selectDailyConceptTargets("2026-10-28");
  const repeated = selectDailyConceptTargets("2026-10-28");
  const nextDay = selectDailyConceptTargets("2026-10-29");
  assert.deepEqual(first, repeated);
  assert.equal(first.length, 5);
  assert.equal(new Set(first.map((target) => target.categoryId)).size, 5);
  assert.ok(first.every((target) => target.businessTypeId));
  assert.notDeepEqual(first, nextDay);
});

test("Ollama model discovery validates and exposes installed model names", async () => {
  const models = await listOllamaModels(async () => new Response(JSON.stringify({
    models: [{ name: "test-model:latest", size: 1024, modified_at: "2026-10-28T00:00:00Z" }],
  }), { status: 200 }));
  assert.deepEqual(models, [{
    name: "test-model:latest",
    size: 1024,
    modifiedAt: "2026-10-28T00:00:00Z",
  }]);
});

test("Ollama concept response is schema-validated against the selected five business types", async () => {
  const targets = selectDailyConceptTargets("2026-10-28");
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    const concepts = targets.map((target, index) => ({
      businessTypeId: target.businessTypeId,
      name: `Concept ${index + 1}`,
      slug: `concept-${index + 1}`,
      tagline: `A distinct concept ${index + 1}.`,
      audience: target.businessTypeLabel,
      description: `A useful ${target.businessTypeLabel.toLowerCase()} website concept.`,
      offerings: ["Consultation", "Service plans", "Customer support"],
    }));
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ concepts }) } }), { status: 200 });
  };
  const concepts = await generateTemplateConcepts("test-model:latest", targets, { fetcher });
  assert.equal(concepts.length, 5);
  assert.deepEqual(concepts.map((concept) => concept.businessTypeId), targets.map((target) => target.businessTypeId));
  assert.match(calls[0].url, /\/api\/chat$/);
  assert.equal(calls[0].body.model, "test-model:latest");
});

test("local role agents produce validated, role-specific briefs without external actions", async () => {
  const targets = selectDailyConceptTargets("2026-10-28");
  const concepts = targets.map((target, index) => ({
    businessTypeId: target.businessTypeId,
    name: `Concept ${index + 1}`,
    slug: `concept-${index + 1}`,
    tagline: `A distinct concept ${index + 1}.`,
    audience: target.businessTypeLabel,
    description: `A useful ${target.businessTypeLabel.toLowerCase()} website concept.`,
    offerings: ["Consultation", "Service plans", "Customer support"],
  }));
  let prompt = "";
  const brief = await generateWorkforceAgentBrief("test-model:latest", {
    id: "sales-lead-finder",
    role: "Sales Lead Finder",
    task: "Researching opportunities",
  }, concepts, {
    fetcher: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      prompt = body.messages.map((message) => message.content).join("\n");
      return new Response(JSON.stringify({
        message: {
          content: JSON.stringify({
            summary: "Prepared an offline lead-research plan for the sample businesses.",
            recommendations: ["Define approved target markets before any real outreach."],
            openQuestions: ["Which regions are approved for future research?"],
          }),
        },
      }), { status: 200 });
    },
  });
  assert.match(prompt, /Sales Lead Finder/);
  assert.match(prompt, /do not perform or imply such action/i);
  assert.equal(brief.recommendations.length, 1);
  await assert.rejects(() => generateWorkforceAgentBrief("test-model:latest", {
    id: "sales-lead-finder",
    role: "Sales Lead Finder",
    task: "Researching opportunities",
  }, concepts, {
    fetcher: async () => new Response(JSON.stringify({
      message: { content: JSON.stringify({ summary: "Sent emails to 03001234567.", recommendations: [], openQuestions: [] }) },
    }), { status: 200 }),
  }), /invalid specialist summary/i);
});

test("agent cards expose durable live status and validated result details", async () => {
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-agent-readiness-test-"));
  const roleId = "sales-lead-finder";
  try {
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    await setAgentReadiness({ id: roleId, status: "running", model: "test-model:latest" });
    const runningRecords = await readAgentReadiness();
    const runningAgent = getWorkforceRoleRegistry([], [], runningRecords).find((agent) => agent.id === roleId);
    assert.equal(runningAgent?.status, "VERIFYING");

    await setAgentReadiness({
      id: roleId,
      status: "ready",
      model: "test-model:latest",
      output: {
        summary: "Prepared a role-specific offline research plan.",
        recommendations: ["Review target markets before any real outreach."],
        openQuestions: ["Which regions are approved?"],
      },
    });
    const readyRecords = await readAgentReadiness();
    const readyAgent = getWorkforceRoleRegistry([], [], readyRecords).find((agent) => agent.id === roleId);
    assert.equal(readyAgent?.status, "VERIFIED");
    assert.match(readyAgent?.verificationSummary || "", /offline research plan/);
    assert.ok(readyAgent?.statusUpdatedAt);
  } finally {
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("static template generation creates 15 isolated editions with honest QA evidence", async () => {
  const previousDirectory = process.cwd();
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-test-"));
  const targets = selectDailyConceptTargets("2026-10-28");
  const concepts = targets.map((target, index) => ({
    businessTypeId: target.businessTypeId,
    name: `Test Business ${index + 1}`,
    slug: `test-business-${index + 1}`,
    tagline: "A useful local business website.",
    audience: target.businessTypeLabel,
    description: `A practical website concept for ${target.businessTypeLabel}.`,
    offerings: ["Consultation", "Service plans", "Customer support"],
  }));
  const batch: WorkforceBatch = {
    id: "batch-2026-10-28",
    scheduledDate: "2026-10-28",
    source: "manual",
    status: "running",
    attempt: 1,
    model: "test-model:latest",
    createdBy: "test-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targets,
    concepts,
    tasks: [],
    artifacts: [],
  };

  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    const result = await generateWorkforceTemplateArtifacts({
      batch,
      concepts,
      maxConcurrency: 2,
    });
    assert.equal(result.artifacts.filter((artifact) => /\/(starter|business|enterprise)$/.test(artifact)).length, 15);
    assert.equal(result.qaReport.failed, 0);
    assert.equal(result.qaReport.passed, 60);
    assert.equal(result.qaReport.notRun, 1);
    assert.equal(result.qaReport.checks[result.qaReport.checks.length - 1]?.status, "not_run");
    const root = join(temporaryDirectory, "generated-templates", "2026-10-28", batch.id);
    const templates = await readdir(root);
    assert.equal(templates.filter((name) => name.startsWith("template-")).length, 5);
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as { totalDeliverables: number };
    assert.equal(manifest.totalDeliverables, 15);
    const firstTemplate = templates.find((name) => name.startsWith("template-"));
    assert.ok(firstTemplate);
    const starter = await readFile(join(root, firstTemplate, "starter", "feature-matrix.json"), "utf8");
    const business = await readFile(join(root, firstTemplate, "business", "feature-matrix.json"), "utf8");
    assert.notEqual(starter, business);
    const resumed = await generateWorkforceTemplateArtifacts({
      batch,
      concepts,
      maxConcurrency: 1,
    });
    assert.deepEqual(resumed.artifacts, result.artifacts);
    assert.equal(resumed.qaReport.passed, result.qaReport.passed);
  } finally {
    process.chdir(previousDirectory);
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
