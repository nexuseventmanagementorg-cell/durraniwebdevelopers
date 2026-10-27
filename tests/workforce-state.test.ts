import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as getWorkforceArtifacts } from "../src/app/api/admin/workforce/artifacts/[...path]/route";
import { GET as getWorkforceDashboard } from "../src/app/api/admin/workforce/route";
import {
  claimNextWorkforceBatch,
  controlWorkforceBatch,
  deliverWorkforceTask,
  enqueueDailyBatch,
  getWorkforceRoleRegistry,
  readWorkforceState,
  recoverStaleWorkforceBatches,
  updateBatchTask,
  updateWorkforceState,
} from "../src/lib/workforce-pipeline";

test("workforce state and artifact endpoints reject unauthenticated requests", async () => {
  const dashboard = await getWorkforceDashboard(new NextRequest("http://localhost/api/admin/workforce"));
  const artifact = await getWorkforceArtifacts(
    new NextRequest("http://localhost/api/admin/workforce/artifacts/sample/index.html"),
    { params: { path: ["sample", "index.html"] } }
  );
  assert.equal(dashboard.status, 401);
  assert.equal(artifact.status, 401);
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
    await updateBatchTask(batch.id, "Content Writer", "completed");
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
    assert.equal(contentWriter?.lastCompletedBatchId, batch.id);
    assert.equal(contentWriter?.handoffStatus, "delivered");
    assert.deepEqual(contentWriter?.deliveredTo, ["web-development-coder"]);
    assert.equal(coder?.taskStatus, "running");
    assert.equal(coder?.handoffStatus, "not_delivered");
    assert.equal(queued.batch.tasks.length, 50);
  } finally {
    process.chdir(previousDirectory);
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousStorageDirectory === undefined) delete process.env.WORKFORCE_DATA_DIR;
    else process.env.WORKFORCE_DATA_DIR = previousStorageDirectory;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
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
