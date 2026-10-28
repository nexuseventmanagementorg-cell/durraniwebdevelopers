"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Search, ShoppingBag } from "lucide-react";

type Level = "basic" | "expanded" | "complex" | "shared";
type CatalogItem = {
  id: string;
  label: string;
  description: string;
  price: number;
  level: Level;
  categoryId: string;
  categoryLabel: string;
  businessTypes: string[];
  origin: "existing" | "new";
  requiresCustomQuote: boolean;
  relatedAddOnIds: string[];
};
type BusinessCategory = {
  id: string;
  label: string;
  businessTypes: { id: string; label: string }[];
};
type SharedAddon = {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  description: string;
  price: number;
  billingPeriod: "one_time" | "monthly";
};

const LEVELS: { id: "all" | Level; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "basic", label: "Basic" },
  { id: "expanded", label: "Expanded" },
  { id: "complex", label: "Complex" },
];

const formatPkr = (amount: number) =>
  `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount)}`;

export default function AddOnsPage() {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [sharedAddons, setSharedAddons] = useState<SharedAddon[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState("all");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [query, setQuery] = useState("");
  const [showShared, setShowShared] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const response = await fetch("/api/public/addons", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load the add-on catalog.");
        }
        if (!active) return;
        const availableCategories = result.businessCategories as BusinessCategory[];
        setCategories(availableCategories);
        setCategoryId(availableCategories[0]?.id || "");
        setCatalog(result.businessCatalog as CatalogItem[]);
        const sharedCategories = new Set([
          "auth", "database", "payment", "admin", "ai", "custom", "feature",
          "website", "business", "creative", "automation", "security",
        ]);
        setSharedAddons((result.addons as SharedAddon[]).filter((addon) =>
          sharedCategories.has(addon.category) && addon.id !== "custom_advanced_feature"
        ));
      } catch (loadError) {
        console.error("Could not load add-on catalog", loadError);
        if (active) setError("The add-on catalog could not be loaded. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const displayedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const items = showShared
      ? sharedAddons.map((addon) => ({
          ...addon,
          level: "shared" as const,
          categoryId: "shared",
          businessTypes: [] as string[],
          origin: "existing" as const,
          requiresCustomQuote: false,
          relatedAddOnIds: [] as string[],
        }))
      : catalog.filter((addon) =>
          addon.categoryId === categoryId &&
          (businessTypeId === "all" || addon.businessTypes.includes(businessTypeId))
        );
    const filtered = items.filter((addon) =>
      (showShared || level === "all" || addon.level === level) &&
      (!normalizedQuery ||
        addon.label.toLowerCase().includes(normalizedQuery) ||
        addon.description.toLowerCase().includes(normalizedQuery))
    );
    return Array.from(new Map(filtered.map((item) => [item.id, item])).values());
  }, [businessTypeId, catalog, categoryId, level, query, sharedAddons, showShared]);

  const selectedAddons = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; price: number; requiresCustomQuote: boolean; billingPeriod: "one_time" | "monthly" }>();
    for (const addon of [...catalog, ...sharedAddons.map((item) => ({
      ...item,
      requiresCustomQuote: false,
    }))]) {
      if (selectedIds.includes(addon.id) && !byId.has(addon.id)) {
        byId.set(addon.id, {
          id: addon.id,
          label: addon.label,
          price: addon.price,
          requiresCustomQuote: "requiresCustomQuote" in addon && addon.requiresCustomQuote,
          billingPeriod: "billingPeriod" in addon ? addon.billingPeriod : "one_time",
        });
      }
    }
    return Array.from(byId.values());
  }, [catalog, selectedIds, sharedAddons]);
  const total = selectedAddons.filter((addon) => addon.billingPeriod !== "monthly").reduce((sum, addon) => sum + addon.price, 0);
  const monthlyTotal = selectedAddons.filter((addon) => addon.billingPeriod === "monthly").reduce((sum, addon) => sum + addon.price, 0);
  const needsQuote = selectedAddons.some((addon) => addon.requiresCustomQuote);
  const calculatorHref = selectedAddons.length
    ? `/calculator?addons=${encodeURIComponent(selectedAddons.map((addon) => addon.id).join(","))}`
    : "/calculator";

  function toggleAddon(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] text-[#101216]">
      <section className="bg-[#101216] py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#E31E36]">Feature catalog</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Choose business add-ons</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            Browse features for your business type, compare scope and indicative PKR prices, then review your selections in the existing budget calculator. Nothing is selected automatically.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 pb-32 sm:px-6 lg:px-8">
        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-bold text-gray-700">
            Business category
            <select
              value={showShared ? "shared" : categoryId}
              onChange={(event) => {
                setShowShared(event.target.value === "shared");
                if (event.target.value !== "shared") {
                  setCategoryId(event.target.value);
                  setBusinessTypeId("all");
                }
              }}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#101216]"
            >
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              <option value="shared">Shared add-ons for any business</option>
            </select>
          </label>
          {!showShared ? (
            <label className="text-xs font-bold text-gray-700">
              Business type
              <select
                value={businessTypeId}
                onChange={(event) => setBusinessTypeId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#101216]"
              >
                <option value="all">All {selectedCategory?.label || "category"} types</option>
                {selectedCategory?.businessTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
          ) : (
            <p className="flex items-center text-xs leading-5 text-gray-500">
              Shared catalog features can be useful across multiple industries.
            </p>
          )}
          <label className="text-xs font-bold text-gray-700">
            Search features
            <span className="relative mt-2 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search add-ons"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-[#101216]"
              />
            </span>
          </label>
        </div>

        {!showShared && <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by pricing level">
          {LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLevel(item.id)}
              aria-pressed={level === item.id}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                level === item.id
                  ? "border-[#E31E36] bg-[#E31E36] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-500">
            {loading ? "Loading features..." : `${displayedItems.length} feature${displayedItems.length === 1 ? "" : "s"}`}
          </span>
        </div>}

        {!loading && !error && displayedItems.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-bold">No matching add-ons</h2>
            <p className="mt-1 text-sm text-gray-500">Try another level, business type, or search term.</p>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedItems.map((addon) => {
            const selected = selectedIds.includes(addon.id);
            return (
              <article key={addon.id} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${selected ? "border-[#E31E36] ring-1 ring-[#E31E36]" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E31E36]">
                      {"categoryLabel" in addon ? addon.categoryLabel : "Shared add-on"}
                      {"level" in addon && addon.level !== "shared" ? ` · ${addon.level}` : ""}
                    </span>
                    <h2 className="mt-2 font-extrabold leading-5">{addon.label}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${addon.origin === "existing" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {addon.origin === "existing" ? "Existing" : "New"}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-xs leading-5 text-gray-600">{addon.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div>
                    <strong className="block text-sm font-black text-[#101216]">{formatPkr(addon.price)}</strong>
                    <span className="text-[10px] text-gray-500">
                      {"billingPeriod" in addon && addon.billingPeriod === "monthly" ? "per month" : "one-time estimate"}
                      {addon.requiresCustomQuote ? " · scope confirmation required" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                      selected ? "bg-[#101216] text-white" : "bg-red-50 text-[#C8162D] hover:bg-red-100"
                    }`}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    {selected ? "Selected" : "Add"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_rgba(16,18,22,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold text-gray-500">
              {selectedAddons.length} selected feature{selectedAddons.length === 1 ? "" : "s"}
              {needsQuote ? " · custom scope quotation required" : ""}
            </p>
            <p className="mt-0.5 text-lg font-black text-[#101216]">
              Estimate: <span className="text-[#E31E36]">{formatPkr(total)}</span>
              {monthlyTotal > 0 && <span className="ml-2 text-sm text-gray-600">+ {formatPkr(monthlyTotal)}/month</span>}
            </p>
          </div>
          <Link
            href={calculatorHref}
            aria-disabled={!selectedAddons.length}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold ${
              selectedAddons.length ? "bg-[#E31E36] text-white hover:bg-[#C8162D]" : "pointer-events-none bg-gray-200 text-gray-500"
            }`}
          >
            Review in budget calculator <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </main>
  );
}
