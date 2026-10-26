'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Check, Flame, Users } from 'lucide-react';
import { Deal } from '@/types';
import { useCart } from '@/context/CartContext';

interface DealCardProps {
  deal: Deal;
}

export default function DealCard({ deal }: DealCardProps) {
  const { addItem } = useCart();
  const [addedAnim, setAddedAnim] = useState(false);

  const handleAddDeal = () => {
    if (!deal.isAvailable) return;

    addItem({
      itemType: 'deal',
      itemId: deal.id,
      nameEn: deal.nameEn,
      nameUr: deal.nameUr,
      basePrice: deal.price,
      quantity: 1,
      image: deal.image,
    });

    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
  };

  return (
    <div className="relative group bg-zinc-900 border-2 border-amber-500/30 hover:border-amber-400 rounded-2xl overflow-hidden shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between">
      {/* Top Media & Banner */}
      <div>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-800">
          <Image
            src={deal.image}
            alt={deal.nameEn}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/30" />

          {/* Deal Number Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-500 text-zinc-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            <Flame className="w-3.5 h-3.5 fill-red-600 text-red-600" />
            <span>Deal {deal.dealNumber}</span>
          </div>

          {/* Family Deal Tag */}
          {deal.isFamilyDeal && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-full uppercase shadow-lg animate-pulse">
              <Users className="w-3.5 h-3.5" />
              <span>Family Mega Deal</span>
            </div>
          )}

          {/* Price Banner */}
          <div className="absolute bottom-3 right-3 bg-zinc-950/95 border border-amber-400 px-3.5 py-1.5 rounded-xl shadow-lg">
            <div className="text-[10px] text-zinc-400 font-bold uppercase text-right leading-none">Deal Price</div>
            <div className="text-amber-400 font-black text-lg leading-tight">
              Rs. {deal.price}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-extrabold text-white text-lg group-hover:text-amber-400 transition-colors">
              {deal.nameEn}
            </h3>
            <span className="text-amber-400 font-urdu text-sm font-bold">{deal.nameUr}</span>
          </div>

          {/* Itemized Components */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 my-3">
            <div className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>What&apos;s Included</span>
              <span className="text-amber-400 font-mono">
                {deal.components.reduce((total, component) => total + component.quantity, 0)} Items
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {deal.components.map((comp, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 border-b border-zinc-800/40 pb-1 last:border-none last:pb-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>
                      {comp.quantity} × {comp.nameEn.replace(/^\d+\s+/, '')}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-urdu">{comp.nameUr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="p-5 pt-0">
        <button
          onClick={handleAddDeal}
          disabled={!deal.isAvailable}
          className={`w-full py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
            addedAnim
              ? 'bg-emerald-500 text-zinc-950 scale-[1.02]'
              : 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 shadow-lg shadow-amber-500/20'
          } disabled:opacity-50`}
        >
          {addedAnim ? (
            <>
              <Check className="w-4 h-4" />
              <span>Deal Added to Basket!</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Deal to Order — Rs. {deal.price}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
