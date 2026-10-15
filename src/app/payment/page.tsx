"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Landmark, Smartphone } from "lucide-react";
import type { ManualPaymentMethod } from "@/lib/payment-types";
import { CURRENCY_OPTIONS, currencyForCountry, type CurrencyCode } from "@/lib/currency";
import type { SafepayCurrency } from "@/lib/safepay";

interface PaymentOptions {
  country: string;
  options: {
    accountHolder: string;
    walletNumber: string;
    bankName: string;
    accountNumber: string;
    iban: string;
    branch: string;
    methods: Record<ManualPaymentMethod, boolean>;
    cardCheckoutAvailable: boolean;
    cardCheckoutMessage: string;
    cardCurrencies: SafepayCurrency[];
  };
}

const methodLabels: ManualPaymentMethod[] = ["JazzCash", "Easypaisa", "Bank Transfer"];

export default function PaymentPage() {
  const [country, setCountry] = useState("PK");
  const [options, setOptions] = useState<PaymentOptions["options"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethod>("JazzCash");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardError, setCardError] = useState("");
  const [currency, setCurrency] = useState<SafepayCurrency>("PKR");
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    inquiryReference: "",
    amount: "",
    transactionReference: "",
  });

  useEffect(() => {
    const queryReference = new URLSearchParams(window.location.search).get("reference");
    if (queryReference) setForm((current) => ({ ...current, inquiryReference: queryReference }));
  }, []);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const refreshPaymentOptions = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch("/api/public/payment-options", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Payment options are not available.");
        if (active) {
          setCountry(data.country || "PK");
          setOptions(data.options);
          const regionalCurrency = currencyForCountry(data.country);
          setCurrency(data.options.cardCurrencies.find((code: SafepayCurrency) => code === regionalCurrency) || "USD");
          setSelectedMethod((currentMethod) =>
            data.options.methods[currentMethod]
              ? currentMethod
              : methodLabels.find((method) => data.options.methods[method]) || currentMethod
          );
          setSetupError("");
        }
      } catch (loadError) {
        if (active) setSetupError(loadError instanceof Error ? loadError.message : "Payment options are not available.");
      } finally {
        requestInFlight = false;
        if (active) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshPaymentOptions();
    };

    void refreshPaymentOptions();
    const refreshInterval = window.setInterval(refreshPaymentOptions, 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData(formElement);
      const response = await fetch("/api/public/payment-proofs", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Receipt submission failed.");
      setMessage(data.message);
      formElement.reset();
      setForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        inquiryReference: "",
        amount: "",
        transactionReference: "",
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Receipt submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startCardCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCardSubmitting(true);
    setCardError("");
    try {
      const response = await fetch("/api/public/safepay-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          inquiryReference: form.inquiryReference,
          amount: form.amount,
          currency,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Safepay checkout could not be started.");
      if (typeof data.checkoutUrl !== "string") {
        throw new Error("Safepay did not return a checkout link. Please try again.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (checkoutError) {
      setCardError(checkoutError instanceof Error ? checkoutError.message : "Safepay checkout could not be started.");
    } finally {
      setCardSubmitting(false);
    }
  };

  const manualPaymentsAvailable = country === "PK" && Boolean(options && methodLabels.some((method) => options.methods[method]));
  const cardCurrencies = CURRENCY_OPTIONS.filter((option) =>
    options?.cardCurrencies.some((cardCurrency: SafepayCurrency) => cardCurrency === option.code)
  );

  return (
    <div className="bg-[#F4F5F7] py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 space-y-7">
        <header className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E31E36]">Secure payment instructions</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-[#101216]">Payment & Receipt Submission</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Pakistan customers can use the enabled local transfer methods below. Submit a receipt after transferring; an admin will verify the transaction before it is recorded as paid.
          </p>
        </header>

        {setupError && (
          <div role="alert" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div><strong>Payment setup is not connected yet.</strong><p className="mt-1">{setupError}</p></div>
          </div>
        )}

        {country !== "PK" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
            Manual JazzCash, Easypaisa and bank-transfer receipts are Pakistan-only. Use Safepay card checkout when it is enabled for this website.
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black text-[#101216]"><Smartphone className="w-5 h-5 text-[#E31E36]" /> Pakistan transfer options</h2>
              {loading ? <p className="mt-4 text-xs text-gray-500">Loading payment instructions...</p> : !manualPaymentsAvailable ? (
                <p className="mt-4 text-xs leading-5 text-gray-600">No local transfer method is enabled yet. Please contact us before making a payment.</p>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {methodLabels.filter((method) => options?.methods[method]).map((method) => (
                      <button key={method} type="button" onClick={() => setSelectedMethod(method)} className={`rounded-lg px-3 py-2 text-xs font-bold border ${selectedMethod === method ? "border-[#E31E36] bg-red-50 text-[#B51128]" : "border-gray-200 bg-white text-gray-700"}`}>
                        {method}
                      </button>
                    ))}
                  </div>
                  {selectedMethod === "Bank Transfer" ? (
                    <dl className="mt-4 space-y-3 text-xs">
                      <div><dt className="text-gray-500">Account title</dt><dd className="font-bold text-[#101216]">{options?.accountHolder}</dd></div>
                      <div><dt className="text-gray-500">Bank</dt><dd className="font-bold text-[#101216]">{options?.bankName}</dd></div>
                      {options?.accountNumber && <div><dt className="text-gray-500">Account number</dt><dd className="font-mono font-bold text-[#101216]">{options.accountNumber}</dd></div>}
                      {options?.iban && <div><dt className="text-gray-500">IBAN</dt><dd className="font-mono font-bold text-[#101216] break-all">{options.iban}</dd></div>}
                      {options?.branch && <div><dt className="text-gray-500">Branch</dt><dd className="font-bold text-[#101216]">{options.branch}</dd></div>}
                    </dl>
                  ) : (
                    <dl className="mt-4 space-y-3 text-xs">
                      <div><dt className="text-gray-500">Recipient / account title</dt><dd className="font-bold text-[#101216]">{options?.accountHolder}</dd></div>
                      <div><dt className="text-gray-500">Wallet number</dt><dd className="font-mono font-bold text-[#101216]">{options?.walletNumber}</dd></div>
                    </dl>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black text-[#101216]"><CreditCard className="w-5 h-5 text-[#E31E36]" /> Credit / debit card</h2>
              {options?.cardCheckoutAvailable ? (
                <form onSubmit={startCardCheckout} className="mt-4 space-y-3">
                  <p className="text-xs leading-5 text-gray-600">{options.cardCheckoutMessage} You will be redirected to Safepay’s secure hosted checkout.</p>
                  {cardError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{cardError}</p>}
                  <label className="block text-xs font-bold text-gray-700">Full name<input required minLength={2} maxLength={100} value={form.customerName} onChange={(event) => updateForm("customerName", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                  <label className="block text-xs font-bold text-gray-700">Email<input required type="email" maxLength={254} value={form.customerEmail} onChange={(event) => updateForm("customerEmail", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                  <label className="block text-xs font-bold text-gray-700">Phone / WhatsApp<input required type="tel" minLength={7} maxLength={30} value={form.customerPhone} onChange={(event) => updateForm("customerPhone", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                  <label className="block text-xs font-bold text-gray-700">Inquiry reference (if available)<input maxLength={50} value={form.inquiryReference} onChange={(event) => updateForm("inquiryReference", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                  <div className="grid grid-cols-[1fr_0.8fr] gap-3">
                    <label className="text-xs font-bold text-gray-700">Amount<input required type="number" min="0.01" max="100000000" step="0.01" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                    <label className="text-xs font-bold text-gray-700">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value as SafepayCurrency)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal">{cardCurrencies.map((option) => <option key={option.code} value={option.code}>{option.code}</option>)}</select></label>
                  </div>
                  <button type="submit" disabled={cardSubmitting || cardCurrencies.length === 0} className="w-full rounded-xl bg-[#101216] px-4 py-3 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">{cardSubmitting ? "Connecting to Safepay..." : "Continue to secure card checkout"}</button>
                  <p className="text-[11px] leading-5 text-gray-500">Payment stays pending until Safepay sends a valid signed payment confirmation. Your card details are entered on Safepay, not this website.</p>
                </form>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-5 text-gray-600">{options?.cardCheckoutMessage || "Safepay card checkout is not configured yet. The administrator must add sandbox credentials and the database migration before card payments can start."}</p>
                  <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase text-amber-800">Safepay checkout unavailable</span>
                </>
              )}
            </div>
          </div>

          <form onSubmit={submitReceipt} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h2 className="flex items-center gap-2 font-black text-[#101216]"><Landmark className="w-5 h-5 text-[#E31E36]" /> Submit transfer receipt</h2>
              <p className="mt-1 text-xs text-gray-500">Manual transfers are accepted in PKR for Pakistan customers only.</p>
            </div>

            {message && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 className="w-4 h-4 shrink-0" />{message}</div>}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div>}

            <fieldset disabled={!manualPaymentsAvailable || submitting} className="space-y-4 disabled:opacity-60">
              <input type="hidden" name="method" value={selectedMethod} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-gray-700">Full name<input name="customerName" required minLength={2} maxLength={100} value={form.customerName} onChange={(event) => updateForm("customerName", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                <label className="text-xs font-bold text-gray-700">Email<input name="customerEmail" type="email" required maxLength={254} value={form.customerEmail} onChange={(event) => updateForm("customerEmail", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                <label className="text-xs font-bold text-gray-700">Phone / WhatsApp<input name="customerPhone" type="tel" required minLength={7} maxLength={30} value={form.customerPhone} onChange={(event) => updateForm("customerPhone", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                <label className="text-xs font-bold text-gray-700">Inquiry reference (if available)<input name="inquiryReference" maxLength={50} value={form.inquiryReference} onChange={(event) => updateForm("inquiryReference", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                <label className="text-xs font-bold text-gray-700">Transferred amount (PKR)<input name="amount" type="number" required min="1" max="100000000" step="0.01" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
                <label className="text-xs font-bold text-gray-700">Transaction ID / reference<input name="transactionReference" required minLength={3} maxLength={100} value={form.transactionReference} onChange={(event) => updateForm("transactionReference", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label>
              </div>
              <label className="block text-xs font-bold text-gray-700">Receipt image (JPEG, PNG, or WebP; max 5 MB)<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2" /></label>
              <p className="text-[11px] leading-5 text-gray-500">Receipt stays in private storage and is visible only to authorized admins. Uploading a receipt does not confirm payment; admin verification is required.</p>
              <button type="submit" disabled={!manualPaymentsAvailable || submitting} className="w-full rounded-xl bg-[#E31E36] px-4 py-3 text-xs font-bold text-white hover:bg-[#C8162D] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting receipt..." : "Submit receipt for verification"}</button>
            </fieldset>
          </form>
        </section>
      </div>
    </div>
  );
}
