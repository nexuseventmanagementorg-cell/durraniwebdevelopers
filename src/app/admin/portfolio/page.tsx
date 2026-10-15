"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { PortfolioProject } from "@/lib/types";
import { formatPKR } from "@/lib/constants";
import {
  Image as ImageIcon,
  Search,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  CheckCircle2,
  ExternalLink,
  X,
  ShieldCheck,
} from "lucide-react";

export default function AdminPortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioProject | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Restaurant web applications");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [techInput, setTechInput] = useState("Next.js, TypeScript, Tailwind CSS, Supabase");
  const [isPublic, setIsPublic] = useState(true);
  const [approvedBudget, setApprovedBudget] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("Starting Package with Admin Panel");
  const [clientConsent, setClientConsent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const categories = [
    "Restaurant web applications",
    "Restaurant order-taking applications",
    "E-commerce stores",
    "Jewellery stores",
    "Cosmetic and beauty stores",
    "Fashion stores",
    "Grocery stores",
    "SaaS applications",
    "Client management systems",
    "Booking and appointment systems",
    "Inventory and product management systems",
    "Custom business applications",
  ];

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/admin/portfolio");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const openNewModal = () => {
    setSelectedItem(null);
    setTitle("");
    setCategory("Restaurant web applications");
    setShortDesc("");
    setFullDesc("");
    setImageUrl("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80");
    setDemoUrl("");
    setTechInput("Next.js, TypeScript, Tailwind CSS, Supabase");
    setIsPublic(true);
    setApprovedBudget("45000");
    setBudgetLabel("Starting Package with Admin Panel");
    setClientConsent(true);
    setModalOpen(true);
  };

  const openEditModal = (item: PortfolioProject) => {
    setSelectedItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setShortDesc(item.shortDescription);
    setFullDesc(item.fullDescription || item.shortDescription);
    setImageUrl(item.imageUrl);
    setDemoUrl(item.demoUrl || "");
    setTechInput(item.technologies.join(", "));
    setIsPublic(item.isPublic);
    setApprovedBudget(item.approvedPublicBudget ? String(item.approvedPublicBudget) : "");
    setBudgetLabel(item.budgetLabel || "Starting Package");
    setClientConsent(Boolean(item.clientConsentForBudget));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !shortDesc.trim()) {
      alert("Title and short description are required.");
      return;
    }
    setSaving(true);

    try {
      const payload: Partial<PortfolioProject> = {
        id: selectedItem ? selectedItem.id : undefined,
        title,
        category,
        shortDescription: shortDesc,
        fullDescription: fullDesc,
        imageUrl,
        demoUrl,
        technologies: techInput.split(",").map((t) => t.trim()).filter(Boolean),
        isPublic,
        approvedPublicBudget: approvedBudget ? Number(approvedBudget) : undefined,
        budgetLabel,
        clientConsentForBudget: clientConsent,
      };

      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Portfolio item successfully saved!");
        setModalOpen(false);
        fetchPortfolio();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (item: PortfolioProject) => {
    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isPublic: !item.isPublic }),
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isPublic: !p.isPublic } : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPortfolio = portfolio.filter((p) => {
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Portfolio Management & Public Privacy"
          subtitle="Control public project visibility, demo links, and approved client budget disclosures"
          actionButton={
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Portfolio Project</span>
            </button>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search portfolio title, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Items: <strong>{portfolio.length}</strong>
            </span>
          </div>

          {/* Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolio.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-gray-900">
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-gray-700">
                      {item.category}
                    </div>
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow flex items-center gap-1 ${
                        item.isPublic
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-800 text-gray-300 border border-gray-600"
                      }`}
                    >
                      {item.isPublic ? (
                        <>
                          <Eye className="w-3 h-3" /> Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Private
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-extrabold text-sm text-[#101216]">{item.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.shortDescription}
                    </p>

                    <div className="pt-2 text-xs flex justify-between items-center text-gray-500">
                      <span>Public Budget:</span>
                      <strong className="text-[#E31E36]">
                        {item.approvedPublicBudget
                          ? formatPKR(item.approvedPublicBudget)
                          : "Hidden"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  {item.demoUrl ? (
                    <a
                      href={item.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#E31E36] font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      Demo <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400 text-[11px]">No Demo URL</span>
                  )}

                  <button
                    onClick={() => openEditModal(item)}
                    className="bg-white hover:bg-gray-100 text-[#101216] px-3 py-1.5 rounded-lg border border-gray-300 font-bold transition inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Portfolio Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {selectedItem ? "Edit Portfolio Item" : "New Portfolio Project"}
                </span>
                <h3 className="text-xl font-black text-[#101216]">
                  {selectedItem ? selectedItem.title : "Add New Showcase Project"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. SpiceCraft - Restaurant Ordering App"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216] font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Live Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://demo.vercel.app"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Image / Screenshot URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Technologies (Comma-separated)
                </label>
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  required
                />
              </div>

              {/* Privacy Controls */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="block text-gray-900 font-bold">Public Website Visibility</strong>
                    <span className="text-[11px] text-gray-500">
                      When enabled, this project appears on the public /portfolio page.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-[#E31E36] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Approved Public Budget (PKR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={approvedBudget}
                      onChange={(e) => setApprovedBudget(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-[#101216]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Budget Badge Label</label>
                    <input
                      type="text"
                      value={budgetLabel}
                      onChange={(e) => setBudgetLabel(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-[#101216]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={clientConsent}
                    onChange={(e) => setClientConsent(e.target.checked)}
                    className="accent-[#E31E36]"
                  />
                  <span>Client has given explicit consent for budget display in portfolio</span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Showcase Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
