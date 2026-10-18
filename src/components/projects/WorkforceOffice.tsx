"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2, Check, Clock3, Monitor, Rocket } from "lucide-react";
import type {
  PublicProjectMilestoneStatus,
  PublicProjectProgress,
} from "@/lib/types";
import {
  DWD_WORKFORCE_AGENTS,
  DWD_WORKFORCE_DEPARTMENTS,
} from "@/lib/workforce-agents";
import LiveAgencyGame from "@/components/projects/LiveAgencyGame";

const STATUS_LABELS: Record<PublicProjectMilestoneStatus, string> = {
  waiting: "Waiting",
  ready: "Up next",
  active: "In progress",
  awaiting_admin: "Team review",
  completed: "Complete",
};

const DEPARTMENT_TONES = {
  blue: "text-sky-200",
  violet: "text-violet-200",
  green: "text-emerald-200",
  amber: "text-amber-200",
  rose: "text-rose-200",
} as const;

export default function WorkforceOffice({
  progress,
  verifiedInquiry = false,
}: {
  progress?: PublicProjectProgress | null;
  verifiedInquiry?: boolean;
}) {
  const [selectedCampusAgent, setSelectedCampusAgent] = useState<string | null>(null);
  const isDemo = !progress && !verifiedInquiry;
  const isAwaitingProject = !progress && verifiedInquiry;

  const agentsWithStatus = DWD_WORKFORCE_AGENTS.map((agent) => {
    const savedStatus = progress?.milestones.find(
      (milestone) => milestone.id === agent.milestoneId,
    )?.status;
    const status = isDemo || isAwaitingProject
      ? "waiting"
      : savedStatus ?? "waiting";

    return { ...agent, status };
  });

  const activeAgents = agentsWithStatus.filter(({ status }) => status === "active");
  const completedMilestones =
    progress?.milestones.filter((milestone) => milestone.status === "completed").length ?? 0;
  const totalCount = progress?.milestones.length ?? DWD_WORKFORCE_AGENTS.length;
  const percent = progress?.percentComplete ?? 0;
  const firstActiveAgent = activeAgents[0];

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#252b35] bg-[#101216] text-white shadow-2xl">
      <header className="flex flex-col justify-between gap-4 border-b border-white/10 bg-[#171a20] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e31e36]/30 bg-[#e31e36]/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e31e36]" />
              DWD agency district
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${isDemo ? "bg-amber-300/10 text-amber-200" : isAwaitingProject ? "bg-sky-300/10 text-sky-200" : "bg-emerald-300/10 text-emerald-200"}`}>
              {isDemo ? "Illustrative demo" : isAwaitingProject ? "Inquiry verified" : "Project workspace"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
            {isDemo
              ? "Welcome to the DWD digital agency"
              : isAwaitingProject
                ? "Your project room is getting ready"
                : progress?.projectName}
          </h2>
          <p className="mt-1 text-[11px] text-gray-400">
            {isDemo
              ? `${DWD_WORKFORCE_AGENTS.length} illustrated specialist roles across ${DWD_WORKFORCE_DEPARTMENTS.length} departments.`
              : isAwaitingProject
                ? "Your inquiry is verified. Project milestone updates appear here once your project is approved and created."
                : firstActiveAgent
                  ? `${firstActiveAgent.role} · ${firstActiveAgent.task}`
                  : "Team status below is mapped from this project's saved workflow milestones."}
          </p>
        </div>

        <div className="min-w-48 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {isDemo ? "Project progress" : progress ? "Project completion" : "Project progress"}
              </p>
              <p className="text-lg font-black leading-tight text-white">
                {progress ? `${percent}% complete` : "Not started"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-emerald-300">
                {completedMilestones} milestones done
              </p>
              <p className="text-[9px] text-gray-400">
                {progress
                  ? `${Math.max(totalCount - completedMilestones, 0)} milestones left`
                  : "Starts after project approval"}
              </p>
            </div>
          </div>
          <div
            className="mt-2.5 h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/10"
            role="progressbar"
            aria-label="Saved project milestone progress"
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-valuenow={completedMilestones}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300 shadow-[0_0_12px_rgba(110,231,183,0.45)] transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[8px] text-gray-500">
            {isDemo
              ? "Project progress changes only when real milestones are saved"
              : progress
                ? `${completedMilestones} of ${totalCount} saved milestones complete`
                : "Work starts after project approval"}
          </p>
        </div>
      </header>

      <LiveAgencyGame />

      <div className="relative overflow-hidden bg-[#61725a] p-3 sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(35deg, transparent 47%, rgba(211,226,186,.16) 48%, rgba(211,226,186,.16) 51%, transparent 52%), radial-gradient(circle at 18% 28%, #b0c98b 0 2px, transparent 3px), radial-gradient(circle at 75% 76%, #b0c98b 0 2px, transparent 3px)",
            backgroundSize: "170px 120px, 32px 32px, 38px 38px",
          }}
        />

        <div className="relative mb-3 flex flex-col gap-3 rounded-2xl border border-white/20 bg-[#26313a] p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black">
              <Image
                src="/logo.jpg"
                alt="Durrani Web Developers logo"
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-rose-300">
                Durrani Web Developers
              </p>
              <h3 className="text-sm font-black text-white sm:text-base">Agency City · Main Campus</h3>
              <p className="text-[9px] text-slate-300">
                {DWD_WORKFORCE_DEPARTMENTS.length} office buildings · {DWD_WORKFORCE_AGENTS.length} unique portraits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-gray-300 sm:self-center">
            <Building2 className="h-3.5 w-3.5 text-amber-300" />
            Top-down office district
          </div>
        </div>

        <div className="relative mb-3 flex items-center gap-2 overflow-hidden rounded-lg border-y-4 border-[#3a4245] bg-[#30383b] px-3 py-2">
          <span className="shrink-0 rounded bg-[#e31e36] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white">
            DWD campus
          </span>
          <div className="flex flex-1 items-center justify-center gap-2 opacity-80" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} className="h-0.5 flex-1 rounded bg-amber-200/80" />
            ))}
          </div>
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-slate-300">
            Main street
          </span>
        </div>

        <div className="relative grid gap-4 lg:grid-cols-2">
          {DWD_WORKFORCE_DEPARTMENTS.map((department, departmentIndex) => {
            const departmentAgents = department.agentRoles.map((role) =>
              agentsWithStatus.find((agent) => agent.role === role)!,
            );

            return (
              <section
                key={department.name}
                className="overflow-hidden rounded-2xl border-[5px] border-[#c9b58c] bg-[#ded3b8] p-2 shadow-[0_8px_0_rgba(36,47,40,.55),0_12px_22px_rgba(0,0,0,.25)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#303a40] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 className={`h-3.5 w-3.5 shrink-0 ${DEPARTMENT_TONES[department.tone]}`} />
                    <h3 className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-white">
                      {department.name}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-gray-200">
                    {department.agentRoles.length} desks
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {departmentAgents.map((agent) => {
                    const agentIndex = DWD_WORKFORCE_AGENTS.findIndex(
                      (item) => item.role === agent.role,
                    );
                    const isActive = agent.status === "active";
                    const isComplete = agent.status === "completed";
                    const isReady = agent.status === "ready";
                    const isSelected = selectedCampusAgent === agent.role;

                    return (
                      <button
                        type="button"
                        key={agent.role}
                        onClick={() =>
                          setSelectedCampusAgent((current) =>
                            current === agent.role ? null : agent.role,
                          )
                        }
                        aria-label={`${agent.role}, ${agent.task}, ${STATUS_LABELS[agent.status]}`}
                        aria-expanded={isSelected}
                        className={`w-full overflow-hidden rounded-xl border bg-[#f6f3e9] text-left shadow-sm transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e31e36] ${
                          isActive
                            ? "border-emerald-500 ring-2 ring-emerald-400/60"
                            : isComplete
                              ? "border-emerald-700/40"
                              : isReady
                                ? "border-sky-500/50"
                                : "border-[#665e4c]/20"
                        }`}
                      >
                        <div className="relative h-[92px] overflow-hidden bg-[#17191d] sm:h-[108px]">
                          <Image
                            src={`/agency/avatars/${agent.avatar}.webp`}
                            alt={`${agent.role} portrait`}
                            width={192}
                            height={144}
                            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 26vw, 16vw"
                            className={`h-full w-full object-cover object-top ${
                              isActive ? "dwd-agent-walking" : "dwd-agent-working"
                            }`}
                            style={{ animationDelay: `${(agentIndex % 10) * -110}ms` }}
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-4">
                            <span className="truncate text-[9px] font-bold text-white sm:text-[10px]">
                              {agent.role}
                            </span>
                            <span
                              className={`ml-1 h-2 w-2 shrink-0 rounded-full ${
                                isActive
                                  ? "animate-pulse bg-emerald-300"
                                  : isComplete
                                    ? "bg-emerald-400"
                                    : isReady
                                      ? "bg-sky-300"
                                      : "bg-slate-500"
                              }`}
                            />
                          </div>
                          {isActive && (
                            <span className="absolute right-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex min-h-[58px] items-center justify-between gap-1.5 px-2 py-2">
                          <div className="min-w-0">
                            <p className="min-h-7 overflow-hidden text-[9px] font-semibold leading-3.5 text-[#343b42] sm:text-[10px]">
                              {agent.task}
                            </p>
                            <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wide text-slate-500">
                              {STATUS_LABELS[agent.status]}
                            </p>
                          </div>
                          <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded border border-black/10 bg-[#d7d6cd] text-[#46515b]">
                            {isComplete ? (
                              <Check className="h-3 w-3 text-emerald-700" />
                            ) : isActive ? (
                              <Monitor className="h-3 w-3 animate-pulse text-emerald-700" />
                            ) : (
                              <Clock3 className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="border-t border-[#665e4c]/20 bg-white/80 px-2 py-2.5 text-[9px] leading-relaxed text-[#343b42] sm:text-[10px]">
                            <span className="block font-extrabold text-[#101216]">
                              Current task
                            </span>
                            <span className="mt-0.5 block">{agent.task}</span>
                            <span className="mt-1 block font-bold text-slate-500">
                              {department.name} · {STATUS_LABELS[agent.status]}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {departmentIndex < DWD_WORKFORCE_DEPARTMENTS.length - 1 && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-[7px] font-extrabold uppercase tracking-[0.16em] text-[#615b4f]">
                    <span className="h-px w-8 bg-[#988b70]" />
                    Campus road
                    <span className="h-px w-8 bg-[#988b70]" />
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#26313a] px-4 py-3">
          <div className="flex items-center gap-2 text-[9px] font-bold text-gray-200">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
              <Rocket className="h-3 w-3 text-amber-200" />
            </span>
            {isDemo
              ? "Full-agency showcase"
              : isAwaitingProject
                ? "Project setup is pending"
                : "Your saved project workflow"}
          </div>
          <div className="text-[8px] text-gray-400">
            Project launch requires DWD team approval
          </div>
        </div>
      </div>

      <p className="border-t border-white/10 bg-[#171a20] px-5 py-3 text-[9px] leading-relaxed text-gray-400 sm:px-7">
        {isDemo
          ? "Illustrative agency showcase: portraits, desk animations and roles are a visual demo, not a live roster or connected autonomous AI workers. Project progress changes only when real milestones are saved. Enter a valid inquiry reference and matching email to open your project room."
          : isAwaitingProject
            ? "Your inquiry is verified. No project work is shown as started until DWD creates and approves its project workflow."
            : "This view maps the project's saved workflow milestones to relevant specialties; it does not claim individual autonomous agents are connected or show a live editor stream. Private notes and customer data are not displayed."}
      </p>
    </section>
  );
}
