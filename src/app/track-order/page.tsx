"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatPKR, buildWhatsAppLink, BUSINESS_INFO } from "@/lib/constants";
import type { PublicProjectProgress, PublicProjectMilestoneStatus } from "@/lib/types";
import WorkforceOffice from "@/components/projects/WorkforceOffice";
import {
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  FileText,
  Calendar,
  Layers,
  ExternalLink,
  Hammer,
} from "lucide-react";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";
  const initialEmail = searchParams.get("email") || "";

  const [refId, setRefId] = useState(initialRef);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inquiry, setInquiry] = useState<any | null>(null);
  const [projectProgress, setProjectProgress] = useState<PublicProjectProgress | null>(null);

  const statuses = [
    "New Inquiry",
    "Under Review",
    "Contacted",
    "Requirements Discussion",
    "Quotation Sent",
    "Awaiting Advance",
    "Advance Received",
    "Approved",
    "In Development",
    "Testing",
    "Delivered",
    "Completed",
  ];

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refId.trim() || !email.trim()) {
      setError("Please enter both your inquiry reference code and email.");
      return;
    }

    setLoading(true);
    setError("");
    setInquiry(null);
    setProjectProgress(null);

    try {
      const res = await fetch(
        `/api/public/inquiries/track?ref=${encodeURIComponent(
          refId.trim()
        )}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No matching inquiry found.");
      }
      setInquiry(data.inquiry);
      setProjectProgress(data.projectProgress || null);
    } catch (err: any) {
      setError(err.message || "Failed to look up inquiry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef && initialEmail) {
      handleTrack();
    }
  }, [initialRef, initialEmail]);

  const currentStatusIndex = inquiry ? statuses.indexOf(inquiry.status) : -1;

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#101216] text-white py-14 border-b border-[#242830]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            Secure Progress Tracker
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Track Your Web Application Inquiry
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-3xl mx-auto">
            Check your inquiry status and, after project approval, follow each build milestone and open your preview when it is shared.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <WorkforceOffice progress={projectProgress} verifiedInquiry={Boolean(inquiry)} />
        </div>

        {/* Lookup Form */}
        <div className="bg-[#F4F5F7] p-6 sm:p-9 rounded-2xl border border-gray-200 mb-12 shadow-sm">
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-end">
            <div className="sm:col-span-5">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Inquiry Reference Code (e.g. DW-849201)
              </label>
              <input
                type="text"
                placeholder="DW-XXXXXX"
                value={refId}
                onChange={(e) => setRefId(e.target.value.toUpperCase())}
                className="w-full bg-white text-sm text-[#101216] px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                required
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white text-sm text-[#101216] px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-sm shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Lookup
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#E31E36] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Inquiry Status Card Result */}
        {inquiry && (
          <div className="bg-white rounded-3xl border border-gray-300 p-6 sm:p-10 shadow-lg space-y-8 animate-fadeIn">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Inquiry Reference Code
                </span>
                <h2 className="text-2xl font-black text-[#101216]">
                  {inquiry.id}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Client: <strong>{inquiry.customerName}</strong> {inquiry.businessName && `(${inquiry.businessName})`}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Current Status
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#101216] text-[#E31E36] px-3.5 py-1 rounded-full text-xs font-black shadow-sm mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#E31E36] animate-pulse"></span>
                  {inquiry.status}
                </span>
              </div>
            </div>

            {/* Visual Status Pipeline */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-4">
                Milestone Pipeline
              </h3>
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[650px] flex items-center justify-between relative">
                  {/* Connecting Line */}
                  <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-[#E31E36] z-0 transition-all duration-500"
                    style={{
                      width: `${
                        currentStatusIndex >= 0
                          ? Math.min(100, (currentStatusIndex / (statuses.length - 1)) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>

                  {statuses.map((statusName, idx) => {
                    const isPassed = idx <= currentStatusIndex;
                    const isCurrent = idx === currentStatusIndex;
                    return (
                      <div
                        key={statusName}
                        className="relative z-10 flex flex-col items-center text-center"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                            isCurrent
                              ? "bg-[#E31E36] text-white ring-4 ring-red-100 shadow-glow"
                              : isPassed
                              ? "bg-gray-900 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isPassed ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[9px] mt-1.5 font-bold max-w-[65px] leading-tight ${
                            isCurrent
                              ? "text-[#E31E36]"
                              : isPassed
                              ? "text-gray-800"
                              : "text-gray-400"
                          }`}
                        >
                          {statusName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Financial & Scope Snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">Estimated Project Price:</span>
                <strong className="text-lg font-black text-[#101216]">
                  {formatPKR(inquiry.estimatedTotal)}
                </strong>
              </div>

              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">Advance Amount:</span>
                <strong className="text-lg font-black text-[#101216]">
                  {formatPKR(inquiry.advanceAmount)}
                </strong>
              </div>

              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">Monthly Installments:</span>
                <strong className="text-lg font-black text-[#E31E36]">
                  PKR {inquiry.regularInstallment.toLocaleString()} / mo
                </strong>
              </div>
            </div>

            {/* WhatsApp Contact Action */}
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950">
                  Have questions about this inquiry or ready to proceed?
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Message our team directly on WhatsApp citing reference code <strong>{inquiry.id}</strong>.
                </p>
              </div>

              <a
                href={buildWhatsAppLink(
                  `Assalam-o-Alaikum Durrani Web Developers, I am checking the status of my inquiry ${inquiry.id} for "${inquiry.customerName}".`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow transition"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Us ({BUSINESS_INFO.phoneDisplay})
              </a>
            </div>
          </div>
        )}

        {inquiry && projectProgress && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-[#101216] text-white shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#191d25] to-[#242830] px-6 py-6 sm:px-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                    <Hammer className="h-3 w-3" /> Website build progress
                  </span>
                  <h2 className="mt-3 text-xl font-black sm:text-2xl">{projectProgress.projectName}</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Milestones update when our team advances the project. Refresh this tracker to see the latest progress.
                  </p>
                </div>
                <div className="min-w-32 sm:text-right">
                  <strong className="text-3xl font-black text-[#E31E36]">{projectProgress.percentComplete}%</strong>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Milestones complete</span>
                </div>
              </div>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Website build progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={projectProgress.percentComplete}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E31E36] to-orange-400 transition-all duration-700"
                  style={{ width: `${projectProgress.percentComplete}%` }}
                />
              </div>
            </div>

            <ol className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
              {projectProgress.milestones.map((milestone) => {
                const stateLabels: Record<PublicProjectMilestoneStatus, string> = {
                  waiting: "Coming up",
                  ready: "Up next",
                  active: "In progress",
                  awaiting_admin: "Final team review",
                  completed: "Complete",
                };
                const complete = milestone.status === "completed";
                const active = milestone.status === "active" || milestone.status === "awaiting_admin";
                const ready = milestone.status === "ready";
                return (
                  <li
                    key={milestone.id}
                    className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 ${
                      complete
                        ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                        : active
                          ? "border-[#E31E36]/50 bg-[#E31E36]/[0.08]"
                          : ready
                            ? "border-sky-400/30 bg-sky-400/[0.06]"
                          : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        complete ? "bg-emerald-400 text-[#101216]" : active ? "bg-[#E31E36] text-white" : ready ? "bg-sky-400 text-[#101216]" : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {complete ? <CheckCircle2 className="h-4 w-4" /> : milestone.id === "preview" ? <ExternalLink className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </span>
                    <span>
                      <strong className="block text-xs font-extrabold">{milestone.label}</strong>
                      <span className={`mt-1 block text-[10px] font-bold ${complete ? "text-emerald-300" : active ? "text-red-200" : ready ? "text-sky-200" : "text-gray-500"}`}>
                        {stateLabels[milestone.status]}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>

            {projectProgress.previewUrl ? (
              <div className="px-5 pb-6 sm:px-8">
                <a
                  href={projectProgress.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-600"
                >
                  <ExternalLink className="h-4 w-4" /> Open your website preview
                </a>
                <p className="mt-2 text-[10px] text-gray-400">
                  This is a review preview. Production launch happens only after final approval.
                </p>
              </div>
            ) : (
              <p className="px-5 pb-6 text-[10px] text-gray-500 sm:px-8">
                Your review preview link will appear here once it is ready and shared by our team.
              </p>
            )}
          </section>
        )}

        {/* Privacy Guard Notice */}
        <div className="mt-12 bg-[#F4F5F7] p-5 rounded-xl border border-gray-200 text-xs text-gray-500 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#E31E36] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Client data is strictly isolated. Only users with both the valid reference ID and matching email can view project milestone tracking. Private administrator notes and other client accounts are never exposed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-bold">Loading inquiry tracker...</p>
          </div>
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
