"use client";

import type {
  PublicProjectProgress,
} from "@/lib/types";
import { DWD_WORKFORCE_AGENTS } from "@/lib/workforce-agents";
import { NEXUS_BUILD_PROGRESS } from "@/lib/nexus-build-progress";
import NexusBuildShowcase from "@/components/projects/NexusBuildShowcase";
import ProjectWorkFloor from "@/components/projects/ProjectWorkFloor";

export default function WorkforceOffice({
  progress,
  verifiedInquiry = false,
}: {
  progress?: PublicProjectProgress | null;
  verifiedInquiry?: boolean;
}) {
  const isDemo = !progress && !verifiedInquiry;
  const isAwaitingProject = !progress && verifiedInquiry;
  const completedMilestones = progress
    ? progress.milestones.filter((milestone) => milestone.status === "completed").length
    : isDemo ? NEXUS_BUILD_PROGRESS.completedMilestones : 0;
  const totalCount = progress?.milestones.length ?? (isDemo ? NEXUS_BUILD_PROGRESS.totalMilestones : 1);
  const percent = progress?.percentComplete ?? (isDemo ? NEXUS_BUILD_PROGRESS.percentComplete : 0);
  const firstActiveAgent = progress
    ? DWD_WORKFORCE_AGENTS.find((agent) =>
        progress.milestones.some((milestone) => milestone.id === agent.milestoneId && milestone.status === "active")
      )
    : undefined;

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
              {isDemo ? "Nexus build showcase" : isAwaitingProject ? "Inquiry verified" : "Project workspace"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
            {isDemo
              ? "Nexus Property Network"
              : isAwaitingProject
                ? "Your project room is getting ready"
                : progress?.projectName}
          </h2>
          <p className="mt-1 text-[11px] text-gray-400">
            {isDemo
              ? `Nexus AI assistant MVP · ${completedMilestones} of ${totalCount} scoped milestones complete.`
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
                {isDemo ? "Nexus MVP progress" : progress ? "Project completion" : "Project progress"}
              </p>
              <p className="text-lg font-black leading-tight text-white">
                {progress || isDemo ? `${percent}% complete` : "Not started"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-emerald-300">
                {completedMilestones} milestones done
              </p>
              <p className="text-[9px] text-gray-400">
                {progress || isDemo
                  ? `${Math.max(totalCount - completedMilestones, 0)} milestones left`
                  : "Starts after project approval"}
              </p>
            </div>
          </div>
          <div
            className="mt-2.5 h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/10"
            role="progressbar"
            aria-label={isDemo ? "Nexus AI assistant MVP progress" : "Saved project milestone progress"}
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
              ? "Progress is calculated from the scoped Nexus MVP milestones below"
              : progress
                ? `${completedMilestones} of ${totalCount} saved milestones complete`
                : "Work starts after project approval"}
          </p>
        </div>
      </header>

      <NexusBuildShowcase />

      <ProjectWorkFloor />

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
