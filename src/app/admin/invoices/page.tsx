"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Invoice, Project } from "@/lib/types";
import { formatPKR, BUSINESS_INFO } from "@/lib/constants";
import {
  FileText,
  Search,
  Plus,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Building,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);

  // New invoice state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState(
    "Standard commercial invoice for web development engineering services. Support & inquiries: durraniwebdevelopers@gmail.com"
  );
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchInvoices = async () => {
    try {
      const [resInv, resProj] = await Promise.all([
        fetch("/api/admin/invoices"),
        fetch("/api/admin/projects"),
      ]);

      if (resInv.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const dataInv = await resInv.json();
      const dataProj = await resProj.json();

      if (dataInv.success) setInvoices(dataInv.invoices);
      if (dataProj.success) {
        setProjects(dataProj.projects);
        if (dataProj.projects.length > 0) {
          setSelectedProjectId(dataProj.projects[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          dueDate,
          termsAndNotes: terms,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Invoice #${data.invoice.id} created successfully!`);
        setCreateModalOpen(false);
        fetchInvoices();
        setPrintModalInvoice(data.invoice);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    return (
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Project Invoices & Billing"
          subtitle="Generate itemized, printable commercial invoices and track client balances"
          actionButton={
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Project Invoice</span>
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

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice number, client, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Invoices: <strong>{invoices.length}</strong>
            </span>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No invoices generated yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Client / Project</th>
                      <th className="py-3 px-4">Invoice Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-black text-[#E31E36]">
                          {inv.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-gray-900 block">{inv.projectName}</strong>
                          <span className="text-[11px] text-gray-500">{inv.clientName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{inv.invoiceDate}</td>
                        <td className="py-3.5 px-4 text-gray-600">{inv.dueDate}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {formatPKR(inv.totalDue)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {formatPKR(inv.amountPaid)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#E31E36]">
                          {formatPKR(inv.remainingBalance)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setPrintModalInvoice(inv)}
                            className="bg-gray-100 hover:bg-gray-200 text-[#101216] px-3 py-1.5 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            View & Print
                          </button>
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

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Invoicing</span>
                <h3 className="text-xl font-black text-[#101216]">Generate Project Invoice</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                  required
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.clientName}) - Total: {formatPKR(proj.approvedPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Commercial Terms & Payment Notes</label>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {printModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 sm:p-12 space-y-8 shadow-2xl border border-gray-300 relative my-8">
            {/* Action buttons (hidden when printing) */}
            <div className="no-print flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500">
                Official Commercial Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-glow inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setPrintModalInvoice(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="space-y-8">
              {/* Header: Business & Invoice Info */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#E31E36] bg-black">
                      <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#101216] tracking-tight">
                        DURRANI <span className="text-[#E31E36]">WEB DEVELOPERS</span>
                      </h2>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Ideas • Code • Real Solutions
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 pt-2 space-y-0.5">
                    <p>Email: {BUSINESS_INFO.email}</p>
                    <p>WhatsApp / Phone: {BUSINESS_INFO.phoneDisplay}</p>
                    <p>Web: {BUSINESS_INFO.website}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-2xl font-black text-[#101216] block uppercase tracking-wider">
                    Commercial Invoice
                  </span>
                  <span className="text-base font-black text-[#E31E36] font-mono block">
                    {printModalInvoice.id}
                  </span>
                  <div className="text-xs text-gray-500 pt-1">
                    <p>Date: <strong>{printModalInvoice.invoiceDate}</strong></p>
                    <p>Payment Due: <strong>{printModalInvoice.dueDate}</strong></p>
                    <p>Status: <strong className="text-emerald-600">{printModalInvoice.status}</strong></p>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-[#F4F5F7] p-5 rounded-2xl border border-gray-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Billed To (Client):
                  </span>
                  <strong className="text-sm font-black text-[#101216] block">
                    {printModalInvoice.clientName}
                  </strong>
                  {printModalInvoice.clientBusiness && (
                    <span className="text-gray-700 block font-semibold">
                      {printModalInvoice.clientBusiness}
                    </span>
                  )}
                  <span className="text-gray-600 block">{printModalInvoice.clientPhone}</span>
                  <span className="text-gray-600 block">{printModalInvoice.clientEmail}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Project Reference:
                  </span>
                  <strong className="text-sm font-bold text-gray-800 block">
                    {printModalInvoice.projectName}
                  </strong>
                  <span className="text-gray-500 text-[11px] block mt-1">
                    Payment Arrangement: {printModalInvoice.paymentMethod || "JazzCash / EasyPaisa / Bank Transfer"}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101216] text-white uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Description / Scope Deliverable</th>
                      <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {printModalInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {item.description}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-gray-900">
                          {formatPKR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Agreed Project Fee:</span>
                    <strong className="text-gray-900">{formatPKR(printModalInvoice.totalDue)}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-200">
                    <span>Total Paid to Date:</span>
                    <strong className="text-emerald-600">{formatPKR(printModalInvoice.amountPaid)}</strong>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#101216] pt-1">
                    <span>Outstanding Balance Due:</span>
                    <span className="text-[#E31E36]">{formatPKR(printModalInvoice.remainingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Installment Summary & Notes */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                <strong className="text-gray-900 font-bold block">Installment Arrangement & Terms:</strong>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  {printModalInvoice.scheduleSummary}
                </p>
                <p className="text-gray-500 text-[11px] leading-relaxed italic">
                  {printModalInvoice.termsAndNotes}
                </p>
              </div>

              {/* Footer Stamp */}
              <div className="pt-6 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400">
                <span>Durrani Web Developers • Official Project Invoice</span>
                <span>All amounts in Pakistani Rupees (PKR)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
