"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { isCurrencyCode, type CurrencyCode } from "@/lib/currency";

type PaymentStatus = "pending" | "paid";

export default function PaymentCompletePage() {
  const [paymentId, setPaymentId] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [status, setStatus] = useState<PaymentStatus | "loading" | "error">("loading");
  const [amount, setAmount] = useState<{ minor: number; currency: CurrencyCode } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setPaymentId(query.get("payment") || "");
    setCancelled(query.get("cancelled") === "1");
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setStatus("error");
      setMessage("The payment reference is missing from this page.");
      return;
    }

    let active = true;
    let attempts = 0;
    let timer: number | undefined;

    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/public/safepay-checkout/${encodeURIComponent(paymentId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check the payment status.");
        if (
          !data.payment ||
          (data.payment.status !== "pending" && data.payment.status !== "paid")
        ) {
          throw new Error("The payment status response was incomplete.");
        }
        if (!active) return;

        setStatus(data.payment.status === "paid" ? "paid" : "pending");
        if (
          typeof data.payment.amountMinor === "number" &&
          isCurrencyCode(data.payment.currency)
        ) {
          setAmount({ minor: data.payment.amountMinor, currency: data.payment.currency });
        }

        attempts += 1;
        if (data.payment.status !== "paid" && attempts < 36) {
          timer = window.setTimeout(checkPayment, 5000);
        }
      } catch (checkError) {
        if (!active) return;
        setStatus("error");
        setMessage(checkError instanceof Error ? checkError.message : "Could not check the payment status.");
      }
    };

    void checkPayment();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentId]);

  return (
    <div className="min-h-[70vh] bg-[#F4F5F7] px-4 py-16">
      <main className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm sm:p-10">
        {status === "paid" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-black text-[#101216]">Payment confirmed</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">Safepay confirmed this card payment through its signed server notification.</p>
          </>
        ) : status === "error" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-600" />
            <h1 className="mt-4 text-2xl font-black text-[#101216]">Payment status unavailable</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
          </>
        ) : (
          <>
            <Clock3 className="mx-auto h-12 w-12 text-amber-600" />
            <h1 className="mt-4 text-2xl font-black text-[#101216]">{cancelled ? "Checkout not completed" : "Confirming your payment"}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {cancelled
                ? "The checkout was cancelled or not completed. No payment is recorded as received."
                : "Your payment remains pending until Safepay sends a verified confirmation. This page checks for that confirmation automatically."}
            </p>
          </>
        )}

        {amount && (
          <p className="mt-5 rounded-xl bg-gray-50 p-3 text-sm font-bold text-gray-800">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: amount.currency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(amount.minor / 100)}
          </p>
        )}
        {paymentId && <p className="mt-4 break-all text-[11px] text-gray-500">Payment reference: {paymentId}</p>}
        {status === "pending" && <p className="mt-3 text-xs text-gray-500">If you have just completed checkout, allow a short time for Safepay’s webhook confirmation.</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/payment" className="rounded-xl bg-[#E31E36] px-5 py-3 text-xs font-bold text-white">Back to payments</Link>
          <Link href="/" className="rounded-xl border border-gray-300 px-5 py-3 text-xs font-bold text-gray-700">Return home</Link>
        </div>
      </main>
    </div>
  );
}
