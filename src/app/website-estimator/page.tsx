"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ExternalLink, Globe, LoaderCircle, Search } from "lucide-react";
import CurrencySelector from "@/components/CurrencySelector";
import { useCurrency } from "@/components/CurrencyProvider";
import { formatCurrency } from "@/lib/currency";
import { getChargeableAddonIds, isEcommercePackageId, isSaasPackageId } from "@/lib/constants";
import { calculateSelectableWebsiteEstimate } from "@/lib/website-estimate-review";
import type { WebsiteEstimateResult } from "@/lib/website-estimator";
import { trackVisitorEvent } from "@/lib/visitor-tracking";

function getCalculatorUrl(estimate: WebsiteEstimateResult): string {
  const packageId = estimate.pricingPackage;
  const params = new URLSearchParams({
    currency: estimate.currency,
    sourceUrl: estimate.url,
    projectType: packageId
      ? isSaasPackageId(packageId) ? "SaaS" : "E-commerce store"
      : "Custom web application",
    adminPanel: "none",
    addons: estimate.addons.map((addon) => addon.id).join(","),
    scanFeatures: JSON.stringify(
      estimate.features.slice(0, 30).map((feature) => ({
        title: feature.title,
        evidence: `${feature.evidenceStatus === "public_signal"
          ? "Public scan signal; not verified as a complete workflow."
          : "Feature requires owner/client confirmation."} ${feature.evidence}`.slice(0, 300),
      }))
    ),
    ...(packageId ? { package: packageId } : {}),
    ...(estimate.matchedTemplateId ? { templateId: estimate.matchedTemplateId } : {}),
  });
  return `/calculator?${params.toString()}`;
}

export default function WebsiteEstimatorPage() {
  const [url, setUrl] = useState("");
  const [estimate, setEstimate] = useState<WebsiteEstimateResult | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [addonSearch, setAddonSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { currency, locale } = useCurrency();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEstimate(null);
    setSelectedAddonIds([]);
    setAddonSearch("");
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

      const websiteEstimate = result.estimate as WebsiteEstimateResult;
      setEstimate(websiteEstimate);
      setSelectedAddonIds(websiteEstimate.addons.map((addon) => addon.id));
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

  const selectedPackage = estimate?.pricingOptions.find(
    (option) => option.id === (estimate.pricingPackage || estimate.suggestedPricingOptionId)
  );
  const hasMatchedPackage = Boolean(estimate?.suggestedPricingOptionId);
  const selectedEstimate = estimate
    ? calculateSelectableWebsiteEstimate(estimate, selectedAddonIds)
    : null;
  const selectedOneTimeAddonTotal = selectedEstimate?.calculation.addonsTotal || 0;
  const selectedMonthlyAddonTotal = selectedEstimate?.calculation.monthlyAddonTotal || 0;
  const hasPricedSignals = selectedOneTimeAddonTotal > 0 || selectedMonthlyAddonTotal > 0;
  const includedAddonIds = new Set(
    estimate?.addonCatalog
      .filter((addon) =>
        !getChargeableAddonIds(
          [addon.id],
          estimate.pricingPackage,
          selectedPackage?.adminPanelType
        ).includes(addon.id)
      )
      .map((addon) => addon.id) || []
  );
  const visibleAddons = estimate?.addonCatalog.filter((addon) =>
    `${addon.title} ${addon.description}`.toLowerCase().includes(addonSearch.trim().toLowerCase())
  ) || [];

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
            Public website URL dein. Tool accessible pages ke feature signals aur un par lagu existing package/add-on prices se provisional rebuild estimate banata hai.
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
              Scanner sitemap aur internal links se maximum 24 same-site public HTML pages tak check karta hai. Login ke peechay workflows, source code, aur database verify nahi hotay.
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
            <p className="mt-1 text-xs text-gray-500">Large ya slow websites par scan ko kuch zyada waqt lag sakta hai.</p>
          </div>
        )}

        {estimate && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700">
                    Public scan · Preliminary estimate — requirements not fully verified
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
                    {estimate.pagesScanned} public page{estimate.pagesScanned === 1 ? "" : "s"} scanned
                  </p>
                </div>
                <div className="sm:min-w-56 rounded-xl bg-red-50 border border-red-100 p-4 sm:text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">
                    {hasMatchedPackage ? "Estimated budget for a similar detected scope" : "Selected catalog add-on total"}
                  </span>
                  <strong className="block text-2xl sm:text-3xl font-black text-[#E31E36] mt-1">
                    {hasMatchedPackage
                      ? selectedEstimate?.estimatedMaximumTotal
                        ? `${formatCurrency(selectedEstimate.calculation.estimatedTotal, estimate.currency, locale)}–${formatCurrency(selectedEstimate.estimatedMaximumTotal, estimate.currency, locale)}`
                        : `${estimate.pricingPackage === "saas_enterprise" ? "From " : ""}${formatCurrency(selectedEstimate?.calculation.estimatedTotal || 0, estimate.currency, locale)}`
                      : hasPricedSignals
                        ? selectedOneTimeAddonTotal > 0
                          ? formatCurrency(selectedOneTimeAddonTotal, estimate.currency, locale)
                          : `${formatCurrency(selectedMonthlyAddonTotal, estimate.currency, locale)} / month`
                        : "Insufficient priced signals"}
                  </strong>
                  <span className="block text-[11px] text-gray-500 mt-1">
                    {hasMatchedPackage
                      ? `${selectedPackage?.label || estimate.basePackage}; public features and current price rules`
                      : hasPricedSignals
                        ? "Selected catalog-priced features only — not a full project total"
                        : "No published package or priced feature was reliably detected"}
                  </span>
                </div>
              </div>
              <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
                <strong>Public-scan based build estimate — some requirements cannot be verified.</strong>{" "}
                Yeh estimate scanned public pages, matched features aur aapke existing package/add-on prices ko use karke isi tarah ka visible website scope build karne ka andaza deta hai. Private admin workflows, seller operations, integrations, infrastructure aur hidden functionality source code ke baghair verify nahi hotay; agar woh scan mein nazar na aayein to final scope aur budget badal sakta hai.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black">Choose add-ons and update the budget</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-600">
                    Scan se detected, chargeable features pehle se selected hain. Mazeed features select ya unselect karein; package mein included features dobara charge nahi honge.
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 sm:text-right sm:min-w-52">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">
                    {hasMatchedPackage ? "Updated comparable build budget" : "Selected catalog add-ons"}
                  </span>
                  <strong className="mt-1 block text-lg font-black text-[#E31E36]">
                    {hasMatchedPackage
                      ? selectedEstimate?.estimatedMaximumTotal
                        ? `${formatCurrency(selectedEstimate.calculation.estimatedTotal, estimate.currency, locale)}–${formatCurrency(selectedEstimate.estimatedMaximumTotal, estimate.currency, locale)}`
                        : formatCurrency(selectedEstimate?.calculation.estimatedTotal || 0, estimate.currency, locale)
                      : selectedOneTimeAddonTotal > 0
                        ? formatCurrency(selectedOneTimeAddonTotal, estimate.currency, locale)
                        : selectedMonthlyAddonTotal > 0
                          ? `${formatCurrency(selectedMonthlyAddonTotal, estimate.currency, locale)} / month`
                          : "No add-ons selected"}
                  </strong>
                  {selectedMonthlyAddonTotal > 0 && selectedOneTimeAddonTotal > 0 && (
                    <span className="mt-1 block text-[11px] text-amber-800">
                      Plus {formatCurrency(selectedMonthlyAddonTotal, estimate.currency, locale)} / month recurring
                    </span>
                  )}
                  {!hasMatchedPackage && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      Add-on total only; base project scope is not priced by this scan.
                    </span>
                  )}
                </div>
              </div>

              <label htmlFor="estimator-addon-search" className="mt-5 block text-xs font-bold text-gray-700">
                Find an add-on
              </label>
              <input
                id="estimator-addon-search"
                type="search"
                value={addonSearch}
                onChange={(event) => setAddonSearch(event.target.value)}
                placeholder="Search features, e.g. reviews or inventory"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31E36]"
              />
              <div className="mt-5 grid max-h-[34rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {visibleAddons.map((addon) => {
                  const includedInPackage = includedAddonIds.has(addon.id);
                  const detectedAddon = estimate.addons.find((item) => item.id === addon.id);
                  const checked = includedInPackage || selectedAddonIds.includes(addon.id);
                  const displayedPrice = detectedAddon?.price ?? addon.price;

                  return (
                    <label
                      key={addon.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                        includedInPackage
                          ? "border-emerald-200 bg-emerald-50/60"
                          : checked
                            ? "border-red-200 bg-red-50/50"
                            : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={includedInPackage}
                        onChange={(event) => {
                          setSelectedAddonIds((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, addon.id]))
                              : current.filter((id) => id !== addon.id)
                          );
                        }}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#E31E36] disabled:accent-emerald-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-start justify-between gap-1">
                          <span className="text-xs font-bold text-gray-800">{addon.title}</span>
                          <strong className={`text-xs ${includedInPackage ? "text-emerald-700" : "text-[#E31E36]"}`}>
                            {includedInPackage
                              ? "Included in package"
                              : `${formatCurrency(displayedPrice, estimate.currency, locale)}${addon.billingPeriod === "monthly" ? " / month" : ""}`}
                          </strong>
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-gray-600">{addon.description}</span>
                        {detectedAddon && !includedInPackage && (
                          <span className="mt-1 block text-[10px] font-semibold text-blue-700">
                            Detected on public pages
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              {estimate.addonCatalog.length === 0 && (
                <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  Is scan ke liye koi active catalog add-on available nahi.
                </p>
              )}
              {estimate.addonCatalog.length > 0 && visibleAddons.length === 0 && (
                <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  Is search ke liye koi add-on match nahi hua.
                </p>
              )}
              <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
                Prices existing add-on catalog se li gayi hain. Public scan mein nazar na aane wali functionality, custom integrations, hosting aur maintenance is selection total mein shamil nahi.
              </p>
            </section>

            {estimate.historicalProjectReference && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <h3 className="font-extrabold text-sm text-emerald-950">
                  Historical project fee — separate from this scan estimate
                </h3>
                <p className="mt-2 text-sm text-emerald-900">
                  {estimate.historicalProjectReference.title} was built for{" "}
                  <strong>{formatCurrency(estimate.historicalProjectReference.amountPKR, "PKR", "en-PK")}</strong>.
                  Converted at today&apos;s exchange rate, that historical Pakistan fee is about{" "}
                  <strong>
                    {formatCurrency(
                      estimate.historicalProjectReference.convertedAmount,
                      estimate.historicalProjectReference.currency,
                      locale
                    )}
                  </strong>.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-900">
                  This is a currency conversion of that project&apos;s historical fee, not an international quotation or a valuation of the scanned website.
                </p>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">1. Public website scan findings</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Features below are public-page signals only. Listed price is the matching existing catalog price, where available; package-included items are not charged twice.
                </p>
                <div className="mt-4 space-y-3">
                  {estimate.features.map((feature) => {
                    const addon = feature.addonId
                      ? estimate.addonCatalog.find((item) => item.id === feature.addonId)
                      : undefined;
                    const detectedAddon = feature.addonId
                      ? estimate.addons.find((item) => item.id === feature.addonId)
                      : undefined;
                    const packageIncludesFeature = Boolean(
                      feature.addonId &&
                      estimate.pricingPackage &&
                      !getChargeableAddonIds(
                        [feature.addonId],
                        estimate.pricingPackage,
                        selectedPackage?.adminPanelType
                      ).includes(feature.addonId)
                    );

                    return (
                      <div key={feature.id} className="flex items-start gap-2.5 border-b border-gray-100 pb-3 last:border-0">
                        <Globe className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-800">{feature.title}</p>
                            {detectedAddon ? (
                              <strong className="text-xs text-[#E31E36]">
                                {formatCurrency(detectedAddon.price, estimate.currency, locale)}
                                {detectedAddon.billingPeriod === "monthly" ? " / month" : ""}
                              </strong>
                            ) : packageIncludesFeature ? (
                              <span className="text-[10px] font-semibold text-emerald-700">
                                Included in {selectedPackage?.label}
                              </span>
                            ) : feature.addonId && addon ? (
                              <span className="text-[10px] text-gray-500">
                                Catalog: {formatCurrency(addon.price, estimate.currency, locale)}
                                {addon.billingPeriod === "monthly" ? " / month" : ""}
                              </span>
                            ) : feature.addonId ? (
                              <span className="text-[10px] text-amber-700">No active catalog price</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{feature.explanation}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {feature.evidenceStatus === "owner_confirmed"
                              ? "Owner-confirmed project record"
                              : "Public page signal — not implementation-verified"}{" "}
                            · {feature.evidence}
                          </p>
                          {feature.sourcePages.length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1 break-all">
                              Source: {feature.sourcePages.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {estimate.features.length === 0 && (
                    <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                      Koi supported feature signal scan kiye gaye public pages par nahi mila. Yeh proof nahi ke website mein features maujood nahi.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">2. Estimated build budget breakdown</h3>
                <div className="mt-4 space-y-3 text-sm">
                  {hasMatchedPackage ? (
                    <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                      <span className="text-gray-600">{selectedPackage?.label || estimate.basePackage}</span>
                      <strong>{formatCurrency(estimate.basePrice, estimate.currency, locale)}</strong>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                      Public scan ne kisi priced base package ko sufficiently match nahi kiya. Basic/starter package ko automatically assume nahi kiya gaya.
                    </p>
                  )}
                  {selectedEstimate?.calculation.selectedAddonDetails.map((addon) => (
                    <div key={addon.id} className="flex justify-between gap-4">
                      <span className="text-gray-600">{addon.label}</span>
                      <strong>
                        {formatCurrency(addon.price, estimate.currency, locale)}
                        {addon.billingPeriod === "monthly" ? " / month" : ""}
                      </strong>
                    </div>
                  ))}
                  {selectedMonthlyAddonTotal > 0 && (
                    <div className="flex justify-between gap-4 border-t border-gray-100 pt-3 text-amber-800">
                      <strong>Recurring catalog features</strong>
                      <strong>{formatCurrency(selectedMonthlyAddonTotal, estimate.currency, locale)} / month</strong>
                    </div>
                  )}
                  {hasMatchedPackage ? (
                    <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-[#E31E36]">
                      <strong>Estimated budget for detected scope</strong>
                      <strong>
                        {selectedEstimate?.estimatedMaximumTotal
                          ? `${formatCurrency(selectedEstimate.calculation.estimatedTotal, estimate.currency, locale)}–${formatCurrency(selectedEstimate.estimatedMaximumTotal, estimate.currency, locale)}`
                          : `${estimate.pricingPackage === "saas_enterprise" ? "From " : ""}${formatCurrency(selectedEstimate?.calculation.estimatedTotal || 0, estimate.currency, locale)}`}
                      </strong>
                    </div>
                  ) : (
                    hasPricedSignals ? (
                      <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-[#E31E36]">
                        <strong>Selected catalog-priced features only</strong>
                        <strong>{formatCurrency(selectedOneTimeAddonTotal, estimate.currency, locale)}</strong>
                      </div>
                    ) : (
                      <p className="rounded-lg border-t border-gray-200 pt-3 text-xs text-gray-600">
                        No catalog-priced features were reliably detected, so a numeric project estimate is unavailable from this scan.
                      </p>
                    )
                  )}
                  <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                    Budget existing package/add-on prices se calculate hua hai. Private workflows, infrastructure, licenses, transaction fees aur unpriced custom work shamil nahi jab tak public scan ya approved pricing record unhein establish na kare.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">3. Public pages opened</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Yeh scan mein actually khulay pages hain; poori website ki guaranteed list nahi. Private/login routes scan nahi kiye jatay.
                </p>
                <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                  {estimate.pageInventory.map((page, index) => (
                    <li key={page.url} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="mt-0.5 min-w-5 text-xs font-bold text-gray-400">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{page.type}</span>
                          <span className="text-xs font-semibold text-gray-800 break-words">{page.title}</span>
                        </div>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-[10px] text-gray-500 hover:text-[#E31E36]"
                        >
                          {new URL(page.url).pathname || "/"}
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <h3 className="font-extrabold text-base">4. Design and theme clues</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Static HTML/CSS se nazar aanay wali style clues; exact rendered design ka screenshot-based audit nahi.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {estimate.designSignals.map((signal) => (
                      <li key={signal} className="flex items-start gap-2 text-xs leading-relaxed text-gray-700">
                        <span className="font-black text-[#E31E36]">•</span><span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <h3 className="font-extrabold text-base">5. Platform and architecture clues</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Sirf public links aur text se mile ishare; backend, private admin panel, seller workflows ya separate-domain setup inspect nahi hotay.
                  </p>
                  {estimate.architectureSignals.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {estimate.architectureSignals.map((signal) => (
                        <li key={signal} className="flex items-start gap-2 text-xs leading-relaxed text-gray-700">
                          <span className="font-black text-[#E31E36]">•</span><span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                      Scanned public pages par admin, marketplace ya multi-domain architecture ka clear signal nahi mila. Iska matlab yeh nahi ke yeh cheezen backend mein maujood nahi.
                    </p>
                  )}
                </section>
              </div>
            </section>

            {(estimate.assumptions.length > 0 || estimate.warnings.length > 0) && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <h3 className="font-extrabold text-sm text-amber-950">Estimate assumptions and scan limits</h3>
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
                    International base package pricing uses the current regional rate and exchange rate (1 PKR = {estimate.exchangeRate} {estimate.currency}); add-on prices follow the published regional pricing rules. Rates updated {estimate.exchangeRateDate || "by provider"}.
                  </p>
                )}
                <Link
                  href={getCalculatorUrl(estimate)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#101216] hover:bg-[#E31E36] px-4 py-2.5 text-xs font-bold text-white transition"
                >
                  {estimate.matchedTemplateId
                    ? "Is estimate ke saath budget calculator kholein"
                    : "Features select aur customize karne ke liye budget calculator kholein"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {estimate.matchedTemplateId && (
                  <Link
                    href={`/templates?template=${encodeURIComponent(estimate.matchedTemplateId)}`}
                    className="mt-3 ml-0 sm:ml-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-800 hover:border-[#E31E36]"
                  >
                    Ya is ready-made template ko request karein
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </section>
            )}
          </div>
        )}

        {!estimate && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Globe className="w-8 h-8 text-gray-400 mx-auto" />
            <h2 className="font-bold mt-3">Website URL yahan enter karein</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xl mx-auto leading-relaxed">
              Tool sitemap aur internal links se maximum 24 public pages check karega. Yeh opened pages, visible style clues aur public feature signals par based estimate deta hai; private admin functionality aur JavaScript-only behavior verify nahi hotay.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
