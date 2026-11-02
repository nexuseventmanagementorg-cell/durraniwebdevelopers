"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateInquiryScopeEstimate } from "@/lib/inquiry-budget-estimate";
import { formatPKR } from "@/lib/constants";
import { formatCurrency, isCurrencyCode } from "@/lib/currency";
import type {
  Inquiry,
  InquiryScopeEstimate,
  PricingRuleConfig,
  ScopePricingPackageId,
} from "@/lib/types";

interface InquiryBudgetReviewProps {
  inquiry: Inquiry;
  pricingConfig: PricingRuleConfig | null;
  pricingConfigError: string;
  saving: boolean;
  onSave: (selection: { packageId: ScopePricingPackageId | null; addonIds: string[] }) => Promise<void>;
}

const PACKAGE_OPTIONS: Array<{ id: ScopePricingPackageId; label: string }> = [
  { id: "package_1", label: "Package 1 — Without Client Admin" },
  { id: "package_2", label: "Package 2 — With Client Admin" },
  { id: "ecommerce_starter", label: "E-Commerce Starter" },
  { id: "ecommerce_business", label: "E-Commerce Business" },
  { id: "ecommerce_advanced", label: "E-Commerce Advanced" },
  { id: "saas_starter", label: "SaaS Starter" },
  { id: "saas_business", label: "SaaS Business" },
  { id: "saas_enterprise", label: "SaaS Enterprise" },
];

function estimateAmount(estimate: InquiryScopeEstimate): string {
  if (!estimate.calculation || estimate.estimateStatus === "insufficient_information") {
    return "Insufficient information for a scope-based estimate";
  }
  if (estimate.regionalCalculation && isCurrencyCode(estimate.currency)) {
    const range = estimate.regionalMaximumEstimatedTotal
      ? ` – ${formatCurrency(estimate.regionalMaximumEstimatedTotal, estimate.currency)}`
      : "";
    return `${formatCurrency(estimate.regionalCalculation.estimatedTotal, estimate.currency)}${range} (PKR base ${formatPKR(estimate.calculation.estimatedTotal)})`;
  }
  const range = estimate.maximumEstimatedTotal
    ? ` – ${formatPKR(estimate.maximumEstimatedTotal)}`
    : "";
  return `${formatPKR(estimate.calculation.estimatedTotal)}${range}`;
}

function lineAmount(estimate: InquiryScopeEstimate, lineId: string, amount: number): string {
  if (estimate.regionalCalculation && isCurrencyCode(estimate.currency)) {
    if (lineId === estimate.pricingPackageId) {
      return formatCurrency(estimate.regionalCalculation.basePrice, estimate.currency);
    }
    const addon = estimate.regionalCalculation.selectedAddonDetails.find((detail) => detail.id === lineId);
    if (addon) return formatCurrency(addon.price, estimate.currency);
    return formatCurrency(0, estimate.currency);
  }
  return formatPKR(amount);
}

