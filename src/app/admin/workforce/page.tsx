"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { WorkforceBatch } from "@/lib/workforce-pipeline";
import { AlertTriangle, Bot, CheckCircle2, CircleHelp, Cpu, ExternalLink, LoaderCircle, Play, RotateCw, ShieldCheck } from "lucide-react";

interface WorkforceDashboardData {
  localOnly: boolean;
  storageDirectory: string;
  inquiryAgentRun: {
    runId: string;
    status: "running" | "completed" | "failed";
    updatedAt: string | null;
    tasks: Array<{
      id: string;
      role: string;
      status: "waiting" | "running" | "completed" | "failed";
      model: string | null;
      startedAt: string | null;
      completedAt: string | null;
      summary: string | null;
      error: string | null;
    }>;
    qa: { passed: number; failed: number };
    prototypeDisclaimer: string;
  } | null;
  provider: {
    name: string;
    available: boolean;
    baseUrl: string;
    models: Array<{ name: string; size: number; modifiedAt: string }>;
    error: string | null;
    selectedModelReady: boolean;
    modelError: string | null;
    lastSuccessfulAt: string | null;
    lastSuccessfulModel: string | null;
    lastError: string | null;
  };
  settings: { model: string | null; maxConcurrency: number; scheduleTime: string; scheduleEnabled: boolean };
  registry: Array<{
    id: string;
    name: string;
    department: string;
    task: string;
    stage: string;
    status: "NOT_VERIFIED" | "VERIFYING" | "VERIFIED" | "VERIFICATION_FAILED";
    taskStatus: "waiting" | "running" | "completed" | "failed" | "cancelled" | "paused" | "none";
    taskBatchId: string | null;
    taskUpdatedAt: string | null;
    handoffStatus: "delivered" | "not_delivered";
    deliveredTo: string[];
    adapter: string | null;
    statusUpdatedAt: string | null;
    statusModel: string | null;
    statusSummary: string | null;
    lastCompletedBatchId: string | null;
    lastCompletedAt: string | null;
    verificationSummary: string | null;
    statusError: string | null;
    taskError: string | null;
  }>;
  batches: WorkforceBatch[];
  events: Array<{ id: string; timestamp: string; type: string; batchId?: string; details: Record<string, unknown> }>;
  scheduleTimezone: string;
}

function artifactPreviewUrl(artifact: string, file = "index.html"): string {
  const segments = artifact.split("/");
  return `/api/admin/workforce/artifacts/${[...segments, file].map(encodeURIComponent).join("/")}`;
}

function statusStyle(status: string): string {
  if (status === "completed" || status === "VERIFIED") return "bg-emerald-100 text-emerald-800";
  if (status === "running" || status === "VERIFYING") return "bg-blue-100 text-blue-800";
  if (status === "paused" || status === "waiting" || status === "NOT_VERIFIED") return "bg-amber-100 text-amber-900";
  if (status === "failed" || status === "cancelled" || status === "VERIFICATION_FAILED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function taskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    waiting: "TASK QUEUED",
    running: "TASK RUNNING",
    paused: "TASK PAUSED",
    completed: "TASK COMPLETED",
    failed: "TASK FAILED",
    cancelled: "TASK CANCELLED",
    none: "NO BATCH TASK",
  };
  return labels[status] || "TASK UNKNOWN";
}

