import crypto from "crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join, resolve, relative, sep } from "path";
import { tmpdir } from "os";
import {
  NexusAgentExecutionError,
  runTaskProposalAnalyst,
  type TaskProposalResult,
} from "@/lib/nexus-agent-runtime";

export const PROPOSED_RESOURCE_LIMITS = {
  cpuCores: 2,
  memoryMb: 4096,
  timeoutSeconds: 1800,
  maxProcesses: 64,
  maxDiskBytes: 5 * 1024 * 1024 * 1024, // 5 GB
} as const;

export interface SyntheticTaskScope {
  taskId: string;
  projectId: string;
  role: string;
  description: string;
  syntheticRepository: string;
  baseRevision: string;
  permittedFiles: string[];
  forbiddenFiles: string[];
  permittedOperations: Array<"create" | "modify">;
  acceptanceCriteria: string[];
  networkPolicy: "none";
  resourceCeilings: {
    cpuCores: number;
    memoryMb: number;
    timeoutSeconds: number;
    maxProcesses: number;
    maxDiskBytes: number;
  };
  approval: {
    approvalId: string;
    approvedBy: string;
    approvedAt: string;
    scopeHash: string;
  };
}

export type SyntheticWorkerAuditEventType =
  | "approval_verified"
  | "isolation_gate_checked"
  | "temporary_directory_created"
  | "worker_not_spawned"
  | "scope_enforced"
  | "operation_performed"
  | "diff_generated"
  | "report_generated"
  | "security_violation"
  | "temporary_directory_cleaned"
  | "human_review";

export interface SyntheticWorkerAuditEntry {
  timestamp: string;
  eventType: SyntheticWorkerAuditEventType;
  actor: string;
  details: Record<string, unknown>;
}

export interface SyntheticTaskCompletionReport {
  executionId: string;
  taskId: string;
  projectId: string;
  status: "simulated" | "failed";
  claimStatus: "proposal_generated" | "claimed_failure";
  executionMode: "deterministic_mock" | "gemini_proposal";
  proposal?: TaskProposalResult;
  isVerified: false; // Decision 6: Completion reports are claims, not independent proof.
  independentReviewRequired: true;
  appliedToMainProject: false; // Changes are quarantined; never auto-applied to main project.
  scopeHash: string;
  diff: string;
  summary: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    operationsCount: number;
    filesTouched: string[];
    errorCode: "scope_violation" | "security_event" | "isolation_blocked" | "timeout" | "verification_failed" | null;
  };
  auditTrail: SyntheticWorkerAuditEntry[];
  humanReview?: {
    reviewedBy: string;
    reviewedAt: string;
    decision: "accepted" | "rejected";
    rationale: string;
  };
}

export interface IsolationCheckResult {
  isAvailable: boolean;
  isolationType: "container" | "microvm" | "none";
  blockerReason: string | null;
  minimumPrerequisite: string | null;
}

export class SecurityScopeViolationError extends Error {
  constructor(message: string, readonly violationCode: "path_traversal" | "forbidden_file" | "operation_disallowed" | "scope_hash_mismatch" | "secret_leak" | "network_disallowed") {
    super(message);
    this.name = "SecurityScopeViolationError";
  }
}

const pendingApprovals = new Map<string, { scopeHash: string; approvedBy: string }>();
const MAX_PENDING_APPROVALS = 100;
const pendingMockReports = new Map<string, string>();
const MAX_PENDING_MOCK_REPORTS = 100;

const GLOBAL_FORBIDDEN_PATTERNS = [
  /project_handoff\.md/i,
  /data\/db\.json/i,
  /\.env(\..+)?$/i,
  /\.git(\/|\\|$)/i,
  /supabase(\/|\\|$)/i,
  /package\.json$/i,
  /package-lock\.json$/i,
  /node_modules(\/|\\|$)/i,
  /^tests\//i,
  /^src\/lib\//i,
  /^src\/app\//i,
];

