'use client';

import React, { useState, useEffect, useMemo, Suspense, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Flame, Utensils, Sandwich, Layers, PlusCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Product, Deal } from '@/types';
import ProductCard from '@/components/ProductCard';
import DealCard from '@/components/DealCard';
import ProductModal from '@/components/ProductModal';

function MenuContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync category param if query param changes
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    startTransition(() => {
      setActiveCategory(cat);
      if (cat === 'all') setSearchQuery('');
    });
  }, [searchParams]);

  // Fetch menu data from API
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/menu', { signal: controller.signal })
      .then(async (response) => {
        const menuData = await response.json();
        if (menuData.products) setProducts(menuData.products);
        if (menuData.deals) setDeals(menuData.deals);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load menu data:', err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const categoryList = [
    { id: 'all', nameEn: 'All Items', nameUr: 'تمام آئٹمز', icon: Sparkles },
    { id: 'deals', nameEn: 'Student Deals (14)', nameUr: 'سٹوڈنٹ ڈیلز', icon: Flame, isDeal: true },
    { id: 'shawarma', nameEn: 'Shawarma (3)', nameUr: 'شوارما', icon: Utensils },
    { id: 'platters-rolls', nameEn: 'Platters & Rolls (1)', nameUr: 'پلیٹر اور رول', icon: Utensils },
    { id: 'zinger-burgers', nameEn: 'Zinger Burgers (5)', nameUr: 'زنگر برگر', icon: Sandwich },
    { id: 'shami-burgers', nameEn: 'Shami Burgers (4)', nameUr: 'شامی برگر', icon: Sandwich },
    { id: 'chicken-burgers', nameEn: 'Chicken Burgers (3)', nameUr: 'چکن برگر', icon: Sandwich },
    { id: 'shappatta-rolls', nameEn: 'Shappatta Roll (4)', nameUr: 'شپٹہ رول', icon: Utensils },
    { id: 'paratha-rolls', nameEn: 'Paratha Rolls (2)', nameUr: 'پراٹھا رول', icon: Utensils },
    { id: 'fries', nameEn: 'Fries (2)', nameUr: 'فرائز', icon: Utensils },
    { id: 'sandwiches', nameEn: 'Sandwiches (3)', nameUr: 'سینڈوچ', icon: Layers },
    { id: 'soups', nameEn: 'Soup (2)', nameUr: 'سوپ', icon: Utensils },
    { id: 'addons', nameEn: 'Extras & Add-ons (2)', nameUr: 'ایکسٹرا', icon: PlusCircle },
  ];

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'deals') return [];
    if (!searchQuery.trim()) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter(
      (d) =>
        d.nameEn.toLowerCase().includes(q) ||
        d.nameUr.includes(q) ||
        d.descriptionEn.toLowerCase().includes(q) ||
        d.components.some((c) => c.nameEn.toLowerCase().includes(q) || c.nameUr.includes(q))
    );
  }, [deals, activeCategory, searchQuery]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'deals') return [];
    let list = products;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.categoryId === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.nameEn.toLowerCase().includes(q) ||
          p.nameUr.includes(q) ||
          p.descriptionEn.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* Menu Header Banner */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 py-10 px-4">
        <div className="container mx-auto max-w-5xl text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-bold text-amber-400">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>Explore the menu and find your favorites</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black italic tracking-tight text-white">
            EXPLORE OUR MENU
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto">
            Choose from authentic shawarmas, crispy burgers, platters, and 14 value-packed Student Deals.
            Browse 31 updated menu items and 14 Student Deals.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative pt-2">
            <Search className="w-5 h-5 absolute left-3.5 top-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search shawarma, deal 13, zinger, tikka, wings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-5 text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Category Navigation */}
      <div className="sticky top-20 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shadow-md py-3 px-4">
        <div className="container mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {categoryList.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-950' : 'text-amber-400'}`} />
                <span>{cat.nameEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 py-10 max-w-7xl space-y-12">
        {loading ? (
          <div className="text-center py-20 text-zinc-400 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">Loading verified menu...</p>
          </div>
        ) : (
          <>
            {/* Deals Section (Show if activeCategory is 'all' or 'deals') */}
            {filteredDeals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-zinc-950 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                        High Value
                      </span>
                      <h2 className="text-2xl font-black text-white">Student Deals</h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Complete meal bundles with fries &amp; drinks • Deals 1 through 14
                    </p>
                  </div>
                  <span className="text-xs text-amber-400 font-bold bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
                    {filteredDeals.length} Deals
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            {filteredProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {activeCategory === 'all'
                        ? 'Individual Menu Items'
                        : categoryList.find((c) => c.id === activeCategory)?.nameEn}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Authentic recipes prepared fresh to order
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                    {filteredProducts.length} Items
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredDeals.length === 0 && filteredProducts.length === 0 && (
              <div className="text-center py-20 text-zinc-400 space-y-4 bg-zinc-900/40 rounded-3xl border border-zinc-800">
                <p className="text-4xl">🔍</p>
                <h3 className="text-lg font-bold text-white">No menu items found</h3>
                <p className="text-xs max-w-sm mx-auto">
                  We couldn&apos;t find any products matching &quot;{searchQuery}&quot;. Try searching for &quot;shawarma&quot;, &quot;zinger&quot;, or &quot;deal 3&quot;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="bg-amber-500 text-zinc-950 font-black px-5 py-2 rounded-xl text-xs hover:bg-amber-400 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          Loading menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
