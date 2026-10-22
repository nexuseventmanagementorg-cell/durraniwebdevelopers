"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import {
  requestTaskProposal,
  reviewTaskProposal,
  TaskProposalRequestError,
  type TaskProposalOperation,
  type TaskProposalPersistenceMode,
  type TaskProposalProviderMode,
  type TaskProposalReport,
  type TaskProposalScopeDraft,
} from "@/lib/task-proposal-client";

const RESOURCE_CEILINGS = {
  cpuCores: 2,
  memoryMb: 4096,
  timeoutSeconds: 1800,
  maxProcesses: 64,
  maxDiskBytes: 5 * 1024 * 1024 * 1024,
};

const FORBIDDEN_FILES = ["PROJECT_HANDOFF.md", "data/db.json", ".env*"];

export default function SyntheticTaskProposalPanel() {
  const [description, setDescription] = useState("Create a greeting helper for the synthetic fixture.");
  const [pathsText, setPathsText] = useState("src/synthetic/greeter.ts");
  const [operations, setOperations] = useState<TaskProposalOperation[]>(["create", "modify"]);
  const [criteriaText, setCriteriaText] = useState("Export formatGreeting(name: string): string");
  const [providerMode, setProviderMode] = useState<TaskProposalProviderMode>("gemini");
  const [mockContent, setMockContent] = useState("export function formatGreeting(name: string): string {\n  return `Hello, ${name}!`;\n}");
  const [mockOperation, setMockOperation] = useState<TaskProposalOperation>("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<TaskProposalReport | null>(null);
  const [persistenceMode, setPersistenceMode] = useState<TaskProposalPersistenceMode | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"accepted" | "rejected">("accepted");
  const [reviewRationale, setReviewRationale] = useState("");

  const paths = pathsText.split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
  const criteria = criteriaText.split(/\r?\n/).map((criterion) => criterion.trim()).filter(Boolean);
  const mockPath = paths[0] || "";

  const toggleOperation = (operation: TaskProposalOperation) => {
    setOperations((current) => current.includes(operation)
      ? current.filter((item) => item !== operation)
      : [...current, operation]);
  };

  const buildScope = (): TaskProposalScopeDraft => ({
    taskId: "synthetic-greeting",
    projectId: "DWD-SYNTHETIC-001",
    role: "Web Developer",
    description: description.trim(),
    syntheticRepository: "dwd-synthetic-fixture",
    baseRevision: "v1.0.0-synthetic",
    permittedFiles: paths,
    forbiddenFiles: FORBIDDEN_FILES,
    permittedOperations: operations,
    acceptanceCriteria: criteria,
    networkPolicy: "none",
    resourceCeilings: RESOURCE_CEILINGS,
  });

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    setReport(null);
    setPersistenceMode(null);
    setReviewRationale("");
    try {
      const scope = buildScope();
      const mock = providerMode === "deterministic_mock"
        ? { path: mockPath, operation: mockOperation, content: mockContent }
        : undefined;
      const result = await requestTaskProposal(scope, providerMode, mock);
      setReport(result.report);
      setPersistenceMode(result.persistenceMode);
    } catch (cause) {
      setError(cause instanceof TaskProposalRequestError
        ? cause.message
        : "The proposal request could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async () => {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      const result = await reviewTaskProposal(report, reviewDecision, reviewRationale);
      setReport(result.report);
      setPersistenceMode(result.persistenceMode);
    } catch (cause) {
      setError(cause instanceof TaskProposalRequestError
        ? cause.message
        : "The review decision could not be recorded.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy;
  const isReviewed = Boolean(report?.humanReview);

  return (
    <section aria-labelledby="synthetic-task-proposal-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#E31E36]">Synthetic task proposal</p>
          <h2 id="synthetic-task-proposal-title" className="mt-1 text-lg font-black text-[#101216]">AI proposal review</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
            This uses a synthetic fixture scope only; it is not attached to a customer project. Scope approval authorizes proposal generation, not code execution or application.
          </p>
          <p className="mt-2 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-950">
            Approval, proposal, and review state is process-local only. It is not durable and may be lost on restart or unavailable across server instances.
          </p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-extrabold uppercase text-amber-900">
          Execution disabled · sandbox NOT READY
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block text-xs font-bold text-gray-700">
          Synthetic task description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1200}
            rows={3}
            disabled={disabled}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 font-normal text-gray-900"
          />
          <span className="mt-1 block text-[10px] font-normal text-gray-500">{description.length}/1200 characters</span>
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Exact permitted file paths (one per line)
          <textarea
            value={pathsText}
            onChange={(event) => setPathsText(event.target.value)}
            rows={3}
            disabled={disabled}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 font-mono text-[11px] font-normal text-gray-900"
          />
          <span className="mt-1 block text-[10px] font-normal text-gray-500">Maximum 10 paths; paths are validated server-side.</span>
        </label>

        <fieldset className="rounded-xl border border-gray-200 p-3">
          <legend className="px-1 text-xs font-bold text-gray-700">Permitted operations</legend>
          <div className="mt-1 flex gap-5">
            {(["create", "modify"] as const).map((operation) => (
              <label key={operation} className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={operations.includes(operation)}
                  disabled={disabled}
                  onChange={() => toggleOperation(operation)}
                />
                {operation}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-xs font-bold text-gray-700">
          Acceptance criteria (one per line)
          <textarea
            value={criteriaText}
            onChange={(event) => setCriteriaText(event.target.value)}
            rows={3}
            disabled={disabled}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 font-normal text-gray-900"
          />
          <span className="mt-1 block text-[10px] font-normal text-gray-500">These exact criteria are bound to the approval; the model cannot change them.</span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Review exact approved scope</p>
        <div className="mt-2 grid gap-3 text-[11px] text-gray-700 md:grid-cols-3">
          <div><strong>Files:</strong><ul className="mt-1 list-inside list-disc font-mono">{paths.length ? paths.map((path, index) => <li key={`${path}-${index}`}>{path}</li>) : <li>None selected</li>}</ul></div>
          <div><strong>Operations:</strong><p className="mt-1">{operations.length ? operations.join(", ") : "None selected"}</p></div>
          <div><strong>Acceptance criteria:</strong><ul className="mt-1 list-inside list-disc">{criteria.length ? criteria.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>None provided</li>}</ul></div>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold text-gray-700">Proposal source</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className={`rounded-xl border p-3 text-xs ${providerMode === "gemini" ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
            <input type="radio" name="task-proposal-mode" checked={providerMode === "gemini"} disabled={disabled} onChange={() => setProviderMode("gemini")} />{" "}
            Gemini provider — no mock fallback
          </label>
          <label className={`rounded-xl border p-3 text-xs ${providerMode === "deterministic_mock" ? "border-gray-400 bg-gray-100" : "border-gray-200"}`}>
            <input type="radio" name="task-proposal-mode" checked={providerMode === "deterministic_mock"} disabled={disabled} onChange={() => setProviderMode("deterministic_mock")} />{" "}
            Deterministic mock — no provider call
          </label>
        </div>
      </fieldset>

      {providerMode === "deterministic_mock" && (
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className="text-xs font-bold text-gray-700">
            Mock operation
            <select value={mockOperation} disabled={disabled} onChange={(event) => setMockOperation(event.target.value as TaskProposalOperation)} className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-gray-900">
              {operations.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-700">
            Proposed text for the deterministic mock (never executed)
            <textarea value={mockContent} onChange={(event) => setMockContent(event.target.value)} maxLength={32 * 1024} rows={4} disabled={disabled} className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 font-mono text-[11px] font-normal text-gray-900" />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || !description.trim() || paths.length === 0 || paths.length > 10 || operations.length === 0 || criteria.length === 0 || criteria.length > 20 || (providerMode === "deterministic_mock" && (!operations.includes(mockOperation) || !mockPath || !mockContent.trim()))}
          onClick={() => void handleGenerate()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#E31E36] px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && !report ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy && !report ? "Requesting approved proposal..." : "Approve exact scope & request proposal"}
        </button>
        <span className="text-[10px] text-gray-500">Approval identity and timestamp come from the authenticated server session.</span>
      </div>

      <div aria-live="polite" className="mt-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {!report && !busy && !error && (
          <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs text-gray-500">No proposal yet. Review the synthetic scope above, select a source, then request a proposal.</p>
        )}
        {report && (
          <article className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Proposal report</h3>
                <p className="mt-1 text-[11px] text-gray-600">
                  Source: <strong>{report.executionMode === "gemini_proposal" ? "Gemini provider response" : "Deterministic mock (not AI)"}</strong>
                  {" · "}{report.status === "simulated" ? "Proposal prepared" : `Preparation failed${report.summary.errorCode ? ` (${report.summary.errorCode})` : ""}`}
                  {" · "}{persistenceMode === "process_local" ? "Temporary process-local state (not durable)" : "Persistence status unavailable"}
                </p>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-extrabold text-amber-900">
                UNVERIFIED · NOT EXECUTED · NOT APPLIED
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-950">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
              Human review records a decision only. It does not run code, run tests, apply patches, merge, or deploy. Isolation and resource limits are not enforced.
            </div>

            {report.proposal && (
              <div className="mt-4 space-y-4 text-xs text-gray-800">
                <section>
                  <h4 className="font-extrabold">Task understanding</h4>
                  <p className="mt-1 whitespace-pre-wrap">{report.proposal.taskUnderstanding}</p>
                  <ul className="mt-2 list-inside list-disc">{report.proposal.requirements.map((item, index) => <li key={`req-${index}`}>{item}</li>)}</ul>
                </section>
                <section>
                  <h4 className="font-extrabold">Proposed changes (approved scope only)</h4>
                  {report.proposal.proposedChanges.length === 0 && <p className="mt-1 text-gray-500">No file-level change was proposed.</p>}
                  {report.proposal.proposedChanges.map((change, index) => (
                    <div key={`${change.path}-${index}`} className="mt-2 rounded-lg border border-gray-200 p-3">
                      <p className="font-bold">{change.path} · {change.operation}</p>
                      <p className="mt-1">{change.rationale}</p>
                      {change.patch && <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-[10px] text-gray-100">{change.patch}</pre>}
                    </div>
                  ))}
                </section>
                <section>
                  <h4 className="font-extrabold">Acceptance criteria</h4>
                  <ul className="mt-1 list-inside list-disc">{report.proposal.acceptanceCriteria.map((item, index) => <li key={`criterion-${index}`}>{item}</li>)}</ul>
                </section>
                {([
                  ["Risks", report.proposal.risks],
                  ["Assumptions", report.proposal.assumptions],
                  ["Unresolved questions", report.proposal.unresolvedQuestions],
                ] as const).map(([heading, items]) => (
                  <section key={heading}>
                    <h4 className="font-extrabold">{heading}</h4>
                    {items.length ? <ul className="mt-1 list-inside list-disc">{items.map((item, index) => <li key={`${heading}-${index}`}>{item}</li>)}</ul> : <p className="mt-1 text-gray-500">None reported.</p>}
                  </section>
                ))}
                <p className="rounded-lg bg-gray-50 p-3 text-[10px] text-gray-700">
                  Verification: code executed — no; tests run — no; artifacts independently verified — no; execution enabled — no.
                </p>
              </div>
            )}

            {!report.proposal && (
              <div className="mt-4 space-y-3 text-xs text-gray-800">
                <p><strong>Mock output:</strong> no provider was called. Files represented: {report.summary.filesTouched.length ? report.summary.filesTouched.join(", ") : "none"}.</p>
                {report.diff && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-[10px] text-gray-100">{report.diff}</pre>}
              </div>
            )}

            {report.humanReview ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                Review recorded in this server process only: {report.humanReview.decision}. It is not durable; the proposal remains unverified and unapplied.
              </p>
            ) : report.status === "simulated" ? (
              <section className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-xs font-extrabold text-gray-900">Human review (no execution or application)</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                  <label className="text-[11px] font-bold text-gray-700">
                    Decision
                    <select value={reviewDecision} disabled={disabled} onChange={(event) => setReviewDecision(event.target.value as "accepted" | "rejected")} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900">
                      <option value="accepted">Accept proposal for review record</option>
                      <option value="rejected">Reject proposal</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-gray-700">
                    Rationale
                    <input value={reviewRationale} onChange={(event) => setReviewRationale(event.target.value)} maxLength={1000} disabled={disabled} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900" />
                  </label>
                  <button type="button" disabled={disabled || !reviewRationale.trim()} onClick={() => void handleReview()} className="self-end rounded-lg border border-gray-400 px-3 py-2 text-[11px] font-bold text-gray-800 disabled:opacity-50">
                    {busy && report ? "Recording..." : "Record review"}
                  </button>
                </div>
              </section>
            ) : null}

            {isReviewed && <p className="sr-only">Review is complete.</p>}
          </article>
        )}
      </div>
    </section>
  );
}