export default function AdminWorkforcePage() {
  const [data, setData] = useState<WorkforceDashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/workforce", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Workforce data could not be loaded.");
      setData(result as WorkforceDashboardData);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Workforce data could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selectedModel = useMemo(() => data?.settings.model || "", [data]);

  const postAction = async (action: string, extra: Record<string, string | number | boolean> = {}) => {
    setBusy(action);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The workforce action failed.");
      setNotice(result.message || "Workforce settings updated.");
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The workforce action failed.");
    } finally {
      setBusy("");
    }
  };

  const modelOptions = data?.provider.models || [];
  const roleCounts = data?.registry.reduce((counts, agent) => {
    counts[agent.status] += 1;
    return counts;
  }, { VERIFIED: 0, NOT_VERIFIED: 0, VERIFYING: 0, VERIFICATION_FAILED: 0 }) ||
    { VERIFIED: 0, NOT_VERIFIED: 0, VERIFYING: 0, VERIFICATION_FAILED: 0 };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="AI Workforce"
          subtitle="50 workforce roles, honest task status, local deliverables, and QA evidence"
          actionButton={
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700"
            >
              <RotateCw className="h-3.5 w-3.5" /> Refresh
            </button>
          }
        />
        <div className="flex-1 space-y-6 p-6">
          {!data && !loadError && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Connecting to the local workforce…
            </div>
          )}
          {loadError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div><strong>Local workforce unavailable.</strong><p className="mt-1">{loadError}</p></div>
            </div>
          )}
          {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

          {data && (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
                <strong>Local-only execution.</strong> The worker and generated files stay on this Windows PC. Vercel cannot access your private Ollama service. Generated templates are drafts; production deploys are not triggered.
              </div>

              <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">Client preview · DW-944529</h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">MANUAL PROTOTYPE · NOT AGENT OUTPUT</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">Ahlam Collections · Kept separate from the inquiry agent’s deliverable. This assistant-authored visual prototype has no live backend.</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href="http://localhost:3001/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-extrabold text-white"
                    >
                      Manual storefront <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="http://localhost:3001/admin.html"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-extrabold text-gray-700"
                    >
                      Manual admin preview <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">Inquiry agent build · DW-944529</h2>
                      {data.inquiryAgentRun ? (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusStyle(data.inquiryAgentRun.status)}`}>
                          {data.inquiryAgentRun.status === "running" ? "AGENT RUNNING" : `BUILD ${data.inquiryAgentRun.status.toUpperCase()}`}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-700">NO RUN RECORDED</span>
                      )}
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
                      Five local Ollama roles run sequentially. This panel refreshes with task records; starting the pipeline still requires an authorized local command, and new inquiries do not trigger it automatically.
                    </p>
                  </div>
                  {data.inquiryAgentRun?.updatedAt && (
                    <p className="shrink-0 text-[11px] text-gray-500">Updated {new Date(data.inquiryAgentRun.updatedAt).toLocaleString()}</p>
                  )}
                </div>

                {data.inquiryAgentRun ? (
                  <>
                    <p className="mt-3 break-all font-mono text-[10px] text-gray-500">{data.inquiryAgentRun.runId}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {data.inquiryAgentRun.tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <strong className="text-xs text-gray-800">{task.role}</strong>
                            <span className={`shrink-0 rounded px-2 py-1 text-[9px] font-extrabold ${statusStyle(task.status)}`}>
                              {taskStatusLabel(task.status)}
                            </span>
                          </div>
                          {task.model && <p className="mt-2 break-all text-[10px] text-gray-500">Model: {task.model}</p>}
                          {task.summary && <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-gray-600">{task.summary}</p>}
                          {task.error && <p role="alert" className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-red-700">{task.error}</p>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-gray-600">
                      QA checks: {data.inquiryAgentRun.qa.passed} passed · {data.inquiryAgentRun.qa.failed} failed.
                      {" "}{data.inquiryAgentRun.prototypeDisclaimer}
                    </p>
                    {data.inquiryAgentRun.status === "completed" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={artifactPreviewUrl(`projects/DW-944529-ahlam-collections-preview/agent-generated-store/${data.inquiryAgentRun.runId}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white"
                        >
                          Review agent storefront <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={artifactPreviewUrl(`projects/DW-944529-ahlam-collections-preview/agent-generated-store/${data.inquiryAgentRun.runId}`, "admin.html")}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-extrabold text-gray-700"
                        >
                          Review agent admin <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    No inquiry-specific agent run has been recorded yet. Run <code>npm.cmd run workforce:inquiry</code> in a local PowerShell window to start the approved prototype test.
                  </p>
                )}
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="font-extrabold text-[#101216]">Ollama provider health</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${data.provider.available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {data.provider.available ? "CONNECTED" : "UNAVAILABLE"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{data.provider.baseUrl}</p>
                  <label className="mt-4 block text-xs font-bold text-gray-700">
                    Default local model
                    <select
                      value={selectedModel}
                      disabled={busy !== "" || modelOptions.length === 0}
                      onChange={(event) => void postAction("set_model", { model: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
                    >
                      <option value="">Select an installed model</option>
                      {modelOptions.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
                    </select>
                  </label>
                  {data.provider.error && <p role="alert" className="mt-2 text-xs text-red-700">{data.provider.error}</p>}
                  {selectedModel && (
                    <p className={`mt-2 text-xs ${data.provider.selectedModelReady ? "text-emerald-800" : "text-amber-800"}`}>
                      Selected model readiness: {data.provider.selectedModelReady ? "ready" : data.provider.modelError || "not checked"}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500">
                    Last successful model request: {data.provider.lastSuccessfulAt
                      ? `${data.provider.lastSuccessfulModel} · ${new Date(data.provider.lastSuccessfulAt).toLocaleString()}`
                      : "none recorded"}
                  </p>
                  {data.provider.lastError && <p className="mt-1 text-[10px] text-red-700">Last batch error: {data.provider.lastError}</p>}
                  <p className="mt-3 text-[11px] text-gray-500">{modelOptions.length} installed model(s). No automatic cloud fallback.</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                  <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-[#E31E36]" /><h2 className="font-extrabold text-[#101216]">Daily production scheduler</h2></div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    Target: <strong>5 distinct concepts × 3 editions = 15 deliverables</strong>. Schedule: {data.settings.scheduleTime} {data.scheduleTimezone}. Missed dates are logged; catch-up is limited to the current day to avoid surprise backfills.
                  </p>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="flex items-center gap-2 pb-2 text-xs font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={data.settings.scheduleEnabled}
                        disabled={busy !== ""}
                        onChange={(event) => void postAction("set_schedule", { enabled: event.target.checked })}
                      />
                      Daily schedule enabled
                    </label>
                    <label className="text-xs font-bold text-gray-700">
                      Local schedule time
                      <input
                        type="time"
                        value={data.settings.scheduleTime}
                        disabled={busy !== ""}
                        onChange={(event) => void postAction("set_schedule", { time: event.target.value })}
                        className="mt-1.5 block rounded-lg border border-gray-300 bg-white p-2"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-700">
                      Build concurrency
                      <select
                        value={data.settings.maxConcurrency}
                        disabled={busy !== ""}
                        onChange={(event) => void postAction("set_concurrency", { maxConcurrency: Number(event.target.value) })}
                        className="mt-1.5 block rounded-lg border border-gray-300 bg-white p-2.5"
                      >
                        {[1, 2, 3].map((value) => <option key={value} value={value}>{value} concept(s)</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy !== "" || !data.provider.available || !selectedModel}
                      onClick={() => void postAction("start_today")}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "start_today" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Run Today&apos;s Batch
                    </button>
                    <span className="text-[11px] text-gray-500">The worker must be running in a separate terminal.</span>
                  </div>
                  <code className="mt-3 block overflow-x-auto rounded-lg bg-gray-950 p-3 text-[11px] text-emerald-200">npm.cmd run workforce:worker</code>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Role registry</p>
                  <p className="mt-1 text-2xl font-black text-[#101216]">{data.registry.length} <span className="text-sm font-bold text-gray-500">agents</span></p>
                  <p className="mt-1 text-xs text-gray-600" aria-live="polite">
                    {roleCounts.VERIFIED} capability-checked · {roleCounts.VERIFICATION_FAILED} check failed · {roleCounts.NOT_VERIFIED} not checked
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Persistent local queue</p>
                  <p className="mt-1 text-2xl font-black text-[#101216]">{data.batches.filter((batch) => ["queued", "running", "paused"].includes(batch.status)).length}</p>
                  <p className="mt-1 break-all text-xs text-gray-600">Agent state and generated websites: {data.storageDirectory}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 p-5">
                  <div><h2 className="font-extrabold text-[#101216]">Today&apos;s and recent batches</h2><p className="mt-1 text-xs text-gray-500">Controls are admin-authenticated and persisted.</p></div>
                  <Bot className="h-5 w-5 text-[#E31E36]" />
                </div>
                <div className="divide-y divide-gray-100">
                  {data.batches.length === 0 && <p className="p-5 text-sm text-gray-500">No batches yet. Select an installed Ollama model and start a batch.</p>}
                  {data.batches.map((batch) => (
                    <article key={batch.id} className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-[#101216]">{batch.id}</h3>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${statusStyle(batch.status)}`}>{batch.status}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">{batch.source}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600">Model: {batch.model || "not selected"} · Attempt {batch.attempt}/3 · {batch.targets.length} distinct business targets</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {batch.status === "queued" || batch.status === "running" ? (
                            <>
                              <button type="button" disabled={busy !== ""} onClick={() => void postAction("pause", { batchId: batch.id })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold">Pause</button>
                              <button type="button" disabled={busy !== ""} onClick={() => void postAction("cancel", { batchId: batch.id })} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">Cancel</button>
                            </>
                          ) : batch.status === "paused" ? (
                            <>
                              <button type="button" disabled={busy !== ""} onClick={() => void postAction("resume", { batchId: batch.id })} className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">Resume</button>
                              <button type="button" disabled={busy !== ""} onClick={() => void postAction("cancel", { batchId: batch.id })} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">Cancel</button>
                            </>
                          ) : batch.status === "failed" ? (
                            <button type="button" disabled={busy !== "" || batch.attempt >= 3} onClick={() => void postAction("retry", { batchId: batch.id })} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"><RotateCw className="h-3 w-3" /> Retry</button>
                          ) : null}
                        </div>
                      </div>
                      {batch.error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{batch.error}</p>}
                      <div className="grid gap-2 md:grid-cols-4">
                        {batch.tasks.map((task) => (
                          <div key={task.id} className="rounded-lg border border-gray-200 p-3">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-gray-800">{task.role}</span>
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${statusStyle(task.status)}`}>{task.status}</span>
                            </div>
                            {(task.handoff.deliveredTo?.length || 0) > 0 && (
                              <p className="mt-1 text-[10px] font-bold text-emerald-800">
                                DELIVERED TO: {task.handoff.deliveredTo?.map((agentId) =>
                                  data.registry.find((agent) => agent.id === agentId)?.name || agentId
                                ).join(", ")}
                              </p>
                            )}
                            {task.error && <p className="mt-1 text-[10px] text-red-700">{task.error}</p>}
                            {task.output && (
                              <details className="mt-2 border-t border-gray-100 pt-2">
                                <summary className="cursor-pointer text-[10px] font-bold text-blue-800">Review local agent output</summary>
                                <p className="mt-2 text-[10px] leading-relaxed text-gray-700">{task.output.summary}</p>
                                {task.output.recommendations.length > 0 && (
                                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-gray-600">
                                    {task.output.recommendations.map((recommendation, index) => <li key={`${task.id}-recommendation-${index}`}>{recommendation}</li>)}
                                  </ul>
                                )}
                                {task.output.openQuestions.length > 0 && (
                                  <div className="mt-2 text-[10px] text-gray-600">
                                    <span className="font-bold">Open questions: </span>
                                    {task.output.openQuestions.join(" · ")}
                                  </div>
                                )}
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                      {batch.concepts.length > 0 && (
                        <ul className="grid gap-2 md:grid-cols-2">
                          {batch.concepts.map((concept, index) => {
                            const basePath = batch.artifacts.find((artifact) => artifact.includes(`/template-${String(index + 1).padStart(2, "0")}-`));
                            const templateFolder = basePath?.split("/").slice(0, -1).join("/") || "";
                            return (
                              <li key={concept.businessTypeId} className="rounded-lg bg-gray-50 p-3">
                                <p className="text-xs font-bold text-[#101216]">{concept.name}</p>
                                <p className="mt-0.5 text-[10px] text-gray-500">{concept.businessTypeId} · {concept.tagline}</p>
                                {templateFolder && (
                                  <div className="mt-2 flex flex-wrap gap-3">
                                    {["starter", "business", "enterprise"].map((edition) => (
                                      <Link
                                        key={edition}
                                        href={artifactPreviewUrl(`${templateFolder}/${edition}`)}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold capitalize text-[#E31E36] hover:underline"
                                      >
                                        Preview {edition} <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {batch.qaReport && (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-950">
                          <ShieldCheck className="h-4 w-4" />
                          <strong>{batch.qaReport.passed} checks passed</strong>
                          <span>{batch.qaReport.failed} failed</span>
                          <span>Browser smoke test: NOT RUN</span>
                          {batch.artifacts.slice(-2).map((artifact) => (
                            <a key={artifact} href={`/api/admin/workforce/artifacts/${artifact.split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noreferrer" className="font-bold underline">
                              {artifact.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /><h2 className="font-extrabold text-[#101216]">50 roles — task &amp; verification status</h2></div>
                <p className="mt-1 text-xs text-gray-500">These are role-specific workflows using the shared local Ollama model or deterministic website/QA code, not 50 separate persistent AI processes. A capability check is not a completed batch task.</p>
                <p className="mt-1 text-xs text-gray-500">“Task completed” means its batch task finished. “Delivered” appears only when a completed task&apos;s artifact handoff to another role is recorded.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.registry.map((agent) => (
                    <div key={agent.id} className={`rounded-lg border p-3 ${agent.taskStatus === "running" || agent.status === "VERIFYING" ? "border-blue-300 bg-blue-50" : "border-gray-100"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="text-[11px] font-bold text-gray-800">{agent.name}</p><p className="mt-0.5 text-[10px] text-gray-500">{agent.department} · {agent.stage}</p></div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${statusStyle(agent.taskStatus)}`}>{taskStatusLabel(agent.taskStatus)}</span>
                      </div>
                      {agent.taskBatchId && <p className="mt-1 text-[9px] text-gray-400">Batch: {agent.taskBatchId}</p>}
                      {agent.taskStatus === "running" && <p className="mt-1 text-[10px] font-semibold text-blue-800" aria-live="polite">Working now · last update {agent.taskUpdatedAt ? new Date(agent.taskUpdatedAt).toLocaleTimeString() : "just now"}</p>}
                      {agent.deliveredTo.length > 0 && <p className="mt-1 text-[10px] font-bold text-emerald-800">DELIVERED TO: {agent.deliveredTo.join(", ")}</p>}
                      {agent.taskError && <p className="mt-1 text-[10px] text-red-700">{agent.taskError}</p>}
                      {agent.lastCompletedBatchId && <p className="mt-1 text-[9px] text-emerald-800">Previous task completed: {agent.lastCompletedBatchId}</p>}
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${statusStyle(agent.status)}`}>
                          {agent.status === "VERIFIED" ? "CAPABILITY CHECK PASSED" :
                            agent.status === "VERIFYING" ? "CAPABILITY CHECK RUNNING" :
                              agent.status === "VERIFICATION_FAILED" ? "CAPABILITY CHECK FAILED" : "NOT YET CHECKED"}
                        </span>
                        {agent.statusSummary && <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-gray-600">{agent.statusSummary}</p>}
                        {agent.verificationSummary && <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-gray-600">{agent.verificationSummary}</p>}
                        {agent.statusError && <p className="mt-1 text-[10px] text-red-700">{agent.statusError}</p>}
                        {agent.statusModel && <p className="mt-1 text-[9px] text-gray-400">Local check: {agent.statusModel}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2"><CircleHelp className="h-4 w-4 text-gray-500" /><h2 className="font-bold text-sm text-gray-800">Recent event log</h2></div>
                {data.events.length === 0 ? <p className="mt-2 text-xs text-gray-500">No worker events yet.</p> : (
                  <ul className="mt-3 space-y-2">
                    {data.events.slice(0, 12).map((event) => (
                      <li key={event.id} className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-2 text-[10px] text-gray-600">
                        <span><strong>{event.type}</strong>{event.batchId ? ` · ${event.batchId}` : ""}</span>
                        <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
