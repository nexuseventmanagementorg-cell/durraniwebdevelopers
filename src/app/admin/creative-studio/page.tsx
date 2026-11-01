"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  CREATIVE_CATEGORIES,
  DEFAULT_CREATIVE_STUDIO_CONFIG,
  formatCreativeCurrency,
  getCreativeInquiryTransitions,
} from "@/lib/creative-studio";
import type {
  CreativeAddon,
  CreativeInquiry,
  CreativeStudioConfig,
} from "@/lib/creative-studio";

const BILLING_UNITS: CreativeAddon["billingUnit"][] = [
  "fixed", "per_minute", "per_image", "per_language", "percentage", "custom_quote",
];

export default function CreativeStudioAdminPage() {
  const [tab, setTab] = useState<"inquiries" | "pricing">("inquiries");
  const [inquiries, setInquiries] = useState<CreativeInquiry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [config, setConfig] = useState<CreativeStudioConfig>(DEFAULT_CREATIVE_STUDIO_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [payment, setPayment] = useState({ amount: "", reference: "", note: "", confirmed: false });
  const [newCountry, setNewCountry] = useState({ country: "", currency: "USD", videoPerMinute: "", imagePerImage: "" });

  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) || null;
  const selectedQuoteTotal = selected?.quote.total;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inquiryResponse, pricingResponse] = await Promise.all([
        fetch("/api/admin/creative-studio", { cache: "no-store" }),
        fetch("/api/admin/creative-studio/pricing", { cache: "no-store" }),
      ]);
      if (inquiryResponse.status === 401 || pricingResponse.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const [inquiryResult, pricingResult] = await Promise.all([
        inquiryResponse.json(),
        pricingResponse.json(),
      ]);
      if (!inquiryResponse.ok || !inquiryResult.success) {
        throw new Error(inquiryResult.error || "Creative inquiries could not be loaded.");
      }
      if (!pricingResponse.ok || !pricingResult.success) {
        throw new Error(pricingResult.error || "Creative pricing could not be loaded.");
      }
      setInquiries(inquiryResult.inquiries);
      setSelectedId((current) =>
        inquiryResult.inquiries.some((inquiry: CreativeInquiry) => inquiry.id === current)
          ? current
          : inquiryResult.inquiries[0]?.id || ""
      );
      setConfig(pricingResult.config);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creative Studio data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedId) return;
    const amount = selectedQuoteTotal?.toString() || "";
    setQuoteAmount(amount);
    setPayment({
      amount,
      reference: "",
      note: "",
      confirmed: false,
    });
  }, [selectedId, selectedQuoteTotal]);

  const counts = useMemo(() => ({
    total: inquiries.length,
    new: inquiries.filter((inquiry) => inquiry.status === "NEW_INQUIRY").length,
    production: inquiries.filter((inquiry) =>
      ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "QUALITY_REVIEW", "REVISION_REQUESTED"].includes(inquiry.status)
    ).length,
  }), [inquiries]);

  const runAction = async (action: string, values: Record<string, unknown> = {}) => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/creative-studio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...values }),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Creative inquiry could not be updated.");
      setInquiries((current) => current.map((inquiry) => inquiry.id === selected.id ? result.inquiry : inquiry));
      setMessage(`Updated ${selected.id}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Creative inquiry could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/creative-studio/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Pricing could not be saved.");
      setConfig(result.config);
      setMessage(`Pricing configuration saved (version ${result.config.version}).`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pricing could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const updateCountryRate = (index: number, field: "country" | "currency" | "videoPerMinute" | "imagePerImage", value: string) => {
    setConfig((current) => ({
      ...current,
      countries: current.countries.map((rate, rateIndex) => rateIndex !== index ? rate : {
        ...rate,
        [field]: field === "videoPerMinute" || field === "imagePerImage"
          ? value.trim() === "" ? null : Math.max(0, Number(value))
          : value,
      }),
    }));
  };

  const addCountryRate = () => {
    const name = newCountry.country.trim();
    if (!name || config.countries.some((rate) => rate.country.toLowerCase() === name.toLowerCase())) {
      setError("Enter a new country that is not already configured.");
      return;
    }
    setConfig((current) => ({
      ...current,
      countries: [...current.countries, {
        country: name,
        currency: newCountry.currency,
        videoPerMinute: newCountry.videoPerMinute === "" ? null : Number(newCountry.videoPerMinute),
        imagePerImage: newCountry.imagePerImage === "" ? null : Number(newCountry.imagePerImage),
        categoryMultipliers: {},
      }],
    }));
    setNewCountry({ country: "", currency: "USD", videoPerMinute: "", imagePerImage: "" });
  };

  const updateAddon = (index: number, field: keyof CreativeAddon, value: string | boolean) => {
    setConfig((current) => ({
      ...current,
      addons: current.addons.map((addon, addonIndex) => {
        if (addonIndex !== index) return addon;
        if (field === "price") {
          return { ...addon, price: value === "" ? null : Number(value) };
        }
        return { ...addon, [field]: value };
      }),
    }));
  };

  const moveAddon = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.addons.length) return;
    setConfig((current) => {
      const addons = [...current.addons];
      [addons[index], addons[target]] = [addons[target], addons[index]];
      return { ...current, addons };
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <AdminSidebar />
      <div className="pl-64">
        <AdminHeader
          title="AI Creative Studio"
          subtitle="Private inquiries, review gates, and administrator-controlled price cards."
          actionButton={<button type="button" onClick={() => void loadData()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50">Refresh</button>}
        />
        <main className="mx-auto max-w-7xl p-5 sm:p-8">
          {(error || message) && <div role={error ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total inquiries" value={counts.total} />
            <MetricCard label="New to review" value={counts.new} />
            <MetricCard label="Production pipeline" value={counts.production} />
          </div>
          <div className="mt-7 flex flex-wrap gap-2 border-b border-slate-200">
            <button type="button" onClick={() => setTab("inquiries")} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === "inquiries" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>Project inquiries</button>
            <button type="button" onClick={() => setTab("pricing")} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === "pricing" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>Pricing management</button>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading Creative Studio records…</p>
          ) : tab === "pricing" ? (
            <PricingEditor
              config={config}
              saving={saving}
              newCountry={newCountry}
              setNewCountry={setNewCountry}
              onUpdateCountry={updateCountryRate}
              onAddCountry={addCountryRate}
              onRemoveCountry={(index) => setConfig((current) => ({ ...current, countries: current.countries.filter((_, itemIndex) => itemIndex !== index) }))}
              onUpdateCategory={(key, value) => setConfig((current) => ({ ...current, categoryMultipliers: { ...current.categoryMultipliers, [key]: value } }))}
              onUpdateComplexity={(key, value) => setConfig((current) => ({ ...current, complexityMultipliers: { ...current.complexityMultipliers, [key]: value } }))}
              onUpdateQuality={(key, value) => setConfig((current) => ({ ...current, qualityMultipliers: { ...current.qualityMultipliers, [key]: value } }))}
              onUpdateAddon={updateAddon}
              onMoveAddon={moveAddon}
              onSave={() => void saveConfig()}
            />
          ) : (
            <div className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-4">
                  <h2 className="font-black">Incoming projects</h2>
                  <p className="mt-1 text-xs text-slate-500">Private customer records; admin-only.</p>
                </div>
                <div className="max-h-[75vh] overflow-y-auto">
                  {inquiries.length === 0 ? <p className="p-5 text-sm text-slate-500">No Creative Studio inquiries yet.</p> : inquiries.map((inquiry) => (
                    <button key={inquiry.id} type="button" onClick={() => setSelectedId(inquiry.id)} className={`block w-full border-b border-slate-100 p-4 text-left transition hover:bg-indigo-50 ${inquiry.id === selectedId ? "bg-indigo-50" : ""}`}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900">{inquiry.customer.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{inquiry.status.replaceAll("_", " ")}</span>
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{inquiry.id} · {inquiry.project.subcategory}</span>
                      <span className="mt-2 block text-xs font-semibold text-indigo-700">{inquiry.quote.total === null ? "Manual quote" : formatCreativeCurrency(inquiry.quote.total, inquiry.quote.currency)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selected ? (
                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{selected.id}</p><h2 className="mt-1 text-2xl font-black">{selected.customer.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.customer.email} · {selected.customer.whatsapp} · {selected.customer.country}</p></div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800">{selected.status.replaceAll("_", " ")}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard title="Project scope">
                      <Info label="Type" value={selected.project.subcategory} />
                      <Info label="Customer" value={`${selected.customer.customerType}${selected.customer.company ? ` · ${selected.customer.company}` : ""}`} />
                      <Info label="Duration / count" value={selected.project.projectKind === "image" ? `${selected.project.imageCount} images` : `${selected.project.durationSeconds} seconds`} />
                      <Info label="Style / quality" value={`${selected.project.style} · ${selected.project.quality} · ${selected.project.aspectRatio}`} />
                      <Info label="Languages" value={Object.values(selected.project.languages).filter(Boolean).join(", ") || "Not specified"} />
                      {selected.customer.preferredDeliveryDate && <Info label="Preferred date" value={selected.customer.preferredDeliveryDate} />}
                    </InfoCard>
                    <InfoCard title="Quotation snapshot">
                      <Info label="Status" value={selected.quote.requiresManualReview ? "Review required" : "Estimate ready"} />
                      <Info label="Estimate / final quote" value={selected.quote.total === null ? "Manual quotation needed" : formatCreativeCurrency(selected.quote.total, selected.quote.currency)} />
                      <Info label="Estimated delivery" value={selected.quote.delivery} />
                      <Info label="Rate configuration version" value={`v${selected.quoteSnapshot.version}`} />
                      <Info label="Submitted" value={new Date(selected.createdAt).toLocaleString()} />
                    </InfoCard>
                  </div>
                  <InfoCard title="Creative brief">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.project.brief}</p>
                    {selected.project.vision && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">Vision: {selected.project.vision}</p>}
                  </InfoCard>
                  {selected.project.referenceFiles.length > 0 && (
                    <InfoCard title="Private reference files">
                      <div className="flex flex-wrap gap-2">{selected.project.referenceFiles.map((file, index) => <a key={`${file.path}-${index}`} href={`/api/admin/creative-studio/files?inquiry=${encodeURIComponent(selected.id)}&file=${index}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</a>)}</div>
                    </InfoCard>
                  )}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold">Send final quotation for approval</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Manual pricing must be reviewed before the customer can approve it.</p>
                      <div className="mt-3 flex gap-2">
                        <input type="number" min="1" value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} aria-label="Final quotation amount" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                        <button type="button" disabled={saving} onClick={() => void runAction("prepare_quote", { amount: Number(quoteAmount) })} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Prepare & send</button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold">Verify received payment</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Only mark funds verified after checking the bank or gateway directly. A screenshot is not verification.</p>
                      <input type="number" min="1" value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} placeholder="Received amount" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} placeholder="Verified transaction reference" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <textarea value={payment.note} onChange={(event) => setPayment((current) => ({ ...current, note: event.target.value }))} placeholder="Verification note" rows={2} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={payment.confirmed} onChange={(event) => setPayment((current) => ({ ...current, confirmed: event.target.checked }))} className="mt-1 accent-indigo-600" />I personally verified that this payment has been received.</label>
                      <button type="button" disabled={saving || !payment.confirmed} onClick={() => void runAction("verify_payment", { ...payment, amount: Number(payment.amount) })} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Verify full payment</button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="font-bold text-amber-950">Production approval gates</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Gate label="Customer approved quote" complete={Boolean(selected.customerQuoteApprovedAt)} />
                      <Gate label="Payment manually verified" complete={Boolean(selected.paymentVerifiedAt)} />
                      <Gate label="Admin approval" complete={Boolean(selected.adminApprovedAt)} />
                      <Gate label="Requirements complete" complete={Boolean(selected.requirementsCompleteAt)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" disabled={saving || selected.status !== "PAYMENT_RECEIVED" || !selected.customerQuoteApprovedAt || !selected.paymentVerifiedAt || Boolean(selected.adminApprovedAt)} onClick={() => void runAction("approve_project")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Admin approve project</button>
                      <button type="button" disabled={saving || selected.status === "CANCELLED" || Boolean(selected.requirementsCompleteAt)} onClick={() => void runAction("complete_requirements")} className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-bold text-amber-950 disabled:opacity-40">Mark requirements complete</button>
                      <button type="button" disabled={saving || !selected.customerQuoteApprovedAt || !selected.adminApprovedAt || !selected.paymentVerifiedAt || !selected.requirementsCompleteAt} onClick={() => void runAction("set_status", { status: "READY_FOR_PRODUCTION" })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Ready for production</button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <label className="text-sm font-bold text-slate-700">Other status
                      <select value="" onChange={(event) => event.target.value && void runAction("set_status", { status: event.target.value })} disabled={saving} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
                        <option value="">Choose a review status…</option>
                        {getCreativeInquiryTransitions(selected.status, selected.statusBeforeHold).filter((status) => status !== "READY_FOR_PRODUCTION").map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                      </select>
                    </label>
                    <div className="flex items-end"><span className="text-xs text-slate-500">{saving ? "Saving…" : "Payment and production status are permission-gated."}</span></div>
                  </div>
                  <InfoCard title="Activity audit trail">
                    <ol className="space-y-2">{[...selected.activity].reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className="border-l-2 border-indigo-200 pl-3"><p className="text-xs font-bold text-slate-800">{entry.action.replaceAll("_", " ")} · {entry.actor}</p><p className="text-xs text-slate-500">{new Date(entry.at).toLocaleString()} — {entry.detail}</p></li>)}</ol>
                  </InfoCard>
                </section>
              ) : (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">Select an inquiry to review or manage pricing.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PricingEditor({
  config,
  saving,
  newCountry,
  setNewCountry,
  onUpdateCountry,
  onAddCountry,
  onRemoveCountry,
  onUpdateCategory,
  onUpdateComplexity,
  onUpdateQuality,
  onUpdateAddon,
  onMoveAddon,
  onSave,
}: {
  config: CreativeStudioConfig;
  saving: boolean;
  newCountry: { country: string; currency: string; videoPerMinute: string; imagePerImage: string };
  setNewCountry: (value: { country: string; currency: string; videoPerMinute: string; imagePerImage: string }) => void;
  onUpdateCountry: (index: number, field: "country" | "currency" | "videoPerMinute" | "imagePerImage", value: string) => void;
  onAddCountry: () => void;
  onRemoveCountry: (index: number) => void;
  onUpdateCategory: (key: string, value: number) => void;
  onUpdateComplexity: (key: string, value: number) => void;
  onUpdateQuality: (key: string, value: number) => void;
  onUpdateAddon: (index: number, field: keyof CreativeAddon, value: string | boolean) => void;
  onMoveAddon: (index: number, direction: -1 | 1) => void;
  onSave: () => void;
}) {
  const currencyCodes = ["PKR", "USD", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "INR"];
  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        Pricing changes are administrator-managed and affect new estimates only. Each saved inquiry retains a snapshot of the pricing version used at submission.
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-black">Country rate cards</h2>
        <p className="mt-1 text-sm text-slate-500">Image pricing remains manual until you enter an approved per-image rate.</p>
        <div className="mt-5 space-y-4">
          {config.countries.map((rate, index) => (
            <div key={`${rate.country}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-bold text-slate-600">Country<input value={rate.country} onChange={(event) => onUpdateCountry(index, "country", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-900" /></label>
              <label className="text-xs font-bold text-slate-600">Currency<select value={rate.currency} onChange={(event) => onUpdateCountry(index, "currency", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal text-slate-900">{currencyCodes.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">Video / minute<input type="number" min="0" value={rate.videoPerMinute ?? ""} onChange={(event) => onUpdateCountry(index, "videoPerMinute", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-900" /></label>
              <label className="text-xs font-bold text-slate-600">Image / item<input type="number" min="0" value={rate.imagePerImage ?? ""} onChange={(event) => onUpdateCountry(index, "imagePerImage", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-900" /></label>
              <button type="button" onClick={() => onRemoveCountry(index)} disabled={rate.country === "Pakistan"} className="self-end rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-30">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-5">
          <input value={newCountry.country} onChange={(event) => setNewCountry({ ...newCountry, country: event.target.value })} placeholder="Country name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={newCountry.currency} onChange={(event) => setNewCountry({ ...newCountry, currency: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{currencyCodes.map((currency) => <option key={currency}>{currency}</option>)}</select>
          <input type="number" min="0" value={newCountry.videoPerMinute} onChange={(event) => setNewCountry({ ...newCountry, videoPerMinute: event.target.value })} placeholder="Video / minute" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min="0" value={newCountry.imagePerImage} onChange={(event) => setNewCountry({ ...newCountry, imagePerImage: event.target.value })} placeholder="Image / item" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" onClick={onAddCountry} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add rate card</button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <MultiplierEditor title="Category multipliers" values={config.categoryMultipliers} onChange={onUpdateCategory} labels={{
          social: "Social media", business: "Business / lifestyle", film: "Film / entertainment",
          featureFilm: "Feature film starting rate", music: "Music", education: "Education / documentary",
          realEstate: "Real estate", animation: "Animation", mvp: "MVP review multiplier", custom: "Custom work",
        }} />
        <MultiplierEditor title="Complexity multipliers" values={config.complexityMultipliers} onChange={onUpdateComplexity} labels={{ basic: "Basic", standard: "Standard", advanced: "Advanced", premium: "Premium" }} />
        <MultiplierEditor title="Quality multipliers" values={config.qualityMultipliers} onChange={onUpdateQuality} labels={{ "720p": "720p", "1080p": "1080p Full HD", "2K": "2K", "4K": "4K" }} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-black">Add-on marketplace</h2>
        <p className="mt-1 text-sm text-slate-500">Choose a billing unit and approved price; custom-quote services do not produce a customer-facing total.</p>
        <div className="mt-5 space-y-3">
          {config.addons.map((addon, index) => (
            <div key={addon.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(150px,1fr)_150px_140px_90px_auto] sm:items-center">
              <div><p className="text-sm font-bold">{addon.name}</p><p className="text-[10px] text-slate-500">{addon.id}</p></div>
              <select value={addon.billingUnit} onChange={(event) => onUpdateAddon(index, "billingUnit", event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs">{BILLING_UNITS.map((unit) => <option key={unit} value={unit}>{unit.replaceAll("_", " ")}</option>)}</select>
              <input type="number" min="0" disabled={addon.billingUnit === "custom_quote"} value={addon.price ?? ""} onChange={(event) => onUpdateAddon(index, "price", event.target.value)} placeholder="Not set" className="rounded-lg border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-100" />
              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={addon.enabled} onChange={(event) => onUpdateAddon(index, "enabled", event.target.checked)} className="accent-indigo-600" />Active</label>
              <div className="flex gap-1"><button type="button" onClick={() => onMoveAddon(index, -1)} aria-label={`Move ${addon.name} up`} className="rounded border px-2 py-1 text-xs">↑</button><button type="button" onClick={() => onMoveAddon(index, 1)} aria-label={`Move ${addon.name} down`} className="rounded border px-2 py-1 text-xs">↓</button></div>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={onSave} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : `Save pricing version ${config.version + 1}`}</button>
    </section>
  );
}

function MultiplierEditor({
  title,
  values,
  labels,
  onChange,
}: {
  title: string;
  values: Record<string, number>;
  labels: Record<string, string>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-black">{title}</h3>
      <div className="mt-4 space-y-3">
        {Object.keys(labels).map((key) => (
          <label key={key} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
            {labels[key]}
            <div className="flex items-center gap-1">
              <input type="number" min="0.01" step="0.05" value={values[key] ?? 1} onChange={(event) => onChange(key, Number(event.target.value))} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm text-slate-900" />
              <span className="text-slate-400">×</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 p-4"><h3 className="mb-3 text-sm font-black text-slate-900">{title}</h3><div className="space-y-2">{children}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></p>;
}

function Gate({ label, complete }: { label: string; complete: boolean }) {
  return <div className="flex items-center gap-2 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${complete ? "bg-emerald-600" : "bg-slate-300"}`} /><span className={complete ? "font-bold text-emerald-900" : "text-slate-600"}>{label}</span><span className="ml-auto">{complete ? "Done" : "Pending"}</span></div>;
}
