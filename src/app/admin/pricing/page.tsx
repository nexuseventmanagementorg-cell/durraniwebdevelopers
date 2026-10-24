"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { PricingRuleConfig } from "@/lib/types";
import {
  formatPKR,
  DEFAULT_PRICING_CONFIG,
  FEATURE_ADDON_PRICE_PKR,
} from "@/lib/constants";
import {
  Sliders,
  Save,
  CheckCircle2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Layers,
} from "lucide-react";

export default function AdminPricingPage() {
  const [config, setConfig] = useState<PricingRuleConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Pricing rules successfully updated and live on calculator!");
        setConfig(data.config);
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAddonPrice = (id: string, newPrice: number) => {
    setConfig((prev) => ({
      ...prev,
      addons: {
        ...prev.addons,
        [id]: {
          ...prev.addons[id],
          price: newPrice,
        },
      },
    }));
  };

  const handleToggleAddonEnabled = (id: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      addons: {
        ...prev.addons,
        [id]: {
          ...prev.addons[id],
          enabled,
        },
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Pricing Rules & Calculator Engine"
          subtitle="Adjust base packages, payment terms, and feature-specific add-on rates"
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-500">Loading pricing configuration...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Base Packages Settings */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-black text-[#101216]">
                      Core Starting Package Rates (PKR)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Standard base prices used by the budget calculator and pricing page.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#E31E36] bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    Active Live Config
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Package 1: Without Client Admin (PKR)
                    </label>
                    <input
                      type="number"
                      value={config.baseWithoutAdmin}
                      onChange={(e) =>
                        setConfig({ ...config, baseWithoutAdmin: Number(e.target.value) })
                      }
                      className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                      required
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Default: 35,000</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Package 2: With Client Admin Support (PKR)
                    </label>
                    <input
                      type="number"
                      value={config.baseWithAdmin}
                      onChange={(e) =>
                        setConfig({ ...config, baseWithAdmin: Number(e.target.value) })
                      }
                      className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#E31E36]"
                      required
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Default: 45,000 (Min for admin)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Default Initial Advance (PKR)
                    </label>
                    <input
                      type="number"
                      value={config.advanceDefault}
                      onChange={(e) =>
                        setConfig({ ...config, advanceDefault: Number(e.target.value) })
                      }
                      className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                      required
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Default: 10,000</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Number of Monthly Installments
                    </label>
                    <input
                      type="number"
                      value={config.installmentsCount}
                      onChange={(e) =>
                        setConfig({ ...config, installmentsCount: Number(e.target.value) })
                      }
                      className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                      required
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Default: 11 installments</span>
                  </div>
                </div>
              </div>

              {/* Add-on Feature Pricing Matrix */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="text-base font-black text-[#101216]">
                    Modular Add-on Feature Pricing (Step 6 Additions)
                  </h3>
                  <p className="text-xs text-gray-500">
                    E-commerce add-ons start at PKR 20,000 and SaaS modules use higher feature rates. E-commerce plans apply ×1.0 / ×1.25 / ×1.5; SaaS plans apply ×1.0 / ×1.2 / ×1.4 from Starter to Enterprise. Other one-time add-ons remain PKR 10,000; monthly maintenance retains its recurring rate.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.values(config.addons).map((addon) => (
                    <div
                      key={addon.id}
                      className="bg-[#F4F5F7] p-4 rounded-2xl border border-gray-200 space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400">
                          {addon.category}
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                          <input
                            type="checkbox"
                            checked={addon.enabled}
                            onChange={(e) => handleToggleAddonEnabled(addon.id, e.target.checked)}
                            className="accent-[#E31E36]"
                          />
                          <span>{addon.enabled ? "Enabled" : "Disabled"}</span>
                        </label>
                      </div>

                      <strong className="text-[#101216] font-extrabold block">
                        {addon.label}
                      </strong>

                      <div>
                        {addon.billingPeriod === "monthly" ? (
                          <>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              Monthly Add-on Price (PKR)
                            </label>
                            <input
                              type="number"
                              value={addon.price}
                              onChange={(e) =>
                                handleUpdateAddonPrice(addon.id, Number(e.target.value))
                              }
                              className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-bold text-[#E31E36]"
                              required
                            />
                          </>
                        ) : addon.category === "ecommerce" || addon.category === "saas" || addon.category === "propertytech" ? (
                          <>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              One-time Add-on Price (PKR)
                            </label>
                            <input
                              type="number"
                              min={addon.category === "ecommerce" || addon.category === "propertytech" ? 20000 : 50000}
                              value={addon.price}
                              onChange={(e) =>
                                handleUpdateAddonPrice(addon.id, Number(e.target.value))
                              }
                              className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-bold text-[#E31E36]"
                              required
                            />
                          </>
                        ) : (
                          <>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">
                              One-time Add-on Price
                            </label>
                            <p className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-bold text-[#E31E36]">
                              {formatPKR(FEATURE_ADDON_PRICE_PKR)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfig(DEFAULT_PRICING_CONFIG)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset to Recommended Defaults
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-7 py-3 rounded-xl text-xs font-bold shadow-glow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    "Saving Changes..."
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save & Apply Pricing Rules
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
