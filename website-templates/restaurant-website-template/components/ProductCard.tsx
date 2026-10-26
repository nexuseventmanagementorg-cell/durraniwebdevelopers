'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Check, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
  onOpenDetails?: (product: Product) => void;
}

export default function ProductCard({ product, onOpenDetails }: ProductCardProps) {
  const { addItem } = useCart();
  const [addedAnim, setAddedAnim] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable) return;

    addItem({
      itemType: 'product',
      itemId: product.id,
      nameEn: product.nameEn,
      nameUr: product.nameUr,
      basePrice: product.price,
      quantity: 1,
      image: product.image,
    });

    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
  };

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(product)}
      className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-amber-500/10 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
        <Image
          src={product.image}
          alt={product.nameEn}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/20" />

        {/* Featured Badge */}
        {product.isFeatured && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3" />
            <span>Popular</span>
          </div>
        )}

        {/* Sold Out Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span className="bg-red-950 text-red-400 border border-red-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}

        {/* Price Tag in Image */}
        <div className="absolute bottom-3 left-3 bg-zinc-950/90 border border-amber-500/40 px-3 py-1 rounded-xl">
          <span className="text-amber-400 font-black text-sm tracking-tight">
            Rs. {product.price}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors line-clamp-1">
              {product.nameEn}
            </h3>
          </div>

          {/* Urdu Name */}
          <p className="text-amber-400/90 font-urdu text-sm mb-2">{product.nameUr}</p>

          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {product.descriptionEn}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Freshly Made</span>

          <button
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              addedAnim
                ? 'bg-emerald-500 text-zinc-950 scale-105'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 shadow-md shadow-amber-500/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {addedAnim ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
