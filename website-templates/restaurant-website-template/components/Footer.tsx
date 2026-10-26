import React from 'react';
import Link from 'next/link';
import { Clock, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 text-zinc-400 text-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 mb-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-black text-amber-400 leading-none">Your Restaurant</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              Freshly prepared favorites, convenient ordering, and great value for every occasion.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase border-b border-zinc-800 pb-2">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/menu?category=shawarma" className="hover:text-amber-400 transition-colors">
                  🌯 Shawarma
                </Link>
              </li>
              <li>
                <Link href="/menu?category=deals" className="text-amber-400 hover:underline font-semibold">
                  🔥 Special Deals
                </Link>
              </li>
              <li>
                <Link href="/menu?category=zinger-burgers" className="hover:text-amber-400 transition-colors">
                  🍔 Zinger Burgers
                </Link>
              </li>
              <li>
                <Link href="/menu?category=platters-rolls" className="hover:text-amber-400 transition-colors">
                  🥙 Platters &amp; Rolls
                </Link>
              </li>
              <li>
                <Link href="/menu?category=shami-burgers" className="hover:text-amber-400 transition-colors">
                  🍔 Shami Burgers
                </Link>
              </li>
              <li>
                <Link href="/menu?category=sandwiches" className="hover:text-amber-400 transition-colors">
                  🥪 Sandwiches
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase border-b border-zinc-800 pb-2">
              Restaurant
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-zinc-300">Opening hours can be added in settings.</p>
                </div>
              </div>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Staff login</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} Your Restaurant. All prices in PKR (Rs.).</p>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>for your community</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
