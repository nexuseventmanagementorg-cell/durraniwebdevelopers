"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { PaymentRecord, Project, PaymentMethod } from "@/lib/types";
import { formatPKR } from "@/lib/constants";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  X,
  AlertCircle,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // New payment form
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("JazzCash");
  const [transactionRef, setTransactionRef] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [verifiedNow, setVerifiedNow] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    try {
      const [resPay, resProj] = await Promise.all([
        fetch("/api/admin/payments"),
        fetch("/api/admin/projects"),
      ]);

      if (resPay.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const dataPay = await resPay.json();
      const dataProj = await resProj.json();

      if (dataPay.success) setPayments(dataPay.payments);
      if (dataProj.success) {
        setProjects(dataProj.projects);
        if (dataProj.projects.length > 0) {
          setProjectId(dataProj.projects[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (paymentId: string) => {
    const verificationNote = window.prompt(
      "Enter where you checked the received funds (bank statement or provider record):"
    )?.trim();
    if (!verificationNote) return;

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, verified: true, status: "Paid", verificationNote }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Payment marked paid by admin; verification note recorded.");
        fetchPayments();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else window.alert(data.error || "Payment could not be verified.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !amount || Number(amount) <= 0) {
      alert("Please select a valid project and positive amount.");
      return;
    }
    if (verifiedNow && !adminNotes.trim()) {
      alert("Add a note identifying the bank or provider record you checked before marking payment paid.");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          amount: Number(amount),
          method,
          transactionRef,
          adminNotes,
          verifiedByAdmin: verifiedNow,
          status: verifiedNow ? "Paid" : "Awaiting Verification",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(verifiedNow ? "Payment recorded as admin-marked paid." : "Payment recorded as awaiting verification.");
        setModalOpen(false);
        setAmount("");
        setTransactionRef("");
        setAdminNotes("");
        fetchPayments();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else window.alert(data.error || "Payment could not be recorded.");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const totalVerifiedPaid = payments
    .filter((p) => p.status === "Paid" && p.verifiedByAdmin)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAwaitingVerification = payments
    .filter((p) => p.status === "Awaiting Verification")
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter((p) => {
    return (
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Payment Verification & Financial Ledger"
          subtitle="Record and verify JazzCash, EasyPaisa, and bank transfer client payments"
          actionButton={
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment Entry</span>
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

          {/* Financial Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  Admin-Marked Received
                </span>
                <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                  {formatPKR(totalVerifiedPaid)}
                </strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  Awaiting Verification
                </span>
                <strong className="text-2xl font-black text-amber-600 mt-1 block">
                  {formatPKR(totalAwaitingVerification)}
                </strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  Supported Methods
                </span>
                <strong className="text-xs font-bold text-gray-800 mt-1 block">
                  JazzCash • EasyPaisa • Bank
                </strong>
                <span className="text-[10px] text-gray-400">Admin verification required</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E31E36] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            “Admin marked paid” means a staff member recorded a manual check. It is not automatic bank or gateway confirmation; match each transaction reference against the provider or bank record.
          </p>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction ID, project, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Transactions: <strong>{payments.length}</strong>
            </span>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading payments ledger...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No payment transactions recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Transaction Ref</th>
                      <th className="py-3 px-4">Project & Client</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#101216]">
                          {p.transactionRef}
                          <span className="text-[10px] text-gray-400 block font-normal">
                            ID: {p.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-gray-900 block">{p.projectName}</strong>
                          <span className="text-[11px] text-gray-500">{p.clientName}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                            {p.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-sm text-[#101216]">
                          {formatPKR(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {p.verifiedByAdmin && p.status === "Paid" ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> Admin marked paid
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {p.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!p.verifiedByAdmin ? (
                            <button
                              onClick={() => handleVerify(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify & Mark Paid
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Verified</span>
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

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Financial Ledger</span>
                <h3 className="text-xl font-black text-[#101216]">Record Client Payment</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                  required
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.clientName}) - Balance: {formatPKR(proj.remainingBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e: any) => setMethod(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216] font-bold"
                  >
                    <option value="JazzCash">JazzCash</option>
                    <option value="Easypaisa">Easypaisa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Manual Entry / Cash">Manual Entry / Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Transaction Ref / TRX ID</label>
                <input
                  type="text"
                  placeholder="e.g. JC-8921892 or Bank slip reference"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  rows={2}
                  placeholder="Where did you verify this? e.g. bank statement date or provider transaction record"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={verifiedNow}
                    onChange={(e) => setVerifiedNow(e.target.checked)}
                    className="accent-[#E31E36] w-4 h-4"
                  />
                  <span>I checked the bank/provider record; mark this as paid</span>
                </label>
                <p className="mt-2 pl-6 text-[10px] leading-relaxed text-gray-500">
                  Leave unchecked until the funds and transaction reference are confirmed. The note above is required when marking paid.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
                >
                  {saving ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
