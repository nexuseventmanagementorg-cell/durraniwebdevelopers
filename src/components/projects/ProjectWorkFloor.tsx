"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckCircle2, CircleDashed, ExternalLink, LockKeyhole, X } from "lucide-react";
import { DWD_WORKFORCE_DEPARTMENTS } from "@/lib/workforce-agents";
import { NEXUS_AGENT_ROLES, summarizeNexusAgentActivity, type NexusAgentActivityEvent } from "@/lib/nexus-agent-activity";

const DEPARTMENT_DESKS = [
  { x: 19, y: 25 },
  { x: 38, y: 25 },
  { x: 60, y: 25 },
  { x: 80, y: 25 },
  { x: 23, y: 36 },
  { x: 44, y: 36 },
  { x: 38, y: 49 },
  { x: 62, y: 49 },
  { x: 66, y: 36 },
  { x: 86, y: 36 },
] as const;

const STATUS_LABELS = {
  completed: "Complete",
  active: "Working",
  queued: "Next",
  blocked: "Blocked",
} as const;

const STATUS_STYLES = {
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  active: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  queued: "border-white/10 bg-white/[0.04] text-slate-300",
  blocked: "border-amber-200/30 bg-amber-200/[0.08] text-amber-100",
} as const;

export default function ProjectWorkFloor({ activity }: { activity: NexusAgentActivityEvent[] }) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(NEXUS_AGENT_ROLES[0].department);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const runActivity = summarizeNexusAgentActivity(activity);
  const selectedWork = runActivity.steps.filter((step) => step.department === selectedDepartment);
  const completedCount = runActivity.steps.filter((step) => step.status === "completed").length;
  const activeCount = runActivity.steps.filter((step) => step.status === "working").length;
  const blockedCount = runActivity.steps.filter((step) => step.status === "failed").length;
  const selectedWorkItem = runActivity.steps.find((step) => step.step === selectedStep);
  const selectedStepEvents = selectedWorkItem
    ? activity.filter((event) => event.runId === runActivity.runId && event.step === selectedWorkItem.step)
    : [];

  return (
    <section className="overflow-hidden border-y border-white/10 bg-[#101216] text-white" aria-labelledby="project-floor-title">
      <header className="flex flex-col justify-between gap-4 border-b border-white/10 bg-[#171a20] px-5 py-5 sm:flex-row sm:items-end sm:px-7">
        <div>
          <span className="inline-flex items-center gap-2 rounded-sm border border-emerald-300/30 bg-emerald-300/[0.08] px-2 py-1 text-[9px] font-extrabold uppercase text-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Project activity snapshot
          </span>
          <h2 id="project-floor-title" className="mt-3 text-xl font-black sm:text-2xl">Nexus build floor</h2>
              <p className="mt-1 text-[11px] text-slate-400">Seated office artwork · department indicators reflect recorded specialist steps only.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-20 border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-lg font-black text-emerald-200">{completedCount}</p>
            <p className="text-[8px] uppercase text-slate-400">Complete</p>
          </div>
          <div className="min-w-20 border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-lg font-black text-sky-200">{activeCount}</p>
            <p className="text-[8px] uppercase text-slate-400">Active</p>
          </div>
          <div className="min-w-20 border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-lg font-black text-amber-100">{blockedCount}</p>
            <p className="text-[8px] uppercase text-slate-400">Blocked</p>
          </div>
        </div>
      </header>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,.8fr)]">
        <div className="border-b border-white/10 p-3 sm:p-5 xl:border-b-0 xl:border-r">
          <div className="relative aspect-[3/2] w-full overflow-hidden border border-white/15 bg-[#111821]">
            <Image
              src="/agency/scenes/dwd-50-agent-office-map.png"
              alt="Illustrated Durrani Web Developers office with seated team members at desks"
              fill
              sizes="(max-width: 1280px) 100vw, 62vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
            {DWD_WORKFORCE_DEPARTMENTS.map((department, index) => {
              const desk = DEPARTMENT_DESKS[index];
              const departmentSteps = runActivity.steps.filter((item) => item.department === department.name);
              const workCount = departmentSteps.filter((item) => item.status === "working").length;
              const completedDepartmentSteps = departmentSteps.filter((item) => item.status === "completed").length;
              const selected = selectedDepartment === department.name;
              return (
                <button
                  key={department.name}
                  type="button"
                  aria-label={`${department.name}, ${workCount} active Nexus tasks, ${completedDepartmentSteps} completed`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDepartment(department.name)}
                  className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border px-2 py-1.5 text-left text-[8px] font-extrabold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-2.5 sm:text-[9px] ${selected ? "border-emerald-200 bg-[#101216]/95 text-white ring-2 ring-emerald-300/80" : "border-white/30 bg-[#101216]/90 text-slate-200 hover:border-emerald-200"}`}
                  style={{ left: `${desk.x}%`, top: `${desk.y}%` }}
                >
                  {workCount > 0 ? <CheckCircle2 className="h-3 w-3 shrink-0 text-sky-200" /> : <CircleDashed className="h-3 w-3 shrink-0 text-slate-400" />}
                  <span className="max-w-24 truncate sm:max-w-36">{department.name}</span>
                  <span className="shrink-0 text-emerald-100">{workCount + completedDepartmentSteps}</span>
                </button>
              );
            })}
            <span className="absolute bottom-2 left-2 z-10 border border-white/20 bg-[#101216]/90 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-white sm:bottom-3 sm:left-3">
              Static seated-office image · no simulated walking
            </span>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
            The office image is illustrative. Movement is not simulated; department task status comes from the latest persisted model run. The 54 registry roles are not 54 autonomous agents.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Selected department</p>
              <h3 className="mt-1 text-sm font-extrabold">{selectedDepartment}</h3>
            </div>
            <span className="shrink-0 text-[9px] text-slate-400">{selectedWork.length} run steps</span>
          </div>

          {selectedWork.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {selectedWork.map((item) => (
                <li key={item.role}>
                  <button type="button" onClick={() => setSelectedStep(item.step)} className="w-full border border-white/10 bg-black/20 p-3 text-left transition hover:border-emerald-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
                    <span className="flex items-start gap-3">
                      <Image src={`/agency/avatars/${item.avatar}.webp`} alt="" width={40} height={52} className="h-12 w-9 shrink-0 bg-black/30 object-cover object-top" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-[10px] font-extrabold text-white">{item.role}</strong>
                          <span className={`border px-1.5 py-0.5 text-[8px] font-bold uppercase ${STATUS_STYLES[item.status === "working" ? "active" : item.status === "failed" ? "blocked" : item.status === "queued" ? "queued" : "completed"]}`}>{item.status === "working" ? "Working" : item.status === "failed" ? "Failed" : item.status === "queued" ? "Standby" : "Reply saved"}</span>
                        </span>
                        <span className="mt-1 block text-[9px] font-semibold text-slate-300">{item.response?.reply || item.dispatch?.instruction || item.task}</span>
                        <span className="mt-2 block text-[8px] font-bold text-emerald-200">Open recorded task events</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-3 border border-dashed border-white/15 bg-black/10 p-4">
              <p className="text-[10px] font-bold text-slate-300">No recorded work in this department.</p>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-500">Only steps from the latest saved specialist run appear here.</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[9px] text-slate-400">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
            Latest run: {runActivity.completedSteps}/{runActivity.totalSteps} saved steps · {runActivity.percentComplete}%
          </div>
        </div>
      </div>

      {selectedWorkItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="project-task-title" onClick={(event) => { if (event.target === event.currentTarget) setSelectedStep(null); }} onKeyDown={(event) => { if (event.key === "Escape") setSelectedStep(null); }}>
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-white/15 bg-[#111821] p-4 text-white shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Recorded Nexus specialist work</p>
                <h2 id="project-task-title" className="mt-1 text-lg font-black">{selectedWorkItem.role}</h2>
                <span className={`mt-2 inline-block border px-2 py-1 text-[8px] font-bold uppercase ${selectedWorkItem.status === "working" ? STATUS_STYLES.active : selectedWorkItem.status === "failed" ? STATUS_STYLES.blocked : selectedWorkItem.status === "queued" ? STATUS_STYLES.queued : STATUS_STYLES.completed}`}>{selectedWorkItem.status}</span>
              </div>
              <button type="button" onClick={() => setSelectedStep(null)} aria-label="Close task details" className="rounded border border-white/15 p-2 text-slate-300 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 py-4">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Actual model events</h3>
                {selectedStepEvents.map((event) => {
                  const participant = NEXUS_AGENT_ROLES.find((agent) => agent.role === event.senderRole);
                  return (
                    <article key={`${event.kind}-${event.createdAt}`} className="mt-3 flex items-start gap-2 border border-white/10 bg-black/20 p-3">
                      {participant ? <Image src={`/agency/avatars/${participant.avatar}.webp`} alt={`${participant.role} avatar`} width={32} height={40} className="h-10 w-8 shrink-0 bg-black/30 object-cover object-top" /> : <span className="h-10 w-8 shrink-0 border border-white/15 bg-slate-800" aria-hidden="true" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-extrabold text-white">{event.senderRole} <span className="font-normal text-slate-500">to {event.recipientRole} · {event.kind}</span></p>
                        {event.instruction && <p className="mt-2 text-[10px] leading-relaxed text-slate-200">{event.instruction}</p>}
                        {event.reply && <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-200">{event.reply}</p>}
                        <time className="mt-2 block text-[8px] text-slate-500" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                        {event.artifact && /^https:\/\//.test(event.artifact) && <a href={event.artifact} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-200">Open artifact <ExternalLink className="h-3 w-3" /></a>}
                      </div>
                    </article>
                  );
                })}
              </section>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}