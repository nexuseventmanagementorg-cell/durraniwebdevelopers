import { setTimeout as sleep } from "timers/promises";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import {
  checkOllamaModel,
  generateWorkforceAgentBrief,
  listOllamaModels,
  OllamaProviderError,
  type WorkforceAgentAssignment,
  type WorkforceAgentBrief,
} from "../src/lib/ollama-provider";
import { readWorkforceState, isLocalWorkforceEnabled } from "../src/lib/workforce-pipeline";
import { readAgentReadiness, setAgentReadiness } from "../src/lib/workforce-agent-readiness";

async function main(): Promise<void> {
  if (!isLocalWorkforceEnabled()) {
    throw new Error("Agent readiness checks are local-only and will not run on Vercel.");
  }
  const state = await readWorkforceState();
  const model = state.settings.model || process.env.OLLAMA_MODEL?.trim() || null;
  if (!model) {
    throw new OllamaProviderError("Select an installed Ollama model in /admin/workforce before activating agents.", "model_missing");
  }
  const installed = await listOllamaModels();
  if (!installed.some((entry) => entry.name === model)) {
    throw new OllamaProviderError(`The selected local model "${model}" is not installed.`, "model_missing");
  }
  await checkOllamaModel(model);

  const sourceBatch = state.batches.find((batch) => batch.status === "completed" && batch.concepts.length === 5);
  if (!sourceBatch) {
    throw new Error("A completed five-concept batch is required before specialist agents can be verified.");
  }

  const readiness = await readAgentReadiness();
  for (const record of readiness.filter((entry) => entry.status === "running")) {
    await setAgentReadiness({
      id: record.id,
      status: "failed",
      model: record.model,
      error: "Previous local activation stopped before this role finished. It will be retried now.",
    });
  }
  const readyIds = new Set(readiness.filter((record) => record.status === "ready").map((record) => record.id));
  const baseAssignments: WorkforceAgentAssignment[] = DWD_WORKFORCE_AGENTS
    .filter((agent) => ![
      "AI CEO Strategist",
      "Content Writer",
      "Web Development Coder",
      "QA Testing Bot",
    ].includes(agent.role))
    .filter((agent) => !readyIds.has(agent.avatar))
    .map((agent) => ({ id: agent.avatar, role: agent.role, task: agent.task }));

  const verifiedCoreRoles = new Set(sourceBatch.tasks
    .filter((task) => task.status === "completed")
    .map((task) => task.role));
  for (const agent of DWD_WORKFORCE_AGENTS.filter((entry) =>
    ["AI CEO Strategist", "Content Writer", "Web Development Coder", "QA Testing Bot"].includes(entry.role)
  )) {
    if (!verifiedCoreRoles.has(agent.role) || readyIds.has(agent.avatar)) continue;
    await setAgentReadiness({
      id: agent.avatar,
      status: "ready",
      model: sourceBatch.model || model,
      output: {
        summary: `Verified through completed batch ${sourceBatch.id}: ${agent.task}.`,
        recommendations: ["Review the saved batch evidence before using this capability for a real client."],
        openQuestions: ["Does this client engagement require additional approvals or testing?"],
      },
    });
  }

  let succeeded = 0;
  let failed = 0;
  console.log(`Verifying ${baseAssignments.length} remaining specialist roles with local ${model}; no cloud model is used.`);
  for (const assignment of baseAssignments) {
    console.log(`RUNNING ${assignment.role}`);
    await setAgentReadiness({ id: assignment.id, status: "running", model });
    try {
      let output: WorkforceAgentBrief | undefined;
      for (let attempt = 1; ; attempt += 1) {
        try {
          output = await generateWorkforceAgentBrief(model, assignment, sourceBatch.concepts);
          break;
        } catch (error) {
          const retryable = error instanceof OllamaProviderError &&
            ["unavailable", "timeout", "invalid_output"].includes(error.code);
          if (!retryable || attempt >= 3) throw error;
          console.warn(`Retrying ${assignment.role} after ${error.code} (${attempt}/2).`);
          await sleep(500 * attempt);
        }
      }
      if (!output) throw new Error(`The local ${assignment.role} agent returned no work product.`);
      await setAgentReadiness({ id: assignment.id, status: "ready", model, output });
      succeeded += 1;
      console.log(`READY ${assignment.role}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The local role verification failed.";
      await setAgentReadiness({ id: assignment.id, status: "failed", model, error: message.slice(0, 400) });
      failed += 1;
      console.error(`FAILED ${assignment.role}: ${message}`);
    }
  }

  console.log(`Agent activation complete: ${succeeded} newly verified, ${failed} failed, ${DWD_WORKFORCE_AGENTS.length} total roles.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Local agent activation failed.");
  process.exitCode = 1;
});
