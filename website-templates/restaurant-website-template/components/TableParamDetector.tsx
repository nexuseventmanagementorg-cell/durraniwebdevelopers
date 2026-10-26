'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { QrCode, CheckCircle2 } from 'lucide-react';

function DetectorInner() {
  const searchParams = useSearchParams();
  const { activeTable, setActiveTable } = useCart();
  const tableParam = searchParams.get('table');

  useEffect(() => {
    if (tableParam && tableParam.toUpperCase() !== activeTable) {
      setActiveTable(tableParam.toUpperCase());
    }
  }, [tableParam, activeTable, setActiveTable]);

  if (!activeTable) return null;

  return (
    <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            🍽️ <strong>Dine-In Session Active:</strong> Table <strong>{activeTable}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ordering at Table</span>
          </span>
          <button
            onClick={() => setActiveTable(null)}
            className="text-zinc-400 hover:text-white text-[11px] underline ml-2"
          >
            Switch Table
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TableParamDetector() {
  return (
    <Suspense fallback={null}>
      <DetectorInner />
    </Suspense>
  );
}