/**
 * Computes a deterministic SHA-256 digest of the task scope (excluding approval metadata).
 * This binds the exact task files, operations, criteria, and resource limits to human approval.
 */
export function computeScopeHash(scope: Omit<SyntheticTaskScope, "approval">): string {
  const canonicalPayload = {
    taskId: scope.taskId,
    projectId: scope.projectId,
    role: scope.role,
    description: scope.description,
    syntheticRepository: scope.syntheticRepository,
    baseRevision: scope.baseRevision,
    permittedFiles: [...scope.permittedFiles].sort(),
    forbiddenFiles: [...scope.forbiddenFiles].sort(),
    permittedOperations: [...scope.permittedOperations].sort(),
    acceptanceCriteria: [...scope.acceptanceCriteria],
    networkPolicy: scope.networkPolicy,
    resourceCeilings: {
      cpuCores: scope.resourceCeilings.cpuCores,
      memoryMb: scope.resourceCeilings.memoryMb,
      timeoutSeconds: scope.resourceCeilings.timeoutSeconds,
      maxProcesses: scope.resourceCeilings.maxProcesses,
      maxDiskBytes: scope.resourceCeilings.maxDiskBytes,
    },
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}

export function approveSyntheticTaskScope(
  scopeBase: Omit<SyntheticTaskScope, "approval">,
  approvedBy: string
): SyntheticTaskScope {
  const limits = scopeBase?.resourceCeilings;
  const positiveIntegerLimits = [
    limits?.cpuCores,
    limits?.memoryMb,
    limits?.timeoutSeconds,
    limits?.maxProcesses,
    limits?.maxDiskBytes,
  ];
  if (!scopeBase || typeof scopeBase !== "object" ||
      typeof approvedBy !== "string" || !approvedBy.trim() ||
      typeof scopeBase.taskId !== "string" || !scopeBase.taskId.trim() || scopeBase.taskId.length > 100 ||
      typeof scopeBase.role !== "string" || !scopeBase.role.trim() || scopeBase.role.length > 100 ||
      typeof scopeBase.description !== "string" || !scopeBase.description.trim() || scopeBase.description.length > 1200 ||
      /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){9,}|(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+|\b(?:sk|AIza)[-_A-Za-z0-9]{16,}/i.test(scopeBase.description) ||
      typeof scopeBase.baseRevision !== "string" || !scopeBase.baseRevision.trim() || scopeBase.baseRevision.length > 100 ||
      !Array.isArray(scopeBase.permittedFiles) ||
      scopeBase.permittedFiles.some((path) => typeof path !== "string" || path.length > 240) ||
      new Set(scopeBase.permittedFiles.map((path) => path.toLocaleLowerCase("en-US"))).size !== scopeBase.permittedFiles.length ||
      !Array.isArray(scopeBase.forbiddenFiles) ||
      scopeBase.forbiddenFiles.length > 50 ||
      scopeBase.forbiddenFiles.some((path) => typeof path !== "string" || path.length > 240) ||
      !Array.isArray(scopeBase.permittedOperations) ||
      !scopeBase.permittedOperations.length ||
      scopeBase.permittedOperations.some((operation) => operation !== "create" && operation !== "modify") ||
      new Set(scopeBase.permittedOperations).size !== scopeBase.permittedOperations.length ||
      !Array.isArray(scopeBase.acceptanceCriteria) ||
      scopeBase.acceptanceCriteria.length > 20 ||
      scopeBase.acceptanceCriteria.some((criterion) => typeof criterion !== "string" || !criterion.trim() || criterion.length > 500 ||
        /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){9,}|(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+|\b(?:sk|AIza)[-_A-Za-z0-9]{16,}/i.test(criterion)) ||
      positiveIntegerLimits.some((value) => !Number.isSafeInteger(value) || Number(value) < 1) ||
      scopeBase.projectId !== "DWD-SYNTHETIC-001" ||
      scopeBase.syntheticRepository !== "dwd-synthetic-fixture" ||
      scopeBase.networkPolicy !== "none" ||
      !scopeBase.permittedFiles.length || scopeBase.permittedFiles.length > 10 ||
      !scopeBase.acceptanceCriteria.length || scopeBase.acceptanceCriteria.length > 20 ||
      scopeBase.resourceCeilings.cpuCores > PROPOSED_RESOURCE_LIMITS.cpuCores ||
      scopeBase.resourceCeilings.memoryMb > PROPOSED_RESOURCE_LIMITS.memoryMb ||
      scopeBase.resourceCeilings.timeoutSeconds > PROPOSED_RESOURCE_LIMITS.timeoutSeconds ||
      scopeBase.resourceCeilings.maxProcesses > PROPOSED_RESOURCE_LIMITS.maxProcesses ||
      scopeBase.resourceCeilings.maxDiskBytes > PROPOSED_RESOURCE_LIMITS.maxDiskBytes) {
    throw new SecurityScopeViolationError("Synthetic approval scope is invalid or exceeds the proposed bounds.", "scope_hash_mismatch");
  }
  if (pendingApprovals.size >= MAX_PENDING_APPROVALS) {
    throw new Error("Too many synthetic approvals are pending in this process.");
  }

  const approvalId = crypto.randomUUID();
  const approvedAt = new Date().toISOString();
  const scope: SyntheticTaskScope = {
    ...scopeBase,
    approval: {
      approvalId,
      approvedBy: approvedBy.trim(),
      approvedAt,
      scopeHash: computeScopeHash(scopeBase),
    },
  };
  if (scope.permittedFiles.some((file) => !validateTaskPath(file, scope).valid)) {
    throw new SecurityScopeViolationError("Approval includes a forbidden or non-canonical path.", "forbidden_file");
  }
  pendingApprovals.set(approvalId, {
    scopeHash: scope.approval.scopeHash,
    approvedBy: scope.approval.approvedBy.toLowerCase(),
  });
  return scope;
}

/**
 * Confirms the scope was approved by this process and has not changed since approval.
 */
export function verifyApprovalScope(scope: SyntheticTaskScope): boolean {
  if (!scope.approval || typeof scope.approval.scopeHash !== "string" ||
      !scope.approval.approvalId || !scope.approval.approvedBy) {
    return false;
  }
  const approvedAt = Date.parse(scope.approval.approvedAt);
  if (!Number.isFinite(approvedAt) || approvedAt > Date.now()) return false;
  const expectedHash = computeScopeHash(scope);
  const storedApproval = pendingApprovals.get(scope.approval.approvalId);
  return Boolean(storedApproval &&
    storedApproval.scopeHash === scope.approval.scopeHash &&
    storedApproval.approvedBy === scope.approval.approvedBy.trim().toLowerCase() &&
    expectedHash.length === scope.approval.scopeHash.length &&
    crypto.timingSafeEqual(Buffer.from(expectedHash, "utf8"), Buffer.from(scope.approval.scopeHash, "utf8")));
}

function consumeApproval(scope: SyntheticTaskScope, adminUser: string): boolean {
  if (!verifyApprovalScope(scope) ||
      scope.approval.approvedBy.trim().toLowerCase() !== adminUser.trim().toLowerCase()) {
    return false;
  }
  pendingApprovals.delete(scope.approval.approvalId);
  return true;
}

/**
 * Reports whether this application has a verified isolation backend configured.
 * No such backend is currently configured, so arbitrary code execution is unavailable.
 */
export function checkHostIsolationCapability(): IsolationCheckResult {
  return {
    isAvailable: false,
    isolationType: "none",
    blockerReason:
      "No independently verified isolation backend is configured for this application. A temporary directory or Git worktree is not a security boundary.",
    minimumPrerequisite:
      "Requires an independently verified microVM (e.g. Firecracker, gVisor) or OCI container engine (Docker/Podman with dropped capabilities, read-only root mount, isolated network namespace, and cgroups v2 resource ceilings).",
  };
}

/**
 * Canonicalizes and enforces server-side path allowlists.
 * Rejects path traversal, Windows drive letters, URL schemes, forbidden files, and unlisted paths.
 */
export function validateTaskPath(
  targetPath: string,
  scope: SyntheticTaskScope
): { valid: boolean; normalizedPath: string; error?: string } {
  if (!targetPath || typeof targetPath !== "string") {
    return { valid: false, normalizedPath: "", error: "Target path must be a non-empty string." };
  }

  // Reject Windows drive letters (e.g. C:, D:)
  if (/^[A-Za-z]:/i.test(targetPath)) {
    return { valid: false, normalizedPath: "", error: "Absolute drive letters are strictly forbidden." };
  }

  // Reject URI schemes (e.g. file://, http://)
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/i.test(targetPath)) {
    return { valid: false, normalizedPath: "", error: "URI schemes are strictly forbidden." };
  }

  // Reject backslashes to prevent Windows traversal bypasses
  if (targetPath.includes("\\")) {
    return { valid: false, normalizedPath: "", error: "Backslashes are forbidden; use forward slashes." };
  }

  // Reject leading slash
  if (targetPath.startsWith("/")) {
    return { valid: false, normalizedPath: "", error: "Absolute paths are forbidden." };
  }

  // Normalize path using forward slash
  const segments = targetPath.split("/");
  if (segments.some((seg) =>
    seg === ".." || seg === "." || seg === "" ||
    /[\u0000-\u001f\u007f:]/.test(seg) ||
    /[. ]$/.test(seg) ||
    /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(seg)
  )) {
    return { valid: false, normalizedPath: "", error: "Path traversal segments (.. or .) are strictly forbidden." };
  }

  const normalized = segments.join("/");

  // Check global forbidden patterns (protects PROJECT_HANDOFF.md, data/db.json, .env, etc.)
  for (const pattern of GLOBAL_FORBIDDEN_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, normalizedPath: normalized, error: `Access to ${normalized} is globally forbidden.` };
    }
  }

  // Check task-specific forbidden files
  for (const forbidden of scope.forbiddenFiles) {
    if (normalized === forbidden || normalized.startsWith(forbidden.replace(/\*$/, ""))) {
      return { valid: false, normalizedPath: normalized, error: `Path ${normalized} is in the forbidden list.` };
    }
  }

  // Check explicit permitted files allowlist
  if (!scope.permittedFiles.includes(normalized)) {
    return {
      valid: false,
      normalizedPath: normalized,
      error: `Path ${normalized} is not in the explicit permitted files allowlist.`,
    };
  }

  return { valid: true, normalizedPath: normalized };
}

