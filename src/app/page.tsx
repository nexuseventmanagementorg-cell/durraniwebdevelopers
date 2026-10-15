import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BUSINESS_INFO,
  formatPKR,
  buildWhatsAppLink,
} from "@/lib/constants";
import { DataStore } from "@/lib/store";
import {
  Calculator,
  ArrowRight,
  CheckCircle2,
  Code2,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  Utensils,
  ShoppingBag,
  Gem,
  Sparkle,
  Shirt,
  Apple,
  Cpu,
  HelpCircle,
  PhoneCall,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const portfolioHighlights = DataStore.getPortfolio(false).slice(0, 3);

  const processSteps = [
    {
      step: "01",
      title: "Requirements & Calculator",
      desc: "Complete our interactive questionnaire. The system instantly calculates your estimated transparent budget.",
      icon: Calculator,
    },
    {
      step: "02",
      title: "Direct WhatsApp Review",
      desc: "Durrani Web Developers personally reviews your requirements, confirms timeline, and clarifies technical scope.",
      icon: PhoneCall,
    },
    {
      step: "03",
      title: "Scope & Advance Payment",
      desc: "Advance payment (PKR 10,000 starting) is verified via JazzCash, EasyPaisa, or direct Bank Transfer.",
      icon: ShieldCheck,
    },
    {
      step: "04",
      title: "Architecture & Development",
      desc: "We build your application using modern Next.js, TypeScript, Tailwind, and Supabase cloud database.",
      icon: Code2,
    },
    {
      step: "05",
      title: "Testing & Vercel Delivery",
      desc: "Final testing, deployment to Vercel, training handover, and initiation of agreed installment milestones.",
      icon: CheckCircle2,
    },
  ];

  const industries = [
    { name: "Restaurant Web Apps", icon: Utensils, desc: "Digital menus, online table booking, and WhatsApp kitchen orders." },
    { name: "E-Commerce Stores", icon: ShoppingBag, desc: "High-conversion product catalogs with cart, coupons, and local payments." },
    { name: "SaaS Projects", icon: Cpu, desc: "Multi-tenant cloud platforms with client portals and subscription management." },
    { name: "Order Taking Apps", icon: Layers, desc: "Streamlined operational checkout systems for fast-paced businesses." },
    { name: "Jewellery Stores", icon: Gem, desc: "Luxury product galleries with carat/gold pricing logic and quote requests." },
    { name: "Cosmetics & Beauty", icon: Sparkle, desc: "Shade filters, beauty quizzes, inventory tracking, and flash sales." },
    { name: "Fashion Stores", icon: Shirt, desc: "Editorial lookbooks, size charts, variant management, and mobile commerce." },
    { name: "Grocery Stores", icon: Apple, desc: "Hyperlocal fast ordering, pin-code delivery slots, and bulk discounting." },
  ];

  const faqs = [
    {
      q: "What is the difference between having Client Admin Access and not having it?",
      a: "With our PKR 35,000 package (Without Client Admin Access), Durrani Web Developers maintains the backend administration exclusively for you. You do not receive admin dashboard login credentials; catalog and backend changes are handled by our team. With the PKR 45,000 package, you receive your own secure, dedicated client dashboard to manage products, categories, orders, customers, and inventory independently.",
    },
    {
      q: "How does the 11-month installment plan work?",
      a: "To make enterprise-grade software accessible to businesses, our starting packages allow an initial PKR 10,000 advance, with the remaining balance spread evenly across 11 monthly installments (e.g. 10 installments of PKR 2,272.73 and a final adjustment of PKR 2,272.70 for the PKR 35,000 package). Exact schedules are formalized upon scope approval.",
    },
    {
      q: "Are domain names and cloud hosting included in the price?",
      a: "Deployment to Vercel and initial architecture setup are included. Custom top-level domains (such as .com or .pk) and any paid third-party API tiers or payment gateway merchant account fees are paid directly to the respective providers by the client.",
    },
    {
      q: "Can I customize the features and add special integrations?",
      a: "Yes! Our budget calculator allows you to select optional add-ons like Google OAuth, Supabase PostgreSQL, JazzCash/EasyPaisa checkout, AI chatbots, and bespoke software workflows (starting at +PKR 10,000 each).",
    },
    {
      q: "How quickly can my web application be delivered?",
      a: "Standard starting web applications are typically delivered within 2 to 4 weeks depending on feature complexity and prompt asset submission.",
    },
  ];

  return (
    <div className="bg-[#FFFFFF] text-[#101216]">
      {/* 1. HERO SECTION */}
      <section className="relative bg-[#101216] text-white pt-20 pb-24 overflow-hidden border-b border-[#242830]">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f242d_1px,transparent_1px),linear-gradient(to_bottom,#1f242d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#242830] border border-[#E31E36]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-200">
                <span className="w-2 h-2 rounded-full bg-[#E31E36] animate-ping" />
                <span className="text-[#E31E36] font-bold">Durrani Web Developers</span>
                <span className="text-gray-400">• Your Vision, Our Development</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                We Turn Your Ideas Into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E31E36] via-red-500 to-rose-400">
                  Powerful Web Applications
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
                We build modern, fast, and scalable web applications that help your business grow. From custom e-commerce stores and restaurant ordering systems to comprehensive SaaS platforms.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/calculator"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-glow transition duration-200 transform hover:-translate-y-0.5"
                >
                  <Calculator className="w-4 h-4" />
                  Build Your Web App
                </Link>

                <Link
                  href="/portfolio"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#242830] hover:bg-[#2E3440] text-white px-7 py-3.5 rounded-xl font-bold text-sm border border-gray-700 transition duration-200"
                >
                  Explore Our Work
                  <ArrowRight className="w-4 h-4 text-[#E31E36]" />
                </Link>
              </div>

              {/* 4 Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-gray-800 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#E31E36]" />
                  <span>Modern Tech</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#E31E36]" />
                  <span>Clean & Scalable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#E31E36]" />
                  <span>On-Time Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E31E36]" />
                  <span>Long-Term Support</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Flyer Graphic */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-gradient-to-b from-[#242830] to-[#181B20] p-4 rounded-2xl border border-gray-700 shadow-card-dark">
                <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-gray-800">
                  <Image
                    src="/rates-flyer.jpg"
                    alt="Durrani Web Developers Pricing and Rates Flyer"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs px-2 text-gray-400">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified Pricing Structure
                  </span>
                  <Link href="/pricing" className="text-[#E31E36] font-bold hover:underline">
                    View Full Rate Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR RATES & PACKAGES SECTION */}
      <section className="py-20 bg-[#F4F5F7] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-red-100 px-3 py-1 rounded-full">
              Our Rates & Packages
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#101216] mt-3">
              Flexible Packages For Your Web Application
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              Transparent starting rates with easy installment options. All prices in Pakistani Rupees (PKR).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Package 1: Without Admin Panel */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-400 p-8 shadow-sm transition-all relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#101216]">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                    Package 1
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-[#101216]">
                  Web Application Development
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  (Without Client Admin Panel Support)
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#101216]">PKR 35,000</span>
                  <span className="text-xs text-gray-500">starting price</span>
                </div>

                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center text-gray-600">
                  <span>Daily Cost:</span>
                  <strong className="text-[#101216] font-bold">PKR 95.89 (per day)</strong>
                </div>

                {/* Payment Breakdown */}
                <div className="mt-6 space-y-3 bg-[#F4F5F7] p-4 rounded-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Advance Payment (at the start):</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(10000)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(25000)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Payment (for 11 months):</span>
                    <strong className="text-[#E31E36] font-bold">PKR 2,272.73 / mo</strong>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mt-4 leading-relaxed italic">
                  * Durrani Web Developers maintains the backend administration exclusively. Changes to products and content are requested via support.
                </p>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/calculator?package=without_admin"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#101216] hover:bg-black text-white py-3 rounded-xl font-bold text-xs transition"
                >
                  Calculate With This Package
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Package 2: With Client Admin Panel */}
            <div className="bg-white rounded-2xl border-2 border-[#E31E36] p-8 shadow-glow relative flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 bg-[#E31E36] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#E31E36]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-[#E31E36] uppercase tracking-wider bg-red-100 px-3 py-1 rounded-full">
                    Package 2
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-[#101216]">
                  Web Application Development
                </h3>
                <p className="text-xs text-[#E31E36] font-bold mt-0.5">
                  (With Client Admin Panel Support)
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#E31E36]">PKR 45,000</span>
                  <span className="text-xs text-gray-500">starting price</span>
                </div>

                <div className="mt-3 bg-red-50/60 p-3 rounded-lg border border-red-200 text-xs flex justify-between items-center text-gray-700">
                  <span>Daily Cost:</span>
                  <strong className="text-[#E31E36] font-bold">PKR 123.29 (per day)</strong>
                </div>

                {/* Payment Breakdown */}
                <div className="mt-6 space-y-3 bg-[#F4F5F7] p-4 rounded-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Advance Payment (at the start):</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(10000)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold">{formatPKR(35000)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Payment (for 11 months):</span>
                    <strong className="text-[#E31E36] font-bold">PKR 3,181.82 / mo</strong>
                  </div>
                </div>

                <p className="text-[11px] text-gray-600 mt-4 leading-relaxed font-medium">
                  * You receive full, independent dashboard credentials to manage products, categories, orders, customers, and inventory yourself.
                </p>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/calculator?package=with_admin"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition"
                >
                  Select Package & Calculate Budget
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* What's Included Bar */}
          <div className="mt-14 max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="text-sm font-extrabold text-[#101216] uppercase tracking-wider text-center mb-6">
              What&apos;s Included In Every Durrani Web Developers Build
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Responsive & Modern Design</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Fast Loading Speed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>SEO Friendly Structure</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Social Media Integration</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Contact Form & Map</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Custom Feature Add-ons</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>1 Year Support & Maintenance</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#E31E36] flex-shrink-0" />
                <span>Free Revisions (as per plan)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INDUSTRIES WE SERVE */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Specialized Web Applications
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#101216] tracking-tight mt-1">
                Built For Modern Industries & Businesses
              </h2>
            </div>
            <Link
              href="/services"
              className="text-xs font-bold text-[#E31E36] hover:underline inline-flex items-center gap-1 mt-3 md:mt-0"
            >
              Browse All Services & Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((ind) => (
              <div
                key={ind.name}
                className="group p-6 rounded-2xl bg-[#F4F5F7] hover:bg-[#101216] hover:text-white transition-all duration-300 border border-transparent hover:border-[#E31E36]/30 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white group-hover:bg-[#E31E36] text-[#E31E36] group-hover:text-white flex items-center justify-center transition-colors shadow-sm mb-4">
                    <ind.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-base text-[#101216] group-hover:text-white mb-2">
                    {ind.name}
                  </h3>
                  <p className="text-xs text-gray-600 group-hover:text-gray-300 leading-relaxed">
                    {ind.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-gray-200 group-hover:border-gray-800">
                  <Link
                    href={`/calculator?type=${encodeURIComponent(ind.name)}`}
                    className="text-xs font-bold text-[#E31E36] group-hover:text-rose-400 inline-flex items-center gap-1"
                  >
                    Calculate Budget &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PORTFOLIO HIGHLIGHTS */}
      <section className="py-20 bg-[#101216] text-white border-t border-b border-[#242830]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Recent Showcase
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                Completed Web Applications
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Verified client projects. Only publicly consented project budgets are shown.
              </p>
            </div>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 bg-[#242830] hover:bg-[#2E3440] text-white px-4 py-2.5 rounded-lg text-xs font-bold border border-gray-700 mt-4 md:mt-0 transition"
            >
              View Full Portfolio Archive <ExternalLink className="w-3.5 h-3.5 text-[#E31E36]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portfolioHighlights.map((item) => (
              <div
                key={item.id}
                className="bg-[#181B20] rounded-2xl overflow-hidden border border-gray-800 hover:border-[#E31E36]/40 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#101216]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-200 border border-gray-700">
                      {item.category}
                    </div>
                    {item.status && (
                      <div className="absolute top-3 right-3 bg-emerald-500/90 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                        {item.status}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-[#E31E36] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.shortDescription}
                    </p>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {item.technologies.slice(0, 3).map((tech) => (
                        <span
                          key={tech}
                          className="bg-[#242830] text-gray-300 text-[10px] px-2 py-0.5 rounded font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-gray-800 flex items-center justify-between">
                  {item.approvedPublicBudget ? (
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">
                        {item.budgetLabel || "Project Budget"}
                      </span>
                      <strong className="text-sm font-black text-[#E31E36]">
                        {formatPKR(item.approvedPublicBudget)}
                      </strong>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Custom Scope</span>
                  )}

                  {item.demoUrl && (
                    <a
                      href={item.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-300 hover:text-white inline-flex items-center gap-1"
                    >
                      Demo <ExternalLink className="w-3 h-3 text-[#E31E36]" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ORDERING PROCESS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Simple & Professional Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#101216] tracking-tight mt-1">
              How Our Ordering Process Works
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              From requirement submission to live production deployment on Vercel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="bg-[#F4F5F7] p-6 rounded-2xl border border-gray-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-black text-[#E31E36] block mb-3">
                    {step.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#101216] shadow-sm mb-4">
                    <step.icon className="w-5 h-5 text-[#E31E36]" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#101216] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQS */}
      <section className="py-20 bg-[#F4F5F7] border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-[#101216] tracking-tight mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-extrabold text-sm text-[#101216] flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-[#E31E36] flex-shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mt-2.5 pl-6.5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHATSAPP & CONTACT CALL TO ACTION */}
      <section className="py-16 bg-[#101216] text-white border-t border-[#242830]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#E31E36]/20 border border-[#E31E36] flex items-center justify-center mx-auto text-[#E31E36]">
            <PhoneCall className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Have a Specific Business Project in Mind?
          </h2>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Speak directly with Durrani Web Developers on WhatsApp or submit your detailed project scope through our multi-step budget calculator.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={buildWhatsAppLink("Hello! I would like to discuss my web application project with Durrani Web Developers.")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg transition"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              Chat on WhatsApp: {BUSINESS_INFO.phoneDisplay}
            </a>

            <Link
              href="/calculator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-glow transition"
            >
              <Calculator className="w-4 h-4" />
              Start Interactive Budget Calculator
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
