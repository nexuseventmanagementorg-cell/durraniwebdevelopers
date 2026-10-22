"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  DWD_WORKFORCE_AGENTS,
  DWD_WORKFORCE_DEPARTMENTS,
  WorkforceAgent,
  WorkforceDepartment,
} from "@/lib/workforce-agents";
import { BUSINESS_INFO, buildWhatsAppLink } from "@/lib/constants";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Bot,
  Lock,
  Workflow,
  X,
  ExternalLink,
  Code2,
  FileCheck,
  Check,
  ChevronRight,
  Eye,
  AlertTriangle,
  HelpCircle,
  Calculator,
  MessageSquare,
} from "lucide-react";

interface MilestoneStageInfo {
  id: "requirements" | "planning" | "development" | "quality" | "preview" | "launch";
  number: string;
  title: string;
  shortDesc: string;
  humanGate: string;
  gateDetail: string;
  badgeTone: "blue" | "violet" | "green" | "amber" | "rose" | "emerald";
}

const LIFECYCLE_STAGES: MilestoneStageInfo[] = [
  {
    id: "requirements",
    number: "01",
    title: "Requirements & Scope",
    shortDesc: "Client brief ingestion, structured user stories, feature scoping, and preliminary budget calculation.",
    humanGate: "Scope Review (Planned)",
    gateDetail: "A planning checkpoint for reviewing scope and quotation; this directory does not enforce it.",
    badgeTone: "blue",
  },
  {
    id: "planning",
    number: "02",
    title: "Architecture & Planning",
    shortDesc: "Data models, UI/UX journey wireframing, tech stack selection, and delivery task graph definition.",
    humanGate: "Architecture Review (Planned)",
    gateDetail: "A planning checkpoint for architecture and feasibility; this directory does not enforce it.",
    badgeTone: "violet",
  },
  {
    id: "development",
    number: "03",
    title: "Development & Build",
    shortDesc: "Illustrative examples: frontend interfaces, backend APIs, content, CMS setup, and commerce workflows.",
    humanGate: "Admin Implementation Approval",
    gateDetail: "An authenticated admin must approve an implementation task before an execution record can be created. No project worker runs that record.",
    badgeTone: "green",
  },
  {
    id: "quality",
    number: "04",
    title: "Quality & Security",
    shortDesc: "Illustrative review areas: responsiveness, SEO, performance, security, and accessibility.",
    humanGate: "QA Evidence Review (Planned)",
    gateDetail: "Execution evidence is metadata-only here. No task test runner currently generates or verifies test results.",
    badgeTone: "emerald",
  },
  {
    id: "preview",
    number: "05",
    title: "Client Preview & Staging",
    shortDesc: "Preview sharing and client feedback planning; this showcase does not provide an isolated staging environment.",
    humanGate: "Client Preview Review (Planned)",
    gateDetail: "A planned review checkpoint; this directory does not provide staging or enforce client sign-off.",
    badgeTone: "amber",
  },
  {
    id: "launch",
    number: "06",
    title: "Launch & Delivery",
    shortDesc: "Release and handover planning; this showcase does not initiate production deployment.",
    humanGate: "Release Authorization (Planned)",
    gateDetail: "A planned release checkpoint; this directory does not perform a deployment or verify handover.",
    badgeTone: "rose",
  },
];

const TONE_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-300",
    badge: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-300",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-300",
    badge: "bg-violet-500/20 text-violet-200 border-violet-500/40",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  },
};

