"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, CircleDashed, ExternalLink, LoaderCircle } from "lucide-react";
import {
  NEXUS_BUILD_MILESTONES,
  NEXUS_BUILD_PROGRESS,
  NEXUS_BUILD_WORK,
  type NexusBuildMilestoneStatus,
} from "@/lib/nexus-build-progress";
import { NEXUS_AGENT_ROLES, summarizeNexusAgentActivity, type NexusAgentActivityEvent } from "@/lib/nexus-agent-activity";

const REPOSITORY = "https://github.com/nexuseventmanagementorg-cell/nexus.properties.network";

function getNexusPreviewUrl(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_NEXUS_PREVIEW_URL?.trim();
  const previewUrl = configuredUrl || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3001" : "");
  if (!previewUrl) return null;

  try {
    const url = new URL(previewUrl);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const isAllowedProtocol = url.protocol === "https:" || (process.env.NODE_ENV === "development" && isLoopback && url.protocol === "http:");
    if (!isAllowedProtocol || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const STATUS_COPY: Record<NexusBuildMilestoneStatus, string> = {
  completed: "Marked complete",
  active: "Marked in progress",
  queued: "Next",
  blocked: "Marked blocked",
};

export default function NexusBuildShowcase({
  activity,
  activityAvailable,
  activityError,
  isAdmin,
}: {
  activity: NexusAgentActivityEvent[];
  activityAvailable: boolean;
  activityError: string;
  isAdmin: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState(NEXUS_BUILD_WORK[1].role);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sameOriginPreviewBlocked, setSameOriginPreviewBlocked] = useState(false);
  const [runGoal, setRunGoal] = useState("Prepare requirements for a property search website with property listings, filters, and inquiry forms. Identify assumptions and open questions.");
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [runError, setRunError] = useState("");
  const [runResult, setRunResult] = useState<{
    summary: string;
    requirements: string[];
    acceptanceCriteria: string[];
    openQuestions: string[];
  } | null>(null);
  const requestId = useRef<string | null>(null);
  const runActivity = summarizeNexusAgentActivity(activity);

  const startAgentRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsStartingRun(true);
    setRunError("");
    try {
      requestId.current ||= crypto.randomUUID();
      const response = await fetch("/api/admin/workforce/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: runGoal, requestId: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.runId) requestId.current = null;
        throw new Error(result.error || "The Nexus agent run could not start.");
      }
      setRunResult(result.run?.result || null);
      requestId.current = null;
      window.dispatchEvent(new Event("nexus-activity-refresh"));
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "The Nexus agent run could not start.");
    } finally {
      setIsStartingRun(false);
    }
  };

  useEffect(() => {
    const configuredUrl = getNexusPreviewUrl();
    if (!configuredUrl) return;
    if (new URL(configuredUrl).origin === window.location.origin) {
      setSameOriginPreviewBlocked(true);
      return;
    }
    setPreviewUrl(configuredUrl);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void fetch("/api/admin/workforce/requirements", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const latestCompleted = Array.isArray(data?.runs)
          ? data.runs.find((run: { status?: string; result?: unknown }) => run.status === "completed" && run.result)
          : null;
        setRunResult(latestCompleted?.result || null);
      })
      .catch(() => {
        if (active) setRunError("Saved agent results could not be loaded.");
      });
    return () => { active = false; };
  }, [isAdmin]);

  const isLocalNexusPreview = Boolean(
    previewUrl && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(previewUrl).hostname)
  );

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#111821] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-emerald-300 px-2 py-1 text-[9px] font-black uppercase text-[#11221c]">Project showcase</span>
              <span className="rounded-sm border border-amber-200/30 px-2 py-1 text-[9px] font-bold uppercase text-amber-100">Human-led · AI-assisted</span>
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Nexus Property Network</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              The panel combines saved Requirements Analyst run status, a static source-linked checklist, and an optional website preview. It is not a live multi-agent build or task-execution feed.
            </p>
          </div>
          <a
            href={REPOSITORY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-white/20 px-3 py-2 text-[10px] font-bold text-white hover:bg-white/10 sm:self-auto"
          >
            Open source repository <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <section className="mt-5 border-l-2 border-sky-300 bg-black/20 p-4" aria-label="Saved Requirements Analyst run status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-sky-200">Requirements Analyst · saved run status</p>
              <h3 className="mt-1 text-lg font-extrabold">Nexus Property Network</h3>
              <p className="mt-1 text-[10px] text-slate-300">An authenticated admin can trigger the Gemini Requirements Analyst to draft a summary, requirements, acceptance criteria, open questions, and capability evidence for review. Provider availability and reliable persistence are unverified.</p>
            </div>
            <span className={`border px-2 py-1 text-[9px] font-bold uppercase ${runActivity.status === "working" ? "border-sky-300/40 text-sky-100" : runActivity.status === "completed" ? "border-emerald-300/40 text-emerald-100" : runActivity.status === "failed" ? "border-rose-300/40 text-rose-100" : "border-white/15 text-slate-300"}`}>
              {runActivity.status === "idle" ? "No saved run" : `Saved status: ${runActivity.status}`}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="text-[10px] text-slate-300">Requirements Analyst run status from saved record</span>
            <strong className="text-xl font-black text-white">{runActivity.percentComplete}%</strong>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden border border-white/10 bg-white/10" role="progressbar" aria-label="Saved Requirements Analyst run status" aria-valuemin={0} aria-valuemax={runActivity.totalSteps} aria-valuenow={runActivity.completedSteps}>
            <div className="h-full bg-sky-300 transition-[width] duration-500" style={{ width: `${runActivity.percentComplete}%` }} />
          </div>
          <div className="mt-3 grid gap-2">
            {NEXUS_AGENT_ROLES.map((agent, index) => {
              const step = runActivity.steps.find((item) => item.step === index + 1);
              const status = step?.status || "queued";
              return (
                <article key={agent.role} className="flex min-w-0 items-start gap-2 border border-white/10 bg-black/20 p-2.5">
                  <Image src={`/agency/avatars/${agent.avatar}.webp`} alt="" width={36} height={46} className="h-11 w-8 shrink-0 bg-black/30 object-cover object-top" />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-extrabold text-white">{agent.role}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">{status === "working" ? "Saved status: running" : status === "completed" ? "Saved status: completed" : status === "failed" ? "Saved status: failed" : "No saved run status"}</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-slate-300">{step?.response?.reply || agent.task}</p>
                  </div>
                </article>
              );
            })}
          </div>
          {!activityAvailable && <p className="mt-3 text-[10px] text-amber-100" role="status">{activityError || "Saved Requirements Analyst activity is unavailable."}</p>}
          {activityAvailable && runActivity.status === "idle" && <p className="mt-3 text-[10px] text-slate-400" role="status">No Requirements Analyst run record is available.</p>}
          {isAdmin && (
            <form onSubmit={startAgentRun} className="mt-4 border-t border-white/10 pt-3">
              <label htmlFor="nexus-agent-goal" className="block text-[9px] font-bold uppercase tracking-wide text-slate-300">Project instruction</label>
              <textarea id="nexus-agent-goal" value={runGoal} onChange={(event) => setRunGoal(event.target.value)} maxLength={1200} rows={2} className="mt-2 w-full resize-y border border-white/15 bg-black/30 p-2 text-[10px] text-white outline-none focus:border-sky-200" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-xl text-[9px] leading-relaxed text-slate-500">This drafts requirements only; it cannot edit files, execute code, install packages, or deploy. A successful response is intended to be saved, but storage reliability and provider availability are not verified. Do not enter personal or confidential information.</p>
                <button type="submit" disabled={isStartingRun || !activityAvailable || !runGoal.trim()} className="border border-sky-200/40 bg-sky-300/10 px-3 py-2 text-[9px] font-bold text-sky-100 hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-40">
                  {isStartingRun ? "Running analyst..." : "Run Requirements Analyst"}
                </button>
              </div>
              {runError && <p className="mt-2 text-[10px] text-rose-200" role="alert">{runError}</p>}
              {runResult && (
                <div className="mt-3 space-y-2 border border-white/10 bg-black/20 p-3 text-[10px]">
                  <p className="font-bold text-white">{runResult.summary}</p>
                  <div>
                    <h4 className="font-bold text-sky-100">Requirements</h4>
                    <ul className="list-disc space-y-1 pl-4 text-slate-300">{runResult.requirements.map((item, index) => <li key={`requirement-${index}`}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sky-100">Acceptance criteria</h4>
                    <ul className="list-disc space-y-1 pl-4 text-slate-300">{runResult.acceptanceCriteria.map((item, index) => <li key={`criterion-${index}`}>{item}</li>)}</ul>
                  </div>
                  {runResult.openQuestions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-amber-100">Open questions</h4>
                      <ul className="list-disc space-y-1 pl-4 text-slate-300">{runResult.openQuestions.map((item, index) => <li key={`question-${index}`}>{item}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </section>

        <section className="mt-5 border-l-2 border-emerald-300 bg-black/20 p-4" aria-label="Nexus AI assistant MVP progress">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Static Nexus assistant implementation checklist</p>
              <p className="mt-1 text-[10px] text-slate-300">Statuses are values in source code, not live agent telemetry or verification of project artifacts, executed tests, provider availability, or deployment.</p>
            </div>
            <p className="text-2xl font-black text-white">{NEXUS_BUILD_PROGRESS.percentComplete}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-sm bg-white/10" role="progressbar" aria-label="Milestones marked complete in static Nexus checklist" aria-valuemin={0} aria-valuemax={NEXUS_BUILD_PROGRESS.totalMilestones} aria-valuenow={NEXUS_BUILD_PROGRESS.completedMilestones}>
            <div className="h-full bg-emerald-300 transition-all duration-500" style={{ width: `${NEXUS_BUILD_PROGRESS.percentComplete}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] text-slate-400">
            <span>{NEXUS_BUILD_PROGRESS.completedMilestones} of {NEXUS_BUILD_PROGRESS.totalMilestones} marked complete in checklist</span>
            <span>{NEXUS_BUILD_MILESTONES.filter((milestone) => milestone.status === "blocked").length} blocked · {NEXUS_BUILD_MILESTONES.filter((milestone) => milestone.status === "queued").length} next</span>
          </div>
          <details className="mt-3 border-t border-white/10 pt-2">
            <summary className="cursor-pointer text-[10px] font-bold text-slate-200">View scope milestones</summary>
            <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {NEXUS_BUILD_MILESTONES.map((milestone) => (
                <li key={milestone.label} className="flex items-center justify-between gap-3 text-[9px]">
                  <span className="text-slate-300">{milestone.label}</span>
                  <span className={milestone.status === "completed" ? "shrink-0 text-emerald-200" : milestone.status === "blocked" ? "shrink-0 text-amber-200" : "shrink-0 text-slate-400"}>{STATUS_COPY[milestone.status]}</span>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <div className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <ol className="space-y-2">
            {NEXUS_BUILD_WORK.map((item) => {
              const selected = selectedRole === item.role;
              const StatusIcon = item.status === "completed"
                ? CheckCircle2
                : item.status === "active"
                  ? LoaderCircle
                  : CircleDashed;
              return (
                <li key={item.role}>
                  <button
                    type="button"
                    aria-expanded={selected}
                    onClick={() => setSelectedRole(selected ? "" : item.role)}
                    className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${selected ? "border-emerald-300/60 bg-white/[0.08]" : "border-white/10 bg-black/10 hover:bg-white/[0.05]"}`}
                  >
                    <Image
                      src={`/agency/avatars/${item.avatar}.webp`}
                      alt=""
                      width={48}
                      height={64}
                      className="h-14 w-11 shrink-0 rounded-sm bg-black/30 object-cover object-top"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-xs font-extrabold">{item.role}</strong>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase ${item.status === "active" ? "text-emerald-200" : item.status === "completed" ? "text-slate-300" : "text-amber-100"}`}>
                          <StatusIcon className={`h-3 w-3 ${item.status === "active" ? "animate-spin" : ""}`} />
                          {STATUS_COPY[item.status]}
                        </span>
                      </span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-slate-300">{item.task}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${selected ? "rotate-180" : ""}`} />
                  </button>
                  {selected && (
                    <div className="ml-3 border-l border-emerald-300/40 px-4 py-3">
                      <p className="text-[10px] leading-relaxed text-slate-200">{item.output}</p>
                      <a
                        href={item.artifact}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-200 hover:text-white"
                      >
                        Source reference: {item.file} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <aside className="self-start border-l-2 border-emerald-300 bg-emerald-300/[0.06] p-4">
            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Static integration note</p>
            <h3 className="mt-2 text-base font-extrabold">Provider availability is unverified</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              The source checklist marks live model verification as blocked; this is not an environment health check. This showcase did not verify a provider key or live inventory. The referenced property records are described as sample/local data.
            </p>
            <p className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-relaxed text-slate-400">
              Work items above are static entries with source links, not verified execution artifacts. Agent portraits and office artwork are illustrative, not telemetry from autonomous workers.
            </p>
          </aside>
        </div>

        <section className="mt-6 border-t border-white/10 pt-5" aria-label="Configured Nexus website preview">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Optional website preview</p>
              <h3 className="mt-1 text-sm font-extrabold">Configured Nexus Property Network preview</h3>
            </div>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-200 hover:text-white">
                Open preview separately <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {previewUrl ? (
            <>
              <div className="mb-2 flex items-center gap-2 text-[9px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {isLocalNexusPreview ? "Local preview URL · availability not checked here" : "Configured HTTPS preview URL · availability not checked here"}
              </div>
              <iframe
                title="Configured Nexus Property Network website preview"
                src={previewUrl}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="h-[640px] w-full rounded-md border border-white/15 bg-white sm:h-[760px]"
              />
            </>
          ) : sameOriginPreviewBlocked ? (
            <div className="border-l-2 border-amber-200 bg-amber-100/[0.06] p-4">
              <p className="text-xs font-bold text-amber-100">Preview URL must use a separate origin</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-300">For security, the embedded site must be hosted on a different origin from DWD.</p>
            </div>
          ) : (
            <div className="border-l-2 border-amber-200 bg-amber-100/[0.06] p-4">
              <p className="text-xs font-bold text-amber-100">Public preview URL not configured</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
                Local development embeds `http://127.0.0.1:3001`. For public visitors, set `NEXT_PUBLIC_NEXUS_PREVIEW_URL` to the externally hosted HTTPS preview deployment; a visitor cannot reach a developer&apos;s localhost.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}