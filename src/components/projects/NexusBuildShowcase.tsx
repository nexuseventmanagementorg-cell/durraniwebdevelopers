"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, CircleDashed, ExternalLink, LoaderCircle } from "lucide-react";
import {
  NEXUS_BUILD_MILESTONES,
  NEXUS_BUILD_PROGRESS,
  NEXUS_BUILD_WORK,
  type NexusBuildMilestoneStatus,
} from "@/lib/nexus-build-progress";

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
  completed: "Complete",
  active: "In progress",
  queued: "Next",
  blocked: "Needs key",
};

export default function NexusBuildShowcase() {
  const [selectedRole, setSelectedRole] = useState(NEXUS_BUILD_WORK[1].role);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sameOriginPreviewBlocked, setSameOriginPreviewBlocked] = useState(false);

  useEffect(() => {
    const configuredUrl = getNexusPreviewUrl();
    if (!configuredUrl) return;
    if (new URL(configuredUrl).origin === window.location.origin) {
      setSameOriginPreviewBlocked(true);
      return;
    }
    setPreviewUrl(configuredUrl);
  }, []);

  const isLocalNexusPreview = Boolean(
    previewUrl && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(previewUrl).hostname)
  );

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#111821] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-emerald-300 px-2 py-1 text-[9px] font-black uppercase text-[#11221c]">Real project build</span>
              <span className="rounded-sm border border-amber-200/30 px-2 py-1 text-[9px] font-bold uppercase text-amber-100">Human-led · AI-assisted</span>
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Nexus Property Network</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              A real DWD internal build. Follow the current assistant-engineering work, its evidence, and what still needs to be connected.
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

        <section className="mt-5 border-l-2 border-emerald-300 bg-black/20 p-4" aria-label="Nexus AI assistant MVP progress">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Nexus AI assistant MVP scope</p>
              <p className="mt-1 text-[10px] text-slate-300">Calculated from completed implementation milestones, not the whole property platform.</p>
            </div>
            <p className="text-2xl font-black text-white">{NEXUS_BUILD_PROGRESS.percentComplete}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-sm bg-white/10" role="progressbar" aria-label="Completed Nexus AI assistant MVP milestones" aria-valuemin={0} aria-valuemax={NEXUS_BUILD_PROGRESS.totalMilestones} aria-valuenow={NEXUS_BUILD_PROGRESS.completedMilestones}>
            <div className="h-full bg-emerald-300 transition-all duration-500" style={{ width: `${NEXUS_BUILD_PROGRESS.percentComplete}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] text-slate-400">
            <span>{NEXUS_BUILD_PROGRESS.completedMilestones} of {NEXUS_BUILD_PROGRESS.totalMilestones} milestones complete</span>
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
                        Evidence: {item.file} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <aside className="self-start border-l-2 border-emerald-300 bg-emerald-300/[0.06] p-4">
            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Current build gate</p>
            <h3 className="mt-2 text-base font-extrabold">Model connection is not configured yet</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              The server-side Gemini gateway is implemented, but it needs a server-only provider key. Property records are still sample/local data; no verified live inventory is connected.
            </p>
            <p className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-relaxed text-slate-400">
              Work items above point to real repository evidence. Agent portraits and movement in the office below are a visualisation, not telemetry from autonomous workers.
            </p>
          </aside>
        </div>

        <section className="mt-6 border-t border-white/10 pt-5" aria-label="Live Nexus website preview">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">Website under construction</p>
              <h3 className="mt-1 text-sm font-extrabold">Live Nexus Property Network preview</h3>
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
                {isLocalNexusPreview ? "Live local Vite server · updates as the app hot-reloads" : "Shared HTTPS preview deployment"}
              </div>
              <iframe
                title="Live Nexus Property Network website build"
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
                Local development embeds `http://127.0.0.1:3001`. For public visitors, set `NEXT_PUBLIC_NEXUS_PREVIEW_URL` to the externally hosted HTTPS preview deployment; a visitor cannot reach a developer's localhost.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}