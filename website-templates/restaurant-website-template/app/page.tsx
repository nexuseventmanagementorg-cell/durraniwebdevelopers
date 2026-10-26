import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  Bike,
  QrCode,
} from 'lucide-react';
import { getProducts, getDeals, getBusinessSettings } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import DealCard from '@/components/DealCard';

export default async function HomePage() {
  const [products, deals, settings] = await Promise.all([
    getProducts(),
    getDeals(),
    getBusinessSettings(),
  ]);

  // Select top featured items from real verified list
  const popularShawarma = products.filter((p) => p.isFeatured && p.categoryId === 'shawarma').slice(0, 4);
  const popularBurgers = products.filter((p) => p.categoryId === 'zinger-burgers').slice(0, 3);
  const featuredDeals = deals.slice(0, 4); // Top 4 deals including Deal 3, 4, 13, 14

  return (
    <div className="flex flex-col min-h-screen">
      {/* Announcement Bar */}
      {settings.isAnnouncementActive && settings.announcementText && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-2 px-4 text-center text-xs font-bold tracking-wide shadow-inner">
          <p className="container mx-auto flex items-center justify-center gap-2">
            <span>📢</span>
            <span>{settings.announcementText}</span>
          </p>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-zinc-950 overflow-hidden border-b border-zinc-800">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full w-fit">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-zinc-300">Dine-In, Takeaway &amp; Delivery</span>
                <span className="text-zinc-600">|</span>
                <span className="text-xs font-semibold text-amber-400">Freshly prepared, ready to enjoy</span>
              </div>

              {/* Title with authentic fast-food typography */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded tracking-wider uppercase">
                    Freshly Prepared
                  </span>
                </div>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black italic tracking-tight text-white leading-[1.05]">
                  FRESH, JUICY <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 drop-shadow-sm">
                    SHAWARMA
                  </span>{' '}
                  &amp; CRISPY{' '}
                  <span className="text-red-600 drop-shadow-sm">ZINGER</span>
                </h1>
              </div>

              {/* Verified Subtitle */}
              <p className="text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed">
                Authentic chicken shawarma rolls starting from just{' '}
                <strong className="text-amber-400 font-black">Rs. 150</strong>, golden paratha rolls,
                and high-value <strong className="text-amber-400">Student Deals</strong> prepared with
                signature secret garlic mayo.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/menu"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-7 py-4 rounded-2xl flex items-center gap-3 text-base shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Utensils className="w-5 h-5" />
                  <span>Order Now • View Menu</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/qr"
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold px-5 py-4 rounded-2xl flex items-center gap-2.5 text-sm transition-all"
                >
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Dine-In Table QR</span>
                </Link>

              </div>

              {/* Verified Features Pills */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800/80 max-w-lg text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>100% Real Menu Prices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Delivery Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Table QR Dine-In</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Feast */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md aspect-square rounded-3xl overflow-hidden border-4 border-amber-500/40 shadow-2xl shadow-amber-500/10 bg-zinc-900">
                <Image
                  src="/images/products/chicken-shawarma-s.webp"
                  alt="Featured restaurant menu item"
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />

                <div className="absolute top-4 right-4 bg-zinc-950/90 border border-amber-400 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-xl backdrop-blur-md">
                  <div>
                    <span className="text-[10px] uppercase font-black text-amber-400 block leading-none">
                      Restaurant Favorite
                    </span>
                    <span className="text-xs font-black text-white">Deals Starting Rs. 250</span>
                  </div>
                </div>

                {/* Floating Bottom Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between backdrop-blur-md">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                      Authentic Pakistani Taste
                    </span>
                    <span className="text-xs font-extrabold text-white">
                      Zinger • Tikka • Shami • Shawarma
                    </span>
                  </div>
                  <Link
                    href="/menu"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-xl text-xs font-black transition-colors"
                  >
                    View All
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Shortcut Badges */}
      <section className="bg-zinc-900/80 border-b border-zinc-800 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
              Browse Categories
            </h2>
            <Link href="/menu" className="text-xs font-bold text-amber-400 hover:underline">
              See All 45 Items →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { id: 'deals', name: 'Student Deals', count: '14 Deals', icon: '🔥', highlight: true },
              { id: 'shawarma', name: 'Shawarma', count: '3 Items', icon: '🌯' },
              { id: 'platters-rolls', name: 'Platters & Rolls', count: '1 Item', icon: '🥙' },
              { id: 'zinger-burgers', name: 'Zinger Burgers', count: '5 Items', icon: '🍔' },
              { id: 'shami-burgers', name: 'Shami Burgers', count: '4 Items', icon: '🍔' },
              { id: 'chicken-burgers', name: 'Chicken Burgers', count: '3 Items', icon: '🍔' },
              { id: 'shappatta-rolls', name: 'Shappatta Roll', count: '4 Items', icon: '🥙' },
              { id: 'paratha-rolls', name: 'Paratha Rolls', count: '2 Items', icon: '🌯' },
              { id: 'fries', name: 'Fries', count: '2 Items', icon: '🍟' },
              { id: 'sandwiches', name: 'Sandwiches', count: '3 Items', icon: '🥪' },
              { id: 'soups', name: 'Soup', count: '2 Items', icon: '🍲' },
              { id: 'addons', name: 'Extras & Add-ons', count: '2 Items', icon: '➕' },
            ].map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className={`p-3.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 group ${
                  cat.highlight
                    ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'
                    : 'bg-zinc-950 border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900'
                }`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-xs font-bold text-white group-hover:text-amber-400">
                  {cat.name}
                </span>
                <span className="text-[10px] text-zinc-400">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Student Deals Section */}
      <section className="py-16 bg-zinc-950 border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500 text-zinc-950 font-black text-xs px-2.5 py-0.5 rounded uppercase">
                  Budget Friendly
                </span>
                <span className="text-xs text-amber-400 font-urdu font-bold">سٹوڈنٹ ڈیلز</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                Famous <span className="text-amber-400">Student Deals</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Every deal includes fresh crispy fries and cold drink. Verified from printed menu.
              </p>
            </div>
            <Link
              href="/menu?category=deals"
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-sm bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-amber-500/50 w-fit"
            >
              <span>View All 14 Student Deals</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      </section>

      {/* Signature Shawarmas */}
      <section className="py-16 bg-zinc-900/40 border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded uppercase">
                  House Specialty
                </span>
                <span className="text-xs text-amber-400 font-urdu font-bold">شوارما</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                Signature <span className="text-amber-400">Shawarma</span> Rolls
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Prepared with hot spiced chicken, crisp pickles, and our proprietary garlic mayo.
              </p>
            </div>
            <Link
              href="/menu?category=shawarma"
              className="text-amber-400 hover:underline font-bold text-sm"
            >
              Explore all 3 Shawarmas →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularShawarma.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Burgers */}
      <section className="py-16 bg-zinc-950 border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500 text-zinc-950 font-black text-xs px-2.5 py-0.5 rounded uppercase">
                  Freshly Prepared
                </span>
                <span className="text-xs text-amber-400 font-urdu font-bold">برگر</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                Crispy <span className="text-red-500">Zinger Burgers</span>
              </h2>
            </div>
            <Link
              href="/menu?category=zinger-burgers"
              className="text-amber-400 hover:underline font-bold text-sm"
            >
              View all burgers →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularBurgers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Dine-In QR Ordering Feature Box */}
      <section className="py-16 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold text-amber-300">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Contactless Table Service</span>
                </div>
                <h3 className="text-2xl md:text-4xl font-black text-white">
                  Dine-In At Our Restaurant? <br />
                  <span className="text-amber-400">Scan Your Table QR Code to Order</span>
                </h3>
                <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                  Scan a table QR code to open the menu with your table number selected. Place your order and follow
                  its progress while the kitchen prepares your meal.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link
                    href="/qr"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-6 py-3 rounded-xl text-sm transition-all"
                  >
                    Select Table / Scan QR
                  </Link>
                  <Link
                    href="/admin/tables"
                    className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Print QR Stands (Admin)</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center">
                <div className="bg-white p-6 rounded-3xl shadow-2xl text-zinc-950 text-center max-w-xs w-full">
                  <div className="w-12 h-12 bg-amber-400 rounded-full mx-auto mb-2 flex items-center justify-center font-black text-sm">
                    T01
                  </div>
                  <h4 className="font-black text-base">Table 01 QR</h4>
                  <p className="text-[11px] text-zinc-600 mb-3">Your Restaurant</p>
                  <div className="aspect-square bg-zinc-100 rounded-xl p-2 border border-zinc-200 flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-zinc-900" />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
                    Scan With Phone Camera
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