/**
 * Creates an empty, sanitized execution environment.
 * Excludes all ambient environment variables and credentials from process.env.
 */
export function createSanitizedWorkerEnvironment(
  customSyntheticVars?: Record<string, string>
): Record<string, string> {
  const sanitized: Record<string, string> = {
    NODE_ENV: "test",
    DWD_WORKER_MODE: "synthetic_mock",
    ...(customSyntheticVars || {}),
  };

  // Verify that no forbidden real secrets leaked into the environment
  const sensitiveKeywords = [
    "SECRET",
    "KEY",
    "TOKEN",
    "PASSWORD",
    "SUPABASE",
    "RESEND",
    "SAFEPAY",
    "CRON",
    "DATABASE",
  ];

  for (const [key, value] of Object.entries(sanitized)) {
    for (const kw of sensitiveKeywords) {
      if (key.toUpperCase().includes(kw) && !key.startsWith("SYNTHETIC_")) {
        throw new SecurityScopeViolationError(
          `Environment variable ${key} contains sensitive keyword ${kw}.`,
          "secret_leak"
        );
      }
    }
  }

  return sanitized;
}

/**
 * Creates a temporary text-staging directory. It is not a security sandbox.
 */
export function createTemporaryMockWorkspace(
  executionId: string,
  initialFiles: Record<string, string>
): { workspaceDir: string; cleanup: () => void } {
  const baseDir = mkdtempSync(join(tmpdir(), `dwd-synthetic-${executionId.slice(0, 8)}-`));

  try {
    if (Object.keys(initialFiles).length > 10) {
      throw new SecurityScopeViolationError("Too many synthetic fixture files.", "path_traversal");
    }
    let totalBytes = 0;
    for (const [relPath, content] of Object.entries(initialFiles)) {
      if (!relPath || relPath.includes("\\") || relPath.startsWith("/") ||
          relPath.split("/").some((segment) => !segment || segment === "." || segment === "..") ||
          typeof content !== "string" || Buffer.byteLength(content, "utf8") > 32 * 1024) {
        throw new SecurityScopeViolationError("Unsafe or oversized synthetic workspace fixture.", "path_traversal");
      }
      totalBytes += Buffer.byteLength(content, "utf8");
      if (totalBytes > 128 * 1024) {
        throw new SecurityScopeViolationError("Synthetic fixture exceeds the text staging limit.", "path_traversal");
      }
      const fullPath = resolve(baseDir, ...relPath.split("/"));
      const relativePath = relative(baseDir, fullPath);
      if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
        throw new SecurityScopeViolationError("Synthetic fixture escaped its temporary directory.", "path_traversal");
      }
      const parent = resolve(fullPath, "..");
      if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
      writeFileSync(fullPath, content, "utf8");
    }
  } catch (error) {
    rmSync(baseDir, { recursive: true, force: true });
    throw error;
  }

  return {
    workspaceDir: baseDir,
    cleanup: () => {
      if (existsSync(baseDir)) rmSync(baseDir, { recursive: true, force: false });
    },
  };
}

