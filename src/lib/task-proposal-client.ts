export type TaskProposalProviderMode = "gemini" | "deterministic_mock";
export type TaskProposalOperation = "create" | "modify";
export type TaskProposalPersistenceMode = "process_local";

export interface TaskProposalScopeDraft {
  taskId: string;
  projectId: string;
  role: string;
  description: string;
  syntheticRepository: string;
  baseRevision: string;
  permittedFiles: string[];
  forbiddenFiles: string[];
  permittedOperations: TaskProposalOperation[];
  acceptanceCriteria: string[];
  networkPolicy: "none";
  resourceCeilings: {
    cpuCores: number;
    memoryMb: number;
    timeoutSeconds: number;
    maxProcesses: number;
    maxDiskBytes: number;
  };
}

export interface TaskProposalScope extends TaskProposalScopeDraft {
  approval: {
    approvalId: string;
    approvedBy: string;
    approvedAt: string;
    scopeHash: string;
  };
}

export interface TaskProposalReport {
  executionId: string;
  taskId: string;
  projectId: string;
  status: "simulated" | "failed";
  executionMode: "deterministic_mock" | "gemini_proposal";
  isVerified: false;
  independentReviewRequired: true;
  appliedToMainProject: false;
  diff: string;
  scopeHash: string;
  summary: {
    filesTouched: string[];
    errorCode: string | null;
  };
  proposal?: {
    taskUnderstanding: string;
    requirements: string[];
    proposedChanges: Array<{
      path: string;
      operation: TaskProposalOperation;
      rationale: string;
      patch: string;
    }>;
    acceptanceCriteria: string[];
    risks: string[];
    assumptions: string[];
    unresolvedQuestions: string[];
    verification: {
      codeExecuted: false;
      testsRun: false;
      artifactsVerified: false;
      executionEnabled: false;
    };
  };
  humanReview?: {
    reviewedBy: string;
    reviewedAt: string;
    decision: "accepted" | "rejected";
    rationale: string;
  };
}

export interface TaskProposalMockOperation {
  path: string;
  operation: TaskProposalOperation;
  content: string;
}

export interface TaskProposalWorkflowResult {
  report: TaskProposalReport;
  persistenceMode: TaskProposalPersistenceMode;
}

export class TaskProposalRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "TaskProposalRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload: unknown = await response.json();
    if (!isRecord(payload)) throw new Error();
    return payload;
  } catch {
    throw new TaskProposalRequestError("The admin proposal API returned an invalid response.", response.status);
  }
}

function errorMessage(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error.slice(0, 300)
    : fallback;
}

function canonicalScope(scope: TaskProposalScopeDraft): string {
  return JSON.stringify({
    taskId: scope.taskId,
    projectId: scope.projectId,
    role: scope.role,
    description: scope.description,
    syntheticRepository: scope.syntheticRepository,
    baseRevision: scope.baseRevision,
    permittedFiles: scope.permittedFiles,
    forbiddenFiles: scope.forbiddenFiles,
    permittedOperations: scope.permittedOperations,
    acceptanceCriteria: scope.acceptanceCriteria,
    networkPolicy: scope.networkPolicy,
    resourceCeilings: scope.resourceCeilings,
  });
}

function isTaskProposalScopeDraft(value: unknown): value is TaskProposalScopeDraft {
  if (!isRecord(value)) return false;
  const resourceCeilings = value.resourceCeilings;
  if (typeof value.taskId !== "string" ||
      typeof value.projectId !== "string" ||
      typeof value.role !== "string" ||
      typeof value.description !== "string" ||
      typeof value.syntheticRepository !== "string" ||
      typeof value.baseRevision !== "string" ||
      !Array.isArray(value.permittedFiles) ||
      !value.permittedFiles.every((path) => typeof path === "string") ||
      !Array.isArray(value.forbiddenFiles) ||
      !value.forbiddenFiles.every((path) => typeof path === "string") ||
      !Array.isArray(value.permittedOperations) ||
      !value.permittedOperations.every((operation) => operation === "create" || operation === "modify") ||
      !Array.isArray(value.acceptanceCriteria) ||
      !value.acceptanceCriteria.every((criterion) => typeof criterion === "string") ||
      value.networkPolicy !== "none" ||
      !isRecord(resourceCeilings) ||
      !["cpuCores", "memoryMb", "timeoutSeconds", "maxProcesses", "maxDiskBytes"]
        .every((limit) => typeof resourceCeilings[limit] === "number")) {
    return false;
  }
  return true;
}

