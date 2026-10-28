"use client";

import { useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { ADDON_CATEGORY_LABELS } from "@/lib/constants";
import { BUSINESS_CATEGORIES, getBusinessAddonCatalog } from "@/lib/business-addon-catalog";
import type { AddonOption, PricingRuleConfig } from "@/lib/types";

const LEVELS = ["basic", "expanded", "complex"] as const;
const currency = (amount: number) =>
  `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount)}`;

function createSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export default function AdminAddonsPage() {
  const [config, setConfig] = useState<PricingRuleConfig | null>(null);
  const [draft, setDraft] = useState<AddonOption | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadConfig() {
    try {
      const response = await fetch("/api/admin/pricing", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to load catalog.");
      setConfig(result.config as PricingRuleConfig);
    } catch (loadError) {
      console.error("Could not load add-on administration catalog", loadError);
      setError("Could not load add-on data. Please reload and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfig(); }, []);

  const addons = useMemo(() => config ? Object.values(config.addons) : [], [config]);
  const filteredAddons = useMemo(() => {
    const text = search.trim().toLowerCase();
    return addons.filter((addon) => {
      const matchesText = !text || `${addon.id} ${addon.label} ${addon.description}`.toLowerCase().includes(text);
      const matchesCategory = categoryFilter === "all" ||
        addon.businessCategories?.includes(categoryFilter) || addon.category === categoryFilter;
      const matchesLevel = levelFilter === "all" || addon.pricingLevel === levelFilter;
      const status = addon.status || (addon.enabled ? "active" : "inactive");
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesText && matchesCategory && matchesLevel && matchesStatus;
    }).sort((a, b) => sortBy === "price-low" ? a.price - b.price
      : sortBy === "price-high" ? b.price - a.price
      : a.label.localeCompare(b.label));
  }, [addons, categoryFilter, levelFilter, search, sortBy, statusFilter]);

  const categoryCounts = useMemo(() => {
    if (!config) return [];
    const businessEntries = getBusinessAddonCatalog(config.addons, true);
    return BUSINESS_CATEGORIES.map((category) => ({
      ...category,
      count: businessEntries.filter((entry) => entry.categoryId === category.id).length,
      levels: Object.fromEntries(LEVELS.map((level) => [
        level,
        businessEntries.filter((entry) => entry.categoryId === category.id && entry.level === level).length,
      ])) as Record<(typeof LEVELS)[number], number>,
    }));
  }, [config]);

  function startCreate() {
    const category = BUSINESS_CATEGORIES[0];
    setEditingId(null);
    setDraft({
      id: "",
      label: "",
      category: "businesscatalog",
      price: 10000,
      description: "",
      enabled: true,
      businessCategories: [category.id],
      businessTypes: category.businessTypes.map((type) => type.id),
      pricingLevel: "basic",
      origin: "new",
      status: "active",
      relatedAddOnIds: [],
    });
    setError("");
    setNotice("");
  }

  function startEdit(addon: AddonOption) {
    setEditingId(addon.id);
    setDraft({ ...addon });
    setError("");
    setNotice("");
  }

  async function persist(nextConfig: PricingRuleConfig, message: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return false;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save add-on.");
      setConfig(result.config as PricingRuleConfig);
      setNotice(message);
      return true;
    } catch (saveError) {
      console.error("Could not save add-on catalog", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save add-on changes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config || !draft) return;
    const id = editingId || draft.id.trim() || createSlug(draft.label);
    if (!id) {
      setError("Provide a name so a stable add-on key can be created.");
      return;
    }
    if (!draft.label.trim() || !draft.description.trim() || !Number.isFinite(draft.price) || draft.price < 0) {
      setError("Name, description, and a valid non-negative PKR amount are required.");
      return;
    }
    if (!draft.businessCategories?.length && draft.category === "businesscatalog") {
      setError("Select at least one business category.");
      return;
    }
    if (editingId && draft.id !== editingId) {
      setError("Changing an add-on key is not allowed. Create a new record instead.");
      return;
    }
    if (!editingId && config.addons[id]) {
      setError(`The stable key "${id}" is already assigned to another add-on.`);
      return;
    }
    const duplicate = Object.values(config.addons).find((addon) =>
      (!editingId || addon.id !== editingId) &&
      addon.label.trim().toLowerCase() === draft.label.trim().toLowerCase()
    );
    if (duplicate) {
      setError(`Possible duplicate: “${duplicate.label}” already exists (${duplicate.id}). Reuse or relate it instead.`);
      return;
    }
    const updatedDraft: AddonOption = {
      ...draft,
      id,
      label: draft.label.trim(),
      description: draft.description.trim(),
      price: Math.round(draft.price),
      enabled: draft.status === "active",
      status: draft.status || "active",
    };
    const nextConfig = {
      ...config,
      addons: { ...config.addons, [id]: updatedDraft },
    };
    if (await persist(nextConfig, "Add-on saved.")) {
      setDraft(null);
      setEditingId(null);
    }
  }

  async function updateStatus(addon: AddonOption, status: "active" | "inactive" | "archived") {
    if (!config) return;
    const nextConfig = {
      ...config,
      addons: {
        ...config.addons,
        [addon.id]: { ...addon, status, enabled: status === "active" },
      },
    };
    await persist(nextConfig, `Add-on ${status === "archived" ? "archived" : status === "active" ? "activated" : "deactivated"}.`);
  }

  function toggleListValue(field: "businessCategories" | "businessTypes" | "relatedAddOnIds", value: string) {
    if (!draft) return;
    const current = draft[field] || [];
    const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
    setDraft({ ...draft, [field]: next });
  }

  const potentialNameDuplicates = draft && config
    ? Object.values(config.addons).filter((addon) =>
        addon.id !== draft.id && draft.label.trim().length > 2 &&
        addon.label.toLowerCase().includes(draft.label.trim().toLowerCase())
      )
    : [];
  const relevantTypes = BUSINESS_CATEGORIES
    .filter((category) => draft?.businessCategories?.includes(category.id))
    .flatMap((category) => category.businessTypes);

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      <AdminSidebar />
      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        <AdminHeader title="Business Add-on Catalog" subtitle="Manage catalog records, categories, levels, pricing, and publication status" />
        <div className="flex-1 space-y-5 p-5 sm:p-7">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-bold text-gray-500">Catalog records</p>
              <p className="mt-1 text-2xl font-black">{addons.length}</p>
            </div>
            {categoryCounts.slice(0, 4).map((category) => (
              <div key={category.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="truncate text-xs font-bold text-gray-500">{category.label}</p>
                <p className="mt-1 text-xl font-black">{category.count} <span className="text-xs font-medium text-gray-500">features</span></p>
                <p className="mt-1 text-[10px] text-gray-500">
                  Basic {category.levels.basic} · Expanded {category.levels.expanded} · Complex {category.levels.complex}
                </p>
              </div>
            ))}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, description, or key" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="all">All categories</option>
                  {BUSINESS_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  {Object.entries(ADDON_CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="all">All levels</option>
                  {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option><option value="all">All statuses</option>
                </select>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort add-ons" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="name">Name A-Z</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option>
                </select>
                <button type="button" onClick={startCreate} className="shrink-0 rounded-lg bg-[#E31E36] px-4 py-2 text-xs font-bold text-white hover:bg-[#C8162D]">Create add-on</button>
              </div>

              {loading ? <p className="py-12 text-center text-sm text-gray-500">Loading catalog...</p> : filteredAddons.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No add-ons match these filters.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAddons.map((addon) => (
                    <article key={addon.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-sm">{addon.label}</h2>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{addon.origin || "existing"}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${addon.status === "archived" ? "bg-gray-200 text-gray-600" : addon.enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{addon.status || (addon.enabled ? "active" : "inactive")}</span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-gray-500">{addon.id} · {addon.description}</p>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {addon.businessCategories?.map((id) => BUSINESS_CATEGORIES.find((category) => category.id === id)?.label || id).join(", ") || ADDON_CATEGORY_LABELS[addon.category]}
                          {addon.pricingLevel ? ` · ${addon.pricingLevel}` : ""}
                          {addon.businessTypes?.length ? ` · ${addon.businessTypes.length} business types` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <strong className="mr-2 text-xs">{currency(addon.price)}</strong>
                        <button type="button" onClick={() => startEdit(addon)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50">Edit</button>
                        {addon.status === "archived" ? (
                          <button type="button" onClick={() => updateStatus(addon, "active")} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50">Restore</button>
                        ) : (
                          <>
                            <button type="button" onClick={() => updateStatus(addon, addon.enabled ? "inactive" : "active")} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50">{addon.enabled ? "Deactivate" : "Activate"}</button>
                            <button type="button" onClick={() => updateStatus(addon, "archived")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Archive</button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-black">{draft ? (editingId ? "Edit add-on" : "Create add-on") : "Catalog preview"}</h2>
              {draft ? (
                <form onSubmit={saveDraft} className="mt-4 space-y-4">
                  <label className="block text-xs font-bold">Name
                    <input value={draft.label} onChange={(event) => {
                      const label = event.target.value;
                      setDraft({ ...draft, label, ...(draft.id ? {} : { id: createSlug(label) }) });
                    }} required maxLength={100} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </label>
                  {potentialNameDuplicates.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                      Possible overlapping records: {potentialNameDuplicates.slice(0, 4).map((item) => `${item.label} (${item.id})`).join("; ")}. Confirm this is distinct or use the related-feature field.
                    </div>
                  )}
                  <label className="block text-xs font-bold">Stable key
                    <input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value.trim() })} disabled={Boolean(editingId)} required className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs disabled:text-gray-500" />
                  </label>
                  <label className="block text-xs font-bold">Description and included scope
                    <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required rows={3} maxLength={1000} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs leading-5" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold">Price (PKR)
                      <input type="number" min="0" step="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs font-bold">Pricing level
                      <select value={draft.pricingLevel || "basic"} onChange={(event) => setDraft({ ...draft, pricingLevel: event.target.value as AddonOption["pricingLevel"] })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-bold">Pricing catalog</p>
                    <p className="mt-1 text-xs text-gray-600">{ADDON_CATEGORY_LABELS[draft.category]}</p>
                    <p className="mt-1 text-[10px] text-gray-500">Existing catalog grouping is preserved; use business categories below to control customer discovery.</p>
                  </div>
                  <fieldset>
                    <legend className="text-xs font-bold">Business categories</legend>
                    <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                      {BUSINESS_CATEGORIES.map((category) => (
                        <label key={category.id} className="flex items-center gap-2 py-1 text-[11px]">
                          <input type="checkbox" checked={draft.businessCategories?.includes(category.id) || false} onChange={() => toggleListValue("businessCategories", category.id)} />
                          {category.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {relevantTypes.length > 0 && (
                    <fieldset>
                      <legend className="text-xs font-bold">Applicable business types</legend>
                      <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                        {relevantTypes.map((type) => (
                          <label key={type.id} className="flex items-center gap-2 py-1 text-[11px]">
                            <input type="checkbox" checked={draft.businessTypes?.includes(type.id) || false} onChange={() => toggleListValue("businessTypes", type.id)} />
                            {type.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <label className="block text-xs font-bold">Related / overlapping add-ons
                    <select multiple value={draft.relatedAddOnIds || []} onChange={(event) => setDraft({ ...draft, relatedAddOnIds: Array.from(event.target.selectedOptions, (option) => option.value) })} className="mt-1 h-24 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs">
                      {addons.filter((addon) => addon.id !== draft.id).map((addon) => <option key={addon.id} value={addon.id}>{addon.label} ({addon.id})</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold">Origin
                      <select value={draft.origin || "new"} onChange={(event) => setDraft({ ...draft, origin: event.target.value as AddonOption["origin"] })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs">
                        <option value="existing">Existing</option><option value="new">New</option>
                      </select>
                    </label>
                    <label className="block text-xs font-bold">Status
                      <select value={draft.status || (draft.enabled ? "active" : "inactive")} onChange={(event) => setDraft({ ...draft, status: event.target.value as AddonOption["status"] })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs">
                        <option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input type="checkbox" checked={draft.requiresCustomQuote || false} onChange={(event) => setDraft({ ...draft, requiresCustomQuote: event.target.checked })} />
                    Mark as requiring custom quotation
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-[#F4F5F7] p-3">
                    <p className="text-[10px] font-extrabold uppercase text-gray-500">Customer preview</p>
                    <p className="mt-1 text-sm font-bold">{draft.label || "Add-on name"}</p>
                    <p className="mt-1 text-xs text-gray-600">{draft.description || "Feature scope will appear here."}</p>
                    <p className="mt-2 text-sm font-black text-[#E31E36]">{currency(draft.price)} · {draft.pricingLevel || "basic"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={saving} className="flex-1 rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save add-on"}</button>
                    <button type="button" onClick={() => { setDraft(null); setEditingId(null); }} className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-5 text-gray-600">Select a record to edit or create a new add-on. Customer-facing selections use stable IDs and numeric PKR prices.</p>
                  {categoryCounts.map((category) => (
                    <div key={category.id} className="border-t border-gray-100 pt-2">
                      <p className="text-xs font-bold">{category.label} <span className="text-gray-500">({category.count})</span></p>
                      <p className="text-[10px] text-gray-500">Basic {category.levels.basic} · Expanded {category.levels.expanded} · Complex {category.levels.complex}</p>
                    </div>
                  ))}
                  <button type="button" onClick={startCreate} className="w-full rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-bold text-white">Create add-on</button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
