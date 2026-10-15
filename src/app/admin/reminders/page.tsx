"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { PaymentReminder } from "@/lib/types";
import { formatPKR, buildWhatsAppLink, BUSINESS_INFO } from "@/lib/constants";
import {
  Bell,
  Search,
  MessageSquare,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Send,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/admin/reminders");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setReminders(data.reminders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleMarkSent = async (reminderId: string) => {
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_sent", reminderId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Reminder recorded as sent!");
        fetchReminders();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunCron = async () => {
    setRunningCron(true);
    setCronResult(null);

    try {
      const res = await fetch("/api/cron/reminders");
      const data = await res.json();
      setCronResult(data);
      fetchReminders();
      setSuccessMsg(`Cron scan completed. ${data.generatedCount || 0} reminders processed.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningCron(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Automated Monthly Payment Reminders"
          subtitle="Configure installment reminder schedules, triggers, and WhatsApp dispatch logs"
          actionButton={
            <button
              onClick={handleRunCron}
              disabled={runningCron}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition disabled:opacity-50"
            >
              {runningCron ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Run Reminder Cron Engine</span>
            </button>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Configuration & Cron Details Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Automated Triggers
              </span>
              <h3 className="font-extrabold text-sm text-[#101216]">Configured Due Cadence</h3>
              <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-semibold">
                  7 Days Before
                </span>
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-semibold">
                  3 Days Before
                </span>
                <span className="bg-red-50 text-[#E31E36] px-2 py-0.5 rounded font-bold">
                  On Due Date
                </span>
                <span className="bg-red-100 text-[#E31E36] px-2 py-0.5 rounded font-bold">
                  Overdue
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Vercel Production Cron
              </span>
              <h3 className="font-extrabold text-sm text-[#101216]">Cron Endpoint: /api/cron/reminders</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Protected with Bearer CRON_SECRET token. Automated daily evaluation with deduplication.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Delivery Integrity
              </span>
              <h3 className="font-extrabold text-sm text-[#101216]">Honest Integration Status</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                When external WhatsApp API keys are not supplied, reminders are marked as{" "}
                <strong className="text-amber-600">Pending Manual Action</strong> with 1-click WhatsApp buttons.
              </p>
            </div>
          </div>

          {/* Reminders Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Installment Payment Reminders Queue ({reminders.length})
              </h3>
              <button
                onClick={fetchReminders}
                className="text-xs font-bold text-gray-500 hover:text-[#101216] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Queue
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading reminder queue...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No payment reminders currently queued.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Client / Project</th>
                      <th className="py-3 px-4">Installment Amount</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Timing Type</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reminders.map((rem) => (
                      <tr key={rem.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4">
                          <strong className="text-gray-900 block">{rem.clientName}</strong>
                          <span className="text-[11px] text-gray-500">
                            {rem.projectName} • #{rem.installmentNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-sm text-[#E31E36]">
                          {formatPKR(rem.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 font-semibold">{rem.dueDate}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {rem.reminderType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 uppercase font-semibold text-[10px]">
                          {rem.channel}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              rem.status === "Sent"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : rem.status === "Pending Manual Action"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {rem.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <a
                            href={buildWhatsAppLink(rem.messageText)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleMarkSent(rem.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition"
                            title="Open WhatsApp with prefilled reminder message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Send via WhatsApp
                          </a>
                          {rem.status !== "Sent" && (
                            <button
                              onClick={() => handleMarkSent(rem.id)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded-lg text-[11px] font-bold transition"
                            >
                              Mark Sent
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
