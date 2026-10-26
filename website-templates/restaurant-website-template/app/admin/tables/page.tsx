'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Printer, Download, QrCode, Utensils, Check, Trash2, Eye } from 'lucide-react';
import QRCode from 'qrcode';
import { DiningTable } from '@/types';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [newTableModal, setNewTableModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSeats, setNewSeats] = useState(4);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        generateAllQRs(data.tables);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const generateAllQRs = async (tableList: DiningTable[]) => {
    const map: Record<string, string> = {};
    for (const t of tableList) {
      try {
        const orderUrl = `${baseUrl}/?table=${t.id}`;
        const dataUrl = await QRCode.toDataURL(orderUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        map[t.id] = dataUrl;
      } catch (err) {
        console.error(err);
      }
    }
    setQrImages(map);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newLabel) return;

    try {
      const tableData: DiningTable = {
        id: newId.trim().toUpperCase(),
        label: newLabel.trim(),
        seats: newSeats,
        isActive: true,
      };

      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData),
      });

      const data = await res.json();
      if (data.success && data.table) {
        setTables((prev) => [...prev, data.table]);
        generateAllQRs([...tables, data.table]);
        setNewTableModal(false);
        setNewId('');
        setNewLabel('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm(`Are you sure you want to delete Table ${id}?`)) return;
    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadQR = (tableId: string) => {
    const dataUrl = qrImages[tableId];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `student_shawarma_qr_table_${tableId}.png`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Dine-In QR Table Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Generate and print table tent QR cards for restaurant seating. Scans automatically load table menu.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/qr/print-tables"
            target="_blank"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all w-fit"
          >
            <Printer className="w-4 h-4" />
            <span>Print Tables 1–6</span>
          </Link>
          <button
            onClick={() => setNewTableModal(true)}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Table</span>
          </button>
        </div>
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs">Loading tables...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => {
            const qrUrl = qrImages[table.id];
            const targetUrl = `${baseUrl}/?table=${table.id}`;

            return (
              <div
                key={table.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center font-black">
                        {table.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{table.label}</h3>
                        <p className="text-[11px] text-zinc-400">{table.seats} Seats Available</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                      title="Delete Table"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* QR Image Display */}
                  <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                    {qrUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={qrUrl}
                        alt={`QR Code for ${table.label}`}
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-400">
                        Generating QR...
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-600 font-mono mt-1 truncate max-w-xs">
                      {targetUrl}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => downloadQR(table.id)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>

                  <Link
                    href={`/admin/tables/print/${table.id}`}
                    target="_blank"
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Standee</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {newTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-white">Add Dining Table</h3>
              <button onClick={() => setNewTableModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Table Identifier Code (e.g. T07)
                </label>
                <input
                  type="text"
                  required
                  placeholder="T07"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Display Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 7 or Family Booth 2"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newSeats}
                  onChange={(e) => setNewSeats(parseInt(e.target.value, 10) || 4)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewTableModal(false)}
                  className="flex-1 bg-zinc-900 text-zinc-300 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl"
                >
                  Create Table &amp; QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
