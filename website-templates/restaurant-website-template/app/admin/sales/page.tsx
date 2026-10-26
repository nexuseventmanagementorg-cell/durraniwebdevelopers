'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, RefreshCw, TrendingUp, Trash2 } from 'lucide-react';
import { DailyExpense, Order } from '@/types';

interface DailySales {
  total: number;
  orderCount: number;
  closed: boolean;
}

interface SalesReport {
  month: string;
  monthlyTotal: number;
  monthlyOrderCount: number;
  dailySales: Record<string, DailySales>;
  dayOrders: Order[];
  dailyExpenses: DailyExpense[];
  dailyExpenseTotal: number;
  burgerCount: number;
  shawarmaCount: number;
  otherItemCount: number;
  itemBreakdown: Array<{ name: string; quantity: number; revenue: number; kind: string }>;
}

function getPakistanDate(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatRupees(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK').format(amount)}`;
}

function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

function getMonthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function changeMonth(month: string, amount: number, day: number): { month: string; day: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const target = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  const nextMonth = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return {
    month: nextMonth,
    day: `${nextMonth}-${String(Math.min(day, lastDay)).padStart(2, '0')}`,
  };
}

async function fetchSalesReport(month: string, selectedDate: string, signal?: AbortSignal): Promise<SalesReport> {
  const query = new URLSearchParams({ month, day: selectedDate });
  const response = await fetch(`/api/admin/sales?${query}`, {
    cache: 'no-store',
    signal,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to load daily sales.');
  }
  return data as SalesReport;
}

export default function DailySalesPage() {
  const today = getPakistanDate(new Date());
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      try {
        const data = await fetchSalesReport(selectedMonth, selectedDate, controller.signal);
        setReport(data);
        setError('');
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load daily sales.');
        setReport(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReport();
    return () => controller.abort();
  }, [selectedMonth, selectedDate]);

  const refreshReport = async () => {
    const updatedReport = await fetchSalesReport(selectedMonth, selectedDate);
    setReport(updatedReport);
  };

  const handleAddExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingExpense(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          description: expenseDescription,
          amount: Number(expenseAmount),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not record purchase.');
      setExpenseDescription('');
      setExpenseAmount('');
      await refreshReport();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not record purchase.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: DailyExpense) => {
    if (!window.confirm(`Delete purchase "${expense.description}" (${formatRupees(expense.amount)})?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/sales?id=${encodeURIComponent(expense.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not delete purchase.');
      await refreshReport();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete purchase.');
    }
  };

  const calendarCells = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) =>
        `${selectedMonth}-${String(index + 1).padStart(2, '0')}`
      ),
    ];
  }, [selectedMonth]);

  const moveMonth = (amount: number) => {
    const next = changeMonth(selectedMonth, amount, Number(selectedDate.slice(-2)));
    setLoading(true);
    setSelectedMonth(next.month);
    setSelectedDate(next.day);
  };

  const selectDate = (date: string) => {
    setLoading(true);
    setSelectedDate(date);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Daily Sales</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Check daily completed sales and closing amounts. Dates use Pakistan Standard Time.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <TrendingUp className="h-4 w-4" />
            Monthly Completed Sales
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {loading ? 'Loading…' : formatRupees(report?.monthlyTotal ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {report?.monthlyOrderCount ?? 0} completed orders in {getMonthLabel(selectedMonth)}
          </p>
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <CalendarDays className="h-4 w-4 text-amber-400" />
            {formatDayLabel(selectedDate)}
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {loading ? 'Loading…' : formatRupees(report?.dailySales[selectedDate]?.total ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {report?.dailySales[selectedDate]?.closed
              ? `Closing amount · ${report.dailySales[selectedDate].orderCount} completed orders`
              : `${report?.dailySales[selectedDate]?.orderCount ?? 0} completed orders · live total`}
          </p>
        </section>
        <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
          <div className="text-xs font-bold text-red-300">Daily Purchases / Investment</div>
          <p className="mt-3 text-3xl font-black text-white">
            {loading ? 'Loading…' : formatRupees(report?.dailyExpenseTotal ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{report?.dailyExpenses.length ?? 0} purchase entries</p>
        </section>
        <section className={`rounded-2xl border p-5 ${(report?.dailySales[selectedDate]?.total ?? 0) - (report?.dailyExpenseTotal ?? 0) >= 0 ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20'}`}>
          <div className="text-xs font-bold text-zinc-300">Estimated Daily Profit / Loss</div>
          <p className={`mt-3 text-3xl font-black ${(report?.dailySales[selectedDate]?.total ?? 0) - (report?.dailyExpenseTotal ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {loading ? 'Loading…' : formatRupees((report?.dailySales[selectedDate]?.total ?? 0) - (report?.dailyExpenseTotal ?? 0))}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Completed sales minus recorded purchases</p>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="font-bold text-white">Daily Item Sales · {formatDayLabel(selectedDate)}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Burger and shawarma counts include components sold inside deals.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Burgers sold', report?.burgerCount ?? 0],
            ['Shawarmas sold', report?.shawarmaCount ?? 0],
            ['Other menu items', report?.otherItemCount ?? 0],
            ['Completed orders', report?.dailySales[selectedDate]?.orderCount ?? 0],
          ].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              <p className="text-[10px] font-bold uppercase text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? '…' : count}</p>
            </div>
          ))}
        </div>
        {report?.itemBreakdown.length ? (
          <div className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {report.itemBreakdown.map((item) => (
              <div key={`${item.kind}:${item.name}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                <span className="text-zinc-200">{item.name} <span className="text-zinc-500">({item.kind})</span></span>
                <span className="whitespace-nowrap font-bold text-amber-300">{item.quantity} sold · {formatRupees(item.revenue)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-zinc-500">No completed item sales on this date.</p>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 hover:text-white"
            aria-label="Previous month"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-black text-white">{getMonthLabel(selectedMonth)}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setSelectedDate(today);
                setSelectedMonth(today.slice(0, 7));
              }}
              className="hidden rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white sm:inline-flex"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 hover:text-white"
              aria-label="Next month"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
            <div key={weekday} className="py-2 text-center text-[10px] font-black uppercase text-zinc-500 sm:text-xs">
              {weekday}
            </div>
          ))}
          {calendarCells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} />;
            const sales = report?.dailySales[date];
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                aria-pressed={isSelected}
                className={`min-h-20 rounded-xl border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15'
                    : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600'
                }`}
              >
                <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-zinc-300'}`}>
                  {Number(date.slice(-2))}
                </span>
                {sales && (
                  <span className="mt-1 block truncate text-[9px] font-bold text-emerald-300 sm:text-[11px]">
                    {formatRupees(sales.total)}
                  </span>
                )}
                {sales && (
                  <span className="block text-[9px] text-zinc-500">
                    {sales.closed
                      ? `Closing · ${sales.orderCount} order${sales.orderCount === 1 ? '' : 's'}`
                      : `${sales.orderCount} order${sales.orderCount === 1 ? '' : 's'}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
          <RefreshCw className="h-3 w-3" />
          Completed orders count as sales. Each past date saves a closing amount that remains on the calendar.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-bold text-white">Completed Orders · {formatDayLabel(selectedDate)}</h2>
        </div>
        {loading ? (
          <p className="py-10 text-center text-xs text-zinc-500">Loading completed orders…</p>
        ) : report?.dayOrders.length ? (
          <div className="divide-y divide-zinc-800">
            {report.dayOrders.map((order) => (
              <div key={order.id} className="flex flex-col gap-2 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono font-bold text-white">{order.id}</p>
                  <p className="mt-1 text-zinc-400">
                    {order.customerName} · {order.orderType.replace(/_/g, ' ')}
                    {order.tableNumber ? ` · Table ${order.tableNumber}` : ''}
                  </p>
                  <div className="mt-2 space-y-1">
                    {order.items.map((item, index) => (
                      <p key={`${order.id}-${index}`} className="text-[11px] text-zinc-300">
                        {item.nameEn} × {item.quantity} · {formatRupees(item.subtotal)}
                      </p>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {new Intl.DateTimeFormat('en-PK', {
                      timeZone: 'Asia/Karachi',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(order.completedAt ?? order.updatedAt))}
                  </p>
                </div>
                <span className="font-black text-amber-400">{formatRupees(order.grandTotal)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-xs text-zinc-500">
            No completed orders were recorded for this date.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-bold text-white">Daily Purchases · {formatDayLabel(selectedDate)}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Record each restaurant purchase separately to estimate profit or loss.</p>
        </div>
        <form onSubmit={handleAddExpense} className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[1fr_10rem_auto]">
          <input
            required
            maxLength={120}
            value={expenseDescription}
            onChange={(event) => setExpenseDescription(event.target.value)}
            placeholder="Purchase item / supplier (e.g. chicken, buns)"
            aria-label="Purchase description"
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white"
          />
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={expenseAmount}
            onChange={(event) => setExpenseAmount(event.target.value)}
            placeholder="Amount in Rs."
            aria-label="Purchase amount"
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white"
          />
          <button
            type="submit"
            disabled={savingExpense || loading || selectedDate > today}
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {savingExpense ? 'Saving…' : 'Add purchase'}
          </button>
        </form>
        {report?.dailyExpenses.length ? (
          <div className="divide-y divide-zinc-800">
            {report.dailyExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                <div>
                  <p className="font-bold text-zinc-200">{expense.description}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Added {new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(new Date(expense.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-red-300">{formatRupees(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteExpense(expense)}
                    aria-label={`Delete purchase ${expense.description}`}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-zinc-500">No purchases recorded for this date.</p>
        )}
      </section>
    </div>
  );
}
