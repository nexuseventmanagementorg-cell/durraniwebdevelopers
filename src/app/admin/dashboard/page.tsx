"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { formatPKR, BUSINESS_INFO } from "@/lib/constants";
import {
  Users,
  Briefcase,
  Inbox,
  CreditCard,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Dashboard data could not be loaded.");
        setStats(data.stats);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Executive Dashboard"
          subtitle="Real-time performance, client metrics, and financial records"
          actionButton={
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Review Inquiries</span>
            </Link>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-500 font-bold">Aggregating live business ledger...</p>
            </div>
          ) : !stats ? (
            <div role="alert" className="m-6 border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{loadError || "Failed to load dashboard data."}</div>
          ) : (
            <>
              {/* Row 1: Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Total Clients
                    </span>
                    <strong className="text-2xl font-black text-[#101216] mt-0.5 block">
                      {stats.totalClients}
                    </strong>
                    <Link href="/admin/clients" className="text-[11px] text-[#E31E36] font-bold hover:underline">
                      Manage Clients &rarr;
                    </Link>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-red-50 text-[#E31E36] flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Active Projects
                    </span>
                    <strong className="text-2xl font-black text-[#101216] mt-0.5 block">
                      {stats.activeProjects}
                    </strong>
                    <Link href="/admin/projects" className="text-[11px] text-[#E31E36] font-bold hover:underline">
                      View Projects &rarr;
                    </Link>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      New Inquiries
                    </span>
                    <strong className="text-2xl font-black text-[#E31E36] mt-0.5 block">
                      {stats.newInquiries}
                    </strong>
                    <Link href="/admin/inquiries" className="text-[11px] text-[#E31E36] font-bold hover:underline">
                      Review Inbox &rarr;
                    </Link>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Inbox className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Awaiting Scope Approval
                    </span>
                    <strong className="text-2xl font-black text-[#101216] mt-0.5 block">
                      {stats.projectsAwaitingApproval}
                    </strong>
                    <span className="text-[11px] text-gray-400">In discussion</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Row 2: Financial Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#101216] text-white p-6 rounded-2xl border border-gray-800 shadow-card-dark">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="uppercase tracking-wider font-bold">Admin-Marked Payments</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white">
                    {formatPKR(stats.revenueReceived)}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Manually marked by admin; confirm against the bank or provider record.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="uppercase tracking-wider font-bold">Outstanding Balances</span>
                    <AlertCircle className="w-4 h-4 text-[#E31E36]" />
                  </div>
                  <div className="text-3xl font-black text-[#101216]">
                    {formatPKR(stats.outstandingBalances)}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Spread across monthly installment plans.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="uppercase tracking-wider font-bold">Pending Actions</span>
                    <CreditCard className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-3xl font-black text-[#E31E36]">
                      {stats.pendingPayments}
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">payments to verify</span>
                  </div>
                  <Link
                    href="/admin/payments"
                    className="text-xs font-bold text-[#E31E36] hover:underline mt-2 inline-block"
                  >
                    Go to Payment Verification &rarr;
                  </Link>
                </div>
              </div>

              {/* Row 3: Monthly Revenue & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Monthly Revenue Chart */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#101216] uppercase tracking-wider mb-4">
                    Monthly Revenue Overview (PKR)
                  </h3>

                  {Object.keys(stats.monthlyRevenueMap || {}).length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      No verified payments logged yet.
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {Object.entries(stats.monthlyRevenueMap).map(([month, rev]: [string, any]) => (
                        <div key={month} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-gray-700">
                            <span>{month}</span>
                            <span className="text-[#E31E36]">{formatPKR(rev)}</span>
                          </div>
                          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-[#E31E36] h-full rounded-full"
                              style={{ width: `${Math.min(100, (rev / 100000) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity Audit Stream */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#101216] uppercase tracking-wider mb-4">
                      Recent Audit Activity
                    </h3>

                    <div className="space-y-3">
                      {stats.recentActivity?.map((act: any) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-[#101216] font-bold">{act.action}</strong>
                            <span className="text-[10px] text-gray-400">
                              {new Date(act.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-[11px] leading-relaxed">{act.details}</p>
                          <span className="text-[10px] text-gray-400 block">By: {act.actor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-gray-100 text-right">
                    <Link href="/admin/settings" className="text-xs font-bold text-[#E31E36] hover:underline">
                      View Full Audit Log &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
