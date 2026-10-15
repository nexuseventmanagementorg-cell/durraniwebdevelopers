"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BUSINESS_INFO, buildWhatsAppLink } from "@/lib/constants";
import {
  Menu,
  X,
  Calculator,
  Briefcase,
  Layers,
  PhoneCall,
  Search,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If in admin area, do not show public header
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navLinks = [
    { name: "Services", href: "/services", icon: Layers },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Pricing & Rates", href: "/pricing", icon: Sparkles },
    { name: "Budget Calculator", href: "/calculator", icon: Calculator },
    { name: "Track Order", href: "/track-order", icon: Search },
    { name: "Contact", href: "/contact", icon: PhoneCall },
  ];

  const defaultWhatsAppText =
    "Hello Durrani Web Developers! I am interested in discussing a custom web application project.";

  return (
    <header className="sticky top-0 z-50 bg-[#101216]/95 backdrop-blur-md border-b border-[#242830] text-white">
      {/* Top micro banner */}
      <div className="bg-[#E31E36] text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="hidden sm:inline">🚀 Looking for a high-performance web app?</span>
        <span>Transparent starting packages from PKR 35,000 with flexible 11-month installments!</span>
        <Link href="/calculator" className="underline font-bold hover:text-white/80 ml-1 inline-flex items-center gap-1">
          Calculate Now <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#E31E36] shadow-[0_0_15px_rgba(227,30,54,0.4)] flex-shrink-0 bg-black">
              <Image
                src="/logo.jpg"
                alt="Durrani Web Developers Logo"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight leading-none text-white group-hover:text-[#E31E36] transition-colors">
                DURRANI
                <span className="text-[#E31E36] ml-1">WEB DEVELOPERS</span>
              </div>
              <div className="text-[10px] tracking-widest uppercase text-gray-400 font-semibold mt-0.5">
                Ideas • Code • Real Solutions
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`transition-colors py-1 flex items-center gap-1.5 ${
                    isActive
                      ? "text-[#E31E36] font-bold border-b-2 border-[#E31E36]"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <link.icon className="w-4 h-4 opacity-70" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={buildWhatsAppLink(defaultWhatsAppText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#242830] hover:bg-[#2E3440] text-gray-200 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-700 transition"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              WhatsApp: {BUSINESS_INFO.phoneDisplay}
            </a>

            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-glow transition transform active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" />
              Build Your Web App
            </Link>

            <Link
              href="/admin/login"
              title="Admin Portal"
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#242830] transition text-xs"
            >
              <ShieldAlert className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#242830] focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#181B20] border-b border-[#242830] px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-[#E31E36] text-white font-semibold"
                      : "text-gray-300 hover:bg-[#242830] hover:text-white"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2">
            <a
              href={buildWhatsAppLink(defaultWhatsAppText)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-bold"
            >
              WhatsApp Us: {BUSINESS_INFO.phoneDisplay}
            </a>

            <Link
              href="/calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white py-2.5 rounded-lg text-xs font-bold"
            >
              <Calculator className="w-4 h-4" />
              Start Budget Calculator
            </Link>

            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-200 py-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Staff / Admin Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
