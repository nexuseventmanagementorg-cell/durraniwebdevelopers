'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowLeft,
  Utensils,
  Bike,
  ShoppingCart,
  Phone,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    subtotal,
    totalCount,
    orderType,
    setOrderType,
    activeTable,
    setActiveTable,
    clearCart,
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState(activeTable || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fixed delivery fee from business settings
  const deliveryFee = orderType === 'delivery' ? 100 : 0;
  const grandTotal = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Your basket is empty. Please add items to proceed.');
      return;
    }

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    if (orderType === 'delivery' && (!deliveryAddress.trim() || deliveryAddress.trim().length < 5)) {
      setErrorMessage('Please provide a complete street delivery address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to server for authoritative price validation & DB order creation
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          orderType,
          tableNumber: orderType === 'dine_in' ? tableNumber.trim().toUpperCase() : undefined,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          items: items.map((it) => ({
            itemType: it.itemType,
            itemId: it.itemId,
            quantity: it.quantity,
            addons: it.addons,
            specialInstructions: it.specialInstructions,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to place order. Please review your cart.');
        setIsSubmitting(false);
        return;
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Clear the local cart now that server has the validated order
      clearCart();

      // Open WhatsApp official URL in a new window/tab
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      // Redirect user to the order status tracking screen
      router.push(`/order/${data.order.id}`);
    } catch {
      setErrorMessage('Network or server error while placing order. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Your Basket is Empty</h1>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">
          Add fresh shawarma, crispy burgers, or deals to proceed with checkout.
        </p>
        <Link
          href="/menu"
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-6 py-3 rounded-xl text-xs transition-colors"
        >
          Browse Restaurant Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs text-amber-400 font-semibold">Step 2: WhatsApp Checkout</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Order Checkout</h1>
        <p className="text-xs text-zinc-400 mb-8">
          Place your order directly with the restaurant via WhatsApp. Real-time confirmation &amp; kitchen preparation.
        </p>

        {errorMessage && (
          <div className="mb-6 bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Details */}
          <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              {/* Step 1: Order Type */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                  1. Choose Service Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`py-3 px-2 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                      orderType === 'takeaway'
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md font-black'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Takeaway / Pickup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`py-3 px-2 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                      orderType === 'dine_in'
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md font-black'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Dine-In (Table)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`py-3 px-2 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                      orderType === 'delivery'
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md font-black'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>Home Delivery</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Customer Contact */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                  2. Your Contact Details
                </label>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Ahmed"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    WhatsApp Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Your phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    The restaurant will send order progress updates to this WhatsApp number.
                  </p>
                </div>
              </div>

              {/* Step 3: Conditional Details (Dine-in vs Delivery) */}
              {orderType === 'dine_in' && (
                <div className="space-y-2 pt-4 border-t border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Table Number (Optional if ordering at counter)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T01 or Table 1"
                    value={tableNumber}
                    onChange={(e) => {
                      setTableNumber(e.target.value);
                      setActiveTable(e.target.value || null);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 uppercase font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    If seated at a table, enter the number printed on the table standee.
                  </p>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2 pt-4 border-t border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Complete Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Street, house or unit number, and a nearby landmark"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Flat delivery charges of Rs. 100 apply within the delivery zone.
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              <div className="space-y-2 pt-4 border-t border-zinc-800">
                <label className="text-xs font-bold text-zinc-300 block">
                  Kitchen Notes or Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Make it extra spicy, pack garlic sauce separately..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit CTA Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transition-all text-base disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating Order with Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5 fill-white" />
                      <span>Place Order on WhatsApp • Rs. {grandTotal}</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-zinc-400 text-center mt-3 leading-relaxed">
                  Clicking will generate your itemized order and open WhatsApp. You will press Send to dispatch your order to the restaurant staff.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Order Basket Summary */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Your Selected Items ({totalCount})</span>
              </h2>
              <Link href="/menu" className="text-xs text-amber-400 hover:underline">
                Edit Basket
              </Link>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-zinc-800/60">
              {items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                    <Image src={item.image} alt={item.nameEn} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.nameEn}</h4>
                    <span className="text-[11px] text-zinc-400">
                      Qty: {item.quantity} × Rs. {item.basePrice}
                    </span>
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-[10px] text-amber-300">
                        +{item.addons.map((a) => a.nameEn).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-black text-amber-400 shrink-0">
                    Rs. {item.lineTotal}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="text-white font-bold">Rs. {subtotal}</span>
              </div>
              {orderType === 'delivery' ? (
                <div className="flex justify-between text-amber-400">
                  <span>Delivery Charges (Flat):</span>
                  <span className="font-bold">Rs. {deliveryFee}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-400">
                  <span>Delivery Charges:</span>
                  <span>Free ({orderType === 'dine_in' ? 'Dine-In' : 'Takeaway'})</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                <span>Total Amount in PKR:</span>
                <span className="text-amber-400">Rs. {grandTotal}</span>
              </div>
            </div>

            {/* Restaurant Guarantee */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Direct Kitchen Order</span>
              </div>
              <p>
                Your order details will be sent directly to the restaurant for confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
