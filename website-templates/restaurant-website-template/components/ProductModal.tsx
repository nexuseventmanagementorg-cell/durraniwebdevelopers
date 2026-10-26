'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { Product, CartItemAddon } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

const AVAILABLE_ADDONS: CartItemAddon[] = [
  { id: 'cheese-slice', nameEn: 'Extra Cheese Slice (چیز سلائس)', price: 60 },
  { id: 'extra-mayo', nameEn: 'Extra Garlic Mayo (ایکسٹرا مایونیز)', price: 30 },
  { id: 'extra-bread', nameEn: 'Extra Shawarma Bread (ایکسٹرا بریڈ)', price: 30 },
];

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const toggleAddon = (addon: CartItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = product.price + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addItem({
      itemType: 'product',
      itemId: product.id,
      nameEn: product.nameEn,
      nameUr: product.nameUr,
      basePrice: product.price,
      quantity,
      addons: selectedAddons.length > 0 ? selectedAddons : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      image: product.image,
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Header */}
        <div className="relative aspect-[16/10] w-full bg-zinc-900">
          <Image
            src={product.image}
            alt={product.nameEn}
            fill
            sizes="(max-width: 640px) 100vw, 500px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />

          {product.isFeatured && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chef Special</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-black text-white">{product.nameEn}</h2>
              <span className="text-amber-400 font-black text-lg">Rs. {product.price}</span>
            </div>
            <p className="text-amber-400/90 font-urdu text-sm mt-0.5">{product.nameUr}</p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              {product.descriptionEn}
            </p>
          </div>

          {/* Add-ons selection (if not already an addon item) */}
          {product.categoryId !== 'addons' && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Customize with Add-ons (Optional)
              </label>
              <div className="space-y-2">
                {AVAILABLE_ADDONS.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <label
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-950/40 border-amber-500 text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? 'bg-amber-500 border-amber-500 text-zinc-950'
                              : 'border-zinc-700 bg-zinc-800'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold">{addon.nameEn}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400">+Rs. {addon.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g., Less spicy, extra garlic sauce, no onions..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quantity Controls & Add Button */}
          <div className="pt-4 border-t border-zinc-800 flex items-center gap-4">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-black text-sm text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                isAdded
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 shadow-lg shadow-amber-500/20'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Basket!</span>
                </>
              ) : (
                <>
                  <span>Add to Basket</span>
                  <span>•</span>
                  <span>Rs. {totalPrice}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
