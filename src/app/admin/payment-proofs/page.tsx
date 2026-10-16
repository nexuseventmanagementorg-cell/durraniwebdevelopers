"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { PaymentProof } from "@/lib/payment-types";
import { isCurrencyCode } from "@/lib/currency";
import { CheckCircle2, Clock3, ExternalLink, RefreshCw, XCircle } from "lucide-react";

interface GatewayPayment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  inquiry_reference: string | null;
  amount_minor: number | string;
  currency: string;
  status: "pending" | "paid";
  created_at: string;
  paid_at: string | null;
}

function formatGatewayPaymentAmount(amountMinor: number | string, currency: string): string {
  const amount = Number(amountMinor) / 100;
  if (!isCurrencyCode(currency)) return `${currency} ${amount.toFixed(2)}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PaymentProofsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [gatewayPayments, setGatewayPayments] = useState<GatewayPayment[]>([]);
  const [gatewayPaymentsError, setGatewayPaymentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadProofs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-proofs", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load receipt submissions.");
      setProofs(data.proofs || []);
      setGatewayPayments(data.gatewayPayments || []);
      setGatewayPaymentsError(data.gatewayPaymentsError || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load receipt submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  const reviewProof = async (proof: PaymentProof, status: "verified" | "rejected") => {
    if (
      status === "verified" &&
      !window.confirm(
        "Confirm you checked the transaction in the JazzCash/Easypaisa account or bank statement and verified the money was actually received."
      )
    ) {
      return;
    }
    const adminNote = status === "rejected" ? window.prompt("Optional reason to keep with this receipt:", "") || "" : "";
    setBusyId(proof.id);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-proofs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proof.id, status, adminNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update receipt status.");
      await loadProofs();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not update receipt status.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Customer Receipt Reviews"
          subtitle="Review private payment proofs and verify transfers manually before marking money received"
          actionButton={
            <button onClick={() => void loadProofs()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          }
        />
        <div className="p-6 space-y-4 flex-1">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">{error}</div>}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-[#101216]">Safepay card payments</h2>
            <p className="mt-1 text-xs text-gray-500">Card payment status changes only after a verified Safepay webhook.</p>
            {gatewayPaymentsError ? (
              <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{gatewayPaymentsError}</p>
            ) : gatewayPayments.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">No Safepay card checkouts have been submitted.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {gatewayPayments.map((payment) => (
                  <article key={payment.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#101216]">{payment.customer_name}</h3>
                        <p className="text-xs text-gray-600">{payment.customer_email} · {payment.customer_phone}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${payment.status === "paid" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                        {payment.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {payment.status}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                      <div><dt className="text-gray-500">Amount</dt><dd className="font-black">{formatGatewayPaymentAmount(payment.amount_minor, payment.currency)}</dd></div>
                      <div><dt className="text-gray-500">Inquiry reference</dt><dd className="font-bold">{payment.inquiry_reference || "Not supplied"}</dd></div>
                      <div><dt className="text-gray-500">Submitted</dt><dd className="font-bold">{new Date(payment.created_at).toLocaleString()}</dd></div>
                    </dl>
                    {payment.paid_at && <p className="mt-2 text-[11px] text-emerald-700">Safepay confirmed {new Date(payment.paid_at).toLocaleString()}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-xs text-gray-500">Loading receipt submissions...</div>
          ) : proofs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-xs text-gray-500">No customer receipts have been submitted.</div>
          ) : (
            <div className="space-y-4">
              {proofs.map((proof) => (
                <article key={proof.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col xl:flex-row gap-5">
                    <div className="w-full xl:w-56 shrink-0">
                      {proof.receipt_url ? (
                        <a href={proof.receipt_url} target="_blank" rel="noreferrer" className="group block">
                          {/* Receipt images are customer uploads; use a normal image element instead of optimizing untrusted remote URLs. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proof.receipt_url} alt={`Receipt from ${proof.customer_name}`} className="h-44 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain" />
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">Open private receipt <ExternalLink className="w-3 h-3" /></span>
                        </a>
                      ) : <div className="h-44 rounded-xl bg-gray-100" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-black text-[#101216]">{proof.customer_name}</h2>
                          <p className="text-xs text-gray-600">{proof.customer_email} · {proof.customer_phone}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          proof.status === "pending" ? "bg-amber-50 text-amber-800" :
                          proof.status === "verified" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                        }`}>
                          {proof.status === "pending" ? <Clock3 className="w-3 h-3" /> : proof.status === "verified" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {proof.status}
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div><dt className="text-gray-500">Amount</dt><dd className="font-black">PKR {Number(proof.amount).toLocaleString()}</dd></div>
                        <div><dt className="text-gray-500">Method</dt><dd className="font-bold">{proof.method}</dd></div>
                        <div><dt className="text-gray-500">Transaction ID</dt><dd className="font-mono font-bold break-all">{proof.transaction_reference}</dd></div>
                        <div><dt className="text-gray-500">Inquiry reference</dt><dd className="font-bold">{proof.inquiry_reference || "Not supplied"}</dd></div>
                      </dl>
                      <p className="text-[11px] text-gray-500">Submitted {new Date(proof.created_at).toLocaleString()}</p>
                      {proof.admin_note && <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-700">Admin note: {proof.admin_note}</p>}
                      {proof.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <button disabled={busyId === proof.id} onClick={() => void reviewProof(proof, "verified")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm funds & verify
                          </button>
                          <button disabled={busyId === proof.id} onClick={() => void reviewProof(proof, "rejected")} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
