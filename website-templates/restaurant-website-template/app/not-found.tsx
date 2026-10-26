import React from 'react';
import Link from 'next/link';
import { Utensils, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20 bg-zinc-950 text-zinc-100">
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 text-3xl">
        🌯
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">
        404 — Page Not Found
      </span>
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
        Looks Like This Order Got Mixed Up!
      </h1>
      <p className="text-xs text-zinc-400 max-w-sm mb-8 leading-relaxed">
        The page you are looking for doesn&apos;t exist or might have moved. Check our hot shawarmas and deals instead!
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/10"
        >
          <Home className="w-4 h-4" />
          <span>Go to Homepage</span>
        </Link>
        <Link
          href="/menu"
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <Utensils className="w-4 h-4 text-amber-400" />
          <span>Explore Menu</span>
        </Link>
      </div>
    </div>
  );
}
