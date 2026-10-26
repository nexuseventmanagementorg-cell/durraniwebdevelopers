'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, Printer } from 'lucide-react';
import { DiningTable } from '@/types';

interface PrintableTable extends DiningTable {
  qrDataUrl: string;
}

const requiredTableIds = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'];

export default function PrintAllTableQRCodesPage() {
  const [printableTables, setPrintableTables] = useState<PrintableTable[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function createPrintableCodes() {
      try {
        const response = await fetch('/api/tables');
        if (!response.ok) {
          throw new Error('Could not load restaurant tables.');
        }
        const data: { tables?: DiningTable[] } = await response.json();
        const tables = requiredTableIds.map((id) => data.tables?.find((table) => table.id === id));
        if (tables.some((table) => !table)) {
          throw new Error('Tables 1–6 must be configured before printing their codes.');
        }

        const origin = window.location.origin;
        const codes = await Promise.all(
          tables.map(async (table) => {
            if (!table) {
              throw new Error('A required table is missing.');
            }
            const url = new URL('/', origin);
            url.searchParams.set('table', table.id);
            const qrDataUrl = await QRCode.toDataURL(url.toString(), {
              width: 480,
              margin: 2,
              color: { dark: '#09090b', light: '#ffffff' },
            });
            return { ...table, qrDataUrl };
          })
        );
        setPrintableTables(codes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not generate table QR codes.');
      }
    }

    createPrintableCodes();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-900 sm:p-8">
      <div className="no-print mx-auto mb-6 flex w-full max-w-5xl items-center justify-between text-zinc-300">
        <Link href="/admin/tables" className="inline-flex items-center gap-2 text-sm font-bold hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to tables
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={printableTables.length !== requiredTableIds.length}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Print all six codes
        </button>
      </div>

      {error && <p className="no-print mx-auto max-w-5xl text-center text-sm text-red-400">{error}</p>}
      {printableTables.length === 0 && !error && (
        <p className="no-print py-12 text-center text-sm text-zinc-300">Generating six unique table codes...</p>
      )}

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
        {printableTables.map((table) => (
          <section
            key={table.id}
            className="flex min-h-[4.5in] flex-col items-center justify-center gap-3 rounded-2xl border-4 border-amber-400 bg-white p-5 text-center print:break-inside-avoid print:rounded-none print:border-2"
          >
            <div className="text-center">
              <h1 className="text-lg font-black text-red-600">Your Restaurant</h1>
              <p className="text-xs font-bold text-zinc-600">Scan to order at your table</p>
            </div>
            <h2 className="rounded-xl bg-zinc-950 px-8 py-2 text-2xl font-black text-white">{table.label}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={table.qrDataUrl} alt={`Unique ordering QR code for ${table.label}`} className="h-56 w-56" />
            <p className="text-xs font-semibold text-zinc-700">Scan with your phone camera to order dine-in</p>
          </section>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </main>
  );
}
