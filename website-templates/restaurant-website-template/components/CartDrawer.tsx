'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Utensils, Bike, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface CartDrawerProps {
  deliveryFee?: number;
}

export default function CartDrawer({ deliveryFee = 100 }: CartDrawerProps) {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    totalCount,
    orderType,
    setOrderType,
    activeTable,
  } = useCart();

  if (!isCartOpen) return null;

  const calculatedDelivery = orderType === 'delivery' ? deliveryFee : 0;
  const grandTotal = subtotal + calculatedDelivery;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Your Food Basket</h2>
                <p className="text-xs text-zinc-400">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order Type Toggle */}
          <div className="px-6 py-3 bg-zinc-900/30 border-b border-zinc-800/80">
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  orderType === 'takeaway'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Takeaway</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  orderType === 'dine_in'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Dine-In</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  orderType === 'delivery'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>
            </div>
            {orderType === 'dine_in' && activeTable && (
              <p className="text-[11px] text-amber-400 font-semibold mt-2 text-center">
                ✨ Table assigned: {activeTable}
              </p>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-zinc-800/60">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-zinc-400">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Your cart is empty</h3>
                <p className="text-xs max-w-xs mb-6 text-zinc-400">
                  Add juicy shawarmas, crispy zinger burgers or high-value Student Deals to get started!
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-amber-500 text-zinc-950 font-black px-6 py-2.5 rounded-xl text-xs hover:bg-amber-400 transition-colors"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-3">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                    <Image
                      src={item.image}
                      alt={item.nameEn}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-bold text-white truncate">{item.nameEn}</h4>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-400 hover:text-red-400 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-400 font-urdu">{item.nameUr}</p>

                    {/* Add-ons tag */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.addons.map((a) => (
                          <span
                            key={a.id}
                            className="bg-zinc-800 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-medium"
                          >
                            +{a.nameEn} (Rs.{a.price})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quantity & Line Total */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white px-2">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-black text-amber-400">Rs. {item.lineTotal}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer / Checkout CTA */}
          {items.length > 0 && (
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/60 space-y-4">
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal ({totalCount} items):</span>
                  <span className="text-white font-bold">Rs. {subtotal}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-amber-400">
                    <span>Delivery Charges:</span>
                    <span className="font-bold">Rs. {deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                  <span>Grand Total:</span>
                  <span className="text-amber-400">Rs. {grandTotal}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="px-3 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900 text-xs font-semibold transition-colors"
                >
                  Clear
                </button>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all text-sm"
                >
                  <span>Proceed to WhatsApp Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
