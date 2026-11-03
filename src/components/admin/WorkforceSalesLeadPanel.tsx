"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, Plus, Search, ShieldCheck } from "lucide-react";
import {
  type SalesLeadEvidenceClaim,
  type SalesLeadVerificationStatus,
} from "@/lib/sales-lead-contract";
import { DWD_SALES_SERVICES } from "@/lib/sales-lead-contract";
import type { SalesLeadRecord } from "@/lib/types";

interface SalesLeadView extends SalesLeadRecord {
  duplicateWarnings: string[];
}

interface EvidenceDraft {
  claim: SalesLeadEvidenceClaim;
  sourceUrl: string;
  observation: string;
}

const EMPTY_EVIDENCE: EvidenceDraft = { claim: "BUSINESS_IDENTITY", sourceUrl: "", observation: "" };
const VERIFICATION_STATUSES: SalesLeadVerificationStatus[] = [
  "VERIFIED", "PARTIALLY_VERIFIED", "OUTDATED", "REJECTED",
];
const CLAIM_OPTIONS: SalesLeadEvidenceClaim[] = [
  "BUSINESS_IDENTITY", "OFFICIAL_WEBSITE", "BUSINESS_PROFILE", "BUSINESS_EMAIL",
  "BUSINESS_PHONE", "BUSINESS_SOCIAL_PROFILE", "WEBSITE_ASSESSMENT", "INDUSTRY",
  "SERVICE_OPPORTUNITY", "OTHER",
];

