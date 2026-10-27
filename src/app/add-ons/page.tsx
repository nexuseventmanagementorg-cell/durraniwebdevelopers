"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Search, ShoppingBag } from "lucide-react";

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
  businessCategories?: string[];
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
  businessCategories?: string[];
  businessTypes?: string[];
}

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

  return (
    <main className="min-h-screen bg-[#F4F5F7] text-[#101216]">
      <section className="bg-[#101216] py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#E31E36]">Feature catalog</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Business Add-on Specifications</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            Yeh page sirf features ki maloomat aur specifications ke liye hai. Yahan koi add-on select, order, ya purchase nahi hota. Har card mein feature ka kaam, kis business ke liye hai, aur andazati qeemat dekhein.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
            return (
              <article key={addon.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E31E36]">
                      {"categoryLabel" in addon ? addon.categoryLabel : "Shared add-on"}
                      {"level" in addon && addon.level !== "shared" ? ` · ${addon.level}` : ""}
                    </span>
                    <h2 className="mt-2 font-extrabold leading-5">{addon.label}</h2>
                  </div>
                </div>
                <div className="mt-4 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                  <h3 className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-gray-700">
                    <Info className="h-3.5 w-3.5 text-[#E31E36]" aria-hidden="true" />
                    Specification
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-700">{addon.description}</p>
                  <dl className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-[11px] leading-4">
                    <div>
                      <dt className="font-bold text-gray-700">Applicable business</dt>
                      <dd className="mt-0.5 text-gray-600">
                        {(() => {
                          const businessTypes = categories.flatMap((category) =>
                            category.businessTypes
                              .filter((type) => addon.businessTypes?.includes(type.id))
                              .map((type) => type.label)
                          );
                          if (businessTypes.length) return businessTypes.join(", ");
                          const businessCategories = (addon.businessCategories || [])
                            .map((id) => categories.find((category) => category.id === id)?.label || id);
                          if (businessCategories.length) return businessCategories.join(", ");
                          return showShared
                            ? "Shared feature; suitability depends on the project requirements."
                            : selectedCategory?.label || "Business-specific use confirmed during project discussion.";
                        })()}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-gray-700">Scope & pricing</dt>
                      <dd className="mt-0.5 text-gray-600">
                        {addon.requiresCustomQuote
                          ? "Complex scope: exact integrations, requirements, and final price are confirmed after project discussion."
                          : "Indicative starting price; exact screens, fields, and workflow are agreed for the project."}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">Indicative price</span>
                    <strong className="mt-1 block text-sm font-black text-[#101216]">{formatPkr(addon.price)}</strong>
                    <span className="mt-0.5 block text-[10px] text-gray-500">
                      {"billingPeriod" in addon && addon.billingPeriod === "monthly" ? "per month" : "one-time estimate"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
