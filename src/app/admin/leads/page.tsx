"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { buildWhatsAppLinkTo } from "@/lib/constants";
import { formatCurrency, isCurrencyCode } from "@/lib/currency";
import type { CalculatorLead, CalculatorLeadStatus } from "@/lib/types";
import { buildCalculatorLeadFollowups } from "@/lib/calculator-lead-followups";
import type { CalculatorLeadFollowupTemplate } from "@/lib/calculator-lead-followups";
import { Check, Copy, ExternalLink, Mail, MessageSquare, Search, Users } from "lucide-react";

const statusOptions: CalculatorLeadStatus[] = ["New", "Contacted", "Qualified", "Converted", "Closed"];

function leadPrice(lead: CalculatorLead): string {
  const currency = isCurrencyCode(lead.currency) ? lead.currency : "PKR";
  return formatCurrency(lead.recommendation.calculation.estimatedTotal, currency, lead.locale);
}

function readableValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ") || "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value) || "Not provided";
  return "Not provided";
}

export default function CalculatorLeadsPage() {
  const [leads, setLeads] = useState<CalculatorLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<CalculatorLead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [followupTemplateId, setFollowupTemplateId] = useState<CalculatorLeadFollowupTemplate["id"]>("phase-one");
  const [followupMessage, setFollowupMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/admin/calculator-leads", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Leads could not be loaded.");
      setLeads(data.leads);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Leads could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const term = search.toLowerCase();
    const matchesText = !term || [lead.id, lead.name, lead.email, lead.phone, lead.goal, lead.recommendation.title]
      .some((value) => value.toLowerCase().includes(term));
    return matchesText && (statusFilter === "All" || lead.status === statusFilter);
  }), [leads, search, statusFilter]);

  const openLead = (lead: CalculatorLead) => {
    setSelectedLead(lead);
    setAdminNotes(lead.adminNotes);
    const initialTemplate = buildCalculatorLeadFollowups(lead)[0];
    setFollowupTemplateId(initialTemplate.id);
    setFollowupMessage(initialTemplate.message);
    setMessage("");
  };

  const handleFollowupTemplateChange = (templateId: CalculatorLeadFollowupTemplate["id"]) => {
    if (!selectedLead) return;
    const template = buildCalculatorLeadFollowups(selectedLead).find((item) => item.id === templateId);
    if (!template) return;
    setFollowupTemplateId(templateId);
    setFollowupMessage(template.message);
  };

  const sendWhatsappUrl = selectedLead?.phone
    ? buildWhatsAppLinkTo(selectedLead.phone, followupMessage)
    : null;
  const emailSubject = selectedLead?.language === "roman-ur"
    ? "Durrani Web Developers - aapke project budget ke options"
    : "Durrani Web Developers - project budget options";
  const sendEmailUrl = selectedLead?.email
    ? `mailto:${encodeURIComponent(selectedLead.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(followupMessage)}`
    : null;

  const updateSelectedLead = async (updates: { status?: CalculatorLeadStatus; adminNotes?: string }) => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/calculator-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedLead.id, ...updates }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Lead update failed.");
      setLeads((previous) => previous.map((lead) => lead.id === data.lead.id ? data.lead : lead));
      setSelectedLead(data.lead);
      setAdminNotes(data.lead.adminNotes);
      setMessage("Lead updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lead update failed.");
    } finally {
      setSaving(false);
    }
  };

  const questionnaireLabels: Record<string, string> = {
    businessName: "Business name",
    projectTypes: "Project types",
    problemToSolve: "Problem to solve",
    targetAudience: "Target audience",
    productsServices: "Products / services",
    inspirationUrl: "Reference website",
    preferredLaunchDate: "Preferred launch",
    expectedBudgetRange: "Budget range",
    needsProductCatalog: "Product catalog",
    productFeatures: "Product features",
    acceptOrdersOnline: "Online orders",
    orderFeatures: "Order features",
    adminPanelType: "Admin dashboard",
    adminFeatures: "Admin tools",
    selectedAddons: "Selected extras",
    customFeatureNotes: "Other requirements",
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      <AdminSidebar />
      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        <AdminHeader title="Incomplete Inquiries" subtitle="Consented calculator leads that have not submitted a final inquiry" />
        <div className="flex-1 space-y-5 p-6">
          {message && !selectedLead && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}
          {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{loadError}</div>}

          <section className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <label className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, or goal" className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-xs" />
            </label>
            <div className="flex items-center gap-3">
              <select aria-label="Filter leads by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs">
                <option value="All">All statuses</option>
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600"><Users className="h-4 w-4" />{filteredLeads.length} leads</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {loading ? (
              <p className="p-8 text-center text-xs text-gray-500">Loading leads…</p>
            ) : filteredLeads.length === 0 ? (
              <p className="p-10 text-center text-xs text-gray-500">No incomplete inquiries yet. Consented calculator leads appear here until the visitor submits the final inquiry; completed submissions remain in the existing Inquiries Inbox.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Need & budget</th><th className="px-4 py-3">Estimate</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Saved</th><th className="px-4 py-3 text-right">Details</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><strong className="block text-gray-900">{lead.name || "Name not provided"}</strong><span className="text-[10px] text-gray-500">{lead.email || lead.phone}</span></td>
                        <td className="px-4 py-3"><strong className="block">{lead.recommendation.title}</strong><span className="text-[10px] text-gray-500">{lead.goal} · {lead.budgetBand} · {lead.language === "roman-ur" ? "Roman Urdu" : "English"}</span></td>
                        <td className="px-4 py-3 font-bold">{leadPrice(lead)}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-600">{lead.progressStep > 0 ? `Left during step ${Math.min(lead.progressStep, 7)} of 7` : "Saved plan; form not started"}</td>
                        <td className="px-4 py-3"><span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold">{lead.status}</span></td>
                        <td className="px-4 py-3 text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right"><button type="button" onClick={() => openLead(lead)} className="rounded-md border border-gray-300 px-3 py-1.5 text-[10px] font-bold hover:bg-gray-50">View lead</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLead(null); }}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl sm:p-7" aria-label="Calculator lead details">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
              <div><p className="text-[10px] font-bold uppercase text-gray-500">{selectedLead.id} · consented {new Date(selectedLead.contactConsentAt).toLocaleString()}</p><h2 className="mt-1 text-xl font-black">{selectedLead.name || selectedLead.email || selectedLead.phone}</h2>{selectedLead.convertedInquiryId && <p className="mt-1 text-[11px] font-semibold text-emerald-700">Submitted inquiry: {selectedLead.convertedInquiryId}</p>}</div>
              <button type="button" onClick={() => setSelectedLead(null)} aria-label="Close lead details" className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs">Close</button>
            </div>

            <section className="mt-5 border-b border-gray-200 pb-5">
              <h3 className="text-xs font-extrabold uppercase text-gray-500">Ready-to-send follow-up</h3>
              <label className="mt-3 block text-[11px] font-semibold text-gray-700">
                Choose a helpful message
                <select value={followupTemplateId} onChange={(event) => handleFollowupTemplateChange(event.target.value as CalculatorLeadFollowupTemplate["id"])} className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-xs">
                  {buildCalculatorLeadFollowups(selectedLead).map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                </select>
              </label>
              <textarea value={followupMessage} onChange={(event) => setFollowupMessage(event.target.value)} rows={6} maxLength={2500} aria-label="Editable follow-up message" className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs leading-relaxed" />
              <p className="mt-1 text-[10px] text-gray-500">Review and edit before sending. These buttons open a draft; they do not send automatically.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(followupMessage); setMessage("Follow-up copied. Paste it into your chosen channel."); } catch { setMessage("Could not copy the follow-up message."); } }} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-bold"><Copy className="h-3.5 w-3.5" />Copy message</button>
                {sendEmailUrl && <a href={sendEmailUrl} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-bold"><Mail className="h-3.5 w-3.5" />Open email draft</a>}
                {sendWhatsappUrl && <a href={sendWhatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-800"><MessageSquare className="h-3.5 w-3.5" />Open WhatsApp message</a>}
              </div>
            </section>

            <section className="mt-6 border-b border-gray-200 pb-5">
              <h3 className="text-xs font-extrabold uppercase text-gray-500">Budget recommendation</h3>
              <p className="mt-2 text-lg font-black">{selectedLead.recommendation.title}</p>
              <p className="text-sm font-bold text-[#E31E36]">{leadPrice(selectedLead)} · {selectedLead.currency}</p>
              <p className="mt-2 text-xs text-gray-600">Goal: {selectedLead.goal} · Budget: {selectedLead.budgetBand} · Language: {selectedLead.language}</p>
              {selectedLead.userDescription && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed">{selectedLead.userDescription}</p>}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><h4 className="text-[11px] font-bold text-emerald-800">Recommended inclusions</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">{selectedLead.recommendation.included.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h4 className="text-[11px] font-bold text-gray-700">Not included unless agreed</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-600">{selectedLead.recommendation.notIncluded.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </section>

            <section className="mt-5">
              <h3 className="text-xs font-extrabold uppercase text-gray-500">Calculator answers</h3>
              {Object.keys(selectedLead.questionnaire).length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">The visitor has not continued into the detailed calculator yet.</p>
              ) : (
                <dl className="mt-3 divide-y divide-gray-100">
                  {Object.entries(questionnaireLabels).filter(([key]) => key in selectedLead.questionnaire).map(([key, label]) => (
                    <div key={key} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5 text-xs"><dt className="font-semibold text-gray-500">{label}</dt><dd className="break-words text-gray-800">{readableValue(selectedLead.questionnaire[key])}</dd></div>
                  ))}
                  {Boolean(selectedLead.questionnaire.calculation) && (
                    <div className="grid grid-cols-[9rem_1fr] gap-3 py-2.5 text-xs"><dt className="font-semibold text-gray-500">Recalculated total</dt><dd className="font-bold">{leadPrice({ ...selectedLead, recommendation: { ...selectedLead.recommendation, calculation: selectedLead.questionnaire.calculation as CalculatorLead["recommendation"]["calculation"] } })}</dd></div>
                  )}
                </dl>
              )}
            </section>

            <section className="mt-6 border-t border-gray-200 pt-5">
              <label className="block text-xs font-bold text-gray-700">Follow-up status</label>
              <select value={selectedLead.status} onChange={(event) => void updateSelectedLead({ status: event.target.value as CalculatorLeadStatus })} disabled={saving} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs">
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
              <label htmlFor="calculator-lead-notes" className="mt-4 block text-xs font-bold text-gray-700">Private admin notes</label>
              <textarea id="calculator-lead-notes" rows={3} maxLength={3000} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span role="status" className="text-[11px] text-gray-500">{message}</span>
                <button type="button" disabled={saving || adminNotes === selectedLead.adminNotes} onClick={() => void updateSelectedLead({ adminNotes })} className="inline-flex items-center gap-1.5 rounded-md bg-[#101216] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Save notes</button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}