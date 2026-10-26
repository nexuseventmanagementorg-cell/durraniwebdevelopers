import React from 'react';
import { CheckCircle2, ShieldCheck, Utensils } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="container mx-auto max-w-4xl space-y-10">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Restaurant Ordering Platform</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-white sm:text-5xl">
            ABOUT <span className="text-amber-400">YOUR RESTAURANT</span>
          </h1>
          <p className="mx-auto max-w-lg text-xs text-zinc-400 sm:text-sm">
            A welcoming place for freshly prepared food, convenient ordering, and memorable meals.
          </p>
        </div>

        <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Utensils className="h-5 w-5" />
            <span>Freshly prepared favorites</span>
          </div>
          <h2 className="text-2xl font-black text-white">Good food, made easy</h2>
          <p className="text-xs leading-relaxed text-zinc-300">
            Explore the menu, choose your favorites, and place an order for dine-in, takeaway, or delivery.
            The menu and restaurant details can be customized to suit your business.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {['Online menu', 'Flexible ordering', 'QR table service'].map((feature) => (
              <span
                key={feature}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-semibold text-zinc-300"
              >
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
                {feature}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-3xl border border-amber-500/40 bg-amber-950/40 p-6 text-xs text-zinc-300">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Built for your restaurant</span>
          </div>
          <p className="leading-relaxed">
            Manage menu items, deals, orders, tables, and business information from the staff dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
