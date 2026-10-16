"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Inquiry, OrderStatus } from "@/lib/types";
import { formatPKR, buildWhatsAppLink, BUSINESS_INFO } from "@/lib/constants";
import { formatCurrency, isCurrencyCode } from "@/lib/currency";
import {
  Inbox,
  Search,
  Filter,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  FileCheck,
  ChevronDown,
} from "lucide-react";

function formatInquiryEstimate(inquiry: Inquiry): string {
  if (
    inquiry.internationalPricing &&
    inquiry.internationalCalculation &&
    isCurrencyCode(inquiry.currency)
  ) {
    return `${formatCurrency(inquiry.internationalCalculation.estimatedTotal, inquiry.currency)} (PKR base ${formatPKR(inquiry.calculation.estimatedTotal)})`;
  }
  return formatPKR(inquiry.calculation.estimatedTotal);
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Conversion modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [timelineInput, setTimelineInput] = useState("3 to 4 Weeks");
  const [advanceInput, setAdvanceInput] = useState("10000");
  const [converting, setConverting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const statusOptions: OrderStatus[] = [
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
    "On Hold",
    "Cancelled",
  ];

  const fetchInquiries = async () => {
    try {
      const res = await fetch("/api/admin/inquiries");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInquiries(data.inquiries);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (inquiryId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inquiryId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === inquiryId ? { ...i, status: newStatus } : i))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev: any) => ({ ...prev, status: newStatus }));
        }
        setActionSuccess(`Status updated to ${newStatus}`);
        setTimeout(() => setActionSuccess(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvertInquiry = async () => {
    if (!selectedInquiry) return;
    setConverting(true);

    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: selectedInquiry.id,
          deliveryTimeline: timelineInput,
          initialAdvanceReceived: Number(advanceInput),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to convert inquiry");
      }

      setActionSuccess(`Successfully converted into Project #${data.project.id}!`);
      setConvertModalOpen(false);
      fetchInquiries();
      setSelectedInquiry((prev: any) => ({
        ...prev,
        status: "Approved",
        convertedProjectId: data.project.id,
      }));
    } catch (err: any) {
      alert(err.message || "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesStatus = statusFilter === "All" || inq.status === statusFilter;
    const matchesSearch =
      inq.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Inquiries & Project Requests"
          subtitle="Review client questionnaire responses and convert inquiries to active projects"
        />

        <div className="p-6 space-y-6 flex-1">
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, client name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F4F5F7] text-xs text-[#101216] px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              >
                <option value="All">All Statuses ({inquiries.length})</option>
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inquiries Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading incoming inquiries...</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No inquiries matching the current criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Ref Code</th>
                      <th className="py-3 px-4">Customer / Business</th>
                      <th className="py-3 px-4">Project Type</th>
                      <th className="py-3 px-4">Admin Tier</th>
                      <th className="py-3 px-4">Estimated Budget</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-black text-[#E31E36]">
                          {inq.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-[#101216] block">{inq.customerName}</strong>
                          <span className="text-gray-400 text-[11px]">
                            {inq.businessName || inq.phone}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          {inq.projectTypes[0] || "Custom App"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inq.adminPanelType === "client_admin"
                                ? "bg-red-50 text-[#E31E36] border border-red-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {inq.adminPanelType === "client_admin" ? "Client Admin (PKR 45k+)" : "Managed (PKR 35k)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#101216]">
                          {formatInquiryEstimate(inq)}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={inq.status}
                            onChange={(e) => handleUpdateStatus(inq.id, e.target.value as OrderStatus)}
                            className="text-[11px] font-bold bg-[#F4F5F7] border border-gray-300 rounded-lg px-2 py-1 text-gray-800 focus:outline-none focus:border-[#E31E36]"
                          >
                            {statusOptions.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedInquiry(inq)}
                            className="bg-gray-100 hover:bg-gray-200 text-[#101216] px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition"
                          >
                            View Scope
                          </button>
                          <a
                            href={buildWhatsAppLink(
                              `Assalam-o-Alaikum ${inq.customerName}! This is Durrani Web Developers regarding your inquiry ${inq.id} for "${inq.businessName || inq.customerName}" (Estimated ${formatInquiryEstimate(inq)}). Let's discuss your timeline and technical scope.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg inline-flex items-center text-[11px] font-bold transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
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

      {/* Inquiry Detail Drawer / Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-gray-300 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Questionnaire Submission Scope
                </span>
                <h3 className="text-2xl font-black text-[#101216]">
                  {selectedInquiry.id} • {selectedInquiry.customerName}
                </h3>
                <span className="text-xs text-gray-500">
                  Logged on {new Date(selectedInquiry.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-gray-400 hover:text-black p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Email</span>
                <a href={`mailto:${selectedInquiry.email}`} className="text-[#E31E36] font-semibold underline">
                  {selectedInquiry.email}
                </a>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">WhatsApp / Phone</span>
                <strong className="text-gray-800">{selectedInquiry.phone}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">City / Location</span>
                <strong className="text-gray-800">{selectedInquiry.cityCountry || "Pakistan"}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Preferred Contact</span>
                <strong className="text-gray-800 uppercase">{selectedInquiry.preferredContact}</strong>
              </div>
            </div>

            {/* Scope Details */}
            <div className="space-y-4 text-xs text-gray-800">
              <div>
                <span className="font-bold text-gray-500 block mb-1">Problem to solve / Objectives:</span>
                <p className="bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
                  {selectedInquiry.problemToSolve || "Not specified"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-gray-500 block mb-1">Target Audience:</span>
                  <p className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    {selectedInquiry.targetAudience || "Not specified"}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 block mb-1">Products / Services:</span>
                  <p className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    {selectedInquiry.productsServices || "Not specified"}
                  </p>
                </div>
              </div>

              {selectedInquiry.scanFeatures && selectedInquiry.scanFeatures.length > 0 && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-emerald-950">URL scan features captured</h3>
                    {selectedInquiry.inspirationUrl && (
                      <span className="break-all text-[11px] text-emerald-800">
                        Scanned URL: {selectedInquiry.inspirationUrl}
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {selectedInquiry.scanFeatures.map((feature, index) => (
                      <li key={`${feature.title}-${index}`} className="text-[11px] leading-relaxed text-emerald-950">
                        <strong>{feature.title}:</strong> {feature.evidence}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Add-ons & Admin Tier */}
              <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-gray-700">Selected Administrative Package:</span>
                  <span className="text-[#E31E36]">
                    {selectedInquiry.adminPanelType === "client_admin"
                      ? "Package 2: With Client Admin Support"
                      : "Package 1: Without Client Admin (Managed)"}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-red-200 text-gray-700">
                  <span>Selected Modular Add-ons:</span>
                  <span className="font-bold">
                    {selectedInquiry.selectedAddons.length > 0
                      ? selectedInquiry.calculation.selectedAddonDetails?.map((addon) => addon.label).join(", ") || selectedInquiry.selectedAddons.join(", ")
                      : "None"}
                  </span>
                </div>

                {(selectedInquiry.calculation.monthlyAddonTotal || 0) > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-red-200 text-gray-700">
                    <span>Recurring monthly add-ons:</span>
                    <strong>
                      {selectedInquiry.internationalPricing && selectedInquiry.internationalCalculation && isCurrencyCode(selectedInquiry.currency)
                        ? `${formatCurrency(selectedInquiry.internationalCalculation.monthlyAddonTotal || 0, selectedInquiry.currency)} / month (${formatPKR(selectedInquiry.calculation.monthlyAddonTotal || 0)} PKR base)`
                        : `${formatPKR(selectedInquiry.calculation.monthlyAddonTotal || 0)} / month`}
                    </strong>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-red-200">
                  <span className="text-xs uppercase font-extrabold text-gray-600">Calculated Budget:</span>
                  <strong className="text-xl font-black text-[#E31E36]">
                    {formatInquiryEstimate(selectedInquiry)}
                  </strong>
                </div>
                {selectedInquiry.internationalPricing && (
                  <p className="text-[11px] text-gray-600">
                    FX rate at inquiry time: 1 PKR = {selectedInquiry.exchangeRate} {selectedInquiry.currency}. Project accounting remains in PKR until the final quote is agreed.
                  </p>
                )}
              </div>
            </div>

            {/* Conversion CTA Footer */}
            <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <a
                href={buildWhatsAppLink(
                  `Assalam-o-Alaikum ${selectedInquiry.customerName}! This is Durrani Web Developers regarding your inquiry ${selectedInquiry.id}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
              >
                <MessageSquare className="w-4 h-4" /> Message on WhatsApp
              </a>

              {selectedInquiry.convertedProjectId ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  ✓ Converted to Project #{selectedInquiry.convertedProjectId}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTimelineInput(selectedInquiry.preferredLaunchDate || "3 to 4 Weeks");
                    setAdvanceInput(String(selectedInquiry.calculation.advanceAmount || 10000));
                    setConvertModalOpen(true);
                  }}
                  className="bg-[#101216] hover:bg-[#E31E36] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Convert Inquiry to Active Project
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Inquiry to Project Confirmation Modal */}
      {convertModalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-300">
            <h3 className="text-lg font-black text-[#101216]">
              Convert Inquiry to Approved Project
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This will automatically register <strong>{selectedInquiry.customerName}</strong> in the Clients Directory and initialize a new active Project in the pipeline.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Approved Project Fee (PKR)</label>
                <input
                  type="text"
                  disabled
                  value={formatPKR(selectedInquiry.calculation.estimatedTotal)}
                  className="w-full bg-gray-100 font-bold px-3 py-2 rounded-lg border border-gray-300 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Agreed Delivery Timeline</label>
                <input
                  type="text"
                  value={timelineInput}
                  onChange={(e) => setTimelineInput(e.target.value)}
                  className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-gray-800 focus:outline-none focus:border-[#E31E36]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Initial Advance Received (PKR)
                </label>
                <input
                  type="number"
                  value={advanceInput}
                  onChange={(e) => setAdvanceInput(e.target.value)}
                  className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-gray-800 focus:outline-none focus:border-[#E31E36]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  If advance has already been transferred via JazzCash/EasyPaisa, enter it to log the payment record immediately.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={converting}
                onClick={handleConvertInquiry}
                className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
              >
                {converting ? "Converting..." : "Approve & Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
