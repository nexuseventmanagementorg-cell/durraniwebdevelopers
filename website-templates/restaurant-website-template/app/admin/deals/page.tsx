'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Deal } from '@/types';

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/admin/deals');
      const data = await res.json();
      if (data.deals) setDeals(data.deals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/deals')
      .then(async (response) => {
        const data = await response.json();
        if (response.ok && data.deals) setDeals(data.deals);
      })
      .catch(() => setError('Could not load deals. Please refresh and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAvailability = async (deal: Deal) => {
    const updated = { ...deal, isAvailable: !deal.isAvailable };
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? updated : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    try {
      setError('');
      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDeal),
      });
      const data = await res.json();
      if (data.success && data.deal) {
        if (isNew) {
          setDeals((prev) => [...prev, data.deal]);
        } else {
          setDeals((prev) => prev.map((d) => (d.id === data.deal.id ? data.deal : d)));
        }
        setEditingDeal(null);
        setIsNew(false);
      } else {
        setError(data.error || 'Could not save this deal.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
  };

  const handleAddDeal = () => {
    const nextDealNumber = Math.max(0, ...deals.map((deal) => deal.dealNumber)) + 1;
    setEditingDeal({
      id: `custom-deal-${Date.now()}`,
      dealNumber: nextDealNumber,
      nameEn: '',
      nameUr: '',
      price: 0,
      components: [{ nameEn: '', nameUr: '', quantity: 1 }],
      descriptionEn: '',
      image: '',
      isAvailable: true,
      verifiedFromMenu: false,
    });
    setIsNew(true);
    setError('');
    setImageUploadError('');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !editingDeal) return;

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
      if (typeof imageData !== 'string') {
        setImageUploadError('Could not read this image file.');
        return;
      }
      setEditingDeal((deal) => (deal ? { ...deal, image: imageData } : deal));
    };
    reader.onerror = () => setImageUploadError('Could not read this image file.');
    reader.readAsDataURL(file);
  };

  const handleDeleteDeal = async (deal: Deal) => {
    if (!confirm(`Delete ${deal.nameEn}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/admin/deals?id=${encodeURIComponent(deal.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not delete this deal.');
        return;
      }
      setDeals((current) => current.filter((item) => item.id !== deal.id));
      setError('');
    } catch {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Student Deals Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage bundle components, prices in PKR, and availability of Deals 1 through 14.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchDeals}
            className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleAddDeal}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3.5 py-2 rounded-xl text-xs font-black"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Deals Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs">Loading deals...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] w-full bg-zinc-800">
                  <Image src={deal.image} alt={deal.nameEn} fill className="object-cover" />
                  <div className="absolute top-3 left-3 bg-amber-500 text-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-black">
                    Deal {deal.dealNumber}
                  </div>
                  {deal.isFamilyDeal && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                      Family Deal
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-zinc-950/90 border border-amber-400 px-3 py-1 rounded-xl text-amber-400 font-black text-sm">
                    Rs. {deal.price}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-white text-base">{deal.nameEn}</h3>
                    <span className="text-amber-400 font-urdu text-xs">{deal.nameUr}</span>
                  </div>

                  {/* Components */}
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 space-y-1.5 text-xs text-zinc-300">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">
                      Bundle Items:
                    </span>
                    {deal.components.map((c, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span>• {c.quantity} × {c.nameEn.replace(/^\d+\s+/, '')}</span>
                        <span className="text-zinc-500 font-urdu">{c.nameUr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between border-t border-zinc-800/60 mt-3 pt-3">
                <button
                  onClick={() => handleToggleAvailability(deal)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                    deal.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-red-950 text-red-300 border-red-800'
                  }`}
                >
                  {deal.isAvailable ? 'Active & Available' : 'Temporarily Off'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteDeal(deal)}
                    className="bg-red-950/60 hover:bg-red-900 text-red-300 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                    aria-label={`Delete ${deal.nameEn}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingDeal(deal);
                      setIsNew(false);
                      setImageUploadError('');
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Deal</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Deal Modal */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-white">
                {isNew ? 'Create Deal' : `Edit ${editingDeal.nameEn}`}
              </h3>
              <button
                onClick={() => {
                  setEditingDeal(null);
                  setIsNew(false);
                  setError('');
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label htmlFor="deal-number" className="text-zinc-300 font-bold block mb-1">
                  Deal Number
                </label>
                <input
                  id="deal-number"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={editingDeal.dealNumber}
                  onChange={(e) =>
                    setEditingDeal({ ...editingDeal, dealNumber: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="deal-name-en" className="text-zinc-300 font-bold block mb-1">
                  Deal Title (English)
                </label>
                <input
                  id="deal-name-en"
                  type="text"
                  required
                  value={editingDeal.nameEn}
                  onChange={(e) => setEditingDeal({ ...editingDeal, nameEn: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="deal-name-ur" className="text-zinc-300 font-bold block mb-1">
                  Deal Title (Urdu)
                </label>
                <input
                  id="deal-name-ur"
                  type="text"
                  required
                  value={editingDeal.nameUr}
                  onChange={(e) => setEditingDeal({ ...editingDeal, nameUr: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-urdu"
                />
              </div>

              <div>
                <label htmlFor="deal-price" className="text-zinc-300 font-bold block mb-1">
                  Price (PKR)
                </label>
                <input
                  id="deal-price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={editingDeal.price}
                  onChange={(e) =>
                    setEditingDeal({ ...editingDeal, price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label htmlFor="deal-image" className="text-zinc-300 font-bold block mb-1">
                  Image URL
                </label>
                <input
                  id="deal-image"
                  type="text"
                  required
                  value={editingDeal.image}
                  onChange={(e) => setEditingDeal({ ...editingDeal, image: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="deal-image-upload"
                  className="block text-zinc-300 font-bold"
                >
                  Or upload an image (JPG, PNG, WebP; max 4 MB)
                </label>
                <input
                  id="deal-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="block w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 file:mr-3 file:cursor-pointer file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:font-bold file:text-zinc-950 hover:file:bg-amber-400"
                />
                {imageUploadError && (
                  <p role="alert" className="text-xs text-red-300">
                    {imageUploadError}
                  </p>
                )}
                {editingDeal.image && (
                  <div className="relative h-36 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                    <Image
                      src={editingDeal.image}
                      alt={`${editingDeal.nameEn || 'Deal'} image preview`}
                      fill
                      unoptimized={editingDeal.image.startsWith('data:')}
                      className="object-contain"
                    />
                    <span className="absolute bottom-2 left-2 rounded-md bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-200">
                      Image preview
                    </span>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-zinc-300 font-bold">
                <input
                  type="checkbox"
                  checked={Boolean(editingDeal.isFamilyDeal)}
                  onChange={(e) =>
                    setEditingDeal({ ...editingDeal, isFamilyDeal: e.target.checked })
                  }
                />
                Mark as a family deal
              </label>

              <div>
                <label htmlFor="deal-description" className="text-zinc-300 font-bold block mb-1">
                  Description / Composition
                </label>
                <textarea
                  id="deal-description"
                  rows={2}
                  value={editingDeal.descriptionEn}
                  onChange={(e) =>
                    setEditingDeal({ ...editingDeal, descriptionEn: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Bundle Components</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingDeal({
                        ...editingDeal,
                        components: [
                          ...editingDeal.components,
                          { nameEn: '', nameUr: '', quantity: 1 },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-amber-400 font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add item
                  </button>
                </div>
                {editingDeal.components.map((component, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_76px_32px] gap-2">
                    <input
                      type="text"
                      required
                      aria-label={`Component ${index + 1} English name`}
                      placeholder="Item name"
                      value={component.nameEn}
                      onChange={(e) => {
                        const components = [...editingDeal.components];
                        components[index] = { ...component, nameEn: e.target.value };
                        setEditingDeal({ ...editingDeal, components });
                      }}
                      className="min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white"
                    />
                    <input
                      type="text"
                      aria-label={`Component ${index + 1} Urdu name`}
                      placeholder="Urdu name"
                      value={component.nameUr}
                      onChange={(e) => {
                        const components = [...editingDeal.components];
                        components[index] = { ...component, nameUr: e.target.value };
                        setEditingDeal({ ...editingDeal, components });
                      }}
                      className="min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white font-urdu"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      aria-label={`Component ${index + 1} quantity`}
                      value={component.quantity}
                      onChange={(e) => {
                        const components = [...editingDeal.components];
                        components[index] = { ...component, quantity: Number(e.target.value) };
                        setEditingDeal({ ...editingDeal, components });
                      }}
                      className="min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white"
                    />
                    <button
                      type="button"
                      disabled={editingDeal.components.length === 1}
                      aria-label={`Remove component ${index + 1}`}
                      onClick={() =>
                        setEditingDeal({
                          ...editingDeal,
                          components: editingDeal.components.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                      className="text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </section>

              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDeal(null);
                    setIsNew(false);
                    setError('');
                  }}
                  className="flex-1 bg-zinc-900 text-zinc-300 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl"
                >
                  {isNew ? 'Create Deal' : 'Save Deal Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
