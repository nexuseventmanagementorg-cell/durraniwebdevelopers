import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPKR, DEFAULT_PRICING_CONFIG, buildWhatsAppLink } from "@/lib/constants";
import {
  Check,
  X as CrossIcon,
  Sparkles,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight,
  ChevronRight,
  Info,
} from "lucide-react";

export default function PricingPage() {
  const addons = Object.values(DEFAULT_PRICING_CONFIG.addons);

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#101216] text-white py-16 border-b border-[#242830]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            Transparent Development Rates
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Clear, Predictable Web App Pricing
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Choose between our managed backend solution or an autonomous client admin dashboard. Start with a modest advance and pay the remaining balance across 11 monthly installments.
          </p>

          <div className="pt-2">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-glow transition"
            >
              <Calculator className="w-4 h-4" />
              Configure In Interactive Budget Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* Main Pricing Cards */}
      <section className="py-20 bg-[#F4F5F7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#E31E36] uppercase tracking-wider">
              Starting Packages (1 Year 365 Days Duration)
            </span>
            <h2 className="text-3xl font-black text-[#101216] mt-1">
              Select The Right Administrative Scope
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Note: These represent starting package prices for standard builds. Advanced integrations adjust according to your specific functional scope.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Package 1: Without Admin Panel */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                    Package 1
                  </span>
                  <span className="text-xs font-bold text-gray-500">Managed Tier</span>
                </div>

                <h3 className="text-2xl font-black text-[#101216] mt-4">
                  Web Application Development
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  (Without Client Admin Panel Support)
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#101216]">PKR 35,000</span>
                  <span className="text-xs text-gray-500 font-medium">starting price</span>
                </div>

                {/* Daily Cost */}
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center text-gray-600">
                  <span>Daily Cost:</span>
                  <strong className="text-[#101216] font-bold">PKR 95.89 (per day)</strong>
                </div>

                {/* 12-Month Installment Schedule Card */}
                <div className="mt-6 bg-[#F4F5F7] p-5 rounded-xl border border-gray-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center font-semibold text-gray-700 pb-2 border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#E31E36]" />
                      Advance Payment (at start):
                    </span>
                    <strong className="text-[#101216] font-black">{formatPKR(10000)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pb-2 border-b border-gray-200">
                    <span>Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(25000)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      10 Monthly Installments:
                    </span>
                    <strong className="text-[#101216] font-black">PKR 2,272.73 / mo</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pt-1 text-[11px]">
                    <span>11th & Final Adjusted Installment:</span>
                    <strong className="text-[#E31E36] font-bold">PKR 2,272.70</strong>
                  </div>
                </div>

                {/* Scope specifics */}
                <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Complete custom responsive web application</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>SEO friendly structure & fast Vercel deployment</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Social media, contact forms & WhatsApp links</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CrossIcon className="w-4 h-4 text-[#E31E36] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-500 line-through">Direct client admin login credentials</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-[11px] leading-relaxed">
                      Durrani Web Developers manages the backend updates exclusively. Changes are requested via support.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <Link
                  href="/calculator?package=without_admin"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#101216] hover:bg-black text-white py-3 rounded-xl font-bold text-xs transition"
                >
                  Configure Package 1 In Calculator
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Package 2: With Client Admin Panel */}
            <div className="bg-white rounded-2xl border-2 border-[#E31E36] p-8 shadow-glow flex flex-col justify-between relative">
              <div className="absolute -top-3.5 right-6 bg-[#E31E36] text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                Recommended For Growing Businesses
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#E31E36] uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full">
                    Package 2
                  </span>
                  <span className="text-xs font-bold text-emerald-600">Client Autonomy</span>
                </div>

                <h3 className="text-2xl font-black text-[#101216] mt-4">
                  Web Application Development
                </h3>
                <p className="text-xs text-[#E31E36] font-bold mt-0.5">
                  (With Client Admin Panel Support)
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#E31E36]">PKR 45,000</span>
                  <span className="text-xs text-gray-500 font-medium">starting price</span>
                </div>

                {/* Daily Cost */}
                <div className="mt-3 bg-red-50/60 p-3 rounded-lg border border-red-200 text-xs flex justify-between items-center text-gray-700">
                  <span>Daily Cost:</span>
                  <strong className="text-[#E31E36] font-bold">PKR 123.29 (per day)</strong>
                </div>

                {/* 12-Month Installment Schedule Card */}
                <div className="mt-6 bg-[#F4F5F7] p-5 rounded-xl border border-gray-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center font-semibold text-gray-700 pb-2 border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#E31E36]" />
                      Advance Payment (at start):
                    </span>
                    <strong className="text-[#101216] font-black">{formatPKR(10000)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pb-2 border-b border-gray-200">
                    <span>Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(35000)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      10 Monthly Installments:
                    </span>
                    <strong className="text-[#E31E36] font-black">PKR 3,181.82 / mo</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pt-1 text-[11px]">
                    <span>11th & Final Adjusted Installment:</span>
                    <strong className="text-[#E31E36] font-bold">PKR 3,181.80</strong>
                  </div>
                </div>

                {/* Scope specifics */}
                <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Complete custom responsive web application</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Full, dedicated client admin dashboard login</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Manage products, orders, customers, & categories</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Real-time order status tracking & inventory management</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-[11px] leading-relaxed">
                      Gives your business full autonomy to update products, prices, stock, and orders without ongoing developer fees for routine changes.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <Link
                  href="/calculator?package=with_admin"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition"
                >
                  Configure Package 2 In Calculator
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Optional Feature Add-ons List */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Modular Extensions
            </span>
            <h2 className="text-3xl font-black text-[#101216] mt-1">
              Optional Add-on Features & Integrations
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Every add-on is completely optional. Choose only what your business genuinely needs. Configurable starting rules (+PKR 10,000 each).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className="bg-[#F4F5F7] p-5 rounded-2xl border border-gray-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-white px-2 py-0.5 rounded">
                      {addon.category}
                    </span>
                    <strong className="text-xs font-black text-[#E31E36]">
                      +{formatPKR(addon.price)}
                    </strong>
                  </div>
                  <h3 className="font-bold text-sm text-[#101216] mb-1">
                    {addon.label}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {addon.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <Link
                    href={`/calculator?addon=${addon.id}`}
                    className="text-xs font-bold text-[#E31E36] hover:underline inline-flex items-center gap-1"
                  >
                    Select in Calculator &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Critical Pricing Disclaimers & Rules */}
      <section className="py-16 bg-[#F4F5F7] border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-300 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 text-[#E31E36]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-black text-base text-[#101216]">
                Important Pricing & Service Scope Rules
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#E31E36] mt-0.5">•</span>
                <span>
                  <strong>Starting Estimates, Not Fixed Guarantees:</strong> Starting rates apply to standard scopes. Highly custom workflows or large multi-tiered systems are priced based on the final agreed requirements.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#E31E36] mt-0.5">•</span>
                <span>
                  <strong>Third-Party Costs Are Separate:</strong> Custom domains (.com, .pk), paid SMS/WhatsApp API bundles, and payment gateway merchant transaction percentages are billed by their respective providers.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#E31E36] mt-0.5">•</span>
                <span>
                  <strong>Payment Verification:</strong> Payments made via JazzCash, EasyPaisa, or Bank Transfer require admin verification before milestone status advances.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#E31E36] mt-0.5">•</span>
                <span>
                  <strong>No Exaggerated Promises:</strong> We believe in honest engineering. We never promise unlimited revisions, lifetime free third-party servers, or features outside the signed scope.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
