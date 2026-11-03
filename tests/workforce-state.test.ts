import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import test from "node:test";
import { NextRequest } from "next/server";
import { signToken } from "../src/lib/auth";
import { GET as getWorkforceArtifacts } from "../src/app/api/admin/workforce/artifacts/[...path]/route";
import { GET as getWorkforceDashboard } from "../src/app/api/admin/workforce/route";
import { PATCH as patchAdminProject } from "../src/app/api/admin/projects/route";
import {
  GET as getCeoStrategyDashboard,
  PATCH as patchCeoStrategy,
  POST as postCeoStrategy,
} from "../src/app/api/admin/workforce/strategy/route";
import {
  claimNextWorkforceBatch,
  completeWorkforceBatch,
  controlWorkforceBatch,
  deliverWorkforceTask,
  enqueueDailyBatch,
  getWorkforceRoleRegistry,
  getWorkforceWorkerHeartbeatStatus,
  readWorkforceState,
  recoverStaleWorkforceBatches,
  retryWorkforceBatch,
  setWorkforceWorkerStatus,
  updateBatchTask,
  updateWorkforceState,
} from "../src/lib/workforce-pipeline";

test("workforce state and artifact endpoints reject unauthenticated requests", async () => {
  const dashboard = await getWorkforceDashboard(new NextRequest("http://localhost/api/admin/workforce"));
  const strategyDashboard = await getCeoStrategyDashboard(new NextRequest("http://localhost/api/admin/workforce/strategy"));
  const generateStrategy = await postCeoStrategy(new NextRequest("http://localhost/api/admin/workforce/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "project-private" }),
  }));
  const approveStrategy = await patchCeoStrategy(new NextRequest("http://localhost/api/admin/workforce/strategy", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "project-private" }),
  }));
  const artifact = await getWorkforceArtifacts(
    new NextRequest("http://localhost/api/admin/workforce/artifacts/sample/index.html"),
    { params: { path: ["sample", "index.html"] } }
  );
  assert.equal(dashboard.status, 401);
  assert.equal(strategyDashboard.status, 401);
  assert.equal(generateStrategy.status, 401);
  assert.equal(approveStrategy.status, 401);
  assert.equal(artifact.status, 401);
});

test("project delivery cannot be marked delivered or completed through the status API", async () => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  try {
    const token = signToken({ email: "admin@example.test", timestamp: Date.now() });
    for (const status of ["Delivered", "Completed"]) {
      const response = await patchAdminProject(new NextRequest("http://localhost/api/admin/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `dwd_admin_session=${token}`,
        },
        body: JSON.stringify({ id: "proj-delivery-test", status }),
      }));
      assert.equal(response.status, 409);
      assert.equal((await response.json()).requiredStatus, "Pending Delivery Review");
    }
  } finally {
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});

test("CEO strategy rejects caller-supplied attachment evidence", async () => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  const previousVercel = process.env.VERCEL;
  process.env.SESSION_SECRET = "unit-test-session-secret-with-at-least-32-bytes";
  delete process.env.VERCEL;
  try {
    const token = signToken({ email: "admin@example.test", timestamp: Date.now() });
    const response = await postCeoStrategy(new NextRequest("http://localhost/api/admin/workforce/strategy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `dwd_admin_session=${token}`,
      },
      body: JSON.stringify({
        projectId: "proj-test",
        authorizedAttachments: [{
          referenceId: "forged",
          label: "Customer scope",
          extractedText: "Unverified caller content.",
          authorized: true,
        }],
      }),
    }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Client-supplied attachment content cannot be verified/);
  } finally {
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }
});

