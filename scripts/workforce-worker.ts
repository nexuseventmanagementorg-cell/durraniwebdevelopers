import { setTimeout as sleep } from "timers/promises";
import {
  claimNextWorkforceBatch,
  completeWorkforceBatch,
  enqueueDailyBatch,
  failWorkforceBatch,
  isLocalWorkforceEnabled,
  readWorkforceState,
  recordScheduleObservation,
  recoverStaleWorkforceBatches,
  recordOllamaRequestSuccess,
  recordWorkforceEvent,
  saveBatchConcepts,
  updateBatchTask,
  deliverWorkforceTask,
  WorkforceStateError,
} from "../src/lib/workforce-pipeline";
import {
  generateTemplateConcepts,
  generateWorkforceAgentBrief,
  checkOllamaModel,
  listOllamaModels,
  OllamaProviderError,
  type WorkforceAgentAssignment,
  type WorkforceAgentBrief,
  type TemplateConcept,
} from "../src/lib/ollama-provider";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import {
  generateWorkforceTemplateArtifacts,
  removeCancelledWorkforceArtifacts,
} from "../src/lib/workforce-template-generator";

let stopping = false;
let activeBatchId: string | null = null;

process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

function karachiClock(): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value || "";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

async function assertBatchNotCancelled(batchId: string): Promise<void> {
  const state = await readWorkforceState();
  const batch = state.batches.find((entry) => entry.id === batchId);
  if (!batch || batch.status === "cancelled") {
    throw new WorkforceStateError("Batch cancelled by an administrator.");
  }
}

async function waitWhilePaused(batchId: string): Promise<void> {
  while (true) {
    const state = await readWorkforceState();
    const batch = state.batches.find((entry) => entry.id === batchId);
    if (!batch || batch.status === "cancelled") {
      throw new WorkforceStateError("Batch cancelled by an administrator.");
    }
    if (batch.status !== "paused") return;
    await sleep(500);
  }
}

async function mapWithLimit<T, R>(
  values: T[],
  limit: number,
  action: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  let failure: unknown;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (failure === undefined) {
      const index = nextIndex++;
      if (index >= values.length) return;
      try {
        results[index] = await action(values[index]);
      } catch (error) {
        failure = error;
        return;
      }
    }
  });
  await Promise.all(workers);
  if (failure !== undefined) throw failure;
  return results;
}

async function runSpecialistAgents(
  batchId: string,
  model: string | null,
  concepts: TemplateConcept[],
  maxConcurrency: number
): Promise<void> {
  if (!model) {
    throw new OllamaProviderError("Select an installed Ollama model before running specialist agents.", "model_missing");
  }
  const excludedRoles = new Set([
    "AI CEO Strategist",
    "Content Writer",
    "Web Development Coder",
    "QA Testing Bot",
  ]);
  const batch = (await readWorkforceState()).batches.find((entry) => entry.id === batchId);
  if (!batch) throw new WorkforceStateError("The active workforce batch was not found.");
  const completedRoles = new Set(batch.tasks
    .filter((task) => task.status === "completed" && task.output)
    .map((task) => task.role));
  const assignments: WorkforceAgentAssignment[] = DWD_WORKFORCE_AGENTS
    .filter((agent) => !excludedRoles.has(agent.role) && !completedRoles.has(agent.role))
    .map((agent) => ({ id: agent.avatar, role: agent.role, task: agent.task }));
  if (assignments.length === 0) return;

  const controller = new AbortController();
  const cancellationWatcher = setInterval(() => {
    void readWorkforceState().then((state) => {
      const current = state.batches.find((entry) => entry.id === batchId);
      if (!current || current.status === "cancelled") controller.abort();
    }).catch((error: unknown) => {
      console.error("Could not read workforce cancellation status", error);
    });
  }, 750);
  try {
    await mapWithLimit(assignments, maxConcurrency, async (assignment) => {
      await assertBatchNotCancelled(batchId);
      await waitWhilePaused(batchId);
      await updateBatchTask(batchId, assignment.role, "running");
      let output: WorkforceAgentBrief | undefined;
      for (let attempt = 1; ; attempt += 1) {
        try {
          output = await generateWorkforceAgentBrief(model, assignment, concepts, { signal: controller.signal });
          break;
        } catch (error) {
          const retryable = error instanceof OllamaProviderError &&
            (error.code === "unavailable" || error.code === "timeout");
          if (!retryable || attempt >= 3) throw error;
          const delayMs = 1000 * (2 ** (attempt - 1));
          await recordWorkforceEvent("ollama_agent_retry", batchId, {
            agentId: assignment.id,
            attempt,
            delayMs,
            code: error.code,
          });
          await sleep(delayMs);
        }
      }
      if (!output) throw new Error(`The local ${assignment.role} agent returned no work product.`);
      await assertBatchNotCancelled(batchId);
      await waitWhilePaused(batchId);
      await updateBatchTask(batchId, assignment.role, "completed", undefined, output);
      return output;
    });
  } finally {
    clearInterval(cancellationWatcher);
  }
}

