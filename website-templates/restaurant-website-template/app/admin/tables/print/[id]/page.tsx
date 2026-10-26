'use client';

import React, { useEffect, useState, use } from 'react';
import QRCode from 'qrcode';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TablePrintStandeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tableId = resolvedParams.id.toUpperCase();

  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const curOrigin = window.location.origin;
      const targetUrl = `${curOrigin}/?table=${tableId}`;
      QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 2,
        color: { dark: '#09090b', light: '#ffffff' },
      }).then(setQrDataUrl);
    }
  }, [tableId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-900 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Action Bar (Hidden during printing) */}
      <div className="no-print max-w-md w-full mb-6 flex items-center justify-between text-zinc-300">
        <Link
          href="/admin/tables"
          className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Table Management</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Standee (4×6&quot;)</span>
        </button>
      </div>

      {/* Printable Card Standee (Styled for Table Tent Printout) */}
      <div className="w-[380px] bg-white rounded-3xl p-8 border-4 border-amber-400 shadow-2xl flex flex-col items-center text-center space-y-4 print:border-2 print:shadow-none print:m-0">
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight text-amber-600 leading-none">
            Your Restaurant
          </h1>
          <p className="text-[10px] text-zinc-700 font-bold tracking-wider uppercase">
            Scan to browse the menu
          </p>
        </div>

        {/* Table Badge */}
        <div className="bg-zinc-950 text-amber-400 px-6 py-2 rounded-2xl w-full">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block leading-none mb-0.5">
            Dine-In Table
          </span>
          <span className="text-2xl font-black tracking-wider text-white">
            {tableId}
          </span>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl flex items-center justify-center">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt={`QR code for Table ${tableId}`}
              className="w-56 h-56 object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-zinc-400 text-xs">
              Generating printable code...
            </div>
          )}
        </div>

        {/* Instruction in English & Urdu */}
        <div className="space-y-1">
          <h2 className="text-base font-black text-zinc-900 tracking-tight">
            SCAN WITH CAMERA TO ORDER
          </h2>
          <p className="text-xs font-urdu font-bold text-red-600">
            اپنے موبائل سے اسکین کریں اور مینو سے آرڈر کریں
          </p>
          <p className="text-[10px] text-zinc-500 max-w-xs leading-tight pt-1">
            Browse the menu, choose your favorites, and send your order to the kitchen.
          </p>
        </div>

      </div>
    </div>
  );
}
