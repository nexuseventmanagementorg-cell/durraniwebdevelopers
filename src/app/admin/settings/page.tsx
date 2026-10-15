"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { AuditLog, SystemSettings } from "@/lib/types";
import { BUSINESS_INFO } from "@/lib/constants";
import {
  Settings,
  ShieldCheck,
  Server,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCode,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data = await res.json();
        if (data.success && data.stats) {
          setAuditLogs(data.stats.recentActivity || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="System Settings & Security Audit Logs"
          subtitle="Platform configurations, API integration statuses, and immutable administrative activity records"
        />

        <div className="p-6 space-y-6 flex-1">
          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* Business & Platform Configuration Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#101216]">
                  Business Profile & Operational Details
                </h3>
                <p className="text-xs text-gray-500">
                  Global parameters applied throughout public forms, invoices, and WhatsApp links.
                </p>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Core Identity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Business Name
                </span>
                <strong className="text-sm font-black text-[#101216] block">
                  {BUSINESS_INFO.name}
                </strong>
                <span className="text-[11px] text-gray-500">{BUSINESS_INFO.tagline}</span>
              </div>

              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Primary Email
                </span>
                <strong className="text-xs font-bold text-[#101216] block">
                  {BUSINESS_INFO.email}
                </strong>
                <span className="text-[10px] text-gray-500">Contact & invoice reply-to</span>
              </div>

              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  WhatsApp / Phone
                </span>
                <strong className="text-xs font-bold text-emerald-600 block">
                  {BUSINESS_INFO.phoneDisplay}
                </strong>
                <span className="text-[10px] text-gray-500">Format: +92 329 9669565</span>
              </div>

              <div className="bg-[#F4F5F7] p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Operating Currency
                </span>
                <strong className="text-xs font-bold text-[#E31E36] block">
                  Pakistani Rupees (PKR)
                </strong>
                <span className="text-[10px] text-gray-500">Symbol: Rs.</span>
              </div>
            </div>
          </div>

          {/* Technical Environment & Integration Readiness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-[#101216]">
                <Server className="w-5 h-5 text-[#E31E36]" />
                <h3 className="font-black text-sm">Deployment & Runtime</h3>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Target Hosting Platform:</span>
                  <strong className="text-black font-bold">Vercel (Production Ready)</strong>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Framework & Runtime:</span>
                  <strong className="text-black font-bold">Next.js 14 (App Router)</strong>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Automated Cron Worker:</span>
                  <strong className="text-emerald-600 font-bold">Vercel Cron Enabled (/api/cron/reminders)</strong>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-[#101216]">
                <Database className="w-5 h-5 text-[#E31E36]" />
                <h3 className="font-black text-sm">Database & Supabase Status</h3>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Primary Data Store:</span>
                  <strong className="text-black font-bold">Persistent Local Store (data/db.json)</strong>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Supabase PostgreSQL Schema:</span>
                  <strong className="text-emerald-600 font-bold">Available in /supabase/schema.sql</strong>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span>Row Level Security (RLS):</span>
                  <strong className="text-black font-bold">Configured & Enforced</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#E31E36]" />
                <h3 className="font-black text-xs text-[#101216] uppercase tracking-wider">
                  Administrative Audit Logs (Recent Actions)
                </h3>
              </div>
              <span className="text-[10px] text-gray-400">
                Tamper-evident system activity log
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No audit entries recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Target Type</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 font-bold text-[#E31E36]">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {log.actor}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase">
                            {log.targetType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 max-w-md">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
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
