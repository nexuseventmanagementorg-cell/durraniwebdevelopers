"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, MessageCircle, Printer } from "lucide-react";
import { formatCreativeCurrency } from "@/lib/creative-studio";
import type { CreativeInquiryStatus, CreativeQuote, CreativeStudioEstimate } from "@/lib/creative-studio";

interface PublicInquiry {
  id: string;
  status: CreativeInquiryStatus;
  quote: CreativeQuote;
  originalEstimate?: CreativeStudioEstimate;
  project: {
    subcategory: string;
    projectKind: "video" | "image" | "mvp";
    durationSeconds: number;
    imageCount: number;
    style: string;
    brief: string;
    languages: Record<string, string>;
    resolution: string;
    aspectRatio: string;
  };
  customerQuoteApprovedAt?: string;
}

const STATUS_LABELS: Record<CreativeInquiryStatus, string> = {
  NEW_INQUIRY: "Your inquiry was received",
  UNDER_REVIEW: "Creative team reviewing",
  NEEDS_MORE_INFORMATION: "More information requested",
  QUOTATION_PREPARED: "Quotation is being prepared",
  AWAITING_CUSTOMER_APPROVAL: "Quotation ready for your approval",
  AWAITING_PAYMENT: "Awaiting payment verification",
  PAYMENT_UNDER_VERIFICATION: "Payment under verification",
  PAYMENT_RECEIVED: "Payment manually verified",
  ADMIN_APPROVED: "Project approved by the studio",
  READY_FOR_PRODUCTION: "Ready for production",
  IN_PRODUCTION: "In production",
  QUALITY_REVIEW: "Quality review",
  REVISION_REQUESTED: "Revision in progress",
  APPROVED_FOR_DELIVERY: "Approved for delivery",
  DELIVERED: "Files delivered",
  COMPLETED: "Project completed",
  CANCELLED: "Project cancelled",
  ON_HOLD: "Project on hold",
};

