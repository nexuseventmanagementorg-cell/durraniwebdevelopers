"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Globe,
  LoaderCircle,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  calculateReviewedWebsiteEstimate,
  getDefaultNewBuildAddonIds,
} from "@/lib/website-estimate-review";
import {
  type ExistingFeatureScope,
  type WebsiteEstimateResult,
  type WebsiteScopeMode,
} from "@/lib/website-estimator";
import {
  getChargeableAddonIds,
  isEcommercePackageId,
  isSaasPackageId,
} from "@/lib/constants";
import CurrencySelector from "@/components/CurrencySelector";
import { useCurrency } from "@/components/CurrencyProvider";
import { trackVisitorEvent } from "@/lib/visitor-tracking";

export default function WebsiteEstimatorPage() {
  const [url, setUrl] = useState("");
  const [estimate, setEstimate] = useState<WebsiteEstimateResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scopeMode, setScopeMode] = useState<WebsiteScopeMode>("new_build");
  const [selectedPricingOptionId, setSelectedPricingOptionId] = useState("package_1");
  const [featureScopes, setFeatureScopes] = useState<Record<string, ExistingFeatureScope>>({});
  const [selectedNewBuildAddons, setSelectedNewBuildAddons] = useState<string[]>([]);
  const [ownerConfirmedAddons, setOwnerConfirmedAddons] = useState<string[]>([]);
  const { currency, locale } = useCurrency();

  const addonById = useMemo(
    () => new Map(estimate?.addonCatalog.map((addon) => [addon.id, addon]) || []),
    [estimate]
  );
  const selectedPricingOption = estimate?.pricingOptions.find(
    (option) => option.id === selectedPricingOptionId
  );
  const reviewedEstimate = estimate
    ? calculateReviewedWebsiteEstimate(
        estimate,
        scopeMode,
        selectedNewBuildAddons,
        featureScopes,
        ownerConfirmedAddons,
        selectedPricingOptionId
      )
    : null;
  const chargeableAddonIds = reviewedEstimate?.chargeableAddonIds || [];
  const calculation = reviewedEstimate?.calculation || null;
  const unpricedRepairs = reviewedEstimate?.unpricedRepairs || [];

  const calculatorUrl = estimate
    ? (() => {
        const params = new URLSearchParams({
          currency: estimate.currency,
          sourceUrl: estimate.url,
          projectType: scopeMode === "existing_site"
            ? "Custom web application"
            : selectedPricingOption?.pricingPackage
            ? isSaasPackageId(selectedPricingOption.pricingPackage) ? "SaaS" : "E-commerce store"
            : "Custom web application",
          adminPanel: reviewedEstimate?.adminPanelType || "none",
          addons: chargeableAddonIds.join(","),
          scanFeatures: JSON.stringify(estimate.features.map(({ title }) => title)),
          ...(scopeMode === "new_build" && selectedPricingOption
            ? {
                package: selectedPricingOption.pricingPackage ||
                  (selectedPricingOption.id === "package_2" ? "with_admin" : "without_admin"),
              }
            : {}),
        });
        return `/calculator?${params.toString()}`;
      })()
    : "/calculator";
  const nextStepUrl = estimate?.matchedTemplateId
      ? `/templates?template=${encodeURIComponent(estimate.matchedTemplateId)}`
      : calculatorUrl;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEstimate(null);
    setSelectedNewBuildAddons([]);
    setOwnerConfirmedAddons([]);
    setFeatureScopes({});
    setSelectedPricingOptionId("package_1");
    setLoading(true);

    try {
      const response = await fetch("/api/public/website-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), currency }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Website scan nahi ho saki. URL check karke dobara koshish karein.");
        return;
      }

      const nextEstimate = result.estimate as WebsiteEstimateResult;
      setEstimate(nextEstimate);
      setSelectedPricingOptionId(nextEstimate.suggestedPricingOptionId);
      setSelectedNewBuildAddons(getDefaultNewBuildAddonIds(nextEstimate));
      setFeatureScopes(Object.fromEntries(
        nextEstimate.features.map((feature) => [feature.id, "unknown"])
      ));
      setScopeMode("new_build");
      trackVisitorEvent("estimator").catch((trackingError) => {
        console.error("Could not record all-time URL estimator user count", trackingError);
      });
    } catch (requestError) {
      console.error("Website estimate request failed", requestError);
      setError("Scan service tak rabta nahi ho saka. Thori dair baad dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] text-[#101216]">
      <section className="bg-[#101216] text-white py-16 border-b border-[#242830]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#E31E36]/15 text-[#E31E36] flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <span className="mt-4 inline-block text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
            Website Budget Estimator
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mt-2">
            Kisi Website Ka Andazati Budget Maloom Karein
          </h1>
          <p className="text-sm text-gray-300 max-w-2xl mx-auto mt-4 leading-relaxed">
            Public website URL dein. Tool accessible pages se feature signals dhoondta hai. Private dashboards, source code aur backend inspect nahi hote, is liye scope aur optional charges review karein.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 max-w-2xl mx-auto">
            <label htmlFor="website-url" className="sr-only">Website URL</label>
            <label htmlFor="estimator-currency" className="block text-left text-xs font-bold text-gray-200 mb-2">
              Estimate currency (automatically selected for your region; you can change it)
            </label>
            <CurrencySelector
              id="estimator-currency"
              className="mb-3 w-full rounded-xl bg-white text-[#101216] px-4 py-3 text-sm border border-gray-300"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="website-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                required
                maxLength={2048}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                className="min-w-0 flex-1 rounded-xl bg-white text-[#101216] px-4 py-3.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E31E36]"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E36] hover:bg-[#C8162D] disabled:opacity-60 text-white px-6 py-3.5 text-sm font-bold transition"
              >
                {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Website check ho rahi hai..." : "Features aur Budget Check Karein"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Sirf public HTML pages scan hotay hain; JavaScript-rendered content, login/private pages, source code aur database verify nahi hotay.
            </p>
          </form>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <LoaderCircle className="w-8 h-8 animate-spin text-[#E31E36] mx-auto" />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              Public pages aur feature signals check kiye ja rahe hain...
            </p>
            <p className="mt-1 text-xs text-gray-500">Aam tor par is mein chand seconds lagte hain.</p>
          </div>
        )}

        {estimate && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <h2 className="font-extrabold text-base text-blue-950">Estimate kis kaam ke liye hai?</h2>
              <p className="mt-1 text-xs leading-relaxed text-blue-900">
                Public signals do not prove whether a feature is already implemented. Choose a new build, or review an existing site so existing work is not charged again.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <label className="flex flex-1 items-start gap-2 rounded-xl border border-blue-200 bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="scope-mode"
                    checked={scopeMode === "new_build"}
                    onChange={() => setScopeMode("new_build")}
                    className="mt-1"
                  />
                  <span><strong>New build</strong><span className="block text-xs text-gray-600">Detected, priced add-ons start included in the estimate; review them below.</span></span>
                </label>
                <label className="flex flex-1 items-start gap-2 rounded-xl border border-blue-200 bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="scope-mode"
                    checked={scopeMode === "existing_site"}
                    onChange={() => setScopeMode("existing_site")}
                    className="mt-1"
                  />
                  <span><strong>Existing site / remaining work</strong><span className="block text-xs text-gray-600">No base package; only explicitly selected new items are priced.</span></span>
                </label>
              </div>
              {scopeMode === "new_build" && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                  <label htmlFor="pricing-plan" className="block text-sm font-semibold text-gray-800">
                    Published pricing plan
                  </label>
                  <p className="mt-1 text-xs text-gray-600">
                    The scan recommends a plan when public signals are clear. Choose the matching plan yourself if the site needs a store or SaaS build that the public pages do not reveal.
                  </p>
                  <select
                    id="pricing-plan"
                    value={selectedPricingOptionId}
                    onChange={(event) => setSelectedPricingOptionId(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {estimate.pricingOptions.map((option) => {
                      const displayedPrice = option.adminPanelType === "client_admin"
                        ? option.basePriceWithAdmin
                        : option.basePrice;
                      const priceLabel = option.maximumPrice
                        ? `${formatCurrency(displayedPrice, estimate.currency, locale)}–${formatCurrency(option.maximumPrice, estimate.currency, locale)}`
                        : option.id === "package_2"
                          ? formatCurrency(displayedPrice, estimate.currency, locale)
                          : option.pricingPackage === "saas_enterprise"
                            ? `${formatCurrency(displayedPrice, estimate.currency, locale)}+`
                            : formatCurrency(displayedPrice, estimate.currency, locale);
                      return (
                        <option key={option.id} value={option.id}>
                          {option.label} — {priceLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              {scopeMode === "new_build" && selectedPricingOption?.pricingPackage &&
                isEcommercePackageId(selectedPricingOption.pricingPackage) && (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                  Client admin and store-management tools are included in this e-commerce package price.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700">
                    Public page scan complete
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mt-1 break-words">{estimate.siteTitle}</h2>
                  <a
                    href={estimate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#E31E36] hover:underline break-all"
                  >
                    {estimate.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  {estimate.siteDescription && (
                    <p className="text-xs text-gray-600 mt-3 leading-relaxed">{estimate.siteDescription}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">
                    {estimate.pagesScanned} public page{estimate.pagesScanned === 1 ? "" : "s"} check kiye gaye
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 break-all">
                    Scanned: {estimate.scannedPages.join(", ")}
                  </p>
                </div>
                <div className="sm:min-w-52 rounded-xl bg-red-50 border border-red-100 p-4 sm:text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">
                  {scopeMode === "new_build" ? "New build estimate" : "Selected remaining work"}
                  </span>
                  <strong className="block text-2xl sm:text-3xl font-black text-[#E31E36] mt-1">
                  {formatCurrency(calculation?.estimatedTotal || 0, estimate.currency, locale)}
                  </strong>
                  <span className="block text-[11px] text-gray-500 mt-1">
                  {scopeMode === "new_build" ? reviewedEstimate?.basePackage : "No existing-site base fee"}
                  </span>
                </div>
              </div>
            </section>

            {estimate.historicalProjectReference && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <h3 className="font-extrabold text-sm text-emerald-950">
                  Existing project fee — separate from this new-build estimate
                </h3>
                <p className="mt-2 text-sm text-emerald-900">
                  {estimate.historicalProjectReference.title} was actually built for{" "}
                  <strong>{formatCurrency(estimate.historicalProjectReference.amountPKR, "PKR", "en-PK")}</strong>.
                  At today&apos;s exchange rate, that historical Pakistan fee is about{" "}
                  <strong>
                    {formatCurrency(
                      estimate.historicalProjectReference.convertedAmount,
                      estimate.historicalProjectReference.currency,
                      locale
                    )}
                  </strong>
                  .
                </p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-900">
                  This is a straight currency conversion of the original Pakistan project fee—not an international quote. The estimate above is a separate quote for a new project with similar visible features, using the selected country&apos;s international pricing.
                </p>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">Public feature signals</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Priced signals are selected by default and included in the breakdown below. Signals are not proof of a complete workflow; uncheck any add-on that is not part of the requested build. Registrar purchase and renewal fees are separate.
                </p>
                <div className="mt-4 space-y-3">
                  {estimate.features.map((feature) => {
                    const addon = feature.addonId ? addonById.get(feature.addonId) : undefined;
                    const packageIncludedAddon = Boolean(
                      feature.addonId &&
                      selectedPricingOption?.pricingPackage &&
                      !getChargeableAddonIds(
                        [feature.addonId],
                        selectedPricingOption.pricingPackage,
                        selectedPricingOption.adminPanelType
                      ).includes(feature.addonId)
                    );
                    const includedStoreSignal = Boolean(
                      selectedPricingOption?.pricingPackage &&
                      isEcommercePackageId(selectedPricingOption.pricingPackage) &&
                      [
                        "Product ya menu catalog",
                        "Cart interaction signal",
                        "Checkout or order-submission signal",
                        "E-commerce store package",
                      ].includes(feature.title)
                    );
                    const includedInSelectedPackage = packageIncludedAddon || includedStoreSignal;

                    return (
                      <div key={feature.title} className="flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                        <p className="text-sm font-bold text-gray-800">{feature.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{feature.explanation}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {feature.evidenceStatus === "owner_confirmed" ? "Owner-confirmed scope record" : "Public signal"} · {feature.evidence}
                          {feature.sourcePages.length > 0 && ` Source: ${feature.sourcePages.join(", ")}`}
                        </p>
                        {scopeMode === "new_build" && includedInSelectedPackage && (
                          <p className="mt-2 text-xs font-semibold text-emerald-700">
                            Included in {selectedPricingOption?.label}; no additional add-on charge.
                          </p>
                        )}
                        {scopeMode === "new_build" && addon && !includedInSelectedPackage && (
                          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedNewBuildAddons.includes(addon.id)}
                              onChange={(event) => setSelectedNewBuildAddons((current) =>
                                event.target.checked
                                  ? Array.from(new Set([...current, addon.id]))
                                  : current.filter((id) => id !== addon.id)
                              )}
                            />
                            Include as new scope: {addon.title}{" "}
                            ({formatCurrency(addon.price, estimate.currency, locale)})
                          </label>
                        )}
                        {scopeMode === "new_build" &&
                          feature.addonId &&
                          !addon &&
                          !includedInSelectedPackage && (
                            <p className="mt-2 text-xs text-amber-700">
                              This feature has no enabled add-on price in the current Pricing &amp; Rates list, so it is not included in the total.
                            </p>
                          )}
                        {scopeMode === "existing_site" && (
                          <label className="mt-2 flex flex-col gap-1 text-xs text-gray-700">
                            <span>Owner scope review</span>
                            <select
                              value={featureScopes[feature.id] || "unknown"}
                              onChange={(event) => setFeatureScopes((current) => ({
                                ...current,
                                [feature.id]: event.target.value as ExistingFeatureScope,
                              }))}
                              className="w-fit rounded-lg border border-gray-300 bg-white px-2 py-1"
                            >
                              <option value="unknown">Unknown — not priced</option>
                              <option value="existing">Already implemented — owner-confirmed</option>
                              <option value="new">New work required — owner-confirmed</option>
                              <option value="repair">Repair / hardening — requires separate scope</option>
                            </select>
                            {featureScopes[feature.id] === "new" && feature.addonId && addonById.has(feature.addonId) && (
                              <span className="text-gray-500">
                                Provisional add-on: {addonById.get(feature.addonId)?.title}{" "}
                                {formatCurrency(addonById.get(feature.addonId)?.price || 0, estimate.currency, locale)}
                              </span>
                            )}
                            {featureScopes[feature.id] === "new" && (!feature.addonId || !addonById.has(feature.addonId)) && (
                              <span className="text-amber-700">No matching price rule; this item is not included in the total.</span>
                            )}
                          </label>
                        )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {scopeMode === "existing_site" && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <label htmlFor="owner-addon" className="block text-sm font-bold">Add owner-confirmed new work</label>
                    <p className="mt-1 text-xs text-gray-500">Use for private features not visible in the public scan. This choice is owner-reported, not independently verified.</p>
                    <select
                      id="owner-addon"
                      value=""
                      onChange={(event) => {
                        const id = event.target.value;
                        if (id) setOwnerConfirmedAddons((current) => Array.from(new Set([...current, id])));
                      }}
                      className="mt-2 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">Choose a priced feature...</option>
                      {estimate.addonCatalog
                        .filter((addon) => !ownerConfirmedAddons.includes(addon.id))
                        .map((addon) => (
                          <option key={addon.id} value={addon.id}>
                            {addon.title} — {formatCurrency(addon.price, estimate.currency, locale)}
                          </option>
                        ))}
                    </select>
                    {ownerConfirmedAddons.map((id) => {
                      const addon = addonById.get(id);
                      return addon ? (
                        <label key={id} className="mt-2 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => setOwnerConfirmedAddons((current) => current.filter((item) => item !== id))}
                          />
                          Owner-confirmed: {addon.title} ({formatCurrency(addon.price, estimate.currency, locale)})
                        </label>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">Calculator ke mutabiq price breakdown</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                    <span className="text-gray-600">
                      {scopeMode === "new_build"
                        ? reviewedEstimate?.adminPanelType === "client_admin" &&
                          !selectedPricingOption?.pricingPackage
                          ? "Package 1: Durrani-Managed (without client admin)"
                          : reviewedEstimate?.basePackage || estimate.basePackage
                        : "Existing site — base excluded"}
                    </span>
                    <strong>
                      {formatCurrency(
                        scopeMode === "new_build"
                          ? Math.max(0, (calculation?.basePrice || 0) - (calculation?.adminFee || 0))
                          : 0,
                        estimate.currency,
                        locale
                      )}
                    </strong>
                  </div>
                  {scopeMode === "new_build" && (calculation?.adminFee || 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Client admin panel upgrade (Package 2)</span>
                      <strong>{formatCurrency(calculation?.adminFee || 0, estimate.currency, locale)}</strong>
                    </div>
                  )}
                  {calculation?.selectedAddonDetails.map((addon) => (
                    <div key={addon.id} className="flex justify-between gap-4">
                      <span className="text-gray-600">
                        {ownerConfirmedAddons.includes(addon.id) ? "Owner-confirmed: " : ""}
                        {addon.label}
                      </span>
                      <strong>
                        {formatCurrency(addon.price, estimate.currency, locale)}
                        {addon.billingPeriod === "monthly" ? " / month" : ""}
                      </strong>
                    </div>
                  ))}
                  {(calculation?.monthlyAddonTotal || 0) > 0 && (
                    <div className="flex justify-between gap-4 border-t border-gray-100 pt-3 text-amber-800">
                      <strong>Recurring monthly add-ons</strong>
                      <strong>{formatCurrency(calculation?.monthlyAddonTotal || 0, estimate.currency, locale)} / month</strong>
                    </div>
                  )}
                  {unpricedRepairs.map((feature) => (
                    <div key={`repair-${feature.id}`} className="text-xs text-amber-700">
                      Repair / hardening not priced: {feature.title} — confirm scope for a separate quote.
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-[#E31E36]">
                    <strong>Andazati total</strong>
                    <strong>{formatCurrency(calculation?.estimatedTotal || 0, estimate.currency, locale)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <h3 className="font-extrabold text-sm text-amber-950">Zaroori wazahat</h3>
              <ul className="mt-3 space-y-2">
                {estimate.assumptions.map((assumption) => (
                  <li key={assumption} className="flex items-start gap-2 text-xs text-amber-950 leading-relaxed">
                    <span className="font-black">•</span><span>{assumption}</span>
                  </li>
                ))}
                {estimate.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-xs text-amber-950 leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{warning}</span>
                  </li>
                ))}
              </ul>
              {estimate.internationalPricing && (
                <p className="mt-3 text-[11px] text-amber-900">
                  International base packages use 2x Pakistan rates converted at 1 PKR = {estimate.exchangeRate} {estimate.currency}; each selected one-time add-on is a flat 100 {estimate.currency}. Rates updated {estimate.exchangeRateDate || "by provider"}. Final quotation may differ with rate changes.
                </p>
              )}
              <Link
                href={nextStepUrl}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#101216] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#E31E36] transition"
              >
                {estimate.matchedTemplateId
                  ? "Is template ko apne brand ke liye customize karein"
                  : "Is tarah ki website apne brand ke liye banwayein"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          </div>
        )}

        {!estimate && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Globe className="w-8 h-8 text-gray-400 mx-auto" />
            <h2 className="font-bold mt-3">Website URL yahan enter karein</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xl mx-auto leading-relaxed">
              Tool public homepage aur usi website ke chand relevant pages check karega. Yeh feature-based estimate hai—website owner ka asal development budget ya invoice maloom karne ka tareeqa nahi.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