function StatusTag({ children, tone }: { children: string; tone: "amber" | "green" | "red" | "blue" }) {
  const colors = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${colors[tone]}`}>{children}</span>;
}

export default function InquiryBudgetReview({
  inquiry,
  pricingConfig,
  pricingConfigError,
  saving,
  onSave,
}: InquiryBudgetReviewProps) {
  const automaticEstimate = useMemo(() => {
    if (!pricingConfig) return inquiry.originalScopeEstimate || null;
    return inquiry.originalScopeEstimate || calculateInquiryScopeEstimate(inquiry, pricingConfig);
  }, [inquiry, pricingConfig]);
  const [packageId, setPackageId] = useState<ScopePricingPackageId | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [newAddonId, setNewAddonId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const initial = inquiry.adminScopeEstimate || automaticEstimate;
    setPackageId(initial?.pricingPackageId ?? null);
    setAddonIds(initial?.selectedAddonIds || []);
    setNewAddonId("");
    setError("");
  }, [inquiry.id, inquiry.adminScopeEstimate, automaticEstimate]);

  const draftEstimate = useMemo(() => {
    if (!pricingConfig) return null;
    return calculateInquiryScopeEstimate(inquiry, pricingConfig, {
      selection: { packageId, addonIds },
    });
  }, [inquiry, pricingConfig, packageId, addonIds]);
  const enabledAddons = useMemo(
    () => Object.values(pricingConfig?.addons || {})
      .filter((addon) => addon.enabled && addon.status !== "archived")
      .sort((left, right) => left.label.localeCompare(right.label)),
    [pricingConfig]
  );
  const savedEstimate = inquiry.adminScopeEstimate;

  const handleSave = async () => {
    if (!draftEstimate) return;
    setError("");
    try {
      await onSave({ packageId, addonIds });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The revised estimate could not be saved.");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-950">Scope-aware preliminary budget</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          This estimate uses published package and add-on prices. It is not a final quotation and does not change the inquiry, advance, or project status.
        </p>
      </div>

      {!pricingConfig ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-white p-3 text-xs text-red-800">
          {pricingConfigError || "Published pricing configuration is loading. The estimate cannot be calculated until it is available."}
        </p>
      ) : (
        <>
          {automaticEstimate && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs text-slate-900">
                  {inquiry.originalScopeEstimate ? "Original automated estimate" : "Current-pricing estimate (legacy inquiry)"}
                </strong>
                <StatusTag
                  tone={automaticEstimate.estimateStatus === "insufficient_information" ? "red" : "blue"}
                >
                  {automaticEstimate.estimateStatus.replaceAll("_", " ")}
                </StatusTag>
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">{estimateAmount(automaticEstimate)}</p>
              {automaticEstimate.packageLabel && (
                <p className="mt-1 text-[11px] text-slate-600">Package: {automaticEstimate.packageLabel}</p>
              )}
              {automaticEstimate.lines.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100 text-[11px]">
                  {automaticEstimate.lines.map((line) => (
                    <li key={`${line.id}-${line.kind}`} className="flex justify-between gap-3 py-1.5">
                      <span className={line.kind === "included" ? "text-slate-500" : "text-slate-800"}>
                        {line.label}{line.note ? ` — ${line.note}` : ""}
                      </span>
                      <strong className="shrink-0">{line.kind === "included" ? "Included" : lineAmount(automaticEstimate, line.id, line.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              {automaticEstimate.missingDetails.length > 0 && (
                <div className="mt-2">
                  <StatusTag tone="amber">Needs follow-up</StatusTag>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-950">
                    {automaticEstimate.missingDetails.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                </div>
              )}
              {automaticEstimate.reviewReasons.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-red-800">
                  {automaticEstimate.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="rounded-lg border border-violet-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs text-slate-900">
                {savedEstimate ? "Admin-adjusted estimate" : "Review and adjust estimate"}
              </strong>
              {draftEstimate && (
                <StatusTag
                  tone={draftEstimate.estimateStatus === "insufficient_information" ? "red" : draftEstimate.estimateStatus === "admin_review_required" ? "amber" : "blue"}
                >
                  {draftEstimate.estimateStatus.replaceAll("_", " ")}
                </StatusTag>
              )}
            </div>

            {savedEstimate && (
              <p className="mt-2 text-[11px] text-slate-600">
                Last saved: {estimateAmount(savedEstimate)} · {new Date(savedEstimate.estimatedAt).toLocaleString()}
              </p>
            )}

            <label htmlFor="scope-package" className="mt-3 block text-[11px] font-bold text-slate-700">Selected base package</label>
            <select
              id="scope-package"
              value={packageId || ""}
              onChange={(event) => {
                const value = event.target.value;
                setPackageId(PACKAGE_OPTIONS.find((option) => option.id === value)?.id || null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
            >
              <option value="">No applicable published package — admin review</option>
              {PACKAGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>

            <label htmlFor="scope-addons" className="mt-3 block text-[11px] font-bold text-slate-700">Add a published add-on</label>
            <div className="mt-1 flex gap-2">
              <select
                id="scope-addons"
                value={newAddonId}
                onChange={(event) => setNewAddonId(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="">Select an enabled add-on</option>
                {enabledAddons.filter((addon) => !addonIds.includes(addon.id)).map((addon) => (
                  <option key={addon.id} value={addon.id}>
                    {addon.label} — {formatPKR(addon.price)}{addon.requiresCustomQuote ? " (custom quote)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!newAddonId}
                onClick={() => {
                  if (newAddonId) setAddonIds((current) => [...current, newAddonId]);
                  setNewAddonId("");
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {addonIds.length > 0 && (
              <ul className="mt-2 space-y-1">
                {addonIds.map((id) => {
                  const addon = pricingConfig.addons[id];
                  if (!addon) return null;
                  const included = draftEstimate?.lines.some((line) => line.id === id && line.kind === "included");
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-2.5 py-2 text-[11px]">
                      <span className="text-slate-800">
                        {addon.label}
                        {included
                          ? " — included"
                          : ` — ${formatPKR(addon.price)}${addon.billingPeriod === "monthly" ? " / month" : ""}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAddonIds((current) => current.filter((value) => value !== id))}
                        aria-label={`Remove ${addon.label}`}
                        className="font-bold text-red-700 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {draftEstimate && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase text-slate-700">Estimated total</span>
                  <strong className="text-lg font-black text-red-700">{estimateAmount(draftEstimate)}</strong>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusTag tone={draftEstimate.scopeStatus === "needs_follow_up" ? "amber" : "green"}>
                    {draftEstimate.scopeStatus.replaceAll("_", " ")}
                  </StatusTag>
                  <StatusTag tone={draftEstimate.confidence === "low" ? "amber" : "blue"}>
                    {`${draftEstimate.confidence} confidence`}
                  </StatusTag>
                  {draftEstimate.estimateStatus === "preliminary_estimate" && (
                    <StatusTag tone="blue">Preliminary estimate</StatusTag>
                  )}
                  {draftEstimate.estimateStatus === "admin_review_required" && (
                    <StatusTag tone="red">Admin review required</StatusTag>
                  )}
                </div>
                {draftEstimate.lines.length > 0 && (
                  <ul className="mt-2 divide-y divide-red-100 border-t border-red-100 text-[11px]">
                    {draftEstimate.lines.map((line) => (
                      <li key={`${line.id}-${line.kind}`} className="flex justify-between gap-3 py-1.5">
                        <span className={line.kind === "included" ? "text-slate-500" : "text-slate-800"}>
                          {line.label}{line.note ? ` — ${line.note}` : ""}
                        </span>
                        <strong className="shrink-0">{line.kind === "included" ? "Included" : lineAmount(draftEstimate, line.id, line.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                {draftEstimate.recommendedPackage && (
                  <p className="mt-2 text-[11px] font-semibold text-amber-900">
                    Recommended for review: {draftEstimate.recommendedPackage.label}. {draftEstimate.recommendedPackage.reason}
                  </p>
                )}
                {draftEstimate.reviewReasons.map((reason) => (
                  <p key={reason} className="mt-2 text-[11px] text-red-800">{reason}</p>
                ))}
                {draftEstimate.missingDetails.length > 0 && (
                  <div className="mt-2 border-t border-red-100 pt-2">
                    <p className="font-bold text-amber-900">Missing details requiring follow-up</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-amber-950">
                      {draftEstimate.missingDetails.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !draftEstimate}
                className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving estimate…" : "Save admin-adjusted estimate"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