async function runClaimedBatch(batchId: string, model: string | null): Promise<void> {
  const batch = (await readWorkforceState()).batches.find((entry) => entry.id === batchId);
  if (!batch) throw new WorkforceStateError("The active workforce batch was not found.");
  let concepts: TemplateConcept[];
  if (batch.concepts.length === 5) {
    concepts = batch.concepts;
    await updateBatchTask(batchId, "AI CEO Strategist", "running");
    await updateBatchTask(batchId, "AI CEO Strategist", "completed", undefined, {
      summary: "Set the direction for five distinct fictional website concepts across the selected business types.",
      recommendations: ["Review each concept against its intended business audience before using it."],
      openQuestions: ["Which concepts should be customized for a real client?"],
    });
    await updateBatchTask(batchId, "Content Writer", "running");
    await updateBatchTask(batchId, "Content Writer", "completed", undefined, {
      summary: "Prepared the concept names, positioning, descriptions, audiences, and offerings.",
      recommendations: ["Have a human review generated copy before publishing."],
      openQuestions: ["What approved brand voice and factual business details should replace sample content?"],
    });
  } else {
    if (!model) {
      throw new OllamaProviderError(
        "No Ollama model is selected. Choose an installed model in the admin workforce dashboard.",
        "model_missing"
      );
    }
    const installed = await listOllamaModels();
    if (!installed.some((entry) => entry.name === model)) {
      throw new OllamaProviderError(`The selected local model "${model}" is not installed. Select an available model and retry.`, "model_missing");
    }
    await checkOllamaModel(model);
    await updateBatchTask(batchId, "AI CEO Strategist", "running");
    await updateBatchTask(batchId, "Content Writer", "running");
    const generationAbort = new AbortController();
    const cancelWatcher = setInterval(() => {
      void readWorkforceState().then((state) => {
        const current = state.batches.find((entry) => entry.id === batchId);
        if (!current || current.status === "cancelled") generationAbort.abort();
      }).catch((error: unknown) => {
        console.error("Could not read workforce cancellation status", error);
      });
    }, 750);
    try {
      let generatedConcepts: TemplateConcept[] | null = null;
      for (let attempt = 1; ; attempt += 1) {
        try {
          generatedConcepts = await generateTemplateConcepts(model, batch.targets, { signal: generationAbort.signal });
          break;
        } catch (error) {
          const retryable = error instanceof OllamaProviderError &&
            (error.code === "unavailable" || error.code === "timeout");
          if (!retryable || attempt >= 3) throw error;
          const delayMs = 1000 * (2 ** (attempt - 1));
          await recordWorkforceEvent("ollama_request_retry", batchId, { attempt, delayMs, code: error.code });
          await sleep(delayMs);
        }
      }
      if (!generatedConcepts) throw new Error("Ollama did not return validated template concepts.");
      await waitWhilePaused(batchId);
      await recordOllamaRequestSuccess(model);
      await saveBatchConcepts(batchId, generatedConcepts);
      concepts = generatedConcepts;
      await updateBatchTask(batchId, "AI CEO Strategist", "completed", undefined, {
        summary: "Set the direction for five distinct fictional website concepts across the selected business types.",
        recommendations: ["Review each concept against its intended business audience before using it."],
        openQuestions: ["Which concepts should be customized for a real client?"],
      });
      await updateBatchTask(batchId, "Content Writer", "completed", undefined, {
        summary: "Prepared the concept names, positioning, descriptions, audiences, and offerings.",
        recommendations: ["Have a human review generated copy before publishing."],
        openQuestions: ["What approved brand voice and factual business details should replace sample content?"],
      });
    } finally {
      clearInterval(cancelWatcher);
    }
  }

  const stateBeforeSpecialists = await readWorkforceState();
  await runSpecialistAgents(
    batchId,
    model,
    concepts,
    stateBeforeSpecialists.settings.maxConcurrency
  );
  if (model) await recordOllamaRequestSuccess(model);

  await updateBatchTask(batchId, "Web Development Coder", "running");
  await assertBatchNotCancelled(batchId);
  await waitWhilePaused(batchId);
  const conceptsArtifact = `generated-templates/${batch.scheduledDate}/${batch.id}/concepts.json`;
  const currentBatch = (await readWorkforceState()).batches.find((entry) => entry.id === batchId);
  if (!currentBatch) throw new WorkforceStateError("The active workforce batch was not found.");
  for (const role of ["AI CEO Strategist", "Content Writer"]) {
    const producer = currentBatch.tasks.find((task) => task.role === role);
    if (producer?.status === "completed" && !producer.handoff.deliveredTo?.includes("web-development-coder")) {
      await deliverWorkforceTask({
        batchId,
        fromRole: role,
        toRole: "Web Development Coder",
        artifacts: [conceptsArtifact],
      });
    }
  }
  const state = await readWorkforceState();
  const artifacts = await generateWorkforceTemplateArtifacts({
    batch,
    concepts,
    maxConcurrency: state.settings.maxConcurrency,
  });
  await assertBatchNotCancelled(batchId);
  await updateBatchTask(batchId, "Web Development Coder", "completed", undefined, {
    summary: "Generated five isolated static websites, each with Starter, Business, and Enterprise editions.",
    recommendations: ["Review the generated previews and adapt them to approved client requirements."],
    openQuestions: ["Which templates should proceed to human design and browser review?"],
  });
  await updateBatchTask(batchId, "QA Testing Bot", "running");
  await deliverWorkforceTask({
    batchId,
    fromRole: "Web Development Coder",
    toRole: "QA Testing Bot",
    artifacts: artifacts.artifacts.filter((artifact) => /\/(starter|business|enterprise)$/.test(artifact)),
  });
  if (artifacts.qaReport.failed > 0) {
    throw new Error(`Quality checks failed (${artifacts.qaReport.failed}); inspect the generated QA report.`);
  }
  await updateBatchTask(batchId, "QA Testing Bot", "completed", undefined, {
    summary: `Static checks passed: ${artifacts.qaReport.passed}; failed: ${artifacts.qaReport.failed}; not run: ${artifacts.qaReport.notRun}.`,
    recommendations: ["Run browser smoke tests before any public release."],
    openQuestions: ["Has a human reviewed the generated pages on desktop and mobile?"],
  });
  while (true) {
    await waitWhilePaused(batchId);
    try {
      await completeWorkforceBatch({ batchId, ...artifacts });
      break;
    } catch (error) {
      const current = (await readWorkforceState()).batches.find((entry) => entry.id === batchId);
      if (current?.status === "paused") continue;
      throw error;
    }
  }
  console.log(`Completed ${batchId}: ${artifacts.artifacts.length} artifact paths; ${artifacts.qaReport.passed} static checks passed, browser smoke test NOT RUN.`);
}

