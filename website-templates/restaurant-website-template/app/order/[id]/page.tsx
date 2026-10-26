'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Phone,
  Copy,
  ExternalLink,
  ChefHat,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [whatsappUrl, setWhatsAppUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Poll order status every 8 seconds for real-time updates from kitchen
  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (isMounted && data.success && data.order) {
          setOrder(data.order);
          setWhatsAppUrl(data.whatsappUrl || '');
        }
      } catch (err) {
        console.error('Error fetching order status:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  const handleDeclareSent = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declare_whatsapp_sent' }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (order?.whatsappMessagePrefilled) {
      navigator.clipboard.writeText(order.whatsappMessagePrefilled);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 space-y-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Order Not Found</h1>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">
          We couldn&apos;t find an order with reference &quot;{orderId}&quot;. Please verify the order reference or contact support.
        </p>
        <Link
          href="/menu"
          className="bg-amber-500 text-zinc-950 px-6 py-2.5 rounded-xl font-bold text-xs"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  const statusDescriptions: Record<OrderStatus, { title: string; color: string; desc: string }> = {
    awaiting_whatsapp: {
      title: 'Awaiting WhatsApp Message',
      color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
      desc: 'Your order was drafted. Please ensure you clicked Send in WhatsApp so our kitchen receives it.',
    },
    pending: {
      title: 'Pending Kitchen Confirmation',
      color: 'text-blue-400 bg-blue-950/60 border-blue-500/40',
      desc: 'You marked the order as sent. Staff is verifying your WhatsApp message and availability.',
    },
    confirmed: {
      title: 'Order Confirmed',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
      desc: 'The restaurant confirmed your order! It is queued for the kitchen.',
    },
    preparing: {
      title: 'Kitchen Is Preparing Food',
      color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
      desc: 'Our chefs are grilling chicken and wrapping your fresh shawarmas now.',
    },
    ready: {
      title: 'Ready for Pickup / Table Service',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
      desc: 'Your food is piping hot and ready!',
    },
    out_for_delivery: {
      title: 'Out for Delivery',
      color: 'text-purple-400 bg-purple-950/60 border-purple-500/40',
      desc: 'Our delivery rider is on the way to your address.',
    },
    completed: {
      title: 'Order Completed',
      color: 'text-zinc-300 bg-zinc-800 border-zinc-700',
      desc: 'This order has been served or delivered. Thank you for ordering with us!',
    },
    cancelled: {
      title: 'Order Cancelled',
      color: 'text-red-400 bg-red-950/60 border-red-500/40',
      desc: 'This order was cancelled by the customer or kitchen.',
    },
  };

  const curr = statusDescriptions[order.status] || statusDescriptions.pending;
  const isPendingSubmission = order.status === 'awaiting_whatsapp';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="container mx-auto max-w-3xl space-y-8">
        {/* Header Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                Order Tracking
              </span>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <span>{order.id}</span>
              </h1>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${curr.color}`}>
              {curr.title}
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">{curr.desc}</p>

          {/* If estimated prep time is set by staff */}
          {order.estimatedMinutes && order.status !== 'completed' && (
            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
              <ChefHat className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Estimated preparation time:{' '}
                <strong className="text-white">{order.estimatedMinutes} minutes</strong>
              </span>
            </div>
          )}

          {/* Action button if customer returned to website after opening WhatsApp */}
          {isPendingSubmission && (
            <div className="bg-amber-950/50 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Did you tap &quot;Send&quot; in WhatsApp?</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Opening WhatsApp drafts your order, but you must press Send. Once sent, click below so the kitchen dashboard flags your order for verification.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleDeclareSent}
                  disabled={actionLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Have Sent the WhatsApp Order</span>
                </button>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Re-open WhatsApp</span>
                  </a>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 italic">
                * Note: Pressing &quot;I Have Sent&quot; is a customer declaration; our team verifies the actual incoming message before confirmation.
              </p>
            </div>
          )}

          {/* Re-open / Copy buttons for convenience */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Chat with Kitchen on WhatsApp</span>
              </a>
            )}
            <button
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Order Text'}</span>
            </button>
          </div>
        </div>

        {/* Order Details Breakdown */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center justify-between">
            <span>Itemized Order Summary</span>
            <span className="text-xs text-amber-400 capitalize">
              {order.orderType === 'dine_in'
                ? `Dine-in ${order.tableNumber ? `(Table ${order.tableNumber})` : ''}`
                : order.orderType === 'takeaway'
                ? 'Takeaway / Pickup'
                : 'Delivery'}
            </span>
          </h2>

          <div className="divide-y divide-zinc-800/80">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white">
                    {item.nameEn} <span className="text-zinc-500 font-normal">× {item.quantity}</span>
                  </p>
                  <p className="text-zinc-400 font-urdu">{item.nameUr}</p>
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-[11px] text-amber-400">
                      Add-ons: {item.addons.map((a) => a.nameEn).join(', ')}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-[11px] text-zinc-400 italic">
                      Note: &quot;{item.specialInstructions}&quot;
                    </p>
                  )}
                </div>
                <span className="font-bold text-amber-400 shrink-0">Rs. {item.subtotal}</span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="text-white font-bold">Rs. {order.itemsSubtotal}</span>
            </div>
            {order.orderType === 'delivery' && (
              <div className="flex justify-between text-amber-400">
                <span>Delivery Charges:</span>
                <span className="font-bold">Rs. {order.deliveryCharges}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
              <span>Grand Total:</span>
              <span className="text-amber-400">Rs. {order.grandTotal}</span>
            </div>
          </div>

          {/* Customer Metadata */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs space-y-2 text-zinc-400">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black block">Customer</span>
                <span className="text-zinc-200 font-semibold">{order.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black block">Phone</span>
                <span className="text-zinc-200 font-semibold">{order.customerPhone}</span>
              </div>
            </div>
            {order.deliveryAddress && (
              <div className="pt-2 border-t border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase font-black block">Address</span>
                <span className="text-zinc-200">{order.deliveryAddress}</span>
              </div>
            )}
            {order.specialInstructions && (
              <div className="pt-2 border-t border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase font-black block">Special Instructions</span>
                <span className="text-zinc-200">{order.specialInstructions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Back navigation */}
        <div className="flex justify-center">
          <Link
            href="/menu"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>Browse More Food &amp; Deals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
