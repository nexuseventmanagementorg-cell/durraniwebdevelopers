'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Phone,
  Download,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  ChefHat,
  MessageSquare,
  Bike,
  Utensils,
  RefreshCw,
  Trash2,
  Plus,
  X,
  LoaderCircle,
} from 'lucide-react';
import { CustomerLead, Deal, Order, OrderStatus, OrderType, Product } from '@/types';

type ManualOrderItem = {
  itemType: 'product' | 'deal';
  itemId: string;
  quantity: number;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length >= 12) return `0${digits.slice(-10)}`;
  return digits.length === 10 ? `0${digits}` : digits;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [prepTimeInput, setPrepTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [submittingManualOrder, setSubmittingManualOrder] = useState(false);
  const [manualOrderError, setManualOrderError] = useState('');
  const [manualOrderSuccess, setManualOrderSuccess] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customerLeads, setCustomerLeads] = useState<CustomerLead[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualOrderType, setManualOrderType] = useState<OrderType>('takeaway');
  const [manualTable, setManualTable] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualInstructions, setManualInstructions] = useState('');
  const [manualMonthlyCredit, setManualMonthlyCredit] = useState(false);
  const [manualSelection, setManualSelection] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualItems, setManualItems] = useState<ManualOrderItem[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) {
        setOrders((currentOrders) => {
          const unchanged =
            currentOrders.length === data.orders.length &&
            currentOrders.every(
              (order, index) =>
                order.id === data.orders[index].id &&
                order.updatedAt === data.orders[index].updatedAt &&
                order.status === data.orders[index].status
            );
          return unchanged ? currentOrders : data.orders;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          statusNotes: notesInput || undefined,
          estimatedMinutes: prepTimeInput ? parseInt(prepTimeInput, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        setSelectedOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const confirmed = window.confirm(
      `Delete order ${order.id} for ${order.customerName}? This cannot be undone.`
    );
    if (!confirmed) return;

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

      setOrders((currentOrders) => currentOrders.filter((item) => item.id !== order.id));
      setSelectedOrder((currentOrder) => currentOrder?.id === order.id ? null : currentOrder);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete order.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const openCreateOrder = async () => {
    setShowCreateOrder(true);
    setManualOrderError('');
    setManualOrderSuccess('');
    setMenuLoading(true);
    try {
      const [productsResponse, dealsResponse, customersResponse] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/deals'),
        fetch('/api/admin/customers'),
      ]);
      const [productsData, dealsData, customersData] = await Promise.all([
        productsResponse.json(),
        dealsResponse.json(),
        customersResponse.json(),
      ]);
      if (!productsResponse.ok || !productsData.success) {
        throw new Error(productsData.error || 'Could not load menu products.');
      }
      if (!dealsResponse.ok || !dealsData.success) {
        throw new Error(dealsData.error || 'Could not load menu deals.');
      }
      if (!customersResponse.ok || !customersData.success) {
        throw new Error(customersData.error || 'Could not load customer accounts.');
      }
      setProducts(productsData.products.filter((product: Product) => product.isAvailable && product.categoryId !== 'addons'));
      setDeals(dealsData.deals.filter((deal: Deal) => deal.isAvailable));
      setCustomerLeads(customersData.customers as CustomerLead[]);
    } catch (error) {
      setManualOrderError(error instanceof Error ? error.message : 'Could not load menu items.');
    } finally {
      setMenuLoading(false);
    }
  };

  const selectedMenuItem = useMemo(() => {
    if (!manualSelection) return null;
    const [itemType, itemId] = manualSelection.split(':');
    if (itemType === 'product') {
      const product = products.find((item) => item.id === itemId);
      return product ? { itemType, itemId, name: product.nameEn, price: product.price } : null;
    }
    const deal = deals.find((item) => item.id === itemId);
    return deal ? { itemType, itemId, name: deal.nameEn, price: deal.price } : null;
  }, [manualSelection, products, deals]);

  const manualSubtotal = useMemo(
    () =>
      manualItems.reduce((total, item) => {
        const menuItem =
          item.itemType === 'product'
            ? products.find((product) => product.id === item.itemId)
            : deals.find((deal) => deal.id === item.itemId);
        return total + (menuItem?.price ?? 0) * item.quantity;
      }, 0),
    [manualItems, products, deals]
  );

  const addManualItem = () => {
    if (!selectedMenuItem) return;
    const existing = manualItems.find(
      (item) => item.itemType === selectedMenuItem.itemType && item.itemId === selectedMenuItem.itemId
    );
    if (existing && existing.quantity + manualQuantity > 50) {
      setManualOrderError('You can add up to 50 of the same menu item per order.');
      return;
    }
    setManualOrderError('');
    setManualItems((current) => {
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + manualQuantity } : item
        );
      }
      return [
        ...current,
        {
          itemType: selectedMenuItem.itemType as 'product' | 'deal',
          itemId: selectedMenuItem.itemId,
          quantity: manualQuantity,
        },
      ];
    });
    setManualQuantity(1);
  };

  const submitManualOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingManualOrder(true);
    setManualOrderError('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: manualName,
          customerPhone: manualPhone,
          orderType: manualOrderType,
          tableNumber: manualOrderType === 'dine_in' ? manualTable : undefined,
          deliveryAddress: manualOrderType === 'delivery' ? manualAddress : undefined,
          specialInstructions: manualInstructions,
          monthlyCredit: manualMonthlyCredit,
          items: manualItems,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not create phone order.');
      }

      setOrders((current) => [data.order, ...current.filter((order) => order.id !== data.order.id)]);
      setManualOrderSuccess(`Phone order ${data.order.id} created.`);
      setShowCreateOrder(false);
      setManualItems([]);
      setManualName('');
      setManualPhone('');
      setManualAddress('');
      setManualTable('');
      setManualInstructions('');
      setManualMonthlyCredit(false);
      setManualOrderType('takeaway');
    } catch (error) {
      setManualOrderError(error instanceof Error ? error.message : 'Could not create phone order.');
    } finally {
      setSubmittingManualOrder(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      'Order ID',
      'Created At',
      'Customer Name',
      'Customer Phone',
      'Order Source',
      'Order Type',
      'Table Number',
      'Delivery Address',
      'Status',
      'Items Subtotal',
      'Delivery Charges',
      'Grand Total',
    ];

    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString(),
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      o.source ?? 'website',
      o.orderType,
      o.tableNumber || '',
      `"${(o.deliveryAddress || '').replace(/"/g, '""')}"`,
      o.status,
      o.itemsSubtotal,
      o.deliveryCharges,
      o.grandTotal,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `student_shawarma_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (tableFilter !== 'all' && o.tableNumber?.toUpperCase() !== tableFilter.toUpperCase())
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerPhone.includes(q);
        const matchesId = o.id.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesId;
      }
      return true;
    });
  }, [orders, statusFilter, tableFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Order Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track kitchen preparation, open WhatsApp chats, and update order fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateOrder}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchOrders}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-xs text-red-300">
          {deleteError}
        </p>
      )}
      {manualOrderSuccess && (
        <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-300">
          {manualOrderSuccess}
        </p>
      )}

      {/* Filters Bar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search order ID, customer name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="awaiting_whatsapp">Awaiting WhatsApp</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Table filter */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Tables &amp; Orders</option>
            <option value="T01">Table T01</option>
            <option value="T02">Table T02</option>
            <option value="T03">Table T03</option>
            <option value="T04">Table T04</option>
            <option value="T05">Table T05</option>
            <option value="T06">Table T06</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-xs">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            No orders match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-4">Order ID &amp; Time</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Type &amp; Destination</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-white block">{ord.id}</span>
                      {ord.source === 'phone' && (
                        <span className="text-[9px] uppercase tracking-wide text-amber-400 font-black">
                          Phone order
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-white block">{ord.customerName}</span>
                      {ord.paymentMethod === 'monthly_credit' && (
                        <span className="text-[9px] font-black uppercase text-amber-300">Monthly credit</span>
                      )}
                      <a
                        href={`https://wa.me/${ord.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{ord.customerPhone}</span>
                      </a>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mb-1 ${
                          ord.orderType === 'dine_in'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : ord.orderType === 'delivery'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {ord.orderType === 'dine_in'
                          ? `Dine-In • Table ${ord.tableNumber || '-'}`
                          : ord.orderType === 'delivery'
                          ? 'Delivery'
                          : 'Takeaway'}
                      </span>
                      {ord.deliveryAddress && (
                        <p className="text-[10px] text-zinc-400 line-clamp-1 max-w-xs">
                          {ord.deliveryAddress}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="line-clamp-2 max-w-xs text-[11px] text-zinc-200">
                        {ord.items.map((i) => `${i.nameEn} × ${i.quantity}`).join(', ')}
                      </p>
                      {ord.specialInstructions && (
                        <p className="text-[10px] text-amber-400 italic">
                          Note: {ord.specialInstructions}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 font-black text-amber-400 text-sm whitespace-nowrap">
                      Rs. {ord.grandTotal}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          ord.status === 'confirmed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : ord.status === 'preparing'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                            : ord.status === 'ready'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : ord.status === 'completed'
                            ? 'bg-zinc-800 text-zinc-400'
                            : ord.status === 'cancelled'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-zinc-900 text-amber-400 border border-zinc-700'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        Order by: <span className="font-bold text-zinc-200">{ord.customerName}</span>
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setPrepTimeInput(ord.estimatedMinutes?.toString() || '');
                            setNotesInput(ord.statusNotes || '');
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          title="View Details & Update"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://wa.me/${ord.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900"
                          title="Open WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(ord)}
                          disabled={deletingOrderId === ord.id}
                          className="p-1.5 rounded-lg bg-red-950/60 border border-red-900 text-red-300 hover:bg-red-900 disabled:cursor-wait disabled:opacity-50"
                          title={`Delete order ${ord.id}`}
                          aria-label={`Delete order ${ord.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Full Order View & Status Editor */}
      {(selectedOrder || showCreateOrder) && (
        <div className={selectedOrder ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto' : 'contents'}>
          <div className={selectedOrder ? 'relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 my-8' : 'contents'}>
            {selectedOrder && (
              <>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold">Order Details</span>
                <h3 className="text-xl font-black text-white">{selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Customer Contact */}
            <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Customer Name:</span>
                <span className="text-white font-bold">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Order Source:</span>
                <span className="text-amber-400 font-bold uppercase">
                  {selectedOrder.source === 'phone' ? 'Phone call' : 'Website'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Contact Phone:</span>
                <a
                  href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  {selectedOrder.customerPhone} (Open WhatsApp)
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Order Service:</span>
                <span className="text-amber-400 font-bold uppercase">
                  {selectedOrder.orderType.replace(/_/g, ' ')}
                  {selectedOrder.tableNumber ? ` (Table ${selectedOrder.tableNumber})` : ''}
                </span>
              </div>
              {selectedOrder.deliveryAddress && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-zinc-400 block mb-0.5">Delivery Address:</span>
                  <span className="text-zinc-200">{selectedOrder.deliveryAddress}</span>
                </div>
              )}
            </div>
              </>
            )}

              {showCreateOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                  <form
                    onSubmit={submitManualOrder}
                    className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-5 my-8"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                      <div>
                        <span className="text-[10px] text-amber-400 uppercase font-bold">Staff entry</span>
                        <h3 className="text-xl font-black text-white">Create Phone Order</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCreateOrder(false)}
                        className="text-zinc-400 hover:text-white p-2"
                        aria-label="Close create order form"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {manualOrderError && (
                      <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-xs text-red-300">
                        {manualOrderError}
                      </p>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="text-xs text-zinc-300">
                        Customer name
                        <input
                          required
                          minLength={2}
                          value={manualName}
                          onChange={(event) => setManualName(event.target.value)}
                          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                          autoComplete="name"
                        />
                      </label>
                      <label className="text-xs text-zinc-300">
                        Contact phone
                        <input
                          required
                          type="tel"
                          value={manualPhone}
                          onChange={(event) => {
                            setManualPhone(event.target.value);
                            setManualMonthlyCredit(false);
                          }}
                          placeholder="03xx-xxxxxxx"
                          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                          autoComplete="tel"
                        />
                      </label>
                      {customerLeads.some(
                        (customer) =>
                          customer.monthlyCreditEnabled &&
                          customer.phone === normalizePhone(manualPhone)
                      ) && (
                        <label className="flex items-start gap-2 rounded-xl border border-amber-800/70 bg-amber-950/20 p-3 text-xs text-zinc-200 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={manualMonthlyCredit}
                            onChange={(event) => setManualMonthlyCredit(event.target.checked)}
                            className="mt-0.5 accent-amber-500"
                          />
                          <span>
                            Add this order to the customer&apos;s monthly credit account.
                            <span className="mt-1 block text-[10px] text-zinc-400">
                              Outstanding balance increases when the order is completed.
                            </span>
                          </span>
                        </label>
                      )}
                      <label className="text-xs text-zinc-300">
                        Order type
                        <select
                          value={manualOrderType}
                          onChange={(event) => setManualOrderType(event.target.value as OrderType)}
                          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                        >
                          <option value="takeaway">Takeaway / Pickup</option>
                          <option value="delivery">Home delivery</option>
                          <option value="dine_in">Dine-in</option>
                        </select>
                      </label>
                      {manualOrderType === 'delivery' && (
                        <label className="text-xs text-zinc-300">
                          Delivery address
                          <input
                            required
                            minLength={5}
                            value={manualAddress}
                            onChange={(event) => setManualAddress(event.target.value)}
                            className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                            autoComplete="street-address"
                          />
                        </label>
                      )}
                      {manualOrderType === 'dine_in' && (
                        <label className="text-xs text-zinc-300">
                          Table number
                          <input
                            value={manualTable}
                            onChange={(event) => setManualTable(event.target.value.toUpperCase())}
                            placeholder="e.g. T01"
                            className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-white">Order items</h4>
                      {menuLoading ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          Loading available menu items...
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={manualSelection}
                            onChange={(event) => setManualSelection(event.target.value)}
                            className="min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white"
                          >
                            <option value="">Choose a product or deal</option>
                            {products.length > 0 && (
                              <optgroup label="Products">
                                {products.map((product) => (
                                  <option key={product.id} value={`product:${product.id}`}>
                                    {product.nameEn} — Rs. {product.price}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {deals.length > 0 && (
                              <optgroup label="Deals">
                                {deals.map((deal) => (
                                  <option key={deal.id} value={`deal:${deal.id}`}>
                                    {deal.nameEn} — Rs. {deal.price}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <input
                            aria-label="Item quantity"
                            type="number"
                            min={1}
                            max={50}
                            value={manualQuantity}
                            onChange={(event) => setManualQuantity(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
                            className="w-20 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={addManualItem}
                            disabled={
                              !selectedMenuItem ||
                              manualItems.some(
                                (item) =>
                                  item.itemType === selectedMenuItem.itemType &&
                                  item.itemId === selectedMenuItem.itemId &&
                                  item.quantity + manualQuantity > 50
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2.5 rounded-xl"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      )}
                      {manualItems.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800">
                          {manualItems.map((item) => {
                            const menuItem =
                              item.itemType === 'product'
                                ? products.find((product) => product.id === item.itemId)
                                : deals.find((deal) => deal.id === item.itemId);
                            return (
                              <div key={`${item.itemType}:${item.itemId}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                <span className="text-zinc-200">{menuItem?.nameEn ?? item.itemId} × {item.quantity}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-amber-400">Rs. {(menuItem?.price ?? 0) * item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => setManualItems((current) => current.filter((line) => line !== item))}
                                    className="text-zinc-500 hover:text-red-300"
                                    aria-label={`Remove ${menuItem?.nameEn ?? item.itemId}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between px-3 py-2 text-xs font-black text-white">
                            <span>Subtotal preview</span>
                            <span className="text-amber-400">Rs. {manualSubtotal}</span>
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-zinc-500">
                        Final prices, delivery minimum, and delivery charges are checked by the server when you submit.
                      </p>
                    </div>

                    <label className="block text-xs text-zinc-300">
                      Special instructions <span className="text-zinc-500">(optional)</span>
                      <textarea
                        rows={2}
                        value={manualInstructions}
                        onChange={(event) => setManualInstructions(event.target.value)}
                        className="mt-1 w-full resize-y bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
                      />
                    </label>

                    <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateOrder(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingManualOrder || menuLoading || manualItems.length === 0}
                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs"
                      >
                        {submittingManualOrder && <LoaderCircle className="w-4 h-4 animate-spin" />}
                        Create order
                      </button>
                    </div>
                  </form>
                </div>
              )}

            {selectedOrder && (
              <>
            {/* Line Items */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-zinc-300">Ordered Items:</h4>
              <div className="bg-zinc-900 p-3 rounded-2xl divide-y divide-zinc-800">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-bold text-white">
                        {it.nameEn} × {it.quantity}
                      </span>
                      {it.addons && it.addons.length > 0 && (
                        <p className="text-[11px] text-amber-400">
                          +{it.addons.map((a) => a.nameEn).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-amber-400">Rs. {it.subtotal}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between font-black text-white text-sm">
                  <span>Grand Total:</span>
                  <span className="text-amber-400">Rs. {selectedOrder.grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Status Change & Estimated Prep Time */}
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <h4 className="font-bold text-zinc-300 text-xs">Update Kitchen Status:</h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Status</label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
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
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Estimated Prep (Mins)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={prepTimeInput}
                    onChange={(e) => setPrepTimeInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs block mb-1">Internal Kitchen Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy requested, dispatched rider Ali..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() =>
                    handleUpdateStatus(selectedOrder.id, selectedOrder.status)
                  }
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl text-xs transition-colors"
                >
                  Save Changes
                </button>
                <a
                  href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