/**
 * Computes a standard unified diff between two text strings.
 */
export function generateUnifiedDiff(filePath: string, originalText: string, newText: string): string {
  if (originalText === newText) {
    return "";
  }

  const originalLines = originalText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${originalLines.length} +1,${newLines.length} @@\n`;
  const diffBody = [
    ...originalLines.map((line) => `-${line}`),
    ...newLines.map((line) => `+${line}`),
  ].join("\n");

  return header + diffBody;
}

/**
 * Checks whether an execution failure is safe and repeatable to allow retry.
 * Stop immediately on security events, scope violations, and retry exhaustion (Decision 7).
 */
export function canRetryExecution(
  report: SyntheticTaskCompletionReport,
  attemptCount: number,
  maxAttempts = 3
): boolean {
  if (attemptCount >= maxAttempts) {
    return false;
  }
  const code = report.summary.errorCode;
  if (code === "scope_violation" || code === "security_event" || code === "isolation_blocked") {
    return false; // Security events and scope violations can NEVER be retried!
  }
  return report.status === "failed" && code === "timeout";
}

function fingerprintReport(report: SyntheticTaskCompletionReport): string {
  return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");
}

/**
 * Produces a deterministic text-only proposal. This does not invoke AI, execute code,
 * run tests, or provide an isolation boundary.
 */
export async function prepareSyntheticTaskProposal(options: {
  scope: SyntheticTaskScope;
  requestedOperation: {
    path: string;
    operation: "create" | "modify";
    content: string;
  };
  adminUser: string;
  simulatedInitialFiles?: Record<string, string>;
}): Promise<SyntheticTaskCompletionReport> {
  if (pendingMockReports.size >= MAX_PENDING_MOCK_REPORTS) {
    throw new Error("Too many unreviewed mock proposals are pending in this process.");
  }
  const startedAt = new Date().toISOString();
  const startTimeMs = Date.now();
  const executionId = crypto.randomUUID();
  const auditTrail: SyntheticWorkerAuditEntry[] = [];

  const addAudit = (eventType: SyntheticWorkerAuditEventType, details: Record<string, unknown>) => {
    auditTrail.push({
      timestamp: new Date().toISOString(),
      eventType,
      actor: options.adminUser || "system",
      details,
    });
  };

  // 1. Authorization check
  if (!options.adminUser || typeof options.adminUser !== "string" || !options.adminUser.trim()) {
    throw new Error("Execution requires an authenticated admin user.");
  }

  // 2. Scope approval verification (Decision 12)
  if (!consumeApproval(options.scope, options.adminUser)) {
    addAudit("security_violation", { reason: "Scope approval hash mismatch or unapproved scope" });
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval?.scopeHash || "",
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }
  addAudit("approval_verified", { scopeHash: options.scope.approval.scopeHash });

  // This check records that no real execution boundary is available. The mock below
  // only stages text and never executes the submitted content.
  const isolation = checkHostIsolationCapability();
  addAudit("isolation_gate_checked", {
    isAvailable: isolation.isAvailable,
    blocker: isolation.blockerReason,
  });

  // 4. Server-side path validation (Decision 2)
  const pathValidation = validateTaskPath(options.requestedOperation.path, options.scope);
  if (!pathValidation.valid) {
    addAudit("security_violation", {
      path: options.requestedOperation.path,
      reason: pathValidation.error,
    });
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval.scopeHash,
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }
  addAudit("scope_enforced", { path: pathValidation.normalizedPath });

  // 5. Operation validation
  if (!options.scope.permittedOperations.includes(options.requestedOperation.operation)) {
    addAudit("security_violation", {
      operation: options.requestedOperation.operation,
      reason: "Operation not in permittedOperations",
    });
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval.scopeHash,
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }

  if (typeof options.requestedOperation.content !== "string" ||
      Buffer.byteLength(options.requestedOperation.content, "utf8") > 32 * 1024) {
    addAudit("security_violation", { reason: "Synthetic proposal content exceeds the 32 KiB limit." });
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval.scopeHash,
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }

  // No child process is started, so no environment is passed to a worker.
  addAudit("worker_not_spawned", { reason: "Text-only deterministic mock; no code execution." });

  // 7. Temporary text staging only; this directory is not an isolation boundary.
  const initialFiles = options.simulatedInitialFiles || {
    [pathValidation.normalizedPath]: "// Initial synthetic fixture code\nexport const initial = true;\n",
  };

  if (options.requestedOperation.operation === "create" && initialFiles[pathValidation.normalizedPath] !== undefined ||
      options.requestedOperation.operation === "modify" && initialFiles[pathValidation.normalizedPath] === undefined) {
    addAudit("security_violation", { reason: "Create/modify operation does not match the synthetic fixture state." });
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval.scopeHash,
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }

  if (Object.entries(initialFiles).some(([path, content]) =>
      !validateTaskPath(path, options.scope).valid ||
      Buffer.byteLength(content, "utf8") > 32 * 1024)) {
    return {
      executionId,
      taskId: options.scope.taskId,
      projectId: options.scope.projectId,
      status: "failed",
      claimStatus: "claimed_failure",
      executionMode: "deterministic_mock",
      isVerified: false,
      independentReviewRequired: true,
      appliedToMainProject: false,
      scopeHash: options.scope.approval.scopeHash,
      diff: "",
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
        operationsCount: 0,
        filesTouched: [],
        errorCode: "scope_violation",
      },
      auditTrail,
    };
  }

  const { workspaceDir, cleanup } = createTemporaryMockWorkspace(executionId, initialFiles);
  addAudit("temporary_directory_created", { fileCount: Object.keys(initialFiles).length });

  let diff = "";
  try {
    const originalContent = initialFiles[pathValidation.normalizedPath] || "";
    const newContent = options.requestedOperation.content;

    // Write file to disposable workspace only (never touches main project)
    const targetFileFullPath = join(workspaceDir, pathValidation.normalizedPath);
    writeFileSync(targetFileFullPath, newContent, "utf8");

    diff = generateUnifiedDiff(pathValidation.normalizedPath, originalContent, newContent);
    addAudit("operation_performed", {
      path: pathValidation.normalizedPath,
      operation: options.requestedOperation.operation,
      bytesWritten: Buffer.byteLength(newContent, "utf8"),
    });
    addAudit("diff_generated", { diffLength: diff.length });
  } finally {
    // 8. Clean up workspace
    cleanup();
    addAudit("temporary_directory_cleaned", { fileCount: Object.keys(initialFiles).length });
  }

  // 9. Return a simulated proposal, not an execution result.
  const report: SyntheticTaskCompletionReport = {
    executionId,
    taskId: options.scope.taskId,
    projectId: options.scope.projectId,
    status: "simulated",
    claimStatus: "proposal_generated",
    executionMode: "deterministic_mock",
    isVerified: false, // Decision 6: Explicitly unverified claim
    independentReviewRequired: true,
    appliedToMainProject: false, // Quarantined: not applied
    scopeHash: options.scope.approval.scopeHash,
    diff,
    summary: {
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTimeMs,
      operationsCount: 1,
      filesTouched: [pathValidation.normalizedPath],
      errorCode: null,
    },
    auditTrail,
  };

  addAudit("report_generated", { status: "simulated", isVerified: false });
  pendingMockReports.set(executionId, fingerprintReport(report));
  return report;
}

export async function generateAIBackedTaskProposal(options: {
  scope: SyntheticTaskScope;
  taskDescription: string;
  adminUser: string;
  apiKey: string;
  fetcher?: typeof fetch;
}): Promise<SyntheticTaskCompletionReport> {
  if (pendingMockReports.size >= MAX_PENDING_MOCK_REPORTS) {
    throw new Error("Too many unreviewed proposals are pending in this process.");
  }
  const description = options.taskDescription.trim();
  if (!description || description.length > 1200 ||
      /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){9,}|(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+|\b(?:sk|AIza)[-_A-Za-z0-9]{16,}/i.test(description) ||
      description !== options.scope.description ||
      options.scope.projectId !== "DWD-SYNTHETIC-001" ||
      options.scope.syntheticRepository !== "dwd-synthetic-fixture" ||
      options.scope.networkPolicy !== "none" ||
      !options.scope.permittedFiles.length ||
      options.scope.permittedFiles.length > 10 ||
      !options.scope.acceptanceCriteria.length ||
      options.scope.acceptanceCriteria.length > 20 ||
      options.scope.permittedFiles.some((path) => !validateTaskPath(path, options.scope).valid) ||
      options.scope.resourceCeilings.cpuCores > PROPOSED_RESOURCE_LIMITS.cpuCores ||
      options.scope.resourceCeilings.memoryMb > PROPOSED_RESOURCE_LIMITS.memoryMb ||
      options.scope.resourceCeilings.timeoutSeconds > PROPOSED_RESOURCE_LIMITS.timeoutSeconds ||
      options.scope.resourceCeilings.maxProcesses > PROPOSED_RESOURCE_LIMITS.maxProcesses ||
      options.scope.resourceCeilings.maxDiskBytes > PROPOSED_RESOURCE_LIMITS.maxDiskBytes) {
    throw new NexusAgentExecutionError("The task proposal request is invalid or outside the synthetic scope.", "invalid_output");
  }
  if (!consumeApproval(options.scope, options.adminUser)) {
    throw new NexusAgentExecutionError("A current approval by this authenticated admin for the exact task scope is required.", "invalid_output");
  }

  const startedAt = new Date().toISOString();
  const startTimeMs = Date.now();
  const executionId = crypto.randomUUID();
  const auditTrail: SyntheticWorkerAuditEntry[] = [
    {
      timestamp: startedAt,
      eventType: "approval_verified",
      actor: options.adminUser,
      details: { scopeHash: options.scope.approval.scopeHash },
    },
    {
      timestamp: new Date().toISOString(),
      eventType: "isolation_gate_checked",
      actor: options.adminUser,
      details: { isAvailable: false, codeExecution: false },
    },
    {
      timestamp: new Date().toISOString(),
      eventType: "worker_not_spawned",
      actor: options.adminUser,
      details: { provider: "gemini", toolExecution: false, codeExecution: false },
    },
  ];

  const proposal = await runTaskProposalAnalyst({
    taskDescription: description,
    approvedFiles: options.scope.permittedFiles,
    approvedOperations: options.scope.permittedOperations,
    acceptanceCriteria: options.scope.acceptanceCriteria,
    sourceContext: [],
  }, options.apiKey, options.fetcher);

  if (proposal.proposedChanges.some((change) =>
      !validateTaskPath(change.path, options.scope).valid ||
      !options.scope.permittedOperations.includes(change.operation))) {
    throw new NexusAgentExecutionError("The AI provider proposed a change outside the approved task scope.", "invalid_output");
  }

  const report: SyntheticTaskCompletionReport = {
    executionId,
    taskId: options.scope.taskId,
    projectId: options.scope.projectId,
    status: "simulated",
    claimStatus: "proposal_generated",
    executionMode: "gemini_proposal",
    proposal,
    isVerified: false,
    independentReviewRequired: true,
    appliedToMainProject: false,
    scopeHash: options.scope.approval.scopeHash,
    diff: proposal.proposedChanges.map((change) => change.patch).filter(Boolean).join("\n"),
    summary: {
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTimeMs,
      operationsCount: proposal.proposedChanges.length,
      filesTouched: proposal.proposedChanges.map((change) => change.path),
      errorCode: null,
    },
    auditTrail: auditTrail.concat({
      timestamp: new Date().toISOString(),
      eventType: "report_generated",
      actor: options.adminUser,
      details: { provider: "gemini", isVerified: false },
    }),
  };
  pendingMockReports.set(executionId, fingerprintReport(report));
  return report;
}

/**
 * Human review of the quarantined task result (Decision 8 & 12).
 * Records reviewer decision and rationale, but NEVER applies changes to the main project.
 */
export function reviewSyntheticTaskResult(
  report: SyntheticTaskCompletionReport,
  reviewerAdmin: string,
  decision: "accepted" | "rejected",
  rationale: string
): SyntheticTaskCompletionReport {
  const expectedFingerprint = pendingMockReports.get(report.executionId);
  if (!expectedFingerprint || expectedFingerprint !== fingerprintReport(report) || report.status !== "simulated") {
    throw new Error("Only an unchanged mock proposal created by this server process can be reviewed.");
  }
  if (!reviewerAdmin || typeof reviewerAdmin !== "string" || !reviewerAdmin.trim()) {
    throw new Error("Review requires an authorized reviewer admin.");
  }
  if (!rationale || typeof rationale !== "string" || !rationale.trim()) {
    throw new Error("Review requires an explicit rationale.");
  }

  const updatedReport: SyntheticTaskCompletionReport = {
    ...report,
    appliedToMainProject: false, // Strictly false: Review acceptance never merges/applies to main repo!
    humanReview: {
      reviewedBy: reviewerAdmin.trim(),
      reviewedAt: new Date().toISOString(),
      decision,
      rationale: rationale.trim(),
    },
    auditTrail: [
      ...report.auditTrail,
      {
        timestamp: new Date().toISOString(),
        eventType: "human_review",
        actor: reviewerAdmin.trim(),
        details: { decision, rationale: rationale.trim() },
      },
    ],
  };

  pendingMockReports.delete(report.executionId);
  return updatedReport;
}