function label(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WorkforceSalesLeadPanel() {
  const [leads, setLeads] = useState<SalesLeadView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [qualificationFilter, setQualificationFilter] = useState("ALL");
  const [reviewStatus, setReviewStatus] = useState<SalesLeadVerificationStatus>("PARTIALLY_VERIFIED");
  const [reviewDetails, setReviewDetails] = useState("");
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([{ ...EMPTY_EVIDENCE }]);
  const [researchEvidence, setResearchEvidence] = useState<EvidenceDraft>({ ...EMPTY_EVIDENCE });
  const [researchDetails, setResearchDetails] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    country: "",
    city: "",
    industry: "",
    officialWebsite: "",
    publicBusinessEmail: "",
    publicBusinessPhone: "",
    publicBusinessSocialProfile: "",
    potentialDwdService: "",
    serviceCompatibility: "UNKNOWN",
    marketSuitability: "UNKNOWN",
    websiteAvailability: "UNKNOWN",
    websiteQuality: "UNKNOWN",
    websiteOpportunityNote: "",
    researchNotes: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/workforce/sales-leads", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Research records could not be loaded.");
      const nextLeads = Array.isArray(result.leads) ? result.leads as SalesLeadView[] : [];
      setLeads(nextLeads);
      setSelectedId((previous) => nextLeads.some((lead) => lead.id === previous) ? previous : nextLeads[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Research records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const isNational = lead.country.trim().toLowerCase() === "pakistan";
      const matchesTerm = !term || [
        lead.businessName, lead.country, lead.city || "", lead.industry || "",
        lead.officialWebsite || "", lead.publicBusinessEmail || "",
      ].some((value) => value.toLowerCase().includes(term));
      return matchesTerm &&
        (regionFilter === "ALL" || (regionFilter === "NATIONAL" ? isNational : !isNational)) &&
        (!countryFilter || lead.country.toLowerCase().includes(countryFilter.toLowerCase())) &&
        (!cityFilter || (lead.city || "").toLowerCase().includes(cityFilter.toLowerCase())) &&
        (!industryFilter || (lead.industry || "").toLowerCase().includes(industryFilter.toLowerCase())) &&
        (verificationFilter === "ALL" || lead.verificationStatus === verificationFilter) &&
        (qualificationFilter === "ALL" || lead.qualificationStatus === qualificationFilter);
    });
  }, [leads, search, regionFilter, countryFilter, cityFilter, industryFilter, verificationFilter, qualificationFilter]);
  const selectedLead = leads.find((lead) => lead.id === selectedId) || null;

  const setField = (field: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const saveIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/sales-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          potentialDwdService: form.potentialDwdService || null,
          evidence: evidence
            .filter((item) => item.sourceUrl.trim() || item.observation.trim())
            .map((item) => ({ ...item })),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Research intake could not be saved.");
      setNotice(result.message || "Manual intake saved as unverified.");
      setForm({
        businessName: "", country: "", city: "", industry: "", officialWebsite: "",
        publicBusinessEmail: "", publicBusinessPhone: "", publicBusinessSocialProfile: "",
        potentialDwdService: "", serviceCompatibility: "UNKNOWN", marketSuitability: "UNKNOWN",
        websiteAvailability: "UNKNOWN", websiteQuality: "UNKNOWN", websiteOpportunityNote: "", researchNotes: "",
      });
      setEvidence([{ ...EMPTY_EVIDENCE }]);
      await refresh();
      setSelectedId(result.lead.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Research intake could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!selectedLead) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/sales-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLead.id,
          action: "review",
          verificationStatus: reviewStatus,
          details: reviewDetails,
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "The review could not be recorded.");
      setNotice(`Human review recorded: ${label(result.lead.verificationStatus)}.`);
      setReviewDetails("");
      await refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The review could not be recorded.");
    } finally {
      setSaving(false);
    }
  };

  const submitResearchUpdate = async () => {
    if (!selectedLead) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/workforce/sales-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLead.id,
          action: "research_update",
          details: researchDetails,
          evidence: [researchEvidence],
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Research update could not be saved.");
      setNotice(result.message || "Research update saved; existing source review was invalidated.");
      setResearchEvidence({ ...EMPTY_EVIDENCE });
      setResearchDetails("");
      await refresh();
    } catch (researchError) {
      setError(researchError instanceof Error ? researchError.message : "Research update could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold text-[#101216]">Agent 6 · Sales Lead Finder</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">MANUAL RESEARCH ONLY</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-700">LIVE DISCOVERY UNAVAILABLE</span>
          </div>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-600">
            Store evidence-linked public business research for national and international prospects. No search adapter is connected. All observations and assessments are admin-entered, not independently fetched or automatically verified. Nexus Property Network is excluded.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 disabled:opacity-50">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">{notice}</p>}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={saveIntake} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-700">Record manual research</h3>
            <span className="text-[10px] text-gray-500">Saved as UNVERIFIED</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-bold text-gray-700">Business name *
              <input required maxLength={160} value={form.businessName} onChange={(event) => setField("businessName", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Country *
              <input required maxLength={100} value={form.country} onChange={(event) => setField("country", event.target.value)} placeholder="Pakistan or other country" className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">City
              <input maxLength={120} value={form.city} onChange={(event) => setField("city", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Industry
              <input maxLength={160} value={form.industry} onChange={(event) => setField("industry", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Official website
              <input type="url" maxLength={2048} value={form.officialWebsite} onChange={(event) => setField("officialWebsite", event.target.value)} placeholder="https://" className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Public business email
              <input type="email" maxLength={254} value={form.publicBusinessEmail} onChange={(event) => setField("publicBusinessEmail", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Public business phone
              <input type="tel" maxLength={32} value={form.publicBusinessPhone} onChange={(event) => setField("publicBusinessPhone", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Public business social profile
              <input type="url" maxLength={2048} value={form.publicBusinessSocialProfile} onChange={(event) => setField("publicBusinessSocialProfile", event.target.value)} placeholder="https://" className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
            </label>
            <label className="text-[10px] font-bold text-gray-700">Potential DWD service
              <select value={form.potentialDwdService} onChange={(event) => setField("potentialDwdService", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs">
                <option value="">Unknown</option>
                {DWD_SALES_SERVICES.map((service) => <option key={service} value={service}>{label(service)}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-bold text-gray-700">Service compatibility
              <select value={form.serviceCompatibility} onChange={(event) => setField("serviceCompatibility", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs">
                <option value="UNKNOWN">Unknown</option><option value="COMPATIBLE">Compatible (admin assessed)</option><option value="NOT_COMPATIBLE">Not compatible (admin assessed)</option>
              </select>
            </label>
            <label className="text-[10px] font-bold text-gray-700">Market suitability
              <select value={form.marketSuitability} onChange={(event) => setField("marketSuitability", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs">
                <option value="UNKNOWN">Unknown</option><option value="SUITABLE">Suitable (admin assessed)</option><option value="NOT_SUITABLE">Not suitable (admin assessed)</option>
              </select>
            </label>
            <label className="text-[10px] font-bold text-gray-700">Website availability
              <select value={form.websiteAvailability} onChange={(event) => setField("websiteAvailability", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs">
                <option value="UNKNOWN">Unknown / not checked</option><option value="ONLINE">Online (admin checked)</option><option value="UNAVAILABLE">Unavailable (admin checked)</option>
              </select>
            </label>
            <label className="text-[10px] font-bold text-gray-700">Website quality
              <select value={form.websiteQuality} onChange={(event) => setField("websiteQuality", event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs">
                <option value="UNKNOWN">Unknown / not assessed</option><option value="ADEQUATE">Adequate (admin assessed)</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option>
              </select>
            </label>
          </div>
          <label className="block text-[10px] font-bold text-gray-700">Observed website opportunity (with evidence below)
            <textarea maxLength={2000} value={form.websiteOpportunityNote} onChange={(event) => setField("websiteOpportunityNote", event.target.value)} rows={2} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
          </label>
          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <strong className="text-[10px] uppercase text-gray-600">Public evidence references</strong>
              <button type="button" onClick={() => setEvidence((previous) => [...previous, { ...EMPTY_EVIDENCE }])} className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800"><Plus className="h-3 w-3" /> Add source</button>
            </div>
            {evidence.map((item, index) => (
              <div key={`evidence-${index}`} className="grid gap-2 rounded border border-gray-100 p-2 md:grid-cols-[0.8fr_1.2fr_1.3fr]">
                <select aria-label={`Evidence claim ${index + 1}`} value={item.claim} onChange={(event) => setEvidence((previous) => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, claim: event.target.value as SalesLeadEvidenceClaim } : entry))} className="rounded border border-gray-300 p-2 text-[10px]">
                  {CLAIM_OPTIONS.map((claim) => <option key={claim} value={claim}>{label(claim)}</option>)}
                </select>
                <input aria-label={`Evidence URL ${index + 1}`} type="url" placeholder="Public source URL" value={item.sourceUrl} onChange={(event) => setEvidence((previous) => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, sourceUrl: event.target.value } : entry))} className="rounded border border-gray-300 p-2 text-[10px]" />
                <input aria-label={`Evidence observation ${index + 1}`} placeholder="What did you observe?" value={item.observation} onChange={(event) => setEvidence((previous) => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, observation: event.target.value } : entry))} className="rounded border border-gray-300 p-2 text-[10px]" />
              </div>
            ))}
          </div>
          <label className="block text-[10px] font-bold text-gray-700">Research notes
            <textarea maxLength={5000} value={form.researchNotes} onChange={(event) => setField("researchNotes", event.target.value)} rows={2} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-xs" />
          </label>
          <p className="text-[10px] text-amber-900">Public business information only. Do not enter private personal data, assumed budgets, buying intent, or decision-maker identities. No contact actions are available.</p>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save manual research
          </button>
        </form>

        <div className="space-y-3">
          <div className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="relative text-[10px] font-bold text-gray-700 sm:col-span-2 lg:col-span-3"><Search className="absolute left-2 top-7 h-3.5 w-3.5 text-gray-400" />
              Search business, city, industry
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white py-2 pl-7 pr-2 text-xs" />
            </label>
            <select aria-label="Region filter" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]">
              <option value="ALL">National + international</option><option value="NATIONAL">National · Pakistan</option><option value="INTERNATIONAL">International · non-Pakistan</option>
            </select>
            <input aria-label="Country filter" placeholder="Filter country" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
            <input aria-label="City filter" placeholder="Filter city" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
            <input aria-label="Industry filter" placeholder="Filter industry" value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
            <select aria-label="Verification filter" value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]">
              <option value="ALL">All verification statuses</option>{["UNVERIFIED", "PARTIALLY_VERIFIED", "VERIFIED", "OUTDATED", "REJECTED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
            <select aria-label="Qualification filter" value={qualificationFilter} onChange={(event) => setQualificationFilter(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-[10px]">
              <option value="ALL">All qualification statuses</option>{["HIGH_POTENTIAL", "MEDIUM_POTENTIAL", "LOW_POTENTIAL", "RESEARCH_REQUIRED", "NOT_SUITABLE"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
            <p className="self-center text-[10px] text-gray-500">{filteredLeads.length} of {leads.length} records</p>
          </div>
          {loading ? <p className="rounded-xl border border-gray-200 p-6 text-center text-xs text-gray-500">Loading private admin records…</p> : filteredLeads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">No research records match these filters. No sample leads are preloaded.</p>
          ) : (
            <div className="max-h-[34rem] space-y-2 overflow-auto">
              {filteredLeads.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setSelectedId(lead.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === lead.id ? "border-rose-400 bg-rose-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs text-gray-900">{lead.businessName}</strong>
                    <span className="text-[10px] font-extrabold text-gray-600">{label(lead.verificationStatus)} · {lead.score}/100</span>
                  </span>
                  <span className="mt-1 block text-[10px] text-gray-600">{[lead.city, lead.country, lead.industry].filter(Boolean).join(" · ") || "Location/industry incomplete"}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-rose-800">{label(lead.qualificationStatus)} · buying intent UNKNOWN</span>
                  {lead.duplicateWarnings.map((warning, index) => <span key={index} className="mt-1 block text-[10px] text-amber-900">Duplicate warning: {warning}</span>)}
                </button>
              ))}
            </div>
          )}

          {selectedLead && (
            <article className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">{selectedLead.businessName}</h3>
                  <p className="text-[10px] text-gray-500">{selectedLead.city || "City unknown"} · {selectedLead.country} · {selectedLead.industry || "Industry unknown"}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold">{label(selectedLead.qualificationStatus)} · {selectedLead.confidenceLevel} confidence</span>
              </div>
              <div className="grid gap-2 text-[10px] text-gray-700 sm:grid-cols-2">
                <p>Potential service: {selectedLead.potentialDwdService ? label(selectedLead.potentialDwdService) : "Unknown"}</p>
                <p>Website: {selectedLead.websiteAssessment.availability} · quality {selectedLead.websiteAssessment.quality}</p>
                <p>Public business email: {selectedLead.publicBusinessEmail || "Unknown"}</p>
                <p>Public business phone: {selectedLead.publicBusinessPhone || "Unknown"}</p>
                <p>Public social profile: {selectedLead.publicBusinessSocialProfile || "Unknown"}</p>
                <p>Verification date: {selectedLead.verificationDate ? new Date(selectedLead.verificationDate).toLocaleString() : "Not verified"}</p>
                <p className="sm:col-span-2">Missing information: {selectedLead.missingInformation.join(", ") || "None recorded"}</p>
                <p className="sm:col-span-2">Research notes: {selectedLead.researchNotes || "No notes recorded."}</p>
              </div>
              {selectedLead.websiteAssessment.opportunityNote && <p className="rounded bg-amber-50 p-2 text-[10px] text-amber-950">Website opportunity (admin assessed): {selectedLead.websiteAssessment.opportunityNote}</p>}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase text-gray-600">Evidence sources · manually entered; not fetched by Agent 6</h4>
                {selectedLead.evidence.length === 0 ? <p className="text-[10px] text-gray-500">No evidence recorded.</p> : selectedLead.evidence.map((item) => (
                  <div key={item.id} className="rounded border border-gray-100 p-2 text-[10px]">
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-bold text-blue-800 underline">{label(item.claim)} · {item.sourceUrl}<ExternalLink className="h-3 w-3 shrink-0" /></a>
                    <p className="mt-1 text-gray-700">{item.observation}</p>
                    <p className="mt-1 text-gray-500">{item.reviewStatus} · captured {new Date(item.capturedAt).toLocaleString()}{item.reviewedBy ? ` · reviewed by ${item.reviewedBy}` : ""}</p>
                  </div>
                ))}
              </div>
              <details className="rounded border border-gray-200 p-2">
                <summary className="cursor-pointer text-[10px] font-extrabold text-gray-700">Explain score {selectedLead.score}/100</summary>
                <ul className="mt-2 space-y-1">
                  {selectedLead.scoringBreakdown.map((part) => <li key={part.key} className="text-[10px] text-gray-700"><strong>{part.label}: {part.points}/{part.maximum}</strong> · {part.explanation}</li>)}
                </ul>
              </details>
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <h4 className="text-[10px] font-extrabold uppercase text-gray-700">Add research evidence</h4>
                <p className="text-[9px] text-amber-900">Adding evidence invalidates prior verification so the complete source set must be reviewed again.</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select aria-label="New evidence claim" value={researchEvidence.claim} onChange={(event) => setResearchEvidence((previous) => ({ ...previous, claim: event.target.value as SalesLeadEvidenceClaim }))} className="rounded border border-gray-300 bg-white p-2 text-[10px]">
                    {CLAIM_OPTIONS.map((claim) => <option key={claim} value={claim}>{label(claim)}</option>)}
                  </select>
                  <input aria-label="New evidence URL" type="url" placeholder="Public source URL" value={researchEvidence.sourceUrl} onChange={(event) => setResearchEvidence((previous) => ({ ...previous, sourceUrl: event.target.value }))} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
                  <input aria-label="New evidence observation" placeholder="What did you observe?" value={researchEvidence.observation} onChange={(event) => setResearchEvidence((previous) => ({ ...previous, observation: event.target.value }))} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input value={researchDetails} onChange={(event) => setResearchDetails(event.target.value)} placeholder="Research update reason / context" maxLength={2000} className="min-w-[14rem] flex-1 rounded border border-gray-300 bg-white p-2 text-[10px]" />
                  <button type="button" disabled={saving || researchDetails.trim().length < 5 || !researchEvidence.sourceUrl.trim() || !researchEvidence.observation.trim()} onClick={() => void submitResearchUpdate()} className="rounded border border-gray-300 bg-white px-3 py-2 text-[10px] font-extrabold text-gray-800 disabled:opacity-50">Save research update</button>
                </div>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <h4 className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-blue-950"><ShieldCheck className="h-3.5 w-3.5" /> Human verification review</h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-[0.8fr_1.5fr_auto]">
                  <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as SalesLeadVerificationStatus)} className="rounded border border-gray-300 bg-white p-2 text-[10px]">
                    {VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                  </select>
                  <input value={reviewDetails} onChange={(event) => setReviewDetails(event.target.value)} placeholder="Required: what did you review?" maxLength={2000} className="rounded border border-gray-300 bg-white p-2 text-[10px]" />
                  <button type="button" disabled={saving || reviewDetails.trim().length < 5} onClick={() => void submitReview()} className="rounded bg-blue-800 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50">Record review</button>
                </div>
                {selectedLead.reviewHistory.length > 0 && (
                  <ol className="mt-2 space-y-1">
                    {selectedLead.reviewHistory.slice().reverse().map((entry) => (
                      <li key={entry.id} className="text-[9px] text-gray-600">{entry.action.replace(/_/g, " ")} · {entry.actor} · {new Date(entry.at).toLocaleString()} · {entry.details}</li>
                    ))}
                  </ol>
                )}
              </div>
              <p className="text-[10px] font-bold text-amber-900">No email, WhatsApp, calls, meeting booking, quotation, pricing negotiation, CRM sync, or commitment action exists. Buying intent remains UNKNOWN.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
