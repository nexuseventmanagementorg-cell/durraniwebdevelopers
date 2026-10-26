'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Phone,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';

interface StatsResponse {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  todayRevenue: number;
  recentOrders: Order[];
  topSellingProducts: Array<{ name: string; count: number; revenue: number }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Polling every 10s for new orders
    return () => clearInterval(interval);
  }, []);

  const handleQuickStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`Delete order ${order.id} for ${order.customerName}? This cannot be undone.`)) {
      return;
    }

    setDeletingOrderId(order.id);
    setDeleteError('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete order.');
      }

      setStats((currentStats) =>
        currentStats
          ? {
              ...currentStats,
              recentOrders: currentStats.recentOrders.filter((item) => item.id !== order.id),
            }
          : currentStats
      );
      await fetchStats();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete order.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-zinc-400">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading restaurant metrics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      caption: 'Live orders received today',
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${stats?.todayRevenue || 0}`,
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      caption: 'Excluding cancelled orders',
    },
    {
      title: 'Action Needed',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      caption: 'Pending WhatsApp confirmation',
    },
    {
      title: 'Completed Today',
      value: stats?.completedOrders || 0,
      icon: CheckCircle2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      caption: 'Successfully served meals',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Dashboard Overview</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time kitchen orders, daily sales totals, and order fulfillment controls.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchStats();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {deleteError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-xs text-red-300">
          {deleteError}
        </p>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">{card.title}</span>
                <div className={`p-2 rounded-xl border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white">{card.value}</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">{card.caption}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders & Quick Actions */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Recent Orders</h2>
            <p className="text-xs text-zinc-400">Incoming dine-in, takeaway, and delivery orders</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="divide-y divide-zinc-800/80 overflow-x-auto">
            {stats.recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{ord.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        ord.orderType === 'dine_in'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : ord.orderType === 'delivery'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {ord.orderType === 'dine_in'
                        ? `Dine-In (${ord.tableNumber || 'Table'})`
                        : ord.orderType === 'delivery'
                        ? 'Delivery'
                        : 'Takeaway'}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-zinc-300 font-semibold">
                    {ord.customerName} • {ord.customerPhone}
                  </p>
                  <p className="text-zinc-400 truncate max-w-md">
                    {ord.items.map((i) => `${i.nameEn} × ${i.quantity}`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-amber-400 text-sm">Rs. {ord.grandTotal}</span>

                  {/* Status Dropdown */}
                  <select
                    value={ord.status}
                    onChange={(e) =>
                      handleQuickStatusUpdate(ord.id, e.target.value as OrderStatus)
                    }
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="awaiting_whatsapp">Awaiting WhatsApp</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <a
                    href={`https://wa.me/${ord.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-colors"
                    title="Open Customer WhatsApp"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(ord)}
                    disabled={deletingOrderId === ord.id}
                    className="p-2 rounded-xl bg-red-950/60 border border-red-900 text-red-300 hover:bg-red-900 disabled:cursor-wait disabled:opacity-50 transition-colors"
                    title={`Delete order ${ord.id}`}
                    aria-label={`Delete order ${ord.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500 space-y-2">
            <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-xs">No orders placed yet.</p>
            <p className="text-[11px] text-zinc-600">
              When customers checkout through WhatsApp or table QR, orders will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Real Product Sales / Best Sellers based on real order data */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Popular Items (Real Order History)</h2>
        {stats?.topSellingProducts && stats.topSellingProducts.length > 0 ? (
          <div className="space-y-3">
            {stats.topSellingProducts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-2 border-b border-zinc-800 last:border-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-white">{p.name}</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <span>{p.count} sold</span>
                  <span className="font-bold text-amber-400">Rs. {p.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-4">
            No sales recorded yet. Figures will automatically calculate from real customer orders.
          </p>
        )}
      </div>
    </div>
  );
}
