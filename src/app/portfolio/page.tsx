"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PortfolioProject } from "@/lib/types";
import RegionalPrice from "@/components/RegionalPrice";
import PortfolioOffer from "@/components/PortfolioOffer";
import {
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Calculator,
  ShieldCheck,
  X,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

export default function PortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [modalProject, setModalProject] = useState<PortfolioProject | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await fetch("/api/public/portfolio");
        const data = await res.json();
        if (data.success) {
          setProjects(data.portfolio);
        }
      } catch (err) {
        console.error("Error loading portfolio", err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  const categories = ["All", ...Array.from(new Set(projects.map((project) => project.category)))];

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.technologies.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#101216] text-white py-16 border-b border-[#242830]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            Client Success & Production Apps
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Verified Client Projects
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Explore real websites and applications developed by Durrani Web Developers. We add projects to our portfolio after they are live and ready to view.
          </p>

          <div className="pt-2">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-glow transition"
            >
              <Calculator className="w-4 h-4" />
              Build a Project Like These
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search & Category Filter Toolbar */}
        <div className="bg-[#F4F5F7] p-4 sm:p-6 rounded-2xl border border-gray-200 mb-10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by project name, tech, or feature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36] focus:ring-1 focus:ring-[#E31E36]"
              />
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing <strong className="text-[#101216]">{filteredProjects.length}</strong> public projects
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition ${
                    isSelected
                      ? "bg-[#E31E36] text-white shadow-sm"
                      : "bg-white text-gray-600 hover:text-[#101216] border border-gray-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Portfolio Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-semibold">Loading verified portfolio projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">No public projects found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No public projects matched your search criteria. Try selecting another category or clear your search term.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="mt-4 text-xs font-bold text-[#E31E36] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-400 shadow-sm hover:shadow-card transition flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-52 w-full bg-gray-900 overflow-hidden cursor-pointer" onClick={() => setModalProject(project)}>
                    <Image
                      src={project.imageUrl}
                      alt={project.title}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      priority={index === 0}
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#101216]/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-gray-700">
                      {project.category}
                    </div>
                    {(project.availabilityStatus || project.status) && (
                      <div className={`absolute top-3 right-3 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow ${
                        project.availabilityStatus === "Offline" ? "bg-red-700" : "bg-emerald-600"
                      }`}>
                        {project.availabilityStatus || project.status}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3
                      onClick={() => setModalProject(project)}
                      className="font-extrabold text-lg text-[#101216] group-hover:text-[#E31E36] transition-colors cursor-pointer"
                    >
                      {project.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {project.shortDescription}
                    </p>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="bg-[#F4F5F7] text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block break-all text-[10px] font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-[#E31E36]"
                      >
                        {project.demoUrl}
                      </a>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex flex-col gap-3">
                  {project.approvedPublicBudget ? (
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">
                        {project.budgetLabel || "Publicly Approved Budget"}
                      </span>
                      <strong className="text-sm font-black text-[#E31E36]">
                        <RegionalPrice pkrAmount={project.approvedPublicBudget} conversion="historical-fx" />
                      </strong>
                      {project.budgetLabel === "Actual Project Fee" && (
                        <span className="block text-[9px] text-gray-500">
                          Original Pakistan fee; foreign currency is direct FX conversion
                        </span>
                      )}
                      {project.budgetLabel === "Estimated Build Price" && (
                        <span className="block text-[9px] text-gray-500">
                          New-build estimate based on visible features
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Custom Enterprise Scope</span>
                  )}
                  <PortfolioOffer project={project} />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => setModalProject(project)}
                      className="text-xs font-bold text-gray-600 hover:text-[#101216] bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition"
                    >
                      Details
                    </button>
                    {project.templateAvailable !== false && (
                      <Link
                        href={`/templates?template=${encodeURIComponent(project.id)}`}
                        className="text-xs font-bold text-white bg-[#E31E36] hover:bg-[#C8162D] px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        Make it yours
                      </Link>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-white bg-[#101216] hover:bg-[#E31E36] px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                      >
                        {project.availabilityStatus === "Offline" ? "Website Offline" : "Live Website"} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy & Disclosures Note */}
        <div className="mt-16 bg-[#F4F5F7] p-6 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#E31E36] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-[#101216]">Client Privacy & Budget Estimates</h4>
            <p className="leading-relaxed text-[11px]">
              Durrani Web Developers strictly protects client confidentiality. We never publish private client contact records, outstanding balances, or internal correspondence. Amounts labelled “Estimated Calculator Budget” or “Estimated Build Price” are estimates based on publicly visible features and current calculator rates; they are not the client&apos;s confirmed invoice or agreed project fee. Final pricing depends on verified scope.
            </p>
          </div>
        </div>
      </div>

      {/* Project Detail Modal */}
      {modalProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl relative">
            <button
              onClick={() => setModalProject(null)}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-64 w-full bg-black">
              <Image
                src={modalProject.imageUrl}
                alt={modalProject.title}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              <div className="absolute bottom-4 left-6 text-white">
                <span className="bg-[#E31E36] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {modalProject.category}
                </span>
                <h3 className="text-xl font-black mt-1.5">{modalProject.title}</h3>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Overview</h4>
                <p className="text-sm text-gray-700 leading-relaxed mt-1">
                  {modalProject.fullDescription || modalProject.shortDescription}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technologies Used</h4>
                <div className="flex flex-wrap gap-2">
                  {modalProject.technologies.map((t) => (
                    <span
                      key={t}
                      className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-md font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {modalProject.demoUrl && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Website link</h4>
                  <a
                    href={modalProject.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-[#E31E36]"
                  >
                    {modalProject.demoUrl}
                  </a>
                </div>
              )}
              <PortfolioOffer project={modalProject} />

              {modalProject.approvedPublicBudget && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 font-semibold block">
                      {modalProject.budgetLabel || "Consented Project Budget"}
                    </span>
                    <span className="text-lg font-black text-[#E31E36]">
                      <RegionalPrice pkrAmount={modalProject.approvedPublicBudget} conversion="historical-fx" />
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium max-w-[200px] text-right">
                    {modalProject.clientConsentForBudget
                      ? "Approved by client for portfolio publication"
                      : modalProject.budgetLabel === "Estimated Calculator Budget" ||
                          modalProject.budgetLabel === "Estimated Build Price"
                        ? "Calculator-based estimate; final price depends on confirmed scope"
                        : "Budget not published"}
                  </span>
                </div>
              )}
              {(modalProject.budgetLabel === "Estimated Calculator Budget" ||
                modalProject.budgetLabel === "Estimated Build Price") && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {modalProject.budgetLabel === "Estimated Build Price"
                    ? `Estimated new-build scope uses the ${modalProject.templatePricingPackage?.replaceAll("_", " ") || "matching published"} package starting at PKR ${modalProject.templateStartingPrice?.toLocaleString("en-PK") || "the published rate"}, plus the listed feature add-ons. Final scope and price require confirmation.`
                    : "Estimate assumes the PKR 45,000 client-admin package plus the PKR 10,000 Supabase database add-on. Vercel deployment work is included in the web-app budget. We do not provide payment gateway accounts or other third-party accounts/subscriptions; clients arrange and pay providers directly."}
                </p>
              )}
              {modalProject.budgetLabel === "Actual Project Fee" && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  Confirmed original Pakistan project fee. For visitors using another currency, the amount above is converted at the current exchange rate only; it is not the quote for a new international build.
                </p>
              )}

              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {modalProject.demoUrl ? (
                    <a
                      href={modalProject.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#101216] hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold text-xs"
                    >
                      Visit Live Website <ExternalLink className="w-3.5 h-3.5 text-[#E31E36]" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Private Client Deployment</span>
                  )}
                  {modalProject.templateAvailable !== false && (
                    <Link
                      href={`/templates?template=${encodeURIComponent(modalProject.id)}`}
                      className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-4 py-2.5 rounded-xl font-bold text-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Make it yours
                    </Link>
                  )}
                  <Link
                    href={`/calculator?inspiration=${encodeURIComponent(modalProject.title)}`}
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-[#101216] px-4 py-2.5 rounded-xl font-bold text-xs"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Estimate Similar Project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
