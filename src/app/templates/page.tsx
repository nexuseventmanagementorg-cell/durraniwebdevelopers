"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Layers3,
  Send,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import {
  ADDON_CATEGORY_LABELS,
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  getChargeableAddonIds,
  getAddonPriceForPackage,
  isPricingPackageId,
  SAAS_PACKAGES,
  formatPKR,
} from "@/lib/constants";
import { getTemplateRequestPlans } from "@/lib/template-pricing";
import type { AddonOption, PortfolioProject } from "@/lib/types";

const TEMPLATE_PLANS = [
  { id: "without_admin", name: "Package 1 — Durrani-managed", price: DEFAULT_PRICING_CONFIG.baseWithoutAdmin, note: "No client admin panel" },
  { id: "with_admin", name: "Package 2 — Client admin panel", price: DEFAULT_PRICING_CONFIG.baseWithAdmin, note: "Manage website content through an admin panel" },
  { id: "ecommerce_starter", name: ECOMMERCE_PACKAGES.ecommerce_starter.label, price: ECOMMERCE_PACKAGES.ecommerce_starter.basePrice, note: "Focused online store with essential shopping workflows" },
  { id: "ecommerce_business", name: ECOMMERCE_PACKAGES.ecommerce_business.label, price: ECOMMERCE_PACKAGES.ecommerce_business.basePrice, note: "Online store with business essentials" },
  { id: "ecommerce_advanced", name: ECOMMERCE_PACKAGES.ecommerce_advanced.label, price: ECOMMERCE_PACKAGES.ecommerce_advanced.basePrice, note: `Starting price; scope may reach ${formatPKR(ECOMMERCE_PACKAGES.ecommerce_advanced.maximumPrice)}` },
  { id: "saas_starter", name: SAAS_PACKAGES.saas_starter.label, price: SAAS_PACKAGES.saas_starter.basePrice, note: "SaaS starting plan" },
  { id: "saas_business", name: SAAS_PACKAGES.saas_business.label, price: SAAS_PACKAGES.saas_business.basePrice, note: "SaaS business plan" },
  { id: "saas_enterprise", name: SAAS_PACKAGES.saas_enterprise.label, price: SAAS_PACKAGES.saas_enterprise.basePrice, note: "Enterprise SaaS starting price" },
] as const;

