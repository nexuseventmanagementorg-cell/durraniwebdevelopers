"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Database, RefreshCw, XCircle } from "lucide-react";

interface StorageStatus {
  checkedAt: string;
  coreDataStore: string;
  payments: {
    backend: string;
    database: { connected: boolean; message: string };
    receiptStorage: { accessible: boolean; private: boolean; message: string };
    safepay: {
      configured: boolean;
      environment: "sandbox" | "production" | null;
      databaseReady: boolean;
      message: string;
    };
  };
}

export default function StorageStatusPanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/storage-status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check storage status.");
      setStatus(data);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to check storage status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-amber-600" />;

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[#101216]">
          <Database className="w-5 h-5 text-[#E31E36]" />
          <h3 className="font-black text-sm">Database & Supabase Status</h3>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh storage status" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {loading && !status ? (
        <p className="text-xs text-gray-500">Testing configured storage backends...</p>
      ) : status && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <span>Core application data:</span>
            <strong className="text-right text-gray-900">{status.coreDataStore}</strong>
          </div>
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <span>Payment settings & receipts:</span>
            <strong className="text-right text-gray-900">{status.payments.backend}</strong>
          </div>
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-flex items-center gap-2"><StatusIcon ok={status.payments.database.connected} /> Payment database:</span>
            <span className="text-right">{status.payments.database.message}</span>
          </div>
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-flex items-center gap-2"><StatusIcon ok={status.payments.receiptStorage.accessible && status.payments.receiptStorage.private} /> Private receipt bucket:</span>
            <span className="text-right">{status.payments.receiptStorage.message}</span>
          </div>
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="inline-flex items-center gap-2"><StatusIcon ok={status.payments.safepay.configured && status.payments.safepay.databaseReady} /> Safepay card checkout:</span>
            <span className="text-right">{status.payments.safepay.message}</span>
          </div>
          {status.checkedAt && <p className="text-[10px] text-gray-400">Last tested: {new Date(status.checkedAt).toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
}
