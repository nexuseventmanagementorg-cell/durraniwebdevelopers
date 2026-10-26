'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
} from 'lucide-react';
import { Product } from '@/types';

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleAvailability = async (product: Product) => {
    const updated = { ...product, isAvailable: !product.isAvailable };
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (data.success && data.product) {
        if (isNew) {
          setProducts((prev) => [...prev, data.product]);
        } else {
          setProducts((prev) => prev.map((p) => (p.id === data.product.id ? data.product : p)));
        }
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setEditingProduct(null);
          setIsNew(false);
        }, 800);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageUploadError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setImageUploadError('Image must be 4 MB or smaller.');
      return;
    }

    setImageUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      if (typeof imageData === 'string') {
        setEditingProduct((product) =>
          product ? { ...product, image: imageData } : product
        );
      } else {
        setImageUploadError('Could not read this image file.');
      }
    };
    reader.onerror = () => setImageUploadError('Could not read this image file.');
    reader.readAsDataURL(file);
  };

  const handleAddNew = () => {
    const newId = `custom-item-${Date.now()}`;
    setEditingProduct({
      id: newId,
      nameEn: '',
      nameUr: '',
      categoryId: 'shawarma',
      price: 150,
      descriptionEn: '',
      descriptionUr: '',
      image: '/images/products/chicken-shawarma-s.webp',
      isAvailable: true,
      isFeatured: false,
      originalPriceFormat: '150/-',
      verifiedFromMenu: true,
      originalMenuSection: 'Custom Added',
    });
    setIsNew(true);
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.nameEn.toLowerCase().includes(q) ||
        p.nameUr.includes(q) ||
        p.price.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Menu Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Update prices, Urdu titles, images, and mark items in stock or sold out instantly.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search items, Urdu names, price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Categories ({products.length})</option>
            <option value="shawarma">Shawarma</option>
            <option value="platters-rolls">Platters &amp; Rolls</option>
            <option value="zinger-burgers">Zinger Burgers</option>
            <option value="shami-burgers">Shami Burgers</option>
            <option value="chicken-burgers">Chicken Burgers</option>
            <option value="shappatta-rolls">Shappatta Roll</option>
            <option value="paratha-rolls">Paratha Rolls</option>
            <option value="fries">Fries</option>
            <option value="sandwiches">Sandwiches</option>
            <option value="soups">Soup</option>
            <option value="addons">Extras &amp; Add-ons</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs">Loading products...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                product.isAvailable ? 'border-zinc-800' : 'border-red-900/50 bg-zinc-950'
              }`}
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-zinc-700">
                    <Image
                      src={product.image}
                      alt={product.nameEn}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{product.nameEn}</h3>
                    <p className="text-amber-400 font-urdu text-xs">{product.nameUr}</p>
                    <span className="text-xs font-black text-amber-400 mt-1 block">
                      Rs. {product.price}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                  {product.descriptionEn}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                {/* Stock Toggle Button */}
                <button
                  onClick={() => handleToggleAvailability(product)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    product.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {product.isAvailable ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>In Stock</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-red-400" />
                      <span>Sold Out</span>
                    </>
                  )}
                </button>

                {/* Edit & Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsNew(false);
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-white">
                {isNew ? 'Add New Product' : `Edit: ${editingProduct.nameEn}`}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">English Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nameEn}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameEn: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Urdu Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nameUr}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameUr: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-urdu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Category</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  >
                    {[
                      ['shawarma', 'Shawarma'],
                      ['platters-rolls', 'Platters & Rolls'],
                      ['zinger-burgers', 'Zinger Burgers'],
                      ['shami-burgers', 'Shami Burgers'],
                      ['chicken-burgers', 'Chicken Burgers'],
                      ['shappatta-rolls', 'Shappatta Roll'],
                      ['paratha-rolls', 'Paratha Rolls'],
                      ['fries', 'Fries'],
                      ['sandwiches', 'Sandwiches'],
                      ['soups', 'Soup'],
                      ['addons', 'Extras & Add-ons'],
                    ].map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Product Image</label>
                <input
                  type="text"
                  required
                  placeholder="Image URL or local path"
                  value={editingProduct.image}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, image: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="mt-2 block w-full text-[11px] text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:font-bold file:text-zinc-950"
                />
                <p className="mt-1 text-[10px] text-zinc-500">Upload an image up to 4 MB. It is saved with this menu item.</p>
                {imageUploadError && <p className="mt-1 text-[11px] text-red-400">{imageUploadError}</p>}
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.descriptionEn}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionEn: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isAvailable}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })
                    }
                    className="rounded border-zinc-700 text-amber-500"
                  />
                  <span className="text-zinc-300 font-semibold">Available In Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured || false}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })
                    }
                    className="rounded border-zinc-700 text-amber-500"
                  />
                  <span className="text-zinc-300 font-semibold">Featured on Homepage</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl"
                >
                  {saveSuccess ? 'Saved Successfully!' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