export default function WebsiteTemplatesPage() {
  const [templates, setTemplates] = useState<PortfolioProject[]>([]);
  const [addons, setAddons] = useState<AddonOption[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("template_starting");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customization, setCustomization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTemplates() {
      try {
        const [portfolioResponse, addonsResponse] = await Promise.all([
          fetch("/api/public/portfolio"),
          fetch("/api/public/addons"),
        ]);
        const [portfolioResult, addonsResult] = await Promise.all([
          portfolioResponse.json(),
          addonsResponse.json(),
        ]);
        if (!portfolioResponse.ok || !portfolioResult.success) {
          throw new Error(portfolioResult.error || "Could not load available templates.");
        }
        if (!addonsResponse.ok || !addonsResult.success) {
          throw new Error(addonsResult.error || "Could not load published add-on prices.");
        }
        const availableTemplates = (portfolioResult.portfolio as PortfolioProject[]).filter(
          (project) => project.templateAvailable !== false
        );
        const requestedTemplateId = new URLSearchParams(window.location.search).get("template");
        const initiallySelectedTemplate = availableTemplates.find(
          (template) => template.id === requestedTemplateId
        ) || availableTemplates[0];
        setAddons(addonsResult.addons as AddonOption[]);
        setTemplates(availableTemplates);
        setSelectedTemplateId(initiallySelectedTemplate?.id || "");
        setSelectedPlanId("template_starting");
        setSelectedAddonIds(
          (initiallySelectedTemplate?.templateIncludedAddonIds || [])
            .filter((id) => (addonsResult.addons as AddonOption[]).some((addon) => addon.id === id))
        );
      } catch (error) {
        console.error("Failed to load website templates", error);
        setLoadError("Template list is temporarily unavailable. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );
  const templatePlans = useMemo(
    () => selectedTemplate ? getTemplateRequestPlans(selectedTemplate) : [],
    [selectedTemplate]
  );
  const selectedPlan = templatePlans.find((plan) => plan.id === selectedPlanId) || templatePlans[0] || {
    id: "template_starting",
    name: "Template starting plan",
    price: 0,
    note: "",
    adminPanelType: "none" as const,
  };
  const packageId = selectedPlan?.packageId ||
    (selectedPlan && isPricingPackageId(selectedPlan.id) ? selectedPlan.id : undefined);
  const adminPanelType = selectedPlan?.adminPanelType || "none";
  const chargeableAddonIds = getChargeableAddonIds(selectedAddonIds, packageId, adminPanelType);
  const selectedAddons = addons.filter((addon) => selectedAddonIds.includes(addon.id));
  const chargeableAddons = selectedAddons.filter((addon) => chargeableAddonIds.includes(addon.id));
  const priceForAddon = (addon: AddonOption) =>
    selectedTemplate?.templateIncludedAddonPrices?.[addon.id] ??
    getAddonPriceForPackage(addon, packageId);
  const oneTimeAddonTotal = chargeableAddons
    .filter((addon) => (addon.billingPeriod || "one_time") === "one_time")
    .reduce((total, addon) => total + priceForAddon(addon), 0);
  const monthlyAddonTotal = chargeableAddons
    .filter((addon) => addon.billingPeriod === "monthly")
    .reduce((total, addon) => total + priceForAddon(addon), 0);
  const estimatedInitialTotal = selectedPlan.price + oneTimeAddonTotal;
  const groupedAddons = addons.reduce<Record<string, AddonOption[]>>((groups, addon) => {
    const category = ADDON_CATEGORY_LABELS[addon.category] || "Other";
    (groups[category] ||= []).push(addon);
    return groups;
  }, {});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTemplate) {
      setErrorMessage("Please choose an available template first.");
      return;
    }
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (!selectedPlan) {
      setErrorMessage("Please select a starting plan for the chosen template.");
      setSubmitting(false);
      return;
    }
    const message = [
      `Ready-made template: ${selectedTemplate.title}`,
      `Template preview: ${selectedTemplate.demoUrl || "Offline preview; please confirm availability"}`,
      `Requested pricing plan: ${selectedPlan.name} (${formatPKR(selectedPlan.price)} starting price)`,
      `Selected add-ons: ${selectedAddons.length > 0
        ? selectedAddons.map((addon) => `${addon.label} — ${formatPKR(priceForAddon(addon))}${addon.billingPeriod === "monthly" ? " / month" : ""}${chargeableAddonIds.includes(addon.id) ? "" : " (included in selected plan)"}`).join(", ")
        : "None"}`,
      `Preliminary price: ${formatPKR(selectedPlan.price)} plan + ${formatPKR(oneTimeAddonTotal)} one-time add-ons = ${formatPKR(estimatedInitialTotal)}${monthlyAddonTotal > 0 ? `, plus ${formatPKR(monthlyAddonTotal)} / month recurring add-ons` : ""}. Final quote depends on confirmed scope.`,
      `Customization/add-ons requested: ${customization.trim() || "None specified yet"}`,
      "Customer understands this is a request, not a confirmed order. Final price and scope must be agreed; the project is booked only after finalization and payment is received. Delivery period and date will be confirmed after payment.",
    ].join("\n");

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject: `Ready-made template request: ${selectedTemplate.title}`,
          message,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not send your template request.");
      }
      setSuccessMessage(result.message || "Your template request has been received.");
      setName("");
      setEmail("");
      setPhone("");
      setCustomization("");
      setSelectedAddonIds([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#101216]">
      <section className="bg-[#101216] px-4 py-16 text-center text-white sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E31E36]/40 bg-[#242830] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff6073]">
          <ShoppingBag className="h-4 w-4" /> Ready-Made Website Templates
        </span>
        <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
          Start with a ready website. Customize it for your business.
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
          Explore available portfolio websites as starting templates. Choose a plan and tell us what you want changed;
          we will review the scope and send a final quote before any booking.
        </p>
      </section>

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-[#F4F5F7] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-[#E31E36]" />
            <div>
              <h2 className="font-extrabold">Published starting plans</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Basic website prices are PKR 35,000 without a client panel and PKR 45,000 with a client admin panel.
                E-commerce and SaaS projects use their separate published plans. Custom features and one-time
                add-ons follow the rates in{" "}
                <Link href="/pricing" className="font-bold text-[#E31E36] hover:underline">Pricing &amp; Rates</Link>
                {" "} Add-on prices vary by feature complexity and selected e-commerce or SaaS plan; e-commerce add-ons start at PKR 20,000. These starting prices are not a final quote.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATE_PLANS.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-extrabold">{plan.name}</h3>
                <p className="mt-2 text-lg font-black text-[#E31E36]">{formatPKR(plan.price)}+</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{plan.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-gray-500">
            Domain registration, hosting subscriptions, and third-party accounts are not included unless agreed separately.
          </p>
        </div>

        <div>
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E31E36]">Available templates</span>
              <h2 className="mt-1 text-2xl font-black">Choose a website to customize</h2>
            </div>
            <Link href="/portfolio" className="text-xs font-bold text-[#E31E36] hover:underline">
              View full portfolio <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <p role="status" className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading available templates…</p>
          ) : loadError ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadError}</p>
          ) : templates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No templates are currently available. Contact us to discuss a custom project.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <article key={template.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative h-52 bg-gray-900">
                    <Image
                      src={template.imageUrl}
                      alt={template.title}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold text-white">
                      {template.category}
                    </span>
                    {template.availabilityStatus === "Offline" && (
                      <span className="absolute right-3 top-3 rounded-full bg-red-700 px-3 py-1 text-[10px] font-bold text-white">
                        Preview offline
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <h3 className="text-lg font-extrabold">{template.title}</h3>
                    <p className="text-xs leading-relaxed text-gray-600">{template.shortDescription}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {template.technologies.map((feature) => (
                        <span key={feature} className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setSelectedPlanId("template_starting");
                        setSelectedAddonIds(
                          (template.templateIncludedAddonIds || [])
                            .filter((id) => addons.some((addon) => addon.id === id))
                        );
                        document.getElementById("template-request")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#101216] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#252a33]"
                    >
                      Request this template <ArrowRight className="h-4 w-4" />
                    </button>
                    {template.demoUrl && (
                      <a
                        href={template.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#E31E36]"
                      >
                        {template.availabilityStatus === "Offline" ? "Try preview (may be unavailable)" : "Open live preview"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <section id="template-request" className="grid scroll-mt-24 gap-8 rounded-3xl bg-[#101216] p-6 text-white sm:p-9 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#ff6073]">Order or customize</span>
            <h2 className="mt-2 text-2xl font-black">Request a template quote</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              Send your preferred template, plan, and requested changes. This sends an inquiry only—not an instant
              purchase, reservation, or payment.
            </p>
            <ol className="mt-6 space-y-4 text-xs text-gray-300">
              <li className="flex gap-3"><span className="font-black text-[#ff6073]">1.</span> We confirm requirements, features, and final scope with you.</li>
              <li className="flex gap-3"><span className="font-black text-[#ff6073]">2.</span> We share the final quotation and payment details for your approval.</li>
              <li className="flex gap-3"><span className="font-black text-[#ff6073]">3.</span> After scope finalization and payment receipt, the work is booked; we calculate and confirm the delivery period/date.</li>
            </ol>
            <p className="mt-6 flex gap-2 rounded-xl border border-gray-700 bg-[#181B20] p-3 text-[11px] leading-relaxed text-gray-400">
              <Clock3 className="h-4 w-4 shrink-0 text-[#ff6073]" />
              Add-ons, e-commerce, SaaS functionality, custom domain, and other changes can change the price and timeline.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 text-[#101216] sm:p-7">
            <div>
              <label htmlFor="template-choice" className="mb-1 block text-xs font-bold">Choose template</label>
              <select
                id="template-choice"
                value={selectedTemplateId}
                onChange={(event) => {
                  const nextTemplate = templates.find((template) => template.id === event.target.value);
                  setSelectedTemplateId(nextTemplate?.id || "");
                  setSelectedPlanId("template_starting");
                  setSelectedAddonIds(
                    (nextTemplate?.templateIncludedAddonIds || [])
                      .filter((id) => addons.some((addon) => addon.id === id))
                  );
                }}
                required
                disabled={templates.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                {templates.length === 0 && <option value="">No templates available</option>}
                {templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="template-plan" className="mb-1 block text-xs font-bold">Starting plan</label>
              <select
                id="template-plan"
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value as typeof selectedPlanId)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                {templatePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name} — {formatPKR(plan.price)}+</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Plans below this template&apos;s {formatPKR(templatePlans[0]?.price || 0)} starting price are hidden. Selected plan starts at {formatPKR(selectedPlan.price)}; final amount depends on confirmed features and add-ons.
              </p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold">Optional add-ons — check what you need</legend>
              <p className="text-[11px] leading-relaxed text-gray-500">
                Prices use the published Pricing &amp; Rates list. Add-ons included with your selected plan are shown as included and are not counted twice.
              </p>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-gray-200 p-3">
                {Object.entries(groupedAddons).map(([category, categoryAddons]) => (
                  <details key={category} open className="rounded-lg border border-gray-100 bg-gray-50">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-extrabold">
                      {category} <span className="font-medium text-gray-500">({categoryAddons.length})</span>
                    </summary>
                    <div className="divide-y divide-gray-200 border-t border-gray-200">
                      {categoryAddons.map((addon) => {
                        const isSelected = selectedAddonIds.includes(addon.id);
                        const isIncluded = isSelected && !chargeableAddonIds.includes(addon.id);
                        return (
                          <label key={addon.id} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-white">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) => {
                                setSelectedAddonIds((current) => event.target.checked
                                  ? [...current, addon.id]
                                  : current.filter((id) => id !== addon.id));
                              }}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#E31E36]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <span className="text-xs font-bold">{addon.label}</span>
                                <strong className="whitespace-nowrap text-xs text-[#E31E36]">
                                  {isIncluded ? "Included" : `${formatPKR(priceForAddon(addon))}${addon.billingPeriod === "monthly" ? " / month" : ""}`}
                                </strong>
                              </span>
                              <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-500">{addon.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
              <div className="rounded-xl border border-[#E31E36]/20 bg-[#FFF6F7] p-3 text-xs">
                <div className="flex justify-between gap-3"><span>Selected plan starting price</span><strong>{formatPKR(selectedPlan.price)}</strong></div>
                <div className="mt-1 flex justify-between gap-3"><span>Selected one-time add-ons</span><strong>{formatPKR(oneTimeAddonTotal)}</strong></div>
                <div className="mt-2 flex justify-between gap-3 border-t border-[#E31E36]/20 pt-2 font-extrabold">
                  <span>Preliminary starting total</span><strong className="text-[#E31E36]">{formatPKR(estimatedInitialTotal)}</strong>
                </div>
                {monthlyAddonTotal > 0 && (
                  <div className="mt-1 flex justify-between gap-3 text-gray-600"><span>Recurring add-ons</span><strong>{formatPKR(monthlyAddonTotal)} / month</strong></div>
                )}
                <p className="mt-2 text-[10px] leading-relaxed text-gray-500">Estimate only; final price is confirmed after requirements and scope review.</p>
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="template-name" className="mb-1 block text-xs font-bold">Your name</label>
                <input id="template-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="template-email" className="mb-1 block text-xs font-bold">Email</label>
                <input id="template-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="template-phone" className="mb-1 block text-xs font-bold">WhatsApp / phone (optional)</label>
              <input id="template-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="template-customization" className="mb-1 block text-xs font-bold">What would you like customized?</label>
              <textarea
                id="template-customization"
                value={customization}
                onChange={(event) => setCustomization(event.target.value)}
                rows={4}
                maxLength={3000}
                placeholder="Describe extra pages, admin features, e-commerce, SaaS, add-ons, or other changes."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
            {successMessage && (
              <p role="status" className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMessage}
              </p>
            )}
            {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">{errorMessage}</p>}
            <button
              type="submit"
              disabled={submitting || templates.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E31E36] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#C8162D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {submitting ? "Sending request…" : "Send template request"}
            </button>
            <p className="flex gap-1.5 text-[10px] leading-relaxed text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> We will use your contact details only to respond to this request.
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
