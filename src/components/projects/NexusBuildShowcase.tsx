"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckCircle2, ChevronDown, CircleDashed, ExternalLink, LoaderCircle } from "lucide-react";

const REPOSITORY = "https://github.com/nexuseventmanagementorg-cell/nexus.properties.network";

type BuildStatus = "completed" | "active" | "queued" | "blocked";

interface BuildRole {
  role: string;
  avatar: string;
  status: BuildStatus;
  task: string;
  output: string;
  artifact: string;
  file: string;
}

const BUILD_ROLES: BuildRole[] = [
  {
    role: "AI Systems Architect",
    avatar: "backend-architect",
    status: "completed",
    task: "Audited the 54-role registry, assistant routing, and declared backend gaps.",
    output: "Confirmed that the registry is a design catalogue and the current assistant uses local scripted replies; no model provider is connected yet.",
    artifact: `${REPOSITORY}/blob/main/NEXUS_PHASE_1_IMPLEMENTATION_REPORT_v1.0.md`,
    file: "NEXUS_PHASE_1_IMPLEMENTATION_REPORT_v1.0.md",
  },
  {
    role: "Conversation Engineer",
    avatar: "automation-workflow-engineer",
    status: "completed",
    task: "Added a server-only Gemini gateway, bounded conversation history, and honest no-key fallback.",
    output: "The drawer uses the gateway for unmatched conversation; exact sample search and FAQ answers stay deterministic. No provider key is in the browser bundle.",
    artifact: `${REPOSITORY}/blob/main/src/server/aiChat.ts`,
    file: "src/server/aiChat.ts",
  },
  {
    role: "Property Intelligence Engineer",
    avatar: "business-analyst",
    status: "queued",
    task: "Connect responses to property search evidence without inventing listings.",
    output: "Next: pass only clearly labelled sample or verified records into the response context; never upgrade sample data to verified.",
    artifact: `${REPOSITORY}/blob/main/src/utils/propertyIntentParser.ts`,
    file: "src/utils/propertyIntentParser.ts",
  },
  {
    role: "Quality & Safety Engineer",
    avatar: "qa-testing-bot",
    status: "completed",
    task: "Added five mocked tests for validation, key isolation, safeguards, and provider failures.",
    output: "All five gateway tests pass without paid API calls. Live provider quality still needs a configured key and human-reviewed evaluations.",
    artifact: `${REPOSITORY}/blob/main/tests/ai-chat.test.ts`,
    file: "tests/ai-chat.test.ts",
  },
  {
    role: "Model Operations",
    avatar: "devops-cloud-engineer",
    status: "blocked",
    task: "Enable live Gemini responses after a server-only API key is configured.",
    output: "No API key was shared or committed. Until the owner configures NEXUS_GEMINI_API_KEY in local server env and Vercel, the assistant correctly stays in local-preview mode.",
    artifact: `${REPOSITORY}/blob/main/.env.example`,
    file: ".env.example",
  },
];

const STATUS_COPY: Record<BuildStatus, string> = {
  completed: "Complete",
  active: "In progress",
  queued: "Next",
  blocked: "Needs key",
};

export default function NexusBuildShowcase() {
  const [selectedRole, setSelectedRole] = useState(BUILD_ROLES[1].role);

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

        <div className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <ol className="space-y-2">
            {BUILD_ROLES.map((item) => {
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
              The codebase currently has a scripted assistant and no connected model provider. A server-side provider key and verified property-data source are required before model replies or live listings can be claimed.
            </p>
            <p className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-relaxed text-slate-400">
              Work items above point to real repository evidence. Agent portraits and movement in the office below are a visualisation, not telemetry from autonomous workers.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}