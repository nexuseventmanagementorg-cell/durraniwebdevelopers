"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  LoaderCircle,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { WebsiteEstimateResult } from "@/lib/website-estimator";
import CurrencySelector from "@/components/CurrencySelector";
import { useCurrency } from "@/components/CurrencyProvider";
import { trackVisitorEvent } from "@/lib/visitor-tracking";

export default function WebsiteEstimatorPage() {
  const [url, setUrl] = useState("");
  const [estimate, setEstimate] = useState<WebsiteEstimateResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { currency, locale } = useCurrency();

  const calculatorUrl = estimate
    ? (() => {
        const params = new URLSearchParams({
          currency: estimate.currency,
          sourceUrl: estimate.url,
          projectType: "Custom web application",
          adminPanel: estimate.adminPanel ? "client_admin" : "none",
          addons: estimate.addons.map((addon) => addon.id).join(","),
        });
        return `/calculator?${params.toString()}`;
      })()
    : "/calculator";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEstimate(null);
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

      setEstimate(result.estimate as WebsiteEstimateResult);
      trackVisitorEvent("estimator").catch((trackingError) => {
        console.error("Could not record today's URL estimator user count", trackingError);
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
            Public website URL dein. Tool nazar aane wale pages aur features check karke Durrani Web Developers ke current calculator rates par aik rough development estimate banayega.
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
              Public websites worldwide scan ho sakti hain. Login/private pages nahi. Aapka browser apni built-in translation chala sakta hai.
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
                </div>
                <div className="sm:min-w-52 rounded-xl bg-red-50 border border-red-100 p-4 sm:text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">
                    New project estimate
                  </span>
                  <strong className="block text-2xl sm:text-3xl font-black text-[#E31E36] mt-1">
                    {formatCurrency(estimate.estimatedTotal, estimate.currency, locale)}
                  </strong>
                  <span className="block text-[11px] text-gray-500 mt-1">{estimate.basePackage}</span>
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
                <h3 className="font-extrabold text-base">Website par nazar anay wale features</h3>
                <p className="text-xs text-gray-500 mt-1">Yeh public page signals hain, poore technical audit ki tasdeeq nahi.</p>
                <div className="mt-4 space-y-3">
                  {estimate.features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{feature.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{feature.explanation}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{feature.evidence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="font-extrabold text-base">Calculator ke mutabiq price breakdown</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                    <span className="text-gray-600">{estimate.basePackage}</span>
                    <strong>{formatCurrency(estimate.basePrice, estimate.currency, locale)}</strong>
                  </div>
                  {estimate.addons.map((addon) => (
                    <div key={addon.id} className="flex justify-between gap-4">
                      <span className="text-gray-600">{addon.title}</span>
                      <strong>{formatCurrency(addon.price, estimate.currency, locale)}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-[#E31E36]">
                    <strong>Andazati total</strong>
                    <strong>{formatCurrency(estimate.estimatedTotal, estimate.currency, locale)}</strong>
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
                  International base packages use 2x Pakistan rates converted at 1 PKR = {estimate.exchangeRate} {estimate.currency}; each add-on is a flat 100 {estimate.currency}. Rates updated {estimate.exchangeRateDate || "by provider"}. Final quotation may differ with rate changes.
                </p>
              )}
              <Link
                href={calculatorUrl}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#101216] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#E31E36] transition"
              >
                Is tarah ki website apne brand ke liye banwayein <ArrowRight className="w-3.5 h-3.5" />
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
