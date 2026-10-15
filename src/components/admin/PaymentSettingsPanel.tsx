"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Save } from "lucide-react";
import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentSettings,
} from "@/lib/payment-types";

export default function PaymentSettingsPanel() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load payment settings.");
        if (active) setSettings({ ...DEFAULT_PAYMENT_SETTINGS, ...data.settings });
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load payment settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateText = (field: keyof PaymentSettings, value: string) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save payment settings.");
      setSettings({ ...DEFAULT_PAYMENT_SETTINGS, ...data.settings });
      setSuccess("Payment instructions saved. Pakistan customers can now view the enabled methods.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  const textFields: Array<{ key: keyof PaymentSettings; label: string; placeholder: string }> = [
    { key: "accountHolder", label: "Account holder / recipient name", placeholder: "Enter recipient name" },
    { key: "walletNumber", label: "JazzCash / Easypaisa number", placeholder: "Enter wallet number" },
    { key: "bankName", label: "Bank name", placeholder: "Enter bank name" },
    { key: "accountNumber", label: "Bank account number", placeholder: "Enter account number" },
    { key: "iban", label: "IBAN (optional)", placeholder: "Enter IBAN if customers need it" },
    { key: "branch", label: "Branch / location (optional)", placeholder: "Enter branch details" },
  ];

  return (
    <section className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-[#101216]">Customer Payment Instructions</h3>
          <p className="text-xs text-gray-500 mt-1">
            Editable transfer details for Pakistan customers. Never enter CNIC or other identity numbers here.
          </p>
        </div>
        <CreditCard className="w-5 h-5 text-[#E31E36] shrink-0" />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500 py-4">Loading payment settings...</p>
      ) : (
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {textFields.map(({ key, label, placeholder }) => (
              <label key={key} className="block text-xs font-bold text-gray-700">
                {label}
                <input
                  type="text"
                  maxLength={120}
                  value={settings[key] as string}
                  onChange={(event) => updateText(key, event.target.value)}
                  placeholder={placeholder}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-[#F4F5F7] px-3 py-2.5 font-medium text-[#101216]"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
            {([
              ["jazzcashEnabled", "Enable JazzCash (Pakistan only)"],
              ["easypaisaEnabled", "Enable Easypaisa (Pakistan only)"],
              ["bankTransferEnabled", "Enable bank transfer (PKR)"],
            ] as const).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2 font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))}
                  className="accent-[#E31E36]"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>Card checkout is not active yet. Safepay merchant approval and production credentials are required before a working card option can be offered.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E31E36] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#C8162D] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Payment Instructions"}
          </button>
        </form>
      )}
    </section>
  );
}
