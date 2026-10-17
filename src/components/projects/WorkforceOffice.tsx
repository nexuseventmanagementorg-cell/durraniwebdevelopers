"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Code2,
  Eye,
  FileSearch,
  Layers3,
  Monitor,
  Paintbrush2,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PublicProjectProgress, PublicProjectMilestoneStatus } from "@/lib/types";

const AGENTS: {
  role: string;
  task: string;
  milestoneId: string;
  icon: LucideIcon;
  color: string;
  avatar: string;
}[] = [
  { role: "Requirements Analyst", task: "Reviewing project scope", milestoneId: "requirements", icon: FileSearch, color: "text-sky-700 bg-sky-100", avatar: "🧑🏻‍💼" },
  { role: "UI / UX Designer", task: "Planning the experience", milestoneId: "planning", icon: Paintbrush2, color: "text-violet-700 bg-violet-100", avatar: "👩🏽‍🎨" },
  { role: "Solution Architect", task: "Mapping the build plan", milestoneId: "planning", icon: Layers3, color: "text-indigo-700 bg-indigo-100", avatar: "🧑🏽‍💻" },
  { role: "Web Developer", task: "Building the website", milestoneId: "development", icon: Code2, color: "text-emerald-700 bg-emerald-100", avatar: "👨🏽‍💻" },
  { role: "QA Engineer", task: "Checking every detail", milestoneId: "quality", icon: Eye, color: "text-amber-700 bg-amber-100", avatar: "👩🏻‍🔬" },
  { role: "Release Manager", task: "Preparing a safe launch", milestoneId: "launch", icon: Rocket, color: "text-rose-700 bg-rose-100", avatar: "🧑🏾‍🚀" },
];

const STATUS_LABELS: Record<PublicProjectMilestoneStatus, string> = {
  waiting: "Waiting",
  ready: "Up next",
  active: "In progress",
  awaiting_admin: "Review",
  completed: "Complete",
};

function DemoOffice({ activeIndex }: { activeIndex: number }) {
  return AGENTS.map((agent, index) => {
    const state: PublicProjectMilestoneStatus =
      index < activeIndex ? "completed" :
        index === activeIndex ? "active" :
          index === activeIndex + 1 ? "ready" : "waiting";
    return { agent, state };
  });
}

export default function WorkforceOffice({ progress }: { progress?: PublicProjectProgress | null }) {
  const [demoIndex, setDemoIndex] = useState(2);
  const isDemo = !progress;

  useEffect(() => {
    if (!isDemo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setDemoIndex((current) => (current + 1) % AGENTS.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isDemo]);

  const officeAgents = isDemo
    ? DemoOffice({ activeIndex: demoIndex })
    : AGENTS.map((agent) => ({
        agent,
        state: progress.milestones.find((milestone) => milestone.id === agent.milestoneId)?.status ?? "waiting",
      }));
  const activeAgent = officeAgents.find(({ state }) => state === "active");

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#252b35] bg-[#101216] text-white shadow-2xl">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 bg-[#171a20] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              DWD digital studio
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${isDemo ? "bg-amber-300/10 text-amber-200" : "bg-sky-300/10 text-sky-200"}`}>
              {isDemo ? "Interactive demo" : "Project room"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
            {isDemo ? "Meet the website team" : progress.projectName}
          </h2>
          <p className="mt-1 text-[11px] text-gray-400">
            {isDemo
              ? "A sample animation showing how each project moves through our delivery workflow."
              : activeAgent
                ? `${activeAgent.agent.role} · ${activeAgent.agent.task}`
                : "Project stages update as our team advances the approved workflow."}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E31E36]/15 text-[#ff6b7d]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
              {isDemo ? "Sample workflow" : "Milestones complete"}
            </p>
            <p className="text-lg font-black leading-tight text-white">
              {isDemo ? "Design → Launch" : `${progress.percentComplete}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-[#242a31] p-3 sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {officeAgents.map(({ agent, state }, index) => {
            const AgentIcon = agent.icon;
            const isActive = state === "active";
            const isComplete = state === "completed";
            return (
              <article
                key={agent.role}
                className={`relative min-h-[166px] overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                  isActive
                    ? "border-emerald-300/70 bg-[#f6f5eb] shadow-[0_0_26px_rgba(52,211,153,0.18)]"
                    : isComplete
                      ? "border-emerald-300/35 bg-[#eef3e9]"
                      : "border-white/10 bg-[#e8e6dc]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${agent.color}`}>
                      <AgentIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[11px] font-extrabold leading-tight text-[#20252b]">{agent.role}</h3>
                      <p className="mt-0.5 text-[9px] text-gray-500">DWD project team</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide ${
                    isActive ? "bg-emerald-600 text-white" :
                      isComplete ? "bg-emerald-100 text-emerald-800" :
                        state === "ready" ? "bg-sky-100 text-sky-800" :
                          state === "awaiting_admin" ? "bg-amber-100 text-amber-900" : "bg-gray-200 text-gray-500"
                  }`}>
                    {isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                    {isComplete && <Check className="h-2.5 w-2.5" />}
                    {STATUS_LABELS[state]}
                  </span>
                </div>

                <div className="mt-3 flex items-end gap-3">
                  <div className={`flex h-16 w-14 shrink-0 items-center justify-center rounded-t-[22px] border border-black/10 bg-gradient-to-b from-white to-[#d8d6cb] text-[30px] shadow-inner ${isActive ? "animate-bounce [animation-duration:1.8s] motion-reduce:animate-none" : ""}`}>
                    <span aria-hidden="true">{agent.avatar}</span>
                  </div>
                  <div className="mb-1 min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-[#252a30]">
                      {isActive ? agent.task : isComplete ? "Milestone finished" : state === "ready" ? "Getting ready" : "Standing by"}
                    </p>
                    <div className="mt-2 flex h-9 items-end gap-1 rounded-lg border border-black/5 bg-white/65 px-2 py-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((bar) => (
                        <span
                          key={bar}
                          className={`w-full rounded-t-[2px] transition-all duration-500 motion-reduce:animate-none ${isActive ? "animate-pulse bg-emerald-500/70" : isComplete ? "bg-emerald-500/45" : "bg-slate-400/40"}`}
                          style={{
                            height: `${isActive ? 25 + ((bar * 17 + index * 11) % 65) : isComplete ? 52 : 18 + ((bar * 13 + index * 7) % 32)}%`,
                            animationDelay: `${bar * 90}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mb-1 hidden h-8 w-10 items-center justify-center rounded-md border border-black/10 bg-[#d3d6d0] text-[#4b5563] sm:flex">
                    <Monitor className="h-4 w-4" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
              <Layers3 className="h-3 w-3" />
            </span>
            {isDemo ? "Sample project workflow" : "Secure client project workflow"}
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Production launch always needs admin approval
          </div>
        </div>
      </div>

      <p className="border-t border-white/10 bg-[#171a20] px-5 py-3 text-[9px] leading-relaxed text-gray-500 sm:px-7">
        {isDemo
          ? "Demo note: this animation is illustrative sample activity, not a live AI coding session. Verify an inquiry below to see its real saved workflow milestones."
          : "This visual reflects saved workflow milestones; it does not stream the local editor or live code changes. Personal details and private admin notes are never shown here."}
      </p>
    </section>
  );
}
