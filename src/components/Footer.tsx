"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BUSINESS_INFO, buildWhatsAppLink } from "@/lib/constants";
import RegionalPrice from "./RegionalPrice";
import CurrencySelector from "./CurrencySelector";
import {
  Mail,
  Phone,
  MessageSquare,
  ShieldCheck,
  Server,
  ExternalLink,
  Code2,
  CheckCircle2,
  Calculator,
  Eye,
  Globe,
} from "lucide-react";

interface AllTimeVisitorCounts {
  visitor: number;
  calculator: number;
  estimator: number;
}

export default function Footer() {
  const pathname = usePathname();
  const [visitorCounts, setVisitorCounts] = useState<AllTimeVisitorCounts | null>(null);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);

  const refreshVisitorCounts = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/public/analytics", { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Visitor analytics are unavailable.");
      }
      setVisitorCounts(result.counts as AllTimeVisitorCounts);
      setAnalyticsUnavailable(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not refresh all-time visitor counts", error);
      setAnalyticsUnavailable(true);
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const controller = new AbortController();
    void refreshVisitorCounts(controller.signal);
    const interval = window.setInterval(() => void refreshVisitorCounts(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [pathname, refreshVisitorCounts]);

  // Do not render public footer in admin panel
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const services = [
    { name: "Restaurant Web Applications", href: "/services" },
    { name: "Restaurant Order-Taking Apps", href: "/services" },
    { name: "E-Commerce Stores", href: "/services" },
    { name: "Jewellery Showroom Systems", href: "/services" },
    { name: "Cosmetic & Beauty Stores", href: "/services" },
    { name: "Fashion & Apparel Apps", href: "/services" },
    { name: "Grocery Delivery Solutions", href: "/services" },
    { name: "SaaS & Multi-Tenant Systems", href: "/services" },
  ];

  return (
    <footer className="bg-[#101216] border-t border-[#242830] text-gray-300 text-sm">
      {/* Top CTA Band */}
      <div className="bg-[#181B20] border-b border-[#242830] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[#E31E36] font-bold text-xs uppercase tracking-widest">
              Ready to automate and elevate your business?
            </span>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              Let’s Build Your Production Web Application Today
            </h3>
            <p className="text-gray-400 text-sm max-w-xl mt-1">
              Starting from <RegionalPrice pkrAmount={35000} /> (PKR 35,000 Pakistan base); plans and currency adjust for your selected region.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/calculator"
              className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-3 rounded-lg font-bold text-xs sm:text-sm shadow-glow transition"
            >
              Start Budget Calculator
            </Link>
            <a
              href={buildWhatsAppLink("Hello! I want to discuss a new web application project with Durrani Web Developers.")}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#E31E36] bg-black">
                <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight">
                  DURRANI <span className="text-[#E31E36]">WEB DEVELOPERS</span>
                </span>
                <p className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
                  Ideas • Code • Real Solutions
                </p>
              </div>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
              We engineer custom, scalable, and secure web applications for modern businesses across Pakistan and internationally. From e-commerce and restaurant order management to bespoke SaaS portals.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <Mail className="w-4 h-4 text-[#E31E36]" />
                <a href={`mailto:${BUSINESS_INFO.email}`} className="hover:text-white underline">
                  {BUSINESS_INFO.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Phone className="w-4 h-4 text-emerald-500" />
                <a href={`tel:${BUSINESS_INFO.phone}`} className="hover:text-white">
                  {BUSINESS_INFO.phoneDisplay} (Call & WhatsApp)
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Server className="w-4 h-4 text-[#E31E36]" />
                <span>Engineered for Vercel & Supabase PostgreSQL</span>
              </div>
            </div>
          </div>

          {/* Service Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 border-l-2 border-[#E31E36] pl-2">
              Our Web Applications
            </h4>
            <ul className="space-y-2 text-xs">
              {services.slice(0, 5).map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-gray-400 hover:text-white transition">
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/services" className="text-[#E31E36] font-semibold hover:underline inline-flex items-center gap-1">
                  View All Services <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 border-l-2 border-[#E31E36] pl-2">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link href="/workforce" className="hover:text-white transition">
                  AI Agency Workforce (50 Specialists)
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-white transition">
                  Completed Projects & Demos
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-white transition">
                  Ready-Made Website Templates
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition">
                  Starting Packages & Installments
                </Link>
              </li>
              <li>
                <Link href="/calculator" className="hover:text-white transition">
                  Interactive Budget Calculator
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition">
                  Track Your Inquiry Status
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Us & Inquiry Form
                </Link>
              </li>
              <li className="pt-2">
                <Link href="/admin/login" className="text-gray-400 hover:text-[#E31E36] flex items-center gap-1.5 transition">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Transparency & Disclaimer notes */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 border-l-2 border-[#E31E36] pl-2">
              Pricing Transparency
            </h4>
            <div className="bg-[#181B20] p-3 rounded-lg border border-[#242830] text-[11px] text-gray-400 space-y-2 leading-relaxed">
              <div className="flex items-start gap-1.5 text-gray-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Prices for your selected region</span>
              </div>
              <CurrencySelector className="w-full rounded-md border border-gray-700 bg-[#101216] px-2 py-1.5 text-gray-200" />
              <p>
                International base packages are doubled from Pakistan rates and converted using the latest exchange rate; each add-on is 100 units in the selected currency. Final quotation follows scope review.
              </p>
              <p>This site is written in English. Use your browser&apos;s built-in translate feature to read it in another language.</p>
              <p>
                We do not provide, purchase, or manage third-party subscriptions, paid domains, payment gateway accounts, or external API accounts. Clients arrange and pay providers directly when needed. Our Vercel deployment work is included in the agreed web app budget; there is no separate deployment fee. Paid Vercel hosting plans are not included.
              </p>
            </div>
          </div>
        </div>

        <section
          aria-labelledby="visitor-counts-heading"
          className="mt-10 rounded-2xl border border-[#30343c] bg-[#181B20] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="visitor-counts-heading" className="text-base font-bold text-white">
                All-time Website Visitors
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                All-time unique visitors; refreshed every 30 seconds.
              </p>
            </div>
            {analyticsUnavailable && (
              <span role="status" className="text-xs text-amber-300">
                Visitor counts temporarily unavailable
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { event: "visitor", label: "Unique visitors", icon: Eye },
              { event: "calculator", label: "Budget calculator users", icon: Calculator },
              { event: "estimator", label: "URL estimator users", icon: Globe },
            ] as const).map(({ event, label, icon: Icon }) => (
              <div key={event} className="flex items-center gap-3 rounded-xl border border-[#30343c] bg-[#101216] p-4">
                <Icon className="h-5 w-5 shrink-0 text-[#E31E36]" aria-hidden="true" />
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {analyticsUnavailable ? "—" : visitorCounts ? visitorCounts[event].toLocaleString() : "…"}
                  </div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#242830] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Regional currency estimates</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-[#E31E36]" /> Built with Google Antigravity &amp; Visual Studio Code
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
