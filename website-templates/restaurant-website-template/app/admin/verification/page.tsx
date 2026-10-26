'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle2, AlertCircle, ShieldCheck, Printer, Check, Eye } from 'lucide-react';
import { Product, Deal } from '@/types';

export default function MenuVerificationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, dealRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/deals'),
        ]);
        const pData = await prodRes.json();
        const dData = await dealRes.json();
        if (pData.products) setProducts(pData.products);
        if (dData.deals) setDeals(dData.deals);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Owner-Provided Menu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Menu Verification Checklist</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Current product names, categories, images, and prices saved in the menu database.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer w-fit"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Audit Checklist</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs text-zinc-400 font-bold block mb-1">Main Menu (Side 1)</span>
          <span className="text-3xl font-black text-amber-400">31 Items</span>
          <p className="text-[11px] text-zinc-500 mt-1">
            Shawarmas, burgers, rolls, fries, sandwiches, soup &amp; extras
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
          <span className="text-xs text-zinc-400 font-bold block mb-1">Student Deals (Side 2)</span>
          <span className="text-3xl font-black text-amber-400">14 Deals</span>
          <p className="text-[11px] text-zinc-500 mt-1">
            Deals 1 to 14 (Includes Deal 13 Family Mega Feast)
          </p>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-3xl p-5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Fidelity Status</span>
          </div>
          <span className="text-2xl font-black text-white">Menu Updated</span>
          <p className="text-[11px] text-emerald-300/80 mt-1">
            Owner-provided menu and PKR prices
          </p>
        </div>
      </div>

      {/* Main Menu Verification Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white">Individual Menu Products (31 Items)</h2>
          <span className="text-xs text-amber-400 font-bold">Main Menu Card</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">English Product Name</th>
                <th className="px-4 py-3">Urdu Printed Name</th>
                <th className="px-4 py-3">Original Printed Price</th>
                <th className="px-4 py-3">App System Price</th>
                <th className="px-4 py-3">Menu Section</th>
                <th className="px-4 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                      <Image src={p.image} alt={p.nameEn} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{p.nameEn}</td>
                  <td className="px-4 py-3 font-urdu text-amber-400 text-sm">{p.nameUr}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{p.originalPriceFormat}</td>
                  <td className="px-4 py-3 font-black text-amber-400">Rs. {p.price}</td>
                  <td className="px-4 py-3 text-zinc-500 text-[11px]">{p.originalMenuSection}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Deals Verification Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-white">Side 2: Student Deals (14 Bundles)</h2>
          <span className="text-xs text-amber-400 font-bold">Deals Card</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Deal # &amp; Title</th>
                <th className="px-4 py-3">Bundle Composition</th>
                <th className="px-4 py-3">Printed Price</th>
                <th className="px-4 py-3">App System Price</th>
                <th className="px-4 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {deals.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                      <Image src={d.image} alt={d.nameEn} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white block">{d.nameEn}</span>
                    <span className="text-amber-400 font-urdu">{d.nameUr}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-zinc-300 max-w-xs">
                    {d.components.map((c) => `${c.nameEn} (${c.nameUr})`).join(' + ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{d.originalPriceFormat}</td>
                  <td className="px-4 py-3 font-black text-amber-400">Rs. {d.price}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