export default function WorkforcePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMilestone, setSelectedMilestone] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<WorkforceAgent | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAgent(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredAgents = useMemo(() => {
    return DWD_WORKFORCE_AGENTS.filter((agent) => {
      const department = DWD_WORKFORCE_DEPARTMENTS.find((d) =>
        d.agentRoles.includes(agent.role)
      );

      const matchesDepartment =
        selectedDepartment === "all" || department?.name === selectedDepartment;

      const matchesMilestone =
        selectedMilestone === "all" || agent.milestoneId === selectedMilestone;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        agent.role.toLowerCase().includes(q) ||
        agent.task.toLowerCase().includes(q) ||
        (department?.name && department.name.toLowerCase().includes(q));

      return matchesDepartment && matchesMilestone && matchesSearch;
    });
  }, [searchQuery, selectedDepartment, selectedMilestone]);

  const specialistProfileCount = DWD_WORKFORCE_AGENTS.length;
  const departmentCount = DWD_WORKFORCE_DEPARTMENTS.length;

  const getDepartmentForRole = (role: string): WorkforceDepartment | undefined => {
    return DWD_WORKFORCE_DEPARTMENTS.find((d) => d.agentRoles.includes(role));
  };

  const getMilestoneForAgent = (agent: WorkforceAgent): MilestoneStageInfo | undefined => {
    return LIFECYCLE_STAGES.find((stage) => stage.id === agent.milestoneId);
  };

  const isRequirementsAnalystProfile = (role: string): boolean => {
    return role === "Business Analyst";
  };

  return (
    <div className="min-h-screen bg-[#101216] text-white">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#242830] bg-[#101216] py-20 lg:py-24">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f242d_1px,transparent_1px),linear-gradient(to_bottom,#1f242d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E31E36]/30 bg-[#242830] px-4 py-1.5 text-xs font-semibold text-gray-200">
              <span className="h-2 w-2 rounded-full bg-[#E31E36]" />
              <span className="font-bold text-[#E31E36]">Durrani Web Developers</span>
              <span className="text-gray-400">• Digital Agency Architecture</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              The DWD{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E31E36] via-red-500 to-rose-400">
                AI Agency Workforce
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-300 leading-relaxed">
              Explore an illustrative directory of 50 static role profiles across 10 departments. These profiles are not 50 running or independently operational AI agents; the directory is an organizational showcase, not proof that every delivery gate is implemented.
            </p>

            {/* Key Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-[#171a20] p-4 text-center">
                <span className="block text-3xl font-black text-white">{specialistProfileCount}</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Illustrative Role Profiles
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#171a20] p-4 text-center">
                <span className="block text-3xl font-black text-[#E31E36]">{departmentCount}</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Profile Departments
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#171a20] p-4 text-center">
                <span className="block text-3xl font-black text-sky-400">6</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Delivery Milestones
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#171a20] p-4 text-center">
                <span className="block text-3xl font-black text-emerald-400">1</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Model-Backed Capability
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <a
                href="#workforce-directory"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E31E36] hover:bg-[#C8162D] px-6 py-3 text-xs font-bold text-white shadow-glow transition transform hover:-translate-y-0.5"
              >
                <Users className="h-4 w-4" />
                Browse 50 Illustrative Profiles
              </a>
              <a
                href="#delivery-lifecycle"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-[#242830] hover:bg-[#2E3440] px-6 py-3 text-xs font-bold text-gray-200 hover:text-white transition"
              >
                <Workflow className="h-4 w-4 text-[#E31E36]" />
                View 6-Stage Framework
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CAPABILITY TRANSPARENCY NOTICE */}
      <section className="border-b border-[#242830] bg-[#14171D] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5 sm:p-6 text-xs text-gray-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-blue-500/20">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 font-bold text-blue-300">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Capability Transparency &amp; Engineering Truthfulness
              </span>
              <span className="text-gray-400 text-[11px]">
                Direct repository evidence &amp; operational boundaries
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] leading-relaxed">
              <div className="space-y-1.5">
                <strong className="block text-white font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Limited Gemini Capability: Requirements Analyst
                </strong>
                <p className="text-gray-400">
                  An authenticated admin can trigger the separate Gemini Requirements Analyst. It returns a draft summary, requirements, acceptance criteria, open questions, and capability evidence for human review. Provider availability and reliable persistence have not been verified. The Business Analyst entry below is a catalog profile mapped to this capability, not a second operational agent.
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="block text-white font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  50 Specialist Role Specifications
                </strong>
                <p className="text-gray-400">
                  All 50 portraits and roles are illustrative, static role profiles for organizing agency responsibilities. They are not running workers and do not independently modify files, run models, or execute tasks.
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="block text-white font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Strict Human Governance &amp; Gates
                </strong>
                <p className="text-gray-400">
                  Admin approval is required before an implementation execution record can be created. No trusted project worker, isolated execution environment, artifact writer, or task test runner is implemented; this showcase does not establish universal approval enforcement, verified QA, or production deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SIX-STAGE DELIVERY FRAMEWORK */}
      <section id="delivery-lifecycle" className="py-20 border-b border-[#242830] bg-[#101216]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-14 space-y-3">
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-sky-300">
              Illustrative Delivery Stages
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Six-Stage Delivery Framework
            </h2>
            <p className="text-gray-400 text-sm">
              These stages map illustrative roles to a planning framework. They are not proof that each approval gate, QA step, staging environment, or deployment path is implemented.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LIFECYCLE_STAGES.map((stage) => {
              const tone = TONE_CLASSES[stage.badgeTone] || TONE_CLASSES.blue;
              const agentCount = DWD_WORKFORCE_AGENTS.filter(
                (a) => a.milestoneId === stage.id
              ).length;
              const isSelected = selectedMilestone === stage.id;

              return (
                <div
                  key={stage.id}
                  onClick={() => {
                    setSelectedMilestone(isSelected ? "all" : stage.id);
                    const el = document.getElementById("workforce-directory");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`group relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "border-[#E31E36] bg-[#1E232B] shadow-glow"
                      : "border-white/10 bg-[#171a20] hover:border-white/25 hover:bg-[#1C2027]"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedMilestone(isSelected ? "all" : stage.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Filter by milestone stage ${stage.title}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-black text-gray-500">
                        PHASE {stage.number}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${tone.badge}`}>
                        {agentCount} Roles Assigned
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-[#E31E36] transition-colors">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                      {stage.shortDesc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-400" />
                      <span>{stage.humanGate}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {stage.gateDetail}
                    </p>
                    <div className="pt-2 text-right">
                      <span className="text-[11px] font-bold text-[#E31E36] group-hover:underline inline-flex items-center gap-1">
                        {isSelected ? "Showing roles below" : "Filter roles for this phase"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ILLUSTRATIVE WORKFORCE DIRECTORY */}
      <section id="workforce-directory" className="py-20 border-b border-[#242830] bg-[#14171D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                Directory &amp; Specializations
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-3">
                All 50 Illustrative Role Profiles
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Static role descriptions grouped by department and mapped stage; these are not 50 operational AI agents.
              </p>
            </div>

            {/* Quick Status / Reset Counter */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Showing <strong className="text-white font-bold">{filteredAgents.length}</strong> of {specialistProfileCount} profiles
              </span>
              {(selectedDepartment !== "all" || selectedMilestone !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment("all");
                    setSelectedMilestone("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-[#242830] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-700 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-4 mb-10">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search specialists by role (e.g. Web Development Coder, QA, SEO, Architect) or task description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#1A1E24] pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#E31E36] focus:outline-none focus:ring-1 focus:ring-[#E31E36]"
                aria-label="Search specialist profiles"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Department Filter Pills */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Filter by Department (10 Departments):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDepartment("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedDepartment === "all"
                      ? "bg-[#E31E36] text-white shadow-sm"
                      : "border border-gray-700 bg-[#171a20] text-gray-300 hover:bg-[#20252D] hover:text-white"
                  }`}
                >
                  All Departments ({specialistProfileCount})
                </button>
                {DWD_WORKFORCE_DEPARTMENTS.map((dept) => {
                  const isSelected = selectedDepartment === dept.name;
                  const count = dept.agentRoles.length;
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => setSelectedDepartment(isSelected ? "all" : dept.name)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-[#E31E36] text-white shadow-sm"
                          : "border border-gray-700 bg-[#171a20] text-gray-300 hover:bg-[#20252D] hover:text-white"
                      }`}
                    >
                      {dept.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Milestone Filter Pills */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Filter by Project Milestone (6 Stages):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMilestone("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedMilestone === "all"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "border border-gray-700 bg-[#171a20] text-gray-300 hover:bg-[#20252D] hover:text-white"
                  }`}
                >
                  All Milestones ({specialistProfileCount})
                </button>
                {LIFECYCLE_STAGES.map((stage) => {
                  const isSelected = selectedMilestone === stage.id;
                  const count = DWD_WORKFORCE_AGENTS.filter((a) => a.milestoneId === stage.id).length;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setSelectedMilestone(isSelected ? "all" : stage.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-sky-600 text-white shadow-sm"
                          : "border border-gray-700 bg-[#171a20] text-gray-300 hover:bg-[#20252D] hover:text-white"
                      }`}
                    >
                      {stage.title} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Directory Cards Grid */}
          {filteredAgents.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-[#171a20] p-12 text-center space-y-4">
              <Bot className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-bold text-white">No specialist profiles match your criteria</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Try searching for a different skill, resetting your department filter, or clearing the search text.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDepartment("all");
                  setSelectedMilestone("all");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E31E36] px-4 py-2 text-xs font-bold text-white hover:bg-[#C8162D]"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAgents.map((agent) => {
                const department = getDepartmentForRole(agent.role);
                const milestone = getMilestoneForAgent(agent);
                const tone = department ? TONE_CLASSES[department.tone] || TONE_CLASSES.blue : TONE_CLASSES.blue;
                const isModel = isRequirementsAnalystProfile(agent.role);

                return (
                  <article
                    key={agent.role}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#171a20] p-4 transition-all duration-200 hover:border-[#E31E36]/40 hover:bg-[#1B1F27] hover:shadow-lg"
                  >
                    <div>
                      {/* Top Header: Avatar & Capability Classification */}
                      <div className="flex items-start gap-3.5 mb-3.5">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black">
                          <Image
                            src={`/agency/avatars/${agent.avatar}.webp`}
                            alt={`${agent.role} avatar portrait`}
                            fill
                            sizes="56px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-sm text-white group-hover:text-[#E31E36] transition-colors leading-snug line-clamp-1">
                            {agent.role}
                          </h3>
                          {department && (
                            <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${tone.badge} line-clamp-1`}>
                              {department.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Task / Description */}
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 min-h-[36px]">
                        {agent.task}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Mapped Stage:</span>
                        <span className="font-semibold text-sky-300">
                          {milestone?.title || agent.milestoneId}
                        </span>
                      </div>

                      {/* Capability Classification */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Classification:</span>
                        {isModel ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Mapped to Requirements Analyst
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                            Specialist Role Profile
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedAgent(agent)}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-gray-200 hover:border-[#E31E36]/40 hover:bg-[#E31E36]/15 hover:text-white transition"
                        aria-label={`View role details for ${agent.role}`}
                      >
                        <Eye className="h-3.5 w-3.5 text-[#E31E36]" />
                        View Role Details
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. ILLUSTRATIVE AGENCY OFFICE & FLOOR PLAN */}
      <section className="py-20 border-b border-[#242830] bg-[#101216]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12 space-y-3">
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-violet-300">
              Agency Operations Visualization
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Virtual Agency Floor Plan &amp; Workspace Map
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">
              Illustrative office artwork mapped to the role-profile departments; it does not depict deployed agents or operational desks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Office Map Card */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171a20] p-4 shadow-xl">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
                <Image
                  src="/agency/scenes/dwd-50-agent-office-map.png"
                  alt="Durrani Web Developers 50-specialist agency office layout and departmental desks"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
              <div className="mt-3 px-2">
                <h4 className="text-sm font-bold text-white">Illustrative Role-Profile Map</h4>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Shows a conceptual arrangement of role profiles across 10 departments. It is not workforce telemetry.
                </p>
              </div>
            </div>

            {/* Future Office Render Card */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171a20] p-4 shadow-xl">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
                <Image
                  src="/agency/scenes/dwd-future-office.webp"
                  alt="Durrani Web Developers future agency digital headquarters concept"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-3 px-2">
                <h4 className="text-sm font-bold text-white">Digital Headquarters Concept</h4>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Concept art for a possible digital headquarters; it does not represent an operating workforce.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="py-16 bg-[#181B20] border-t border-[#242830]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E31E36] bg-[#E31E36]/20 text-[#E31E36]">
            <Code2 className="h-7 w-7" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Planning a Project with DWD?
          </h2>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-gray-400 leading-relaxed">
            Get an instant preliminary estimate using our interactive budget calculator or consult directly on WhatsApp with our agency leadership.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/calculator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E36] hover:bg-[#C8162D] px-7 py-3.5 text-xs font-bold text-white shadow-glow transition transform hover:-translate-y-0.5"
            >
              <Calculator className="h-4 w-4" />
              Start Interactive Budget Calculator
            </Link>

            <a
              href={buildWhatsAppLink("Hello Durrani Web Developers! I saw your AI Agency Workforce page and want to discuss my web application project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-7 py-3.5 text-xs font-bold text-white shadow-lg transition"
            >
              <MessageSquare className="h-4 w-4" />
              Chat on WhatsApp: {BUSINESS_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      {/* 7. EXPANDED AGENT DETAILS MODAL */}
      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-modal-title"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border border-gray-700 bg-[#171a20] p-6 text-white shadow-2xl sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-gray-300 hover:bg-[#E31E36] hover:text-white transition"
              aria-label="Close specialist details"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#E31E36] bg-black shadow-lg">
                <Image
                  src={`/agency/avatars/${selectedAgent.avatar}.webp`}
                  alt={`${selectedAgent.role} portrait`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pr-6">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Illustrative DWD Role Profile
                </span>
                <h3 id="agent-modal-title" className="text-xl font-black text-white">
                  {selectedAgent.role}
                </h3>
                {(() => {
                  const dept = getDepartmentForRole(selectedAgent.role);
                  const tone = dept ? TONE_CLASSES[dept.tone] || TONE_CLASSES.blue : TONE_CLASSES.blue;
                  return dept ? (
                    <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${tone.badge}`}>
                      {dept.name}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Role Responsibilities */}
            <div className="space-y-2 rounded-xl bg-black/30 p-4 border border-white/10 text-xs">
              <h4 className="font-extrabold uppercase tracking-wider text-gray-400 text-[10px]">
                Primary Responsibility
              </h4>
              <p className="text-gray-200 leading-relaxed text-sm">
                {selectedAgent.task}
              </p>
            </div>

            {/* Lifecycle Phase & Human Gate */}
            {(() => {
              const stage = getMilestoneForAgent(selectedAgent);
              const isModel = isRequirementsAnalystProfile(selectedAgent.role);
              return (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Lifecycle Milestone
                      </span>
                      <strong className="block text-sky-300 font-bold">
                        {stage?.title || selectedAgent.milestoneId}
                      </strong>
                      <p className="text-[11px] text-gray-400">
                        Phase {stage?.number} of 06
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Planned Review Checkpoint
                      </span>
                      <strong className="block text-amber-300 font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                        {stage?.humanGate}
                      </strong>
                      <p className="text-[11px] text-gray-400">
                        Framework checkpoint; enforcement is not implied
                      </p>
                    </div>
                  </div>

                  {/* Capability Details */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Technical Capability Classification
                    </span>
                    {isModel ? (
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Requirements Analyst capability (separate)
                        </span>
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          This Business Analyst catalog profile is mapped to the separate, admin-triggered Gemini Requirements Analyst; it is not another agent. The analyst can return a draft summary, requirements, acceptance criteria, open questions, and capability evidence. Provider availability and reliable persistence have not been verified.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-300">
                          <span className="h-2 w-2 rounded-full bg-gray-500" />
                          Specialist Agency Role Specification
                        </span>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          This static catalog entry describes an illustrative agency responsibility. It is not a deployed AI worker and does not imply automated task execution.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-white/10">
              <Link
                href="/calculator"
                onClick={() => setSelectedAgent(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E36] hover:bg-[#C8162D] px-5 py-2.5 text-xs font-bold text-white transition"
              >
                Discuss a Project With DWD
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="w-full sm:w-auto rounded-xl border border-gray-700 bg-[#242830] px-4 py-2.5 text-xs font-semibold text-gray-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
