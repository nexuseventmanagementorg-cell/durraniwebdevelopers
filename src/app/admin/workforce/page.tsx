"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { WorkforceBatch } from "@/lib/workforce-pipeline";
import type { CeoStrategyRecord } from "@/lib/ceo-strategy";
import type { ProjectManagerPlan } from "@/lib/project-manager";
import type { BusinessAnalysisRecord } from "@/lib/business-analysis";
import type { ProposalRecord } from "@/lib/proposal-writer";
import type { ClientOnboardingRecord } from "@/lib/client-onboarding";
import WorkforceSalesLeadPanel from "@/components/admin/WorkforceSalesLeadPanel";
import { AlertTriangle, Bot, CheckCircle2, CircleHelp, Cpu, ExternalLink, LoaderCircle, Play, RotateCw, ShieldCheck } from "lucide-react";

interface WorkforceDashboardData {
  localOnly: boolean;
  storageDirectory: string;
  worker: {
    heartbeatStatus: "RECENT_HEARTBEAT" | "STALE_HEARTBEAT" | "NOT_REPORTING";
    startedAt: string | null;
    lastSeenAt: string | null;
  };
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

interface StrategyProject {
  id: string;
  name: string;
  category: string;
  status: string;
  strategy: CeoStrategyRecord | null;
  strategyHistoryCount: number;
}

interface StrategyDashboardData {
  projects: StrategyProject[];
}

function artifactPreviewUrl(artifact: string, file = "index.html"): string {
  const segments = artifact.split("/");
  return `/api/admin/workforce/artifacts/${[...segments, file].map(encodeURIComponent).join("/")}`;
}

function statusStyle(status: string): string {
  if (status === "completed" || status === "VERIFIED") return "bg-emerald-100 text-emerald-800";
  if (status === "UNVERIFIED" || status === "LEGACY_UNVERIFIED" || status === "STALE_HEARTBEAT") return "bg-amber-100 text-amber-900";
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
  const [strategyProjects, setStrategyProjects] = useState<StrategyProject[]>([]);
  const [strategyError, setStrategyError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectManagerPlan, setProjectManagerPlan] = useState<ProjectManagerPlan | null>(null);
  const [projectManagerPlanCurrent, setProjectManagerPlanCurrent] = useState(false);
  const [projectManagerError, setProjectManagerError] = useState("");
  const [businessAnalysis, setBusinessAnalysis] = useState<BusinessAnalysisRecord | null>(null);
  const [businessAnalysisCurrent, setBusinessAnalysisCurrent] = useState(false);
  const [businessAnalysisError, setBusinessAnalysisError] = useState("");
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [proposalHistory, setProposalHistory] = useState<ProposalRecord[]>([]);
  const [proposalCurrent, setProposalCurrent] = useState(false);
  const [proposalEligible, setProposalEligible] = useState(false);
  const [proposalBlocker, setProposalBlocker] = useState("");
  const [proposalError, setProposalError] = useState("");
  const [acknowledgeOpenProposalItems, setAcknowledgeOpenProposalItems] = useState(false);
  const [clientOnboarding, setClientOnboarding] = useState<ClientOnboardingRecord | null>(null);
  const [clientOnboardingPreview, setClientOnboardingPreview] = useState<ClientOnboardingRecord | null>(null);
  const [clientOnboardingHistory, setClientOnboardingHistory] = useState<ClientOnboardingRecord[]>([]);
  const [clientOnboardingBlockers, setClientOnboardingBlockers] = useState<string[]>([]);
  const [clientOnboardingEligible, setClientOnboardingEligible] = useState(false);
  const [clientOnboardingCurrent, setClientOnboardingCurrent] = useState(false);
  const [clientOnboardingError, setClientOnboardingError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [response, strategyResponse] = await Promise.all([
        fetch("/api/admin/workforce", { cache: "no-store" }),
        fetch("/api/admin/workforce/strategy", { cache: "no-store" }),
      ]);
      const [result, strategyResult] = await Promise.all([response.json(), strategyResponse.json()]);
      if (response.status === 401 || strategyResponse.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Workforce data could not be loaded.");
      if (strategyResponse.ok && strategyResult.success) {
        const strategyData = strategyResult as StrategyDashboardData;
        setStrategyProjects(strategyData.projects);
        setStrategyError("");
        setSelectedProjectId((current) =>
          strategyData.projects.some((project) => project.id === current)
            ? current
            : strategyData.projects.find((project) => !project.strategy)?.id || strategyData.projects[0]?.id || ""
        );
      } else {
        setStrategyError(strategyResult.error || "Approved project strategies could not be loaded.");
      }
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
  const selectedProject = useMemo(
    () => strategyProjects.find((project) => project.id === selectedProjectId) || null,
    [strategyProjects, selectedProjectId]
  );
  useEffect(() => {
    let active = true;
    if (!selectedProjectId || selectedProject?.strategy?.status !== "approved") {
      setProjectManagerPlan(null);
      setProjectManagerPlanCurrent(false);
      setProjectManagerError("");
      return () => { active = false; };
    }
    const loadPlan = async () => {
      try {
        const response = await fetch(
          `/api/admin/workforce/project-manager?projectId=${encodeURIComponent(selectedProjectId)}`,
          { cache: "no-store" }
        );
        const result = await response.json();
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.error || "The Project Manager plan could not be loaded.");
        if (!active) return;
        setProjectManagerPlan(result.plan || null);
        setProjectManagerPlanCurrent(Boolean(result.current));
        setProjectManagerError("");
      } catch (error) {
        if (!active) return;
        setProjectManagerError(error instanceof Error ? error.message : "The Project Manager plan could not be loaded.");
      }
    };
    void loadPlan();
    return () => { active = false; };
  }, [selectedProjectId, selectedProject?.strategy?.status]);

  const loadBusinessAnalysis = useCallback(async (projectId: string, isCurrent: () => boolean = () => true) => {
    try {
      const response = await fetch(
        `/api/admin/workforce/business-analysis?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Business analysis could not be loaded.");
      if (!isCurrent()) return;
      setBusinessAnalysis(result.analysis || null);
      setBusinessAnalysisCurrent(Boolean(result.current));
      setBusinessAnalysisError("");
    } catch (error) {
      if (!isCurrent()) return;
      setBusinessAnalysisError(error instanceof Error ? error.message : "Business analysis could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setBusinessAnalysis(null);
    setBusinessAnalysisCurrent(false);
    setBusinessAnalysisError("");
    if (!selectedProjectId || selectedProject?.strategy?.status !== "approved") {
      return () => { active = false; };
    }
    void loadBusinessAnalysis(selectedProjectId, () => active);
    return () => { active = false; };
  }, [selectedProjectId, selectedProject?.strategy?.status, loadBusinessAnalysis]);

  const loadProposal = useCallback(async (projectId: string, isCurrent: () => boolean = () => true) => {
    try {
      const response = await fetch(
        `/api/admin/workforce/proposal?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Proposal data could not be loaded.");
      if (!isCurrent()) return;
      setProposal(result.proposal || null);
      setProposalHistory(Array.isArray(result.history) ? result.history : []);
      setProposalCurrent(Boolean(result.current));
      setProposalEligible(Boolean(result.eligible));
      setProposalBlocker(result.blocker || "");
      setProposalError("");
    } catch (error) {
      if (!isCurrent()) return;
      setProposalError(error instanceof Error ? error.message : "Proposal data could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setProposal(null);
    setProposalHistory([]);
    setProposalCurrent(false);
    setProposalEligible(false);
    setProposalBlocker("");
    setProposalError("");
    setAcknowledgeOpenProposalItems(false);
    if (!selectedProjectId || selectedProject?.strategy?.status !== "approved" ||
        businessAnalysis?.status !== "APPROVED" || !businessAnalysisCurrent) {
      return () => { active = false; };
    }
    void loadProposal(selectedProjectId, () => active);
    return () => { active = false; };
  }, [
    selectedProjectId,
    selectedProject?.strategy?.status,
    businessAnalysis?.status,
    businessAnalysisCurrent,
    loadProposal,
  ]);

  const loadClientOnboarding = useCallback(async (projectId: string, isCurrent: () => boolean = () => true) => {
    try {
      const response = await fetch(
        `/api/admin/workforce/client-onboarding?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Onboarding readiness could not be loaded.");
      if (!isCurrent()) return;
      setClientOnboarding(result.record || null);
      setClientOnboardingPreview(result.assessmentPreview || null);
      setClientOnboardingHistory(Array.isArray(result.history) ? result.history : []);
      setClientOnboardingBlockers(Array.isArray(result.blockers) ? result.blockers : []);
      setClientOnboardingEligible(Boolean(result.eligible));
      setClientOnboardingCurrent(Boolean(result.sourceCurrent));
      setClientOnboardingError("");
    } catch (error) {
      if (!isCurrent()) return;
      setClientOnboardingError(error instanceof Error ? error.message : "Onboarding readiness could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setClientOnboarding(null);
    setClientOnboardingPreview(null);
    setClientOnboardingHistory([]);
    setClientOnboardingBlockers([]);
    setClientOnboardingEligible(false);
    setClientOnboardingCurrent(false);
    setClientOnboardingError("");
    if (!selectedProjectId) return () => { active = false; };
    void loadClientOnboarding(selectedProjectId, () => active);
    return () => { active = false; };
  }, [selectedProjectId, loadClientOnboarding]);
  const strategistReady = Boolean(data?.provider.available && data.provider.selectedModelReady);
  const strategyAwaitingApproval = strategyProjects.filter(
    (project) => project.strategy?.status === "awaiting_human_approval"
  ).length;
  const projectsAwaitingStrategy = strategyProjects.filter((project) => !project.strategy).length;

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

  const runStrategyAction = async (action: "generate" | "approve") => {
    if (!selectedProject) return;
    setBusy(`strategy_${action}`);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/strategy", {
        method: action === "generate" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The strategy action failed.");
      setNotice(action === "generate"
        ? "Draft strategy saved for human review; specialist tasks are not executed."
        : "Strategy approval recorded; specialist tasks remain blocked until a safe project worker is available.");
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The strategy action failed.");
    } finally {
      setBusy("");
    }
  };

  const runProjectManagerAction = async (action: "generate" | "approve") => {
    if (!selectedProject) return;
    setBusy(`project_manager_${action}`);
    setActionError("");
    setProjectManagerError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/project-manager", {
        method: action === "generate" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          ...(action === "approve" ? { planId: projectManagerPlan?.id } : {}),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.error || "The Project Manager action failed.");
      }
      setProjectManagerPlan(result.plan || null);
      setProjectManagerPlanCurrent(true);
      setNotice(action === "generate"
        ? "Project Manager WBS saved as a planning draft; every customer task remains BLOCKED."
        : "Project Manager plan approval recorded; task execution is still unavailable and remains BLOCKED.");
    } catch (error) {
      setProjectManagerError(error instanceof Error ? error.message : "The Project Manager action failed.");
    } finally {
      setBusy("");
    }
  };

  const runBusinessAnalysisAction = async (
    action: "generate" | "approve" | "request_clarification"
  ) => {
    if (!selectedProject) return;
    setBusy(`business_analysis_${action}`);
    setBusinessAnalysisError("");
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/business-analysis", {
        method: action === "generate" ? "POST" : action === "approve" || action === "request_clarification" ? "PATCH" : "GET",
        headers: { "Content-Type": "application/json" },
        body: action === "generate"
          ? JSON.stringify({ projectId: selectedProject.id })
          : JSON.stringify({
              projectId: selectedProject.id,
              analysisId: businessAnalysis?.id,
              action,
              ...(action === "request_clarification"
                ? { clarificationIds: businessAnalysis?.clarifications.filter((item) => item.status === "OPEN").map((item) => item.id) || [] }
                : {}),
            }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The Business Analyst action failed.");
      setBusinessAnalysis(result.analysis || null);
      setBusinessAnalysisCurrent(true);
      setNotice(action === "generate"
        ? "Requirements draft generated from approved source records; all requirements need human review."
        : action === "approve"
          ? "Requirements baseline approval recorded for this exact analysis and source fingerprint."
          : "Clarification request recorded for internal follow-up; it was not sent to the customer.");
    } catch (error) {
      setBusinessAnalysisError(error instanceof Error ? error.message : "The Business Analyst action failed.");
    } finally {
      setBusy("");
    }
  };

  const runProposalAction = async (action: "generate" | "review" | "approve") => {
    if (!selectedProject) return;
    setBusy(`proposal_${action}`);
    setProposalError("");
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/proposal", {
        method: action === "generate" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "generate"
          ? JSON.stringify({ projectId: selectedProject.id })
          : JSON.stringify({
              projectId: selectedProject.id,
              proposalId: proposal?.id,
              action,
              ...(action === "approve"
                ? { openItemsAcknowledged: acknowledgeOpenProposalItems }
                : {}),
            }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The proposal action failed.");
      setProposal(result.proposal || null);
      if (Array.isArray(result.history)) setProposalHistory(result.history);
      setProposalCurrent(true);
      setProposalEligible(true);
      setProposalBlocker("");
      setAcknowledgeOpenProposalItems(false);
      setNotice(action === "generate"
        ? "Agent 4 proposal draft saved from approved records; no customer message was sent."
        : action === "review"
          ? "Proposal review recorded against this exact proposal version; approval remains separate."
          : "Proposal approved for customer review; it has NOT been sent and no customer work was executed.");
    } catch (error) {
      setProposalError(error instanceof Error ? error.message : "The proposal action failed.");
    } finally {
      setBusy("");
    }
  };

  const runClientOnboardingAction = async (action: "prepare_assessment" | "review") => {
    if (!selectedProject) return;
    setBusy(`client_onboarding_${action}`);
    setClientOnboardingError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/client-onboarding", {
        method: action === "prepare_assessment" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "prepare_assessment"
          ? { projectId: selectedProject.id, action }
          : { projectId: selectedProject.id, recordId: clientOnboarding?.id, action }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The onboarding action failed.");
      setClientOnboarding(result.record || null);
      setClientOnboardingCurrent(true);
      setClientOnboardingBlockers(result.blockers || result.record?.handoff.blockers || []);
      setNotice(result.message || "Readiness assessment updated; onboarding remains gated.");
    } catch (error) {
      setClientOnboardingError(error instanceof Error ? error.message : "The onboarding action failed.");
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

          <WorkforceSalesLeadPanel />

          {data && (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
                <strong>Local-only execution.</strong> The worker and generated files stay on this Windows PC. Vercel cannot access your private Ollama service. Generated templates are drafts; production deploys are not triggered.
              </div>

              <section className="space-y-5 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">AI CEO Strategist · approved customer projects</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${strategistReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                        {strategistReady ? "READY TO DRAFT" : "PROVIDER OR MODEL UNAVAILABLE"}
                      </span>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
                      Strategy generation requires an approved inquiry, approved commercial scope, and verified advance. Plans require a separate human approval; specialist assignments remain blocked and are never executed by this agent.
                    </p>
                  </div>
                  <p className="shrink-0 rounded-lg bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-600">
                    Worker heartbeat: {data.worker.heartbeatStatus.replace(/_/g, " ")} · {data.worker.lastSeenAt ? `last report ${new Date(data.worker.lastSeenAt).toLocaleTimeString()}` : "no heartbeat"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Ollama provider</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{data.provider.available ? "AVAILABLE" : "UNAVAILABLE"} · {data.provider.selectedModelReady ? "model ready" : "model not ready"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Approved projects awaiting strategy</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{projectsAwaitingStrategy}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Strategies awaiting human approval</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{strategyAwaitingApproval}</p>
                  </div>
                </div>

                {strategyError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{strategyError}</p>}
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-[16rem] flex-1 text-xs font-bold text-gray-700">
                    Approved project
                    <select
                      value={selectedProjectId}
                      disabled={strategyProjects.length === 0 || busy !== ""}
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5"
                    >
                      {strategyProjects.length === 0 && <option value="">No commercially approved customer projects</option>}
                      {strategyProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name} · {project.id}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!selectedProject || !strategistReady || busy !== "" || selectedProject.strategy?.status === "approved"}
                    onClick={() => void runStrategyAction("generate")}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === "strategy_generate" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    Generate strategy draft
                  </button>
                  <button
                    type="button"
                    disabled={!selectedProject || selectedProject.strategy?.status !== "awaiting_human_approval" || busy !== ""}
                    onClick={() => void runStrategyAction("approve")}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" /> Approve strategy
                  </button>
                </div>

                {selectedProject?.strategy ? (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-gray-900">{selectedProject.name}</strong>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${statusStyle(selectedProject.strategy.status)}`}>
                        STRATEGY {selectedProject.strategy.status === "approved" ? "APPROVED BY HUMAN" : "AWAITING HUMAN APPROVAL"}
                      </span>
                      <span className="text-[10px] text-gray-500">Generated {new Date(selectedProject.strategy.generatedAt).toLocaleString()} · {selectedProject.strategy.model}</span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500">Executive summary</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-800">{selectedProject.strategy.plan.executiveSummary.text}</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-500">{selectedProject.strategy.plan.classification.primaryCategory.replace(/_/g, " ")} · {selectedProject.strategy.plan.executiveSummary.status}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">Execution and delivery gate</p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-950">Specialist assignments: BLOCKED · no customer-project worker adapter. Actual customer artifacts and project QA: NOT TESTED. Human delivery approval: NOT IMPLEMENTED.</p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div>
                        <h3 className="text-xs font-extrabold text-gray-800">Specialist assignments · recommendations only</h3>
                        <div className="mt-2 space-y-2">
                          {selectedProject.strategy.plan.specialistAssignments.map((assignment) => (
                            <article key={assignment.agentRoleId} className="rounded-lg border border-gray-200 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong className="text-xs text-gray-900">{assignment.agentRole} · {assignment.taskTitle}</strong>
                                <span className="rounded bg-amber-100 px-2 py-1 text-[9px] font-extrabold text-amber-900">{assignment.status}</span>
                              </div>
                              <p className="mt-1 text-[10px] leading-relaxed text-gray-600">{assignment.instructions}</p>
                              <p className="mt-1 text-[10px] text-amber-900">Blocker: {assignment.blocker}</p>
                              {assignment.dependencies.length > 0 && <p className="mt-1 text-[10px] text-gray-500">Dependencies: {assignment.dependencies.join(", ")}</p>}
                              <p className="mt-1 text-[10px] text-gray-500">Expected outputs: {assignment.expectedOutputs.join(" · ") || "none stated"}</p>
                            </article>
                          ))}
                          {selectedProject.strategy.plan.specialistAssignments.length === 0 && <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">No specialist assignments were returned.</p>}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-gray-800">Evidence references and unknowns</h3>
                        <ul className="mt-2 max-h-72 space-y-2 overflow-auto">
                          {selectedProject.strategy.plan.evidenceReferences.map((item) => (
                            <li key={item.referenceId} className="rounded-lg border border-gray-100 p-2">
                              <strong className="block text-[10px] text-gray-800">{item.label} · {item.status}</strong>
                              <span className="text-[10px] leading-relaxed text-gray-600">{item.content}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[10px] leading-relaxed text-gray-600">
                          Missing information: {selectedProject.strategy.plan.unknowns.map((item) => item.text).join(" · ") || "No unknowns listed."}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <strong className="text-[10px] text-gray-800">Scope</strong>
                            {selectedProject.strategy.plan.scopeAndExclusions?.scope?.map((item, index) =>
                              <p key={`scope-${index}`} className="text-[10px] text-gray-600">{item.status}: {item.text}</p>)}
                          </div>
                          <div>
                            <strong className="text-[10px] text-gray-800">Exclusions</strong>
                            {selectedProject.strategy.plan.scopeAndExclusions?.exclusions?.map((item, index) =>
                              <p key={`exclusion-${index}`} className="text-[10px] text-gray-600">{item.status}: {item.text}</p>)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-gray-800">Category capability coverage ({selectedProject.strategy.plan.classification.capabilityCoverage.length})</summary>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedProject.strategy.plan.classification.capabilityCoverage.map((coverage) => (
                          <li key={coverage.category} className="rounded bg-gray-50 p-2 text-[10px] text-gray-700">
                            <strong className="block">{coverage.category.replace(/_/g, " ")}</strong>
                            {coverage.capabilities
                              ? <>
                                  {Object.entries(coverage.capabilities).map(([capability, available]) =>
                                    `${capability.replace(/_/g, " ")}: ${available ? "AVAILABLE" : "NOT AVAILABLE"}`).join(" · ")}
                                  {coverage.blocker ? ` · Blocker: ${coverage.blocker}` : ""}
                                </>
                              : "Legacy capability claims are not re-verified."}
                          </li>
                        ))}
                      </ul>
                    </details>

                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-gray-800">Review the complete strategy before approval</summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Business objectives</h3>
                          {selectedProject.strategy.plan.businessObjectives.map((item, index) => <p key={`objective-${index}`} className="mt-1 text-[10px] text-gray-700">{item.status}: {item.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Functional requirements</h3>
                          {selectedProject.strategy.plan.functionalRequirements.map((item, index) => <p key={`requirement-${index}`} className="mt-1 text-[10px] text-gray-700">{item.status}: {item.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">UI/UX and architecture</h3>
                          <p className="mt-1 text-[10px] text-gray-700">UI/UX · {selectedProject.strategy.plan.uiUxDirection.status}: {selectedProject.strategy.plan.uiUxDirection.text}</p>
                          <p className="mt-1 text-[10px] text-gray-700">Architecture · {selectedProject.strategy.plan.technicalArchitecture.status}: {selectedProject.strategy.plan.technicalArchitecture.text}</p>
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Integrations and project phases</h3>
                          {selectedProject.strategy.plan.requiredIntegrations.map((item, index) => <p key={`integration-${index}`} className="mt-1 text-[10px] text-gray-700">{item.name}: {item.rationale.text}</p>)}
                          {selectedProject.strategy.plan.projectPhases.map((item) => <p key={item.id} className="mt-1 text-[10px] text-gray-700">{item.title}: {item.outcome.text} · Assignments: {item.taskAssignmentIds.join(", ") || "none"}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Acceptance criteria</h3>
                          {selectedProject.strategy.plan.acceptanceCriteria.map((item, index) => <p key={`acceptance-${index}`} className="mt-1 text-[10px] text-gray-700">{item.status}: {item.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Risks</h3>
                          {selectedProject.strategy.plan.riskRegister.map((item, index) => <p key={`risk-${index}`} className="mt-1 text-[10px] text-gray-700">{item.risk.text} · {item.likelihood}/{item.impact}. Mitigation: {item.mitigation.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Assumptions</h3>
                          {selectedProject.strategy.plan.assumptions.map((item, index) => <p key={`assumption-${index}`} className="mt-1 text-[10px] text-gray-700">{item.status}: {item.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Commercial considerations</h3>
                          {selectedProject.strategy.plan.commercialConsiderations.map((item, index) => <p key={`commercial-${index}`} className="mt-1 text-[10px] text-gray-700">{item.status}: {item.text}</p>)}
                        </section>
                        <section className="rounded bg-gray-50 p-3">
                          <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Approvals and blockers</h3>
                          {selectedProject.strategy.plan.humanApprovalRequirements.map((item, index) => <p key={`approval-${index}`} className="mt-1 text-[10px] text-gray-700">{item.text}</p>)}
                          {selectedProject.strategy.plan.implementationBlockers.map((item, index) => <p key={`blocker-${index}`} className="mt-1 text-[10px] text-amber-900">{item.status}: {item.text}</p>)}
                        </section>
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {selectedProject
                      ? "No strategy has been generated. Generation creates a reviewable draft only."
                      : "No commercially approved project is eligible. Inquiry approval, approved project conversion, commercial scope, and advance requirements are not bypassed."}
                  </p>
                )}
                {selectedProject && (
                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-900">Agent 2 · Project Manager WBS</h3>
                        <p className="mt-1 text-[11px] text-gray-600">
                          Planning uses the approved CEO strategy and registered roles. No customer task is dispatched or executed.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={selectedProject.strategy?.status !== "approved" || busy !== "" ||
                            (projectManagerPlan?.status === "APPROVED" && projectManagerPlanCurrent)}
                          onClick={() => void runProjectManagerAction("generate")}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy === "project_manager_generate" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                          Generate WBS
                        </button>
                        <button
                          type="button"
                          disabled={!projectManagerPlan || !projectManagerPlanCurrent ||
                            projectManagerPlan.status !== "AWAITING_APPROVAL" || busy !== ""}
                          onClick={() => void runProjectManagerAction("approve")}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" /> Approve WBS
                        </button>
                      </div>
                    </div>
                    {projectManagerError && (
                      <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        {projectManagerError}
                      </p>
                    )}
                    {selectedProject.strategy?.status !== "approved" ? (
                      <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        An explicitly approved, current CEO strategy is required before WBS planning.
                      </p>
                    ) : projectManagerPlan ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${statusStyle(projectManagerPlan.status)}`}>
                            PLAN {projectManagerPlan.status.replace(/_/g, " ")}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${projectManagerPlanCurrent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                            SOURCE {projectManagerPlanCurrent ? "CURRENT" : "STALE / NOT VERIFIED"}
                          </span>
                          {projectManagerPlan.approval && (
                            <span className="text-[10px] text-gray-500">
                              Approved by {projectManagerPlan.approval.approvedBy} · {new Date(projectManagerPlan.approval.approvedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <p className="rounded bg-gray-50 p-2 text-[10px] text-gray-700">Phases: {projectManagerPlan.phases.length} · Milestones: {projectManagerPlan.milestones.length}</p>
                          <p className="rounded bg-gray-50 p-2 text-[10px] text-gray-700">WBS tasks/subtasks: {projectManagerPlan.tasks.length} · All status: BLOCKED</p>
                          <p className="rounded bg-gray-50 p-2 text-[10px] text-gray-700">Timeline: UNKNOWN · Estimated effort: UNKNOWN</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <strong className="text-[10px] font-extrabold uppercase text-amber-900">Execution boundary</strong>
                          <p className="mt-1 text-[11px] leading-relaxed text-amber-950">
                            Local customer-project worker, browser QA, independent artifact verification, and deployment adapters are not connected. WBS approval is not execution approval and cannot unblock these tasks.
                          </p>
                        </div>
                        <div className="grid gap-2 lg:grid-cols-2">
                          {projectManagerPlan.phases.map((phase) => (
                            <article key={phase.id} className="rounded-lg border border-gray-200 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-xs text-gray-900">{phase.title}</strong>
                                <span className="rounded bg-amber-100 px-2 py-1 text-[9px] font-extrabold text-amber-900">MILESTONE BLOCKED</span>
                              </div>
                              <p className="mt-1 text-[10px] text-gray-600">Outcome: {phase.outcome}</p>
                              <ul className="mt-2 space-y-2">
                                {phase.taskIds.map((taskId) => {
                                  const task = projectManagerPlan.tasks.find((item) => item.id === taskId);
                                  if (!task) return null;
                                  return (
                                    <li key={task.id} className="rounded bg-gray-50 p-2">
                                      <strong className="block text-[10px] text-gray-800">{task.title} · {task.agentRoleId}</strong>
                                      <span className="text-[10px] text-amber-900">BLOCKED · execution adapter unavailable</span>
                                      <span className="block text-[10px] text-gray-500">Human approvals: {task.humanApprovalRequirements.join(" · ")}</span>
                                      {task.dependencies.length > 0 && (
                                        <span className="block text-[10px] text-gray-500">
                                          Depends on: {task.dependencies.map((dependency) =>
                                            projectManagerPlan.tasks.find((item) => item.id === dependency)?.title || dependency
                                          ).join(" · ")}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </article>
                          ))}
                        </div>
                        <details className="rounded-lg border border-gray-200 p-3">
                          <summary className="cursor-pointer text-xs font-bold text-gray-800">
                            Risk register and blockers ({projectManagerPlan.risks.length} risks · {projectManagerPlan.blockers.length} blockers)
                          </summary>
                          <ul className="mt-2 space-y-2">
                            {projectManagerPlan.risks.map((risk) => (
                              <li key={risk.id} className="rounded bg-gray-50 p-2">
                                <strong className="block text-[10px] text-gray-800">{risk.severity} · {risk.status.replace(/_/g, " ")} · {risk.description}</strong>
                                <span className="text-[10px] text-gray-600">Mitigation: {risk.mitigation}</span>
                              </li>
                            ))}
                            {projectManagerPlan.blockers.map((blocker, index) => (
                              <li key={`pm-blocker-${index}`} className="text-[10px] text-amber-900">BLOCKED: {blocker}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        No Project Manager WBS exists yet. Generate creates a reviewable plan, not project execution.
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">Agent 3 · Business Analyst requirements</h2>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-extrabold text-sky-900">
                        {businessAnalysis
                          ? `ANALYSIS ${businessAnalysis.status.replace(/_/g, " ")}`
                          : "NOT GENERATED"}
                      </span>
                      {businessAnalysis && (
                        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${businessAnalysisCurrent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                          SOURCE {businessAnalysisCurrent ? "CURRENT" : "STALE"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
                      Deterministic analysis uses the approved inquiry, project scope, and Agent 1 strategy; it does not invent customer decisions, execute tests, communicate with customers, or alter Agent 1/2 plans. Customer attachments and direct Agent 4/5 handoffs are not integrated.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={selectedProject?.strategy?.status !== "approved" || busy !== ""}
                      onClick={() => selectedProject && void loadBusinessAnalysis(selectedProject.id)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 disabled:opacity-50"
                    >
                      View / refresh
                    </button>
                    <button
                      type="button"
                      disabled={selectedProject?.strategy?.status !== "approved" || busy !== "" ||
                        (businessAnalysis?.status === "APPROVED" && businessAnalysisCurrent)}
                      onClick={() => void runBusinessAnalysisAction("generate")}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "business_analysis_generate" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Generate analysis
                    </button>
                    <button
                      type="button"
                      disabled={!businessAnalysis || !businessAnalysisCurrent ||
                        businessAnalysis.status !== "AWAITING_REVIEW" ||
                        !businessAnalysis.clarifications.some((item) => item.status === "OPEN") || busy !== ""}
                      onClick={() => void runBusinessAnalysisAction("request_clarification")}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Request clarification
                    </button>
                    <button
                      type="button"
                      disabled={!businessAnalysis || !businessAnalysisCurrent ||
                        businessAnalysis.status !== "AWAITING_REVIEW" || busy !== ""}
                      onClick={() => void runBusinessAnalysisAction("approve")}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" /> Approve baseline
                    </button>
                  </div>
                </div>
                {businessAnalysisError && (
                  <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {businessAnalysisError}
                  </p>
                )}
                {selectedProject?.strategy?.status !== "approved" ? (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    A current human-approved Agent 1 strategy, approved inquiry conversion, commercial scope, and verified advance are required.
                  </p>
                ) : businessAnalysis ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                      <span className="rounded bg-gray-100 px-2 py-1">Inquiry {businessAnalysis.inquiryId}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">Project {businessAnalysis.projectId}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">Generated {new Date(businessAnalysis.generatedAt).toLocaleString()}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">No test execution · NOT TESTED</span>
                      {businessAnalysis.approval && (
                        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-900">
                          Approved by {businessAnalysis.approval.approvedBy} · {new Date(businessAnalysis.approval.approvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {!businessAnalysisCurrent && (
                      <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                        Source data or the approved strategy has changed. This analysis cannot be approved; generate a new analysis for review.
                      </div>
                    )}
                    <div className="grid gap-3 lg:grid-cols-2">
                      <section className="rounded-lg bg-gray-50 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Business objectives</h3>
                        {businessAnalysis.businessObjectives.map((objective) => (
                          <p key={objective.id} className="mt-1 text-[10px] text-gray-700">
                            {objective.evidenceStatus} · {objective.text}
                          </p>
                        ))}
                      </section>
                      <section className="rounded-lg bg-gray-50 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Project category relevance · capability not assessed</h3>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {businessAnalysis.categories.map((category) => (
                            <span key={category.category} className={`rounded px-2 py-1 text-[9px] font-bold ${category.relevance === "PRIMARY" ? "bg-sky-100 text-sky-900" : "bg-white text-gray-600"}`}>
                              {category.category}: {category.relevance.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </section>
                    </div>
                    <section>
                      <h3 className="text-xs font-extrabold text-gray-800">Requirements · all require baseline review</h3>
                      <div className="mt-2 grid gap-2 lg:grid-cols-2">
                        {businessAnalysis.requirements.map((requirement) => (
                          <article key={requirement.id} className="rounded-lg border border-gray-200 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-[11px] text-gray-900">{requirement.title}</strong>
                              <span className="rounded bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-700">{requirement.category.replace(/_/g, " ")}</span>
                              <span className="rounded bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-900">{requirement.scope.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed text-gray-700">{requirement.description}</p>
                            <p className="mt-1 text-[9px] text-gray-500">Priority {requirement.priority} · {requirement.status} · Verification {requirement.verificationApproach.status} · Source {businessAnalysis.evidence.find((item) => item.id === requirement.sourceRefId)?.sourcePath || "INVALID SOURCE"}</p>
                            <p className="mt-1 text-[10px] text-gray-600">{requirement.rationale}</p>
                            {requirement.acceptanceCriteria.map((criterion, index) => (
                              <p key={`${requirement.id}-criterion-${index}`} className="mt-1 text-[10px] text-sky-900">Acceptance proposal: {criterion}</p>
                            ))}
                          </article>
                        ))}
                      </div>
                    </section>
                    <div className="grid gap-3 xl:grid-cols-2">
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-xs font-extrabold text-gray-800">Feature analysis · unspecified fields remain explicit</h3>
                        <div className="mt-2 space-y-2">
                          {businessAnalysis.features.map((feature) => (
                            <article key={feature.id} className="rounded bg-gray-50 p-2">
                              <strong className="block text-[10px] text-gray-800">{feature.title} · {feature.scope.replace(/_/g, " ")}</strong>
                              <span className="block text-[10px] text-gray-600">Purpose: {feature.businessPurpose} · Source: {businessAnalysis.evidence.find((item) => item.id === feature.sourceRefId)?.sourcePath}</span>
                              <span className="block text-[10px] text-gray-600">Inputs: {feature.inputs.join(" · ") || "Not recorded"} · Outputs: {feature.outputs.join(" · ") || "Not recorded"}</span>
                              <span className="block text-[10px] text-gray-600">Rules: {feature.businessRules.join(" · ") || "Not recorded"} · Validation: {feature.validation.join(" · ") || "Not recorded"}</span>
                              <span className="block text-[10px] text-gray-600">Permissions: {feature.permissions.join(" · ") || "Not recorded"} · Dependencies: {feature.dependencies.join(" · ") || feature.dependencyAssessment}</span>
                              <span className="block text-[10px] text-amber-900">Success/failure scenarios are proposals only; no runtime behavior was tested.</span>
                            </article>
                          ))}
                          {businessAnalysis.features.length === 0 && <p className="text-[10px] text-gray-600">No explicit features were captured; common features were not assumed.</p>}
                        </div>
                      </section>
                      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <h3 className="text-xs font-extrabold text-amber-950">Clarifications and conflicts</h3>
                        <p className="mt-1 text-[10px] text-amber-900">Request clarification records an internal follow-up only; no customer message is sent.</p>
                        {businessAnalysis.clarifications.map((item) => (
                          <article key={item.id} className="mt-2 rounded bg-white p-2">
                            <strong className="block text-[10px] text-gray-800">{item.priority} · {item.status} · {item.questionOrIssue}</strong>
                            <span className="block text-[10px] text-gray-600">{item.whyNeeded}</span>
                            <span className="block text-[10px] text-amber-900">Ask: {item.recommendedQuestion}</span>
                          </article>
                        ))}
                        {businessAnalysis.conflicts.map((item) => (
                          <article key={item.id} className="mt-2 rounded border border-red-200 bg-white p-2">
                            <strong className="block text-[10px] text-red-900">Conflict · {item.issue}</strong>
                            <span className="text-[10px] text-gray-700">Ask: {item.recommendedQuestion}</span>
                          </article>
                        ))}
                      </section>
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-xs font-extrabold text-gray-800">Scope, assumptions, and risks</h3>
                        {businessAnalysis.scopeBoundaries.map((item) => (
                          <p key={item.id} className="mt-1 text-[10px] text-gray-700">{item.scope.replace(/_/g, " ")} · {item.sourceStatus} · {item.text}</p>
                        ))}
                        {businessAnalysis.assumptions.map((item) => (
                          <p key={item.id} className="mt-1 text-[10px] text-amber-900">ASSUMED · {item.text}</p>
                        ))}
                        {businessAnalysis.risks.map((item) => (
                          <p key={item.id} className="mt-1 text-[10px] text-gray-700">Risk {item.likelihood}/{item.impact} · {item.description} · Mitigation: {item.mitigation}</p>
                        ))}
                      </section>
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-xs font-extrabold text-gray-800">Traceability and Agent 2</h3>
                        <p className="mt-1 text-[10px] text-gray-600">Inquiry links: {businessAnalysis.traceability.inquiryToRequirements.length} · Objective links: {businessAnalysis.traceability.objectivesToRequirements.length} · Requirement/feature links: {businessAnalysis.traceability.requirementsToFeatures.length}</p>
                        {businessAnalysis.traceability.projectManagerTasks
                          ? <p className="mt-1 text-[10px] text-amber-900">Agent 2 plan {businessAnalysis.traceability.projectManagerTasks.planId} · {businessAnalysis.traceability.projectManagerTasks.tasks.length} tasks · linkage {businessAnalysis.traceability.projectManagerTasks.linkageStatus}; no unsupported task-to-requirement links are inferred.</p>
                          : <p className="mt-1 text-[10px] text-gray-600">No current approved Agent 2 plan was available for traceability.</p>}
                        {businessAnalysis.clarificationRequests.map((item, index) => (
                          <p key={`clarification-request-${index}`} className="mt-1 text-[10px] text-amber-900">Clarification follow-up recorded by {item.requestedBy} · {item.deliveryStatus} · {item.clarificationIds.length} questions</p>
                        ))}
                      </section>
                    </div>
                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-xs font-extrabold text-gray-800">
                        Authorized source evidence · {businessAnalysis.evidence.length} references
                      </summary>
                      <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
                        {businessAnalysis.evidence.map((item) => (
                          <article key={item.id} className="rounded bg-gray-50 p-2">
                            <strong className="block text-[10px] text-gray-800">{item.sourceType} · {item.label}</strong>
                            <code className="text-[9px] text-gray-500">{item.sourcePath}</code>
                            <p className="mt-1 whitespace-pre-wrap break-words text-[10px] text-gray-700">{item.content}</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    No Business Analyst document is saved. Generate creates a reviewable draft; it does not modify approved scope or execute tests.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">Agent 4 · Proposal Writer</h2>
                      <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-extrabold text-violet-900">
                        {proposal ? `PROPOSAL ${proposal.status.replace(/_/g, " ")}` : "NOT GENERATED"}
                      </span>
                      {proposal && (
                        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${proposalCurrent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                          SOURCE {proposalCurrent ? "CURRENT" : "STALE / NOT VERIFIED"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
                      Creates a private, source-linked proposal draft from current approved Agent 1 strategy and Agent 3 analysis. Agent 2 deliverables remain unmapped. Review and approval are separate; approval is not delivery, customer messaging, or project execution.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!selectedProjectId || busy !== ""}
                      onClick={() => selectedProject && void loadProposal(selectedProject.id)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 disabled:opacity-50"
                    >
                      View / refresh
                    </button>
                    <button
                      type="button"
                      disabled={!proposalEligible || busy !== "" ||
                        (proposal?.status === "APPROVED_FOR_CUSTOMER" && proposalCurrent)}
                      onClick={() => void runProposalAction("generate")}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "proposal_generate" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Generate draft
                    </button>
                    <button
                      type="button"
                      disabled={!proposal || !proposalCurrent ||
                        !["DRAFT", "NEEDS_INFORMATION", "ADMIN_REVIEW_REQUIRED"].includes(proposal.status) || busy !== ""}
                      onClick={() => void runProposalAction("review")}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-[11px] font-extrabold text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Record review
                    </button>
                    <button
                      type="button"
                      disabled={!proposal || !proposalCurrent || proposal.status !== "ADMIN_REVIEW_REQUIRED" ||
                        (proposal.pendingClarifications.length > 0 && !acknowledgeOpenProposalItems) || busy !== ""}
                      onClick={() => void runProposalAction("approve")}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" /> Approve for review
                    </button>
                  </div>
                </div>
                {proposalError && (
                  <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {proposalError}
                  </p>
                )}
                {selectedProject?.strategy?.status !== "approved" ||
                businessAnalysis?.status !== "APPROVED" ||
                !businessAnalysisCurrent ? (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    A current approved inquiry conversion, verified commercial record, human-approved Agent 1 strategy, and separately approved current Agent 3 analysis are required.
                  </p>
                ) : !proposalEligible ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    BLOCKED · {proposalBlocker || "Proposal eligibility has not been verified from authorized project sources."}
                  </p>
                ) : null}
                {proposal && (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                      <span className="rounded bg-gray-100 px-2 py-1">{proposal.proposalReference} · Version {proposal.version}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">{proposal.proposalType}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">Market {proposal.customerMarket} · Currency {proposal.currency}</span>
                      <span className="rounded bg-gray-100 px-2 py-1">Generated {new Date(proposal.generatedAt).toLocaleString()}</span>
                      {proposal.review && <span className="rounded bg-blue-50 px-2 py-1 text-blue-900">Reviewed by {proposal.review.reviewedBy}</span>}
                      {proposal.approval && (
                        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-900">
                          APPROVED FOR CUSTOMER REVIEW by {proposal.approval.approvedBy} · NOT SENT
                        </span>
                      )}
                    </div>
                    {!proposalCurrent && (
                      <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                        Proposal sources changed. This version cannot be reviewed or approved; generate a new version.
                      </p>
                    )}
                    <div className="grid gap-3 lg:grid-cols-2">
                      <section className="rounded-lg bg-gray-50 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Executive summary · provisional strategy text</h3>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-gray-800">{proposal.executiveSummary.text}</p>
                        <p className="mt-1 text-[9px] text-gray-500">Evidence: {proposal.executiveSummary.evidenceClassification} · {proposal.executiveSummary.reviewStatus}</p>
                      </section>
                      <section className="rounded-lg bg-gray-50 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Commercial record · PKR</h3>
                        <p className="mt-1 text-xs text-gray-800">Approved fee {proposal.commercialBreakdown.approvedProjectFee?.toLocaleString()} · advance required {proposal.commercialBreakdown.advanceRequired?.toLocaleString()} · verified received {proposal.commercialBreakdown.advanceReceived?.toLocaleString()} · balance {proposal.commercialBreakdown.remainingBalance?.toLocaleString()}</p>
                        <p className="mt-1 text-[10px] text-gray-600">{proposal.commercialBreakdown.note}</p>
                      </section>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Requirements and acceptance criteria</h3>
                        {[...proposal.customerRequirements, ...proposal.acceptanceCriteria].map((item, index) => (
                          <p key={`proposal-requirement-${index}`} className="mt-1 text-[10px] text-gray-700">
                            {item.evidenceClassification} · {item.text}
                          </p>
                        ))}
                      </section>
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Scope and technical approach</h3>
                        {[...proposal.includedServices, ...proposal.excludedServices, ...proposal.technicalApproach].map((item, index) => (
                          <p key={`proposal-scope-${index}`} className="mt-1 text-[10px] text-gray-700">
                            {item.evidenceClassification} · {item.text}
                          </p>
                        ))}
                      </section>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <section className="rounded-lg border border-gray-200 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Objectives, assumptions, and risks</h3>
                        {[...proposal.businessObjectives, ...proposal.assumptions, ...proposal.risks].map((item, index) => (
                          <p key={`proposal-risk-${index}`} className="mt-1 text-[10px] text-gray-700">
                            {item.evidenceClassification} · {item.text}
                          </p>
                        ))}
                      </section>
                      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <h3 className="text-[10px] font-extrabold uppercase text-amber-950">Open clarifications and conflicts</h3>
                        {proposal.pendingClarifications.length === 0
                          ? <p className="mt-1 text-[10px] text-gray-700">No open items were recorded by the approved sources.</p>
                          : proposal.pendingClarifications.map((item) => (
                            <p key={item.id} className="mt-1 text-[10px] text-amber-950">{item.kind} · {item.status} · {item.text}</p>
                          ))}
                        {proposal.pendingClarifications.length > 0 && (
                          <label className="mt-3 flex items-start gap-2 text-[10px] font-bold text-amber-950">
                            <input
                              type="checkbox"
                              checked={acknowledgeOpenProposalItems}
                              onChange={(event) => setAcknowledgeOpenProposalItems(event.target.checked)}
                            />
                            I reviewed and explicitly acknowledge these unresolved items for customer review.
                          </label>
                        )}
                      </section>
                    </div>
                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-[10px] font-extrabold text-gray-800">
                        Source references · {proposal.sourceReferences.length} · Agent 2 deliverables {proposal.deliverables.length}
                      </summary>
                      <p className="mt-2 text-[10px] text-amber-900">Agent 2 outputs are proposal references only and remain NOT_MAPPED to Agent 3 requirements.</p>
                      <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                        {proposal.sourceReferences.map((source) => (
                          <article key={source.id} className="rounded bg-gray-50 p-2">
                            <strong className="block text-[10px] text-gray-800">{source.sourceType} · {source.label}</strong>
                            <code className="text-[9px] text-gray-500">{source.sourcePath}</code>
                            <p className="mt-1 whitespace-pre-wrap break-words text-[10px] text-gray-700">{source.content}</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                {proposalHistory.length > 0 && (
                  <details className="mt-3 rounded-lg border border-gray-200 p-3">
                    <summary className="cursor-pointer text-[10px] font-extrabold text-gray-800">Prior proposal versions ({proposalHistory.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {proposalHistory.slice().reverse().map((item) => (
                        <li key={item.id} className="text-[10px] text-gray-600">
                          {item.proposalReference} · {item.status.replace(/_/g, " ")} · {new Date(item.generatedAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>

              <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-[#101216]">Agent 5 · Client Onboarding Agent</h2>
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-extrabold text-rose-900">
                        {clientOnboarding?.status || clientOnboardingPreview?.status || "READINESS NOT SAVED"}
                      </span>
                      {(clientOnboarding || clientOnboardingPreview) && (
                        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                          !clientOnboarding ? "bg-blue-100 text-blue-800" :
                            clientOnboardingCurrent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          SOURCES {!clientOnboarding ? "LIVE PREVIEW" : clientOnboardingCurrent ? "CURRENT" : "STALE"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
                      Admin-only readiness assessment using approved Agent 1–4 records and server-verified payment references. It cannot confirm customer acceptance, initiate customer contact, accept uploads, approve scope changes, or authorize project start.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!selectedProjectId || busy !== ""}
                      onClick={() => selectedProject && void loadClientOnboarding(selectedProject.id)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 disabled:opacity-50"
                    >
                      View / refresh
                    </button>
                    <button
                      type="button"
                      disabled={!selectedProject || busy !== ""}
                      onClick={() => void runClientOnboardingAction("prepare_assessment")}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
                    >
                      {busy === "client_onboarding_prepare_assessment" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Save readiness assessment
                    </button>
                    <button
                      type="button"
                      disabled={!clientOnboarding || !clientOnboardingCurrent ||
                        clientOnboarding.status !== "BLOCKED" || Boolean(clientOnboarding.humanReview) || busy !== ""}
                      onClick={() => void runClientOnboardingAction("review")}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-[11px] font-extrabold text-blue-900 disabled:opacity-50"
                    >
                      Review blockers
                    </button>
                  </div>
                </div>
                {clientOnboardingError && (
                  <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {clientOnboardingError}
                  </p>
                )}
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <p className="rounded-lg bg-gray-50 p-3 text-[10px] text-gray-700">
                    Customer profile reference: {clientOnboarding?.customerProfile.sourceReference || clientOnboardingPreview?.customerProfile.sourceReference || "not available"} · contact authorization: NOT VERIFIED
                  </p>
                  <p className="rounded-lg bg-gray-50 p-3 text-[10px] text-gray-700">
                    Category: {clientOnboarding?.project.category || clientOnboardingPreview?.project.category || "unknown"} · pending questions: {(clientOnboarding?.pendingClarifications || clientOnboardingPreview?.pendingClarifications || []).length}
                  </p>
                  <p className="rounded-lg bg-gray-50 p-3 text-[10px] text-gray-700">
                    Assets: {clientOnboarding?.customerAssets.items.length || 0} received · secure project upload: UNAVAILABLE · notifications: PREPARED NOT SENT
                  </p>
                </div>
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <strong className="text-[10px] font-extrabold uppercase text-amber-950">
                    {clientOnboardingEligible ? "Eligibility verified · human/customer gates remain" : "BLOCKED · onboarding has not started"}
                  </strong>
                  <ul className="mt-1 space-y-1">
                    {(clientOnboardingBlockers.length
                      ? clientOnboardingBlockers
                      : clientOnboarding?.handoff.blockers || clientOnboardingPreview?.handoff.blockers || []
                    ).map((blocker, index) => (
                      <li key={`onboarding-blocker-${index}`} className="text-[10px] text-amber-950">• {blocker}</li>
                    ))}
                  </ul>
                </div>
                {(clientOnboarding || clientOnboardingPreview) && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <section className="rounded-lg border border-gray-200 p-3">
                      <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Category-aware questions</h3>
                      <div className="mt-2 space-y-2">
                        {(clientOnboarding?.questionnaire || clientOnboardingPreview?.questionnaire || []).map((item) => (
                          <article key={item.id} className="rounded bg-gray-50 p-2">
                            <strong className="text-[10px] text-gray-800">{item.required ? "REQUIRED" : "OPTIONAL"} · {item.status.replace(/_/g, " ")}</strong>
                            <p className="mt-1 text-[10px] text-gray-700">{item.question}</p>
                            {item.requirementReferences.length > 0 && (
                              <p className="mt-1 text-[9px] text-gray-500">Requirement refs: {item.requirementReferences.join(", ")}</p>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="rounded-lg border border-gray-200 p-3">
                      <h3 className="text-[10px] font-extrabold uppercase text-gray-600">Evidence and handoff references</h3>
                      <p className="mt-1 text-[10px] text-gray-700">Customer acceptance: {clientOnboarding?.customerAcceptance.status || clientOnboardingPreview?.customerAcceptance.status || "NOT AVAILABLE"}</p>
                      <p className="mt-1 text-[10px] text-gray-700">Agreement: {clientOnboarding?.agreement.status || clientOnboardingPreview?.agreement.status || "NOT AVAILABLE"} · applicability {clientOnboarding?.agreement.applicability || clientOnboardingPreview?.agreement.applicability || "UNKNOWN"}</p>
                      <p className="mt-1 text-[10px] text-gray-700">Verified payment: {clientOnboarding?.paymentVerification.status || clientOnboardingPreview?.paymentVerification.status || "NOT VERIFIED"} · evidence refs {(clientOnboarding?.paymentVerification.references || clientOnboardingPreview?.paymentVerification.references || []).length}</p>
                      <p className="mt-1 text-[10px] text-gray-700">Handoff: {clientOnboarding?.handoff.status || clientOnboardingPreview?.handoff.status || "BLOCKED"} · Agent 1–4 records are read-only references.</p>
                      <p className="mt-2 text-[10px] text-amber-900">No direct agent communication, customer authentication, project asset upload, message delivery, or project-start authorization is available.</p>
                      {clientOnboarding?.humanReview && (
                        <p className="mt-2 text-[10px] text-blue-900">Blocked assessment reviewed by {clientOnboarding.humanReview.reviewedBy} · {new Date(clientOnboarding.humanReview.reviewedAt).toLocaleString()}</p>
                      )}
                    </section>
                  </div>
                )}
                {clientOnboardingHistory.length > 0 && (
                  <details className="mt-3 rounded-lg border border-gray-200 p-3">
                    <summary className="cursor-pointer text-[10px] font-extrabold text-gray-800">Prior readiness assessments ({clientOnboardingHistory.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {clientOnboardingHistory.slice().reverse().map((item) => (
                        <li key={item.id} className="text-[10px] text-gray-600">
                          Version {item.recordVersion} · {item.status} · {new Date(item.generatedAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>

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
                            {batch.completionEvidenceStatus && (
                              <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${statusStyle(batch.completionEvidenceStatus)}`}>
                                EVIDENCE {batch.completionEvidenceStatus.replace(/_/g, " ")}
                              </span>
                            )}
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
                            {task.status === "completed" && (
                              <p className={`mt-1 text-[9px] font-extrabold ${task.evidenceStatus === "VERIFIED" ? "text-emerald-800" : "text-amber-800"}`}>
                                OUTPUT {task.evidenceStatus || "LEGACY UNVERIFIED"}
                              </p>
                            )}
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