async function processNextBatch(): Promise<boolean> {
  const batch = await claimNextWorkforceBatch(karachiClock().day);
  if (!batch) return false;
  activeBatchId = batch.id;
  console.log(`Starting ${batch.id} (attempt ${batch.attempt}) with model ${batch.model || "not selected"}.`);
  try {
    await runClaimedBatch(batch.id, batch.model);
  } catch (error) {
    const current = (await readWorkforceState()).batches.find((entry) => entry.id === batch.id);
    if (current?.status === "cancelled") {
      await removeCancelledWorkforceArtifacts(batch);
      console.log(`${batch.id} was cancelled.`);
    } else {
      const message = error instanceof Error ? error.message : "The local workforce batch failed.";
      console.error(`${batch.id} failed: ${message}`);
      await failWorkforceBatch(batch.id, message);
    }
  } finally {
    activeBatchId = null;
  }
  return true;
}

async function ensureDailySchedule(): Promise<void> {
  const { day, time } = karachiClock();
  const state = await readWorkforceState();
  const due = state.settings.scheduleEnabled && time >= state.settings.scheduleTime;
  const alreadyRecorded = state.events.some((event) =>
    event.type === "schedule_due" && event.details.date === day
  );
  const hasBatchToday = state.batches.some((batch) => batch.scheduledDate === day);
  if (state.scheduler.lastObservedDate !== day || (due && !hasBatchToday && !alreadyRecorded)) {
    await recordScheduleObservation(day, due, hasBatchToday);
  }
  if (due && !hasBatchToday) {
    await enqueueDailyBatch(day, "schedule", "daily-scheduler");
    console.log(`Queued scheduled batch for ${day} (${state.settings.scheduleTime} Asia/Karachi).`);
  }
}

async function main(): Promise<void> {
  if (!isLocalWorkforceEnabled()) {
    throw new Error("The workforce worker is local-only and will not run on Vercel.");
  }
  await recoverStaleWorkforceBatches();
  const oneShot = process.argv.includes("--once");
  if (process.argv.includes("--start-today")) {
    const { day } = karachiClock();
    const queued = await enqueueDailyBatch(day, "manual", "local-worker-cli");
    console.log(queued.created ? `Queued manual batch for ${day}.` : `A batch for ${day} already exists; no duplicate was created.`);
  }
  console.log("Local DWD workforce worker started. Provider: Ollama; schedule timezone: Asia/Karachi.");
  if (oneShot) {
    const handled = await processNextBatch();
    if (!handled) console.log("No queued batch was available; worker exited without starting a model request.");
    return;
  }
  console.log("Press Ctrl+C to stop the worker. Completed batches remain on disk.");
  while (!stopping) {
    await ensureDailySchedule();
    const handled = await processNextBatch();
    if (!handled) await sleep(2_000);
  }
  console.log(activeBatchId ? `Worker stopped; ${activeBatchId} will be recovered if it becomes stale.` : "Worker stopped.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The workforce worker failed to start.");
  process.exitCode = 1;
});