function isApprovedScope(value: unknown, expected: TaskProposalScopeDraft): value is TaskProposalScope {
  if (!isRecord(value) || !isRecord(value.approval)) return false;
  const { approval, ...scope } = value;
  return typeof approval.approvalId === "string" &&
    typeof approval.approvedBy === "string" &&
    typeof approval.approvedAt === "string" &&
    typeof approval.scopeHash === "string" &&
    isTaskProposalScopeDraft(scope) &&
    canonicalScope(scope) === canonicalScope(expected);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTaskProposalReport(value: unknown, mode: TaskProposalProviderMode): value is TaskProposalReport {
  if (!isRecord(value) || !isRecord(value.summary)) return false;
  const expectedExecutionMode = mode === "gemini" ? "gemini_proposal" : "deterministic_mock";
  if (value.executionMode !== expectedExecutionMode ||
      (value.status !== "simulated" && value.status !== "failed") ||
      value.isVerified !== false ||
      value.independentReviewRequired !== true ||
      value.appliedToMainProject !== false ||
      typeof value.executionId !== "string" ||
      typeof value.taskId !== "string" ||
      typeof value.projectId !== "string" ||
      typeof value.diff !== "string" ||
      !isStringArray(value.summary.filesTouched) ||
      (value.summary.errorCode !== null && typeof value.summary.errorCode !== "string")) {
    return false;
  }
  if (value.proposal === undefined) return mode === "deterministic_mock";
  if (!isRecord(value.proposal) ||
      typeof value.proposal.taskUnderstanding !== "string" ||
      !isStringArray(value.proposal.requirements) ||
      !Array.isArray(value.proposal.proposedChanges) ||
      !value.proposal.proposedChanges.every((change) =>
        isRecord(change) &&
        typeof change.path === "string" &&
        (change.operation === "create" || change.operation === "modify") &&
        typeof change.rationale === "string" &&
        typeof change.patch === "string"
      ) ||
      !isStringArray(value.proposal.acceptanceCriteria) ||
      !isStringArray(value.proposal.risks) ||
      !isStringArray(value.proposal.assumptions) ||
      !isStringArray(value.proposal.unresolvedQuestions) ||
      !isRecord(value.proposal.verification) ||
      value.proposal.verification.codeExecuted !== false ||
      value.proposal.verification.testsRun !== false ||
      value.proposal.verification.artifactsVerified !== false ||
      value.proposal.verification.executionEnabled !== false) {
    return false;
  }
  return true;
}

async function postJson(
  fetcher: typeof fetch,
  body: Record<string, unknown>
): Promise<{ response: Response; payload: Record<string, unknown> }> {
  let response: Response;
  try {
    response = await fetcher("/api/admin/projects/task-executions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TaskProposalRequestError("The admin proposal service could not be reached.");
  }
  return { response, payload: await readPayload(response) };
}

export async function requestTaskProposal(
  scopeDraft: TaskProposalScopeDraft,
  mode: TaskProposalProviderMode,
  mockOperation?: TaskProposalMockOperation,
  fetcher: typeof fetch = fetch
): Promise<TaskProposalWorkflowResult> {
  if (mode === "deterministic_mock" &&
      (!mockOperation ||
        !scopeDraft.permittedFiles.includes(mockOperation.path) ||
        !scopeDraft.permittedOperations.includes(mockOperation.operation))) {
    throw new TaskProposalRequestError("The mock change must use an approved path and operation.");
  }

  const approval = await postJson(fetcher, {
    action: "approve_synthetic_scope",
    scope: scopeDraft,
  });
  if (!approval.response.ok || approval.payload.success !== true) {
    throw new TaskProposalRequestError(
      errorMessage(approval.payload, "The approved task scope could not be recorded."),
      approval.response.status
    );
  }
  if (approval.payload.persistenceMode !== "process_local") {
    throw new TaskProposalRequestError("The server did not identify how the approval is stored.", approval.response.status);
  }
  if (!isApprovedScope(approval.payload.scope, scopeDraft)) {
    throw new TaskProposalRequestError("The server approval did not match the submitted task scope.");
  }

  const proposal = await postJson(fetcher, mode === "gemini"
    ? {
        action: "generate_ai_proposal",
        scope: approval.payload.scope,
        taskDescription: scopeDraft.description,
      }
    : {
        action: "prepare_synthetic_proposal",
        scope: approval.payload.scope,
        operation: mockOperation,
      });
  if (proposal.payload.providerMode !== mode) {
    throw new TaskProposalRequestError("The server provider mode did not match the selected proposal mode.", proposal.response.status);
  }
  if (proposal.payload.success !== true ||
      (!proposal.response.ok && !(mode === "deterministic_mock" && proposal.response.status === 422))) {
    throw new TaskProposalRequestError(
      errorMessage(proposal.payload, "The task proposal could not be generated."),
      proposal.response.status
    );
  }
  if (proposal.payload.persistenceMode !== "process_local") {
    throw new TaskProposalRequestError("The server did not identify how the proposal is stored.", proposal.response.status);
  }
  if (!isTaskProposalReport(proposal.payload.report, mode)) {
    throw new TaskProposalRequestError("The server returned a proposal with unexpected status or verification metadata.", proposal.response.status);
  }
  return {
    report: proposal.payload.report,
    persistenceMode: proposal.payload.persistenceMode,
  };
}

export async function reviewTaskProposal(
  report: TaskProposalReport,
  decision: "accepted" | "rejected",
  rationale: string,
  fetcher: typeof fetch = fetch
): Promise<TaskProposalWorkflowResult> {
  if (report.status !== "simulated" || report.isVerified !== false || report.appliedToMainProject !== false) {
    throw new TaskProposalRequestError("Only an unchanged, unverified proposal can be reviewed.");
  }
  if (!rationale.trim()) {
    throw new TaskProposalRequestError("Enter a review rationale before recording a decision.");
  }
  const { response, payload } = await postJson(fetcher, {
    action: "review_synthetic",
    report,
    decision,
    rationale: rationale.trim(),
  });
  if (!response.ok || payload.success !== true || !isRecord(payload.report) ||
      payload.persistenceMode !== "process_local" ||
      !isTaskProposalReport(payload.report, report.executionMode === "gemini_proposal" ? "gemini" : "deterministic_mock") ||
      payload.report.executionMode !== report.executionMode ||
      payload.report.appliedToMainProject !== false ||
      payload.report.isVerified !== false ||
      !isRecord(payload.report.humanReview) ||
      payload.report.humanReview.decision !== decision ||
      typeof payload.report.humanReview.reviewedAt !== "string" ||
      typeof payload.report.humanReview.reviewedBy !== "string" ||
      typeof payload.report.humanReview.rationale !== "string") {
    throw new TaskProposalRequestError(
      errorMessage(payload, "The proposal review could not be recorded safely."),
      response.status
    );
  }
  return {
    report: payload.report,
    persistenceMode: payload.persistenceMode,
  };
}
