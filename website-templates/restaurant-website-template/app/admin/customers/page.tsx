'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Heart, LoaderCircle, RefreshCw, Search, Star } from 'lucide-react';
import { CustomerLead } from '@/types';

function getPakistanMonth(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}`;
}

function getPakistanDate(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatRupees(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK').format(amount)}`;
}

function formatDate(date: string): string {
  return date
    ? new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
      }).format(new Date(date))
    : '—';
}

export default function AdminCustomersPage() {
  const [month, setMonth] = useState(getPakistanMonth);
  const [customers, setCustomers] = useState<CustomerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [error, setError] = useState('');
  const [busyPhone, setBusyPhone] = useState('');
  const [paymentInputs, setPaymentInputs] = useState<
    Record<string, { amount: string; notes: string; date: string }>
  >({});

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/customers?month=${encodeURIComponent(month)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not load customer records.');
      }
      setCustomers(data.customers as CustomerLead[]);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load customer records.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter(
      (customer) =>
        (!favouritesOnly || customer.favourite) &&
        (!query ||
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(query))
    );
  }, [customers, search, favouritesOnly]);

  const updateMonthlyAccount = async (customer: CustomerLead) => {
    setBusyPhone(customer.phone);
    setError('');
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customer.phone, enabled: !customer.monthlyCreditEnabled }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not update the monthly account.');
      }
      await loadCustomers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update the monthly account.');
    } finally {
      setBusyPhone('');
    }
  };

  const recordPayment = async (event: React.FormEvent<HTMLFormElement>, customer: CustomerLead) => {
    event.preventDefault();
    const values = paymentInputs[customer.phone] ?? { amount: '', notes: '', date: getPakistanDate() };
    setBusyPhone(customer.phone);
    setError('');
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          amount: Number(values.amount),
          date: values.date,
          notes: values.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not record customer payment.');
      }
      setPaymentInputs((current) => ({
        ...current,
        [customer.phone]: { amount: '', notes: '', date: getPakistanDate() },
      }));
      await loadCustomers();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not record customer payment.');
    } finally {
      setBusyPhone('');
    }
  };

  const favouriteCustomers = customers.filter((customer) => customer.favourite);
  const creditCustomers = customers.filter((customer) => customer.monthlyCreditEnabled);
  const totalOutstandingCredit = customers.reduce((total, customer) => total + customer.creditBalance, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Customer Leads</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Customer order history, monthly favourites, and monthly credit balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-400" htmlFor="customer-month">Favourites month</label>
          <input
            id="customer-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => void loadCustomers()}
            disabled={loading}
            aria-label="Refresh customer list"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-pink-500/30 bg-pink-950/20 p-4">
          <Heart className="h-4 w-4 text-pink-300" />
          <p className="mt-2 text-2xl font-black text-white">{favouriteCustomers.length}</p>
          <p className="text-xs text-zinc-400">Favourite customers · 10+ orders in {month} (cancelled orders excluded)</p>
        </section>
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
          <CreditCard className="h-4 w-4 text-amber-300" />
          <p className="mt-2 text-2xl font-black text-white">{creditCustomers.length}</p>
          <p className="text-xs text-zinc-400">Monthly credit accounts</p>
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-bold text-zinc-400">Total credit outstanding</p>
          <p className="mt-2 text-2xl font-black text-amber-300">
            {formatRupees(totalOutstandingCredit)}
          </p>
          <p className="text-xs text-zinc-500">Outstanding across all monthly accounts</p>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-white">Customer directory</h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Order totals exclude cancelled orders; sales totals include completed orders only.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              aria-pressed={favouritesOnly}
              onClick={() => setFavouritesOnly((current) => !current)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                favouritesOnly
                  ? 'border-pink-700 bg-pink-950/50 text-pink-300'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${favouritesOnly ? 'fill-current' : ''}`} />
              {favouritesOnly ? 'Showing favourites' : `Favourites (${favouriteCustomers.length})`}
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer or phone"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading customer leads...
          </p>
        ) : visibleCustomers.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-500">No customer orders found.</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {visibleCustomers.map((customer) => {
              const inputs = paymentInputs[customer.phone] ?? { amount: '', notes: '', date: getPakistanDate() };
              return (
                <article key={customer.phone} className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-white">{customer.name}</h3>
                        {customer.favourite && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-pink-700 bg-pink-950/50 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                            <Star className="h-3 w-3 fill-current" /> Favourite
                          </span>
                        )}
                        {customer.monthlyCreditEnabled && (
                          <span className="rounded-full border border-amber-700 bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            Monthly credit
                          </span>
                        )}
                        {!customer.monthlyCreditEnabled && customer.creditBalance > 0 && (
                          <span className="rounded-full border border-red-800 bg-red-950/50 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            Credit due · account disabled
                          </span>
                        )}
                      </div>
                      <a href={`tel:${customer.phone}`} className="mt-1 block text-xs text-emerald-300 hover:underline">
                        {customer.phone}
                      </a>
                      <p className="mt-1 text-[11px] text-zinc-500">Last order: {formatDate(customer.lastOrderAt)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-4">
                      <div><span className="block text-zinc-500">Orders · all time</span><b className="text-white">{customer.orderCount}</b></div>
                      <div><span className="block text-zinc-500">Orders · {month}</span><b className="text-white">{customer.thisMonthOrderCount}</b></div>
                      <div><span className="block text-zinc-500">Completed sales</span><b className="text-white">{formatRupees(customer.totalSpent)}</b></div>
                      <div><span className="block text-zinc-500">Credit due</span><b className="text-amber-300">{formatRupees(customer.creditBalance)}</b></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void updateMonthlyAccount(customer)}
                        disabled={busyPhone === customer.phone}
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold disabled:opacity-50 ${
                          customer.monthlyCreditEnabled
                            ? 'border border-zinc-700 text-zinc-300 hover:border-red-700 hover:text-red-300'
                            : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                        }`}
                      >
                        {busyPhone === customer.phone ? 'Saving…' : customer.monthlyCreditEnabled ? 'Disable credit' : 'Enable monthly credit'}
                      </button>
                      {customer.payments.length > 0 && (
                        <details className="text-[11px] text-zinc-400">
                          <summary className="cursor-pointer rounded-lg px-2 py-2 hover:text-white">
                            {customer.payments.length} recorded payment{customer.payments.length === 1 ? '' : 's'}
                          </summary>
                          <div className="mt-1 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                            {customer.payments.map((payment) => (
                              <p key={payment.id}>
                                {formatDate(payment.date)} · {formatRupees(payment.amount)}
                                {payment.notes ? ` · ${payment.notes}` : ''}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {customer.creditBalance > 0 && (
                      <form
                        onSubmit={(event) => void recordPayment(event, customer)}
                        className="grid flex-1 gap-2 sm:max-w-2xl sm:grid-cols-[1fr_1.5fr_auto]"
                      >
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          max={customer.creditBalance}
                          value={inputs.amount}
                          onChange={(event) =>
                            setPaymentInputs((current) => ({
                              ...current,
                              [customer.phone]: { ...inputs, amount: event.target.value },
                            }))
                          }
                          placeholder={`Payment · max ${customer.creditBalance}`}
                          aria-label={`Payment amount for ${customer.name}`}
                          className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                        />
                        <input
                          required
                          type="date"
                          max={getPakistanDate()}
                          value={inputs.date}
                          onChange={(event) =>
                            setPaymentInputs((current) => ({
                              ...current,
                              [customer.phone]: { ...inputs, date: event.target.value },
                            }))
                          }
                          aria-label={`Payment date for ${customer.name}`}
                          className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-3"
                        />
                        <input
                          value={inputs.notes}
                          onChange={(event) =>
                            setPaymentInputs((current) => ({
                              ...current,
                              [customer.phone]: { ...inputs, notes: event.target.value },
                            }))
                          }
                          placeholder="Payment note (optional)"
                          aria-label={`Payment note for ${customer.name}`}
                          className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                        />
                        <button
                          type="submit"
                          disabled={busyPhone === customer.phone || !inputs.amount}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Record payment
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