test("workforce dashboard distinguishes completed tasks from actual delivered handoffs", async () => {
  const previousDirectory = process.cwd();
  const previousVercel = process.env.VERCEL;
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-handoff-test-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    delete process.env.VERCEL;
    const queued = await enqueueDailyBatch("2026-10-30", "manual", "test-admin");
    const batch = await claimNextWorkforceBatch("2026-10-30");
    assert.ok(batch);
    await assert.rejects(
      updateBatchTask(batch.id, "Content Writer", "completed"),
      /without a saved work product/
    );
    await assert.rejects(
      updateBatchTask(batch.id, "Web Development Coder", "running"),
      /blocked by an incomplete dependency/
    );
    await updateBatchTask(batch.id, "AI CEO Strategist", "completed", undefined, {
      summary: "Prepared a fictional concept direction.",
      recommendations: ["Require human review before reuse."],
      openQuestions: ["Which concepts should be adapted?"],
    });
    await updateBatchTask(batch.id, "Content Writer", "completed", undefined, {
      summary: "Drafted sample content for the fictional project.",
      recommendations: ["Require human review before reuse."],
      openQuestions: ["Which approved content should replace the sample?"],
    });
    await updateBatchTask(batch.id, "Web Development Coder", "running");
    await deliverWorkforceTask({
      batchId: batch.id,
      fromRole: "Content Writer",
      toRole: "Web Development Coder",
      artifacts: ["generated-templates/2026-10-30/concepts.json"],
    });

    const state = await readWorkforceState();
    const contentWriter = getWorkforceRoleRegistry([], state.batches).find((agent) => agent.id === "content-writer");
    const coder = getWorkforceRoleRegistry([], state.batches).find((agent) => agent.id === "web-development-coder");
    assert.equal(contentWriter?.taskStatus, "completed");
    assert.equal(
      state.batches[0].tasks.find((task) => task.role === "Content Writer")?.evidenceStatus,
      "UNVERIFIED"
    );
    assert.equal(contentWriter?.lastCompletedBatchId, batch.id);
    assert.equal(contentWriter?.handoffStatus, "delivered");
    assert.deepEqual(contentWriter?.deliveredTo, ["web-development-coder"]);
    assert.equal(coder?.taskStatus, "running");
    assert.equal(coder?.handoffStatus, "not_delivered");
    assert.equal(queued.batch.tasks.length, 50);
    await assert.rejects(
      completeWorkforceBatch({
        batchId: batch.id,
        artifacts: [],
        qaReport: { passed: 1, failed: 0, notRun: 0, checks: [{ name: "test", status: "passed", evidence: "present" }] },
      }),
      /verified concepts, manifest, and QA report artifacts/
    );
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("historical completed batches are explicitly marked unverified without fabricated evidence", async () => {
  const previousDirectory = process.cwd();
  const previousVercel = process.env.VERCEL;
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-legacy-test-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    delete process.env.VERCEL;
    await enqueueDailyBatch("2026-10-30", "manual", "test-admin");
    await updateWorkforceState((state) => {
      state.batches[0].status = "completed";
      state.batches[0].completionEvidenceStatus = "VERIFIED";
      state.batches[0].tasks[0].status = "completed";
      state.batches[0].tasks[0].evidenceStatus = "VERIFIED";
      state.batches[0].artifacts = [];
      delete state.batches[0].qaReport;
    });
    const state = await readWorkforceState();
    assert.equal(state.batches[0].completionEvidenceStatus, "LEGACY_UNVERIFIED");
    assert.equal(state.batches[0].tasks[0].evidenceStatus, "LEGACY_UNVERIFIED");
    assert.deepEqual(state.batches[0].artifacts, []);
    assert.equal(state.batches[0].qaReport, undefined);
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("worker heartbeat state is independent from provider and ignores a different worker's stop", async () => {
  const previousDirectory = process.cwd();
  const previousVercel = process.env.VERCEL;
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-worker-test-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    delete process.env.VERCEL;
    const now = new Date().toISOString();
    await setWorkforceWorkerStatus("running", process.pid, now, now);
    assert.equal((await readWorkforceState()).worker?.status, "running");
    await setWorkforceWorkerStatus("stopped", process.pid + 1, now, now);
    assert.equal((await readWorkforceState()).worker?.status, "running");
    await setWorkforceWorkerStatus("stopped", process.pid, now, now);
    assert.equal((await readWorkforceState()).worker?.status, "stopped");
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("workforce batch completion verifies required files, QA evidence, and coder task evidence", async () => {
  const previousDirectory = process.cwd();
  const previousVercel = process.env.VERCEL;
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-evidence-test-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    delete process.env.VERCEL;
    await enqueueDailyBatch("2026-10-30", "manual", "test-admin");
    const batch = await claimNextWorkforceBatch("2026-10-30");
    assert.ok(batch);
    const base = join(temporaryDirectory, "generated-templates", batch.scheduledDate, batch.id);
    const reportPath = `generated-templates/${batch.scheduledDate}/${batch.id}/batch-report.json`;
    const manifestPath = `generated-templates/${batch.scheduledDate}/${batch.id}/manifest.json`;
    const conceptsPath = `generated-templates/${batch.scheduledDate}/${batch.id}/concepts.json`;
    const editionPath = `generated-templates/${batch.scheduledDate}/${batch.id}/template-01-demo/starter`;
    const qaReport = {
      passed: 1,
      failed: 0,
      notRun: 1,
      checks: [
        { name: "Required files", status: "passed" as const, evidence: "index.html, styles.css, and app.js exist." },
        { name: "Browser smoke test", status: "not_run" as const, evidence: "Browser automation is not configured." },
      ],
    };
    await mkdir(join(base, "template-01-demo", "starter"), { recursive: true });
    await writeFile(join(base, "concepts.json"), "[]", "utf8");
    await writeFile(join(base, "manifest.json"), JSON.stringify({
      batchId: batch.id,
      generationDate: batch.scheduledDate,
      totalDeliverables: 15,
      qaPassed: qaReport.passed,
      qaFailed: qaReport.failed,
    }), "utf8");
    await writeFile(join(base, "batch-report.json"), JSON.stringify({ batchId: batch.id, qaReport }), "utf8");

    const output = {
      summary: "Created a test work product for the local workflow.",
      recommendations: ["Require human review."],
      openQuestions: ["What should be reviewed?"],
    };
    await updateBatchTask(batch.id, "AI CEO Strategist", "completed", undefined, output);
    await updateBatchTask(batch.id, "Content Writer", "completed", undefined, output);
    for (const task of batch.tasks) {
      if (["AI CEO Strategist", "Content Writer", "Web Development Coder", "QA Testing Bot"].includes(task.role)) continue;
      await updateBatchTask(batch.id, task.role, "completed", undefined, output);
    }
    await updateBatchTask(batch.id, "Web Development Coder", "completed", undefined, output, [editionPath, manifestPath]);
    await updateBatchTask(batch.id, "QA Testing Bot", "completed", undefined, output);

    const completionInput = {
      batchId: batch.id,
      artifacts: [conceptsPath, manifestPath, reportPath, editionPath],
      qaReport,
    };
    await assert.rejects(completeWorkforceBatch(completionInput), /QA Testing Bot task requires verified local artifact evidence/);
    await updateBatchTask(batch.id, "QA Testing Bot", "completed", undefined, output, [reportPath]);
    await updateBatchTask(batch.id, "Content Writer", "running");
    await assert.rejects(completeWorkforceBatch(completionInput), /every registered task has a completed output and valid handoff/);
    await updateBatchTask(batch.id, "Content Writer", "completed", undefined, output);

    const completed = await completeWorkforceBatch(completionInput);
    assert.equal(completed.status, "completed");
    assert.equal(completed.completionEvidenceStatus, "UNVERIFIED");
    assert.equal(completed.verificationVersion, 2);
    assert.equal(completed.tasks.find((task) => task.role === "Web Development Coder")?.evidenceStatus, "VERIFIED");
    assert.equal(completed.tasks.find((task) => task.role === "Content Writer")?.evidenceStatus, "UNVERIFIED");
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("stale worker heartbeat is never represented as online", () => {
  const now = Date.parse("2026-11-03T10:00:00.000Z");
  assert.equal(getWorkforceWorkerHeartbeatStatus({
    pid: 123,
    startedAt: new Date(now - 60_000).toISOString(),
    lastSeenAt: new Date(now - 16_000).toISOString(),
    status: "running",
  }, now), "STALE_HEARTBEAT");
  assert.equal(getWorkforceWorkerHeartbeatStatus({
    pid: 123,
    startedAt: new Date(now - 60_000).toISOString(),
    lastSeenAt: new Date(now - 5_000).toISOString(),
    status: "running",
  }, now), "RECENT_HEARTBEAT");
  assert.equal(getWorkforceWorkerHeartbeatStatus({
    pid: 123,
    startedAt: new Date(now - 60_000).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    status: "stopped",
  }, now), "NOT_REPORTING");
});

test("daily batch creation is idempotent and persisted controls recover stale worker state", async () => {
  const previousDirectory = process.cwd();
  const previousVercel = process.env.VERCEL;
  const previousStorageDirectory = process.env.WORKFORCE_DATA_DIR;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "dwd-workforce-state-test-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.WORKFORCE_DATA_DIR = temporaryDirectory;
    delete process.env.VERCEL;
    const first = await enqueueDailyBatch("2026-10-30", "manual", "test-admin");
    assert.equal(first.batch.tasks.length, 50);
    assert.equal(new Set(first.batch.tasks.map((task) => task.agentId)).size, 50);
    assert.ok(first.batch.tasks.every((task) => task.status === "waiting"));
    const duplicate = await enqueueDailyBatch("2026-10-30", "schedule", "scheduler");
    assert.equal(first.created, true);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.batch.id, first.batch.id);
    await updateWorkforceState((state) => {
      state.batches[0].tasks = state.batches[0].tasks.slice(0, 4);
    });
    assert.equal(await claimNextWorkforceBatch("2026-10-29"), null, "future-dated batches stay queued");
    const claimed = await claimNextWorkforceBatch("2026-10-30");
    assert.equal(claimed?.tasks.length, 50, "legacy pending batches are upgraded with tasks for the full team");
    assert.equal(claimed?.status, "running");
    await controlWorkforceBatch(first.batch.id, "pause");
    assert.equal((await readWorkforceState()).batches[0].status, "paused");
    await controlWorkforceBatch(first.batch.id, "resume");
    assert.equal((await readWorkforceState()).batches[0].status, "queued");
    const recovered = await claimNextWorkforceBatch("2026-10-30");
    assert.equal(recovered?.attempt, 2);
    await updateWorkforceState((state) => {
      state.batches[0].startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    });
    await recoverStaleWorkforceBatches();
    const state = await readWorkforceState();
    assert.equal(state.batches[0].status, "queued");
    assert.ok(state.events.some((event) => event.type === "stale_batch_recovered"));
    await updateWorkforceState((current) => {
      current.batches[0].status = "failed";
    });
    const retried = await retryWorkforceBatch(first.batch.id);
    assert.equal(retried.status, "queued");
    const thirdAttempt = await claimNextWorkforceBatch("2026-10-30");
    assert.equal(thirdAttempt?.attempt, 3);
    await controlWorkforceBatch(first.batch.id, "cancel");
    assert.equal((await readWorkforceState()).batches[0].status, "cancelled");
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
