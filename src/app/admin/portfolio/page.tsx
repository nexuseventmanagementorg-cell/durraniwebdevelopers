"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { AddonOption, PortfolioProject } from "@/lib/types";
import { DEFAULT_PRICING_CONFIG, formatPKR, getAddonPriceForPackage } from "@/lib/constants";
import { getPortfolioOffer } from "@/lib/portfolio-offers";
import { getPortfolioFeatureLabels, getTemplatePriceBreakdown } from "@/lib/template-pricing";
import {
  Image as ImageIcon,
  Search,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  CheckCircle2,
  ExternalLink,
  X,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const TEMPLATE_PACKAGE_OPTIONS: { id: NonNullable<PortfolioProject["templatePricingPackage"]>; label: string }[] = [
  { id: "ecommerce_starter", label: "E-Commerce Starter" },
  { id: "ecommerce_business", label: "E-Commerce Business" },
  { id: "ecommerce_advanced", label: "E-Commerce Advanced" },
  { id: "saas_starter", label: "SaaS Starter" },
  { id: "saas_business", label: "SaaS Business" },
  { id: "saas_enterprise", label: "SaaS Enterprise" },
];

const OFFER_TAG_PRESETS = ["50% OFF", "Limited-Time Offer", "Flash Sale", "3-Day Deal", "Special Offer"];

function toLocalDateTimeValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function AdminPortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioProject | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Restaurant web applications");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [techInput, setTechInput] = useState("Next.js, TypeScript, Tailwind CSS, Supabase");
  const [isPublic, setIsPublic] = useState(true);
  const [approvedBudget, setApprovedBudget] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("Starting Package with Admin Panel");
  const [clientConsent, setClientConsent] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<"Online" | "Offline">("Online");
  const [templateAvailable, setTemplateAvailable] = useState(true);
  const [templatePricingPackage, setTemplatePricingPackage] =
    useState<NonNullable<PortfolioProject["templatePricingPackage"]>>("ecommerce_business");
  const [templateStartingPrice, setTemplateStartingPrice] = useState("");
  const [templateIncludedAddonIds, setTemplateIncludedAddonIds] = useState<string[]>([]);
  const [templateIncludedAddonPrices, setTemplateIncludedAddonPrices] = useState<Record<string, string>>({});
  const [addonCatalog, setAddonCatalog] = useState<AddonOption[]>(
    Object.values(DEFAULT_PRICING_CONFIG.addons)
  );
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerTag, setOfferTag] = useState("");
  const [offerDiscountPercent, setOfferDiscountPercent] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");
  const [projectStatus, setProjectStatus] = useState<PortfolioProject["status"]>("Live");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    "Restaurant web applications",
    "Restaurant order-taking applications",
    "E-commerce stores",
    "Jewellery stores",
    "Cosmetic and beauty stores",
    "Fashion stores",
    "Grocery stores",
    "SaaS applications",
    "Client management systems",
    "Booking and appointment systems",
    "Inventory and product management systems",
    "Custom business applications",
  ];

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/admin/portfolio");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio);
        setErrorMsg("");
      } else {
        setErrorMsg(data.error || "Could not load portfolio items.");
      }
    } catch (error) {
      console.error("Failed to load portfolio items", error);
      setErrorMsg("Could not load portfolio items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetch("/api/public/addons")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.addons)) {
          throw new Error(data.error || "Could not load add-on catalog.");
        }
        setAddonCatalog(data.addons);
      })
      .catch((error) => {
        console.error("Failed to load portfolio add-on catalog", error);
        setErrorMsg("Portfolio loaded, but current add-on prices could not be loaded.");
      });
  }, []);

  const openNewModal = () => {
    setSelectedItem(null);
    setTitle("");
    setCategory("Restaurant web applications");
    setShortDesc("");
    setFullDesc("");
    setImageUrl("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80");
    setDemoUrl("");
    setTechInput("Next.js, TypeScript, Tailwind CSS, Supabase");
    setIsPublic(true);
    setApprovedBudget("45000");
    setBudgetLabel("Starting Package with Admin Panel");
    setClientConsent(true);
    setAvailabilityStatus("Online");
    setTemplateAvailable(true);
    setTemplatePricingPackage("ecommerce_business");
    setTemplateStartingPrice("");
    setTemplateIncludedAddonIds([]);
    setTemplateIncludedAddonPrices({});
    setOfferEnabled(false);
    setOfferTag("");
    setOfferDiscountPercent("");
    setOfferEndsAt("");
    setProjectStatus("Live");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (item: PortfolioProject) => {
    setSelectedItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setShortDesc(item.shortDescription);
    setFullDesc(item.fullDescription || item.shortDescription);
    setImageUrl(item.imageUrl);
    setDemoUrl(item.demoUrl || "");
    setTechInput(item.technologies.join(", "));
    setIsPublic(item.isPublic);
    setApprovedBudget(item.approvedPublicBudget ? String(item.approvedPublicBudget) : "");
    setBudgetLabel(item.budgetLabel || "Starting Package");
    setClientConsent(Boolean(item.clientConsentForBudget));
    setAvailabilityStatus(item.availabilityStatus || "Online");
    setTemplateAvailable(item.templateAvailable !== false);
    setTemplatePricingPackage(item.templatePricingPackage || "ecommerce_business");
    setTemplateStartingPrice(item.templateStartingPrice ? String(item.templateStartingPrice) : "");
    setTemplateIncludedAddonIds(item.templateIncludedAddonIds || []);
    setTemplateIncludedAddonPrices(Object.fromEntries(
      Object.entries(item.templateIncludedAddonPrices || {}).map(([id, price]) => [id, String(price)])
    ));
    setOfferEnabled(
      Boolean(item.offerEnabled && item.offerEndsAt && Date.parse(item.offerEndsAt) > Date.now())
    );
    setOfferTag(item.offerTag || "");
    setOfferDiscountPercent(
      item.offerDiscountPercent ? String(item.offerDiscountPercent) : ""
    );
    setOfferEndsAt(toLocalDateTimeValue(item.offerEndsAt));
    setProjectStatus(item.status);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !shortDesc.trim()) {
      alert("Title and short description are required.");
      return;
    }
    setSaving(true);

    try {
      const payload = {
        id: selectedItem ? selectedItem.id : undefined,
        title,
        category,
        shortDescription: shortDesc,
        fullDescription: fullDesc,
        imageUrl,
        demoUrl,
        technologies: techInput.split(",").map((t) => t.trim()).filter(Boolean),
        isPublic,
        approvedPublicBudget: approvedBudget ? Number(approvedBudget) : null,
        budgetLabel,
        clientConsentForBudget: clientConsent,
        availabilityStatus,
        templateAvailable,
        templatePricingPackage,
        templateStartingPrice: templateStartingPrice ? Number(templateStartingPrice) : null,
        templateIncludedAddonIds,
        templateIncludedAddonPrices: Object.fromEntries(
          templateIncludedAddonIds.flatMap((id) => {
            const value = templateIncludedAddonPrices[id]?.trim();
            return value && Number.isFinite(Number(value)) && Number(value) >= 0
              ? [[id, Number(value)]]
              : [];
          })
        ),
        templateFeatureVersion: 1,
        offerEnabled,
        offerTag,
        offerDiscountPercent: offerDiscountPercent ? Number(offerDiscountPercent) : undefined,
        offerEndsAt: offerEndsAt ? new Date(offerEndsAt).toISOString() : undefined,
        status: projectStatus,
      };

      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Portfolio item successfully saved!");
        setModalOpen(false);
        fetchPortfolio();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Could not save this portfolio item.");
      }
    } catch (error) {
      console.error("Failed to save portfolio item", error);
      setErrorMsg("Could not save this portfolio item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (item: PortfolioProject) => {
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isPublic: !item.isPublic }),
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isPublic: !p.isPublic } : p))
        );
      } else {
        setErrorMsg(data.error || "Could not update portfolio visibility.");
      }
    } catch (error) {
      console.error("Failed to update portfolio visibility", error);
      setErrorMsg("Could not update portfolio visibility. Please try again.");
    }
  };

  const handleDelete = async (item: PortfolioProject) => {
    if (!window.confirm(`Permanently remove "${item.title}" from the portfolio and template marketplace?`)) return;
    setDeletingId(item.id);
    setErrorMsg("");
    try {
      const response = await fetch("/api/admin/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMsg(data.error || "Could not delete this portfolio item.");
        return;
      }
      setPortfolio((current) => current.filter((project) => project.id !== item.id));
      setSuccessMsg("Portfolio item removed.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Failed to delete portfolio item", error);
      setErrorMsg("Could not delete this portfolio item. Please try again.");
    } finally {
      setDeletingId("");
    }
  };

  const filteredPortfolio = portfolio.filter((p) => {
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Portfolio & Template Marketplace"
          subtitle="Add, edit, remove, price, promote, and manage public portfolio projects and templates"
          actionButton={
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Portfolio Project</span>
            </button>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search portfolio title, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Items: <strong>{portfolio.length}</strong>
            </span>
          </div>

          {/* Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolio.map((item) => {
              const featureLabels = getPortfolioFeatureLabels(item, addonCatalog);
              const templateBreakdown = item.templatePricingPackage
                ? getTemplatePriceBreakdown(item, addonCatalog)
                : undefined;
              return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-gray-900">
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-gray-700">
                      {item.category}
                    </div>
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow flex items-center gap-1 ${
                        item.isPublic
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-800 text-gray-300 border border-gray-600"
                      }`}
                    >
                      {item.isPublic ? (
                        <>
                          <Eye className="w-3 h-3" /> Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Private
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-extrabold text-sm text-[#101216]">{item.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.shortDescription}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {featureLabels.map((feature) => (
                        <span key={feature} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-[10px] font-semibold text-blue-700 underline underline-offset-2"
                      >
                        {item.demoUrl}
                      </a>
                    )}

                    <div className="pt-2 text-xs flex justify-between items-center text-gray-500">
                      <span>Public Budget:</span>
                      <strong className="text-[#E31E36]">
                        {item.approvedPublicBudget
                          ? formatPKR(item.approvedPublicBudget)
                          : "Hidden"}
                      </strong>
                    </div>
                    {templateBreakdown && (
                      <div className="pt-1 text-xs flex justify-between items-center text-gray-500">
                        <span>Comparable new-build estimate:</span>
                        <strong className="text-[#E31E36]">{formatPKR(templateBreakdown.total)}</strong>
                      </div>
                    )}
                    {item.offerEnabled && (
                      <div className="pt-1 text-xs flex justify-between items-center text-gray-500">
                        <span>{getPortfolioOffer(item) ? "Live offer:" : "Offer:"}</span>
                        <strong className="text-[#E31E36]">
                          {getPortfolioOffer(item)
                            ? `${item.offerTag} — ${formatPKR(getPortfolioOffer(item)?.offerPrice || 0)}`
                            : "Inactive / expired"}
                        </strong>
                      </div>
                    )}
                    <div className="pt-1 text-xs flex justify-between items-center text-gray-500">
                      <span>Website:</span>
                      <strong className={item.availabilityStatus === "Offline" ? "text-red-600" : "text-emerald-600"}>
                        {item.availabilityStatus || "Online"}
                      </strong>
                    </div>
                    <div className="pt-1 text-xs flex justify-between items-center text-gray-500">
                      <span>Template:</span>
                      <strong className={item.templateAvailable === false ? "text-gray-500" : "text-blue-600"}>
                        {item.templateAvailable === false ? "Sold / unavailable" : "Available"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  {item.demoUrl ? (
                    <a
                      href={item.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#E31E36] font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      Demo <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400 text-[11px]">No Demo URL</span>
                  )}

                  <button
                    onClick={() => openEditModal(item)}
                    className="bg-white hover:bg-gray-100 text-[#101216] px-3 py-1.5 rounded-lg border border-gray-300 font-bold transition inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label={`Remove ${item.title}`}
                    className="bg-white hover:bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 font-bold transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Portfolio Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {selectedItem ? "Edit Portfolio Item" : "New Portfolio Project"}
                </span>
                <h3 className="text-xl font-black text-[#101216]">
                  {selectedItem ? selectedItem.title : "Add New Showcase Project"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. GRILLVI - Restaurant Website"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216] font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Live Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://demo.vercel.app"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Image / Screenshot URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Website Availability</label>
                  <select
                    value={availabilityStatus}
                    onChange={(event) => setAvailabilityStatus(event.target.value as "Online" | "Offline")}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Project Status</label>
                  <select
                    value={projectStatus}
                    onChange={(event) => setProjectStatus(event.target.value as PortfolioProject["status"])}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  >
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Technologies (Comma-separated)
                </label>
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div>
                  <strong className="block text-sm font-extrabold text-gray-900">Template marketplace settings</strong>
                  <span className="text-[11px] text-gray-600">This project record drives public feature lists, template pricing, URL-estimator confirmations, and calculator handoff.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Template pricing plan</label>
                    <select
                      value={templatePricingPackage}
                      onChange={(event) => setTemplatePricingPackage(event.target.value as NonNullable<PortfolioProject["templatePricingPackage"]>)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#101216]"
                    >
                      {TEMPLATE_PACKAGE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-gray-700">Template starting price (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={templateStartingPrice}
                      onChange={(event) => setTemplateStartingPrice(event.target.value)}
                      placeholder="Use package price"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#101216]"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={templateAvailable}
                    onChange={(event) => setTemplateAvailable(event.target.checked)}
                    className="accent-[#E31E36]"
                  />
                  Publish as an available website template
                </label>
                <div className="space-y-2 border-t border-blue-200 pt-3">
                  <div>
                    <strong className="block text-xs font-bold text-gray-800">Included priced features</strong>
                    <span className="text-[10px] text-gray-600">
                      Select features that are confirmed in this working project. These become visible in portfolio/template details and are included by the URL estimator.
                    </span>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-blue-100 bg-white p-3">
                    {addonCatalog.filter((addon) => addon.enabled).map((addon) => {
                      const checked = templateIncludedAddonIds.includes(addon.id);
                      const catalogPrice = getAddonPriceForPackage(addon, templatePricingPackage);
                      const customPrice = templateIncludedAddonPrices[addon.id] || "";
                      return (
                        <div key={addon.id} className="grid grid-cols-[auto_1fr_6rem] items-center gap-2 text-[10px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setTemplateIncludedAddonIds((current) =>
                              event.target.checked
                                ? Array.from(new Set([...current, addon.id]))
                                : current.filter((id) => id !== addon.id)
                            )}
                            aria-label={`Include ${addon.label}`}
                            className="accent-[#E31E36]"
                          />
                          <span className="font-medium text-gray-700">
                            {addon.label}
                            <span className="ml-1 text-gray-400">
                              ({formatPKR(catalogPrice)}{addon.billingPeriod === "monthly" ? "/mo" : ""})
                            </span>
                          </span>
                          <input
                            type="number"
                            min="0"
                            disabled={!checked}
                            value={customPrice}
                            onChange={(event) => setTemplateIncludedAddonPrices((current) => ({
                              ...current,
                              [addon.id]: event.target.value,
                            }))}
                            aria-label={`Custom included price for ${addon.label}; blank uses current catalog price`}
                            placeholder="Catalog"
                            className="w-24 rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 border-t border-blue-200 pt-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={offerEnabled}
                      onChange={(event) => setOfferEnabled(event.target.checked)}
                      className="accent-[#E31E36]"
                    />
                    Activate a limited-time offer
                  </label>
                  {offerEnabled && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {OFFER_TAG_PRESETS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setOfferTag(tag)}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                              offerTag === tag
                                ? "border-[#E31E36] bg-[#E31E36] text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:border-[#E31E36]"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3 sm:col-span-1">
                          <label className="mb-1 block font-bold text-gray-700">Offer badge text</label>
                          <input
                            value={offerTag}
                            onChange={(event) => setOfferTag(event.target.value)}
                            placeholder="e.g. Half Price"
                            maxLength={40}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#101216]"
                            required={offerEnabled}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Discount %</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={offerDiscountPercent}
                            onChange={(event) => setOfferDiscountPercent(event.target.value)}
                            placeholder="50"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#101216]"
                            required={offerEnabled}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="mb-1 block font-bold text-gray-700">Offer ends (local time)</label>
                          <input
                            type="datetime-local"
                            value={offerEndsAt}
                            onChange={(event) => setOfferEndsAt(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-[#101216]"
                            required={offerEnabled}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Discount applies to the published portfolio price. The original build estimate and the template package breakdown remain unchanged.
                      </p>
                    </>
                  )}
                </div>
              </section>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  required
                />
              </div>

              {/* Privacy Controls */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="block text-gray-900 font-bold">Public Website Visibility</strong>
                    <span className="text-[11px] text-gray-500">
                      When enabled, this project appears on the public /portfolio page.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-[#E31E36] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Approved Public Budget (PKR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={approvedBudget}
                      onChange={(e) => setApprovedBudget(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-[#101216]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Budget Badge Label</label>
                    <input
                      type="text"
                      value={budgetLabel}
                      onChange={(e) => setBudgetLabel(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-[#101216]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={clientConsent}
                    onChange={(e) => setClientConsent(e.target.checked)}
                    className="accent-[#E31E36]"
                  />
                  <span>Client has given explicit consent for budget display in portfolio</span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Showcase Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
