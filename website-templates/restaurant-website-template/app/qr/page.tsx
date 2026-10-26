'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Utensils, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { DiningTable } from '@/types';

export default function TableSelectionPage() {
  const router = useRouter();
  const { activeTable, setActiveTable } = useCart();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [manualTableInput, setManualTableInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTables() {
      try {
        const res = await fetch('/api/tables');
        const data = await res.json();
        if (data.tables) setTables(data.tables);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTables();
  }, []);

  const handleSelectTable = (tableId: string) => {
    setActiveTable(tableId);
    router.push(`/menu?table=${tableId}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTableInput.trim()) return;
    const clean = manualTableInput.trim().toUpperCase();
    setActiveTable(clean);
    router.push(`/menu?table=${clean}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="container mx-auto max-w-2xl space-y-8">
        {/* Banner */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl mx-auto flex items-center justify-center">
            <QrCode className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-white">Dine-In Table Ordering</h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Seated at a table? Select it below or enter the number from your table stand to start ordering.
          </p>
        </div>

        {/* Current Active Table */}
        {activeTable && (
          <div className="bg-amber-950/50 border border-amber-500/50 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Current Table: <strong>{activeTable}</strong></span>
            </div>
            <button
              onClick={() => router.push(`/menu?table=${activeTable}`)}
              className="bg-amber-500 text-zinc-950 px-3 py-1.5 rounded-xl font-black hover:bg-amber-400 transition-colors flex items-center gap-1"
            >
              <span>Continue to Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table Selection Grid */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Select Your Table</h2>
            <p className="text-xs text-zinc-400">
              Tables available in the dining hall and family room:
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-400 text-xs">Loading available tables...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables
                .filter((t) => t.isActive)
                .map((table) => {
                  const isSelected = activeTable === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleSelectTable(table.id)}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                          : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-white hover:border-amber-500/40'
                      }`}
                    >
                      <Utensils className={`w-5 h-5 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                      <span className="text-sm font-bold">{table.label}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-zinc-900 font-bold' : 'text-zinc-400'
                        }`}
                      >
                        {table.seats} Seats ({table.id})
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Manual Input Form */}
          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Or Enter Table Code Manually
            </h3>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. T01, T02, T06..."
                value={manualTableInput}
                onChange={(e) => setManualTableInput(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 uppercase font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs transition-colors shrink-0"
              >
                Set Table
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