export default function CreativeStudioConfirmation({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [inquiry, setInquiry] = useState<PublicInquiry | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!inquiryId || !/^DAC-\d{4}-(?:\d{6}|[A-F0-9]{16})$/i.test(inquiryId)) {
      setError("The inquiry link is invalid.");
      setLoading(false);
      return;
    }
    let savedToken = "";
    try {
      savedToken = window.sessionStorage.getItem(`creative-studio:${inquiryId}`) || "";
    } catch {
      setError("This browser does not allow private tracking storage. Contact the creative team with your inquiry ID.");
      setLoading(false);
      return;
    }
    if (!savedToken) {
      setError("This private tracking session is unavailable. Use the confirmation link in the browser session where you submitted the inquiry, or contact Shamsa with your inquiry ID.");
      setLoading(false);
      return;
    }
    setToken(savedToken);
    fetch(`/api/public/creative-studio/inquiries/${encodeURIComponent(inquiryId)}`, {
      headers: { Authorization: `Bearer ${savedToken}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Inquiry could not be loaded.");
        setInquiry(result.inquiry as PublicInquiry);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Inquiry could not be loaded."))
      .finally(() => setLoading(false));
  }, [inquiryId]);

  const approveQuote = async () => {
    if (!inquiry || inquiry.status !== "AWAITING_CUSTOMER_APPROVAL") return;
    if (!window.confirm("Do you approve the final quotation? Payment is still pending and the project will not begin until the studio verifies payment and approves production.")) return;
    setApproving(true);
    setError("");
    try {
      const response = await fetch(`/api/public/creative-studio/inquiries/${encodeURIComponent(inquiry.id)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve_quote" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Quotation approval could not be saved.");
      setInquiry((current) => current ? { ...current, status: result.inquiry.status, customerQuoteApprovedAt: new Date().toISOString() } : current);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Quotation approval could not be saved.");
    } finally {
      setApproving(false);
    }
  };

  const formattedQuote = inquiry?.quote.total === null || !inquiry
    ? "Manual quotation requested"
    : formatCreativeCurrency(inquiry.quote.total, inquiry.quote.currency);
  const finalQuoteSent = Boolean(inquiry && [
    "AWAITING_CUSTOMER_APPROVAL",
    "AWAITING_PAYMENT",
    "PAYMENT_UNDER_VERIFICATION",
    "PAYMENT_RECEIVED",
    "ADMIN_APPROVED",
    "READY_FOR_PRODUCTION",
    "IN_PRODUCTION",
    "QUALITY_REVIEW",
    "REVISION_REQUESTED",
    "APPROVED_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
  ].includes(inquiry.status));
  const whatsappText = inquiry
    ? `Hello Shamsa, I submitted creative inquiry ${inquiry.id} for ${inquiry.project.subcategory}. Budget: ${formattedQuote}.`
    : "";
  const whatsappLink = `https://wa.me/923296260778?text=${encodeURIComponent(whatsappText)}`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
        <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-indigo-600">Durrani AI Creative Studio</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Your project inquiry has been received.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The creative team will review your brief and confirm the final scope, quotation, and schedule. No work or payment has been automatically started.</p>
        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your private inquiry…</div>
        ) : error ? (
          <p role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}{inquiryId && <span className="mt-2 block font-bold">Inquiry ID: {inquiryId}</span>}</p>
        ) : inquiry ? (
          <div className="mt-8 space-y-5">
            <section className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Inquiry ID</p>
              <p className="mt-1 text-2xl font-black">{inquiry.id}</p>
              <p className="mt-4 text-sm text-slate-300">{inquiry.project.subcategory}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-indigo-200">{finalQuoteSent ? "Current final quotation" : "Current estimate"}</p>
              <p className="mt-1 text-2xl font-black">{formattedQuote}</p>
              <p className="mt-1 text-xs text-slate-400">{finalQuoteSent ? "This quotation is awaiting your approval or continuing through the project workflow." : inquiry.quote.requiresManualReview ? inquiry.quote.reason : "Preliminary estimate only; the final scope and quotation require studio review."}</p>
            </section>
            {inquiry.originalEstimate && (
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <h2 className="font-black text-slate-900">Original automatic estimate</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">Saved with your inquiry using the Creative Studio pricing catalog at submission. This is separate from any final quotation.</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <Summary label="Estimate status" value={inquiry.originalEstimate.status.replaceAll("_", " ")} />
                  <Summary label="Confidence" value={inquiry.originalEstimate.confidence} />
                  <Summary label="Service" value={inquiry.originalEstimate.selectedService} />
                  <Summary label="Quantity" value={`${inquiry.originalEstimate.quantity.value} ${inquiry.originalEstimate.quantity.unit}`} />
                  <Summary label="Catalog version" value={`v${inquiry.originalEstimate.pricingCatalogVersion}`} />
                  <Summary label="Estimate total" value={inquiry.originalEstimate.estimatedTotal === null ? "Manual review required" : formatCreativeCurrency(inquiry.originalEstimate.estimatedTotal, inquiry.originalEstimate.currency)} />
                </dl>
                <ul className="mt-3 space-y-1 border-t border-indigo-100 pt-3">
                  {inquiry.originalEstimate.lines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-600">{line.label}</span>
                      <span className="font-semibold text-slate-800">{line.amount === null ? "Unpriced" : formatCreativeCurrency(line.amount, inquiry.originalEstimate!.currency)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-slate-600">{inquiry.originalEstimate.explanation}</p>
                {inquiry.originalEstimate.includedFeatures.length > 0 && <p className="mt-2 text-xs leading-5 text-slate-600">Priced add-ons: {inquiry.originalEstimate.includedFeatures.join(", ")}</p>}
                {inquiry.originalEstimate.missingInformation.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-900">For a more accurate estimate, please clarify: {inquiry.originalEstimate.missingInformation.join(", ")}.</p>}
                {inquiry.originalEstimate.unpricedRequirements.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-900">Requires a manual quotation: {inquiry.originalEstimate.unpricedRequirements.join(" ")}</p>}
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 text-indigo-600" />
                <div><p className="font-bold text-slate-900">{STATUS_LABELS[inquiry.status]}</p><p className="mt-1 text-sm leading-6 text-slate-600">Estimated delivery: {inquiry.quote.delivery}. This is provisional until the studio approves the production schedule.</p></div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-black text-slate-900">Your request</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Summary label="Production" value={inquiry.project.projectKind} />
                <Summary label="Duration / quantity" value={inquiry.project.projectKind === "image" ? `${inquiry.project.imageCount} images` : `${inquiry.project.durationSeconds} seconds`} />
                <Summary label="Style / quality" value={`${inquiry.project.style} · ${inquiry.project.resolution} · ${inquiry.project.aspectRatio}`} />
                <Summary label="Languages" value={Object.values(inquiry.project.languages).filter(Boolean).join(", ")} />
              </dl>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{inquiry.project.brief}</p>
            </section>
            {inquiry.status === "AWAITING_CUSTOMER_APPROVAL" && (
              <button type="button" onClick={() => void approveQuote()} disabled={approving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {approving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve final quotation
              </button>
            )}
            {inquiry.status === "AWAITING_PAYMENT" && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Quotation approved. Please coordinate payment details directly with the creative team. Payment will only be marked received after manual verification.</p>}
            <div className="flex flex-wrap gap-3">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> Message Shamsa on WhatsApp</a>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print quotation</button>
            </div>
          </div>
        ) : null}
        <Link href="/creative-studio" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"><ArrowLeft className="h-4 w-4" /> Return to Creative Studio</Link>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-800">{value}</dd></div>;
}
