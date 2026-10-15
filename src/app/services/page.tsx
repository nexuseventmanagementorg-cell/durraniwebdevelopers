import React from "react";
import Link from "next/link";
import {
  Utensils,
  Layers,
  ShoppingBag,
  Gem,
  Sparkle,
  Shirt,
  Apple,
  Cpu,
  Users,
  Calendar,
  Boxes,
  Briefcase,
  Code2,
  Calculator,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function ServicesPage() {
  const serviceCategories = [
    {
      id: "restaurant-web-apps",
      title: "Restaurant Web Applications",
      icon: Utensils,
      tagline: "Engage diners with digital menus, table bookings, and food stories.",
      description:
        "Custom web applications engineered for restaurants, cafes, and food lounges. Includes interactive visual menus, reservation scheduling, branch locators, and dynamic dietary filters.",
      highlights: [
        "Visual categorize-able digital menus",
        "Table reservation & event booking forms",
        "Social proof, chef stories, & customer reviews",
        "Mobile-first ultra fast loading for diner phones",
      ],
      packageNote: "Admin dashboard available in Package 2 for changing daily specials.",
    },
    {
      id: "restaurant-order-taking",
      title: "Restaurant Order-Taking Applications",
      icon: Layers,
      tagline: "Direct ordering to your kitchen with real-time WhatsApp dispatches.",
      description:
        "High-speed ordering portal eliminating third-party aggregator commissions. Customers customize burger toppings, crusts, or meal deals and send orders directly with receipt generation.",
      highlights: [
        "Instant cart with customizable food addons",
        "Direct WhatsApp & email kitchen order dispatch",
        "Delivery zone calculation & takeaway pickup timer",
        "Thermal printer friendly order summaries",
      ],
      packageNote: "Order management pipeline included with client admin panel support.",
    },
    {
      id: "ecommerce-stores",
      title: "E-Commerce Stores",
      icon: ShoppingBag,
      tagline: "High-conversion retail shopping platforms for physical & digital goods.",
      description:
        "Full-fledged modern online stores built on Next.js. Fast product discovery, SEO-optimized product pages, flexible shipping calculations, coupon engine, and local checkout.",
      highlights: [
        "Product catalog with variants (color, size, weight)",
        "Shopping cart, persistent guest checkout, & order tracking",
        "Discount codes, coupon rules, & promotional banners",
        "Local payment workflow (JazzCash, EasyPaisa, Bank Transfer)",
      ],
      packageNote: "Starting base PKR 35k (managed) or PKR 45k (client dashboard).",
    },
    {
      id: "jewellery-stores",
      title: "Jewellery Stores",
      icon: Gem,
      tagline: "Sophisticated luxury showrooms with metal rate logic & VIP lookbooks.",
      description:
        "Bespoke digital storefronts for fine jewellers, goldsmiths, and diamond houses. Features high-resolution zoomable galleries, metal weight calculations, and private consultation inquiries.",
      highlights: [
        "High-definition zoom & 360 showcase galleries",
        "Gold / silver purity & daily price ticker integration",
        "Custom jewelry quote request & consultation booking",
        "Private VIP catalog lookbooks with restricted access",
      ],
      packageNote: "Real-time rates and live APIs can be attached as add-ons.",
    },
    {
      id: "cosmetic-beauty",
      title: "Cosmetic & Beauty Stores",
      icon: Sparkle,
      tagline: "Vibrant skincare & cosmetic storefronts with quiz matching & shade selectors.",
      description:
        "Beauty-focused e-commerce portals with ingredient transparency, shade match selector, customer photo reviews, and bundle builder discounts for skincare brands.",
      highlights: [
        "Shade and skin-tone visual swatch pickers",
        "Skin concern matching recommendation logic",
        "Verified customer before/after review gallery",
        "Cart upsells, free-gift thresholds, & beauty bundles",
      ],
      packageNote: "Inventory alerts and stock levels managed in Package 2.",
    },
    {
      id: "fashion-stores",
      title: "Fashion Stores",
      icon: Shirt,
      tagline: "Editorial apparel boutiques with sizing guides & collection drops.",
      description:
        "Designed for apparel designers, clothing brands, and fashion boutiques. Mobile-first shopping experience with lookbook carousels, seasonal collections, and size recommendation tools.",
      highlights: [
        "Editorial seasonal collection lookbooks",
        "Interactive sizing charts & measurement guides",
        "Inventory variant matrix (Size x Color x Cut)",
        "Instagram feed & social styling integrations",
      ],
      packageNote: "Client admin panel gives your staff autonomous inventory control.",
    },
    {
      id: "grocery-stores",
      title: "Grocery Stores",
      icon: Apple,
      tagline: "Fast hyperlocal grocery portals with slot selection & bulk orders.",
      description:
        "Built for supermarkets, organic farms, and grocery marts. Features fast item re-ordering, weight-based pricing, area pin-code availability validation, and scheduled delivery slots.",
      highlights: [
        "Rapid category browsing & instant item search",
        "Weight-based pricing (per kg, pack, unit)",
        "Delivery time slot booking (morning/evening)",
        "Minimum order value validation & delivery fee rules",
      ],
      packageNote: "Complex delivery and barcode features available as custom add-ons.",
    },
    {
      id: "saas-applications",
      title: "SaaS Applications",
      icon: Cpu,
      tagline: "Cloud software platforms with multi-tenant workspaces & billing.",
      description:
        "Custom Software-as-a-Service platforms engineered from the ground up. Features client authentication, tenant isolation, subscription tier gating, and automated task pipelines.",
      highlights: [
        "Secure user authentication (Google OAuth / Supabase Auth)",
        "Multi-tenant architecture & organizational accounts",
        "Role-based access controls (SuperAdmin, Staff, Member)",
        "Automated scheduled cron workers on Vercel",
      ],
      packageNote: "Advanced enterprise SaaS architecture quoted according to feature scope.",
    },
    {
      id: "client-management",
      title: "Client Management Systems (CRM)",
      icon: Users,
      tagline: "Centralize clients, deals, communications, and historical records.",
      description:
        "Tailored CRM portals for consulting firms, real estate agencies, and service companies to track leads, manage customer interactions, and monitor sales pipelines.",
      highlights: [
        "Client database with contact logs & private notes",
        "Lead pipeline stages (Inquiry to Closed Deal)",
        "Task assignments & team follow-up reminders",
        "Customer lifetime value & deal history reports",
      ],
      packageNote: "Full client dashboard support included in starting Package 2.",
    },
    {
      id: "booking-systems",
      title: "Booking & Appointment Systems",
      icon: Calendar,
      tagline: "Automate appointment booking for clinics, salons, and consultants.",
      description:
        "Interactive booking workflows that prevent double-booking, allow clients to select available practitioner timeslots, and send automated confirmation messages.",
      highlights: [
        "Interactive calendar & practitioner time slot picker",
        "Service duration & buffer time configuration",
        "WhatsApp / SMS appointment confirmation alerts",
        "Cancellation, rescheduling, & advance deposit policies",
      ],
      packageNote: "WhatsApp API hookups can be configured as project add-ons.",
    },
    {
      id: "inventory-systems",
      title: "Inventory & Product Management Systems",
      icon: Boxes,
      tagline: "Track multi-warehouse stock levels, reorder alerts, and supplier logs.",
      description:
        "Back-office warehouse and stock management applications. Keep track of incoming purchase orders, batch numbers, low-stock thresholds, and physical inventory audits.",
      highlights: [
        "SKU & barcode tracking with batch numbers",
        "Automated low-stock alerts & reorder thresholds",
        "Supplier directory & purchase order logs",
        "Stock adjustment tracking with audit history",
      ],
      packageNote: "Requires client admin panel package for operational team use.",
    },
    {
      id: "custom-business-apps",
      title: "Custom Business Applications",
      icon: Briefcase,
      tagline: "Unique operational software tailored to your specific workflows.",
      description:
        "Have a business workflow that off-the-shelf software cannot solve? We build custom web apps to automate quotation generators, logistics tracking, internal forms, and member portals.",
      highlights: [
        "Bespoke database schema tailored to your operations",
        "Custom calculations, logic rules, & exportable data",
        "PDF invoice / document auto-generation",
        "Role-based staff permissions & secure audit logging",
      ],
      packageNote: "Scope evaluated transparently through our interactive budget calculator.",
    },
    {
      id: "other-software",
      title: "Other Custom Software Solutions",
      icon: Code2,
      tagline: "APIs, external integrations, automation scripts, and legacy migrations.",
      description:
        "Full-stack software engineering services covering REST/GraphQL API development, legacy PHP/WordPress migrations to Next.js, database optimization, and third-party webhooks.",
      highlights: [
        "Next.js App Router & TypeScript architectures",
        "Supabase / PostgreSQL cloud relational databases",
        "Payment gateway webhook & callback hardening",
        "Vercel serverless functions & automated cron schedulers",
      ],
      packageNote: "Contact us directly or use the calculator to describe your requirements.",
    },
  ];

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#101216] text-white py-16 border-b border-[#242830]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            Professional Web Application Services
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Tailored Web Solutions For Every Industry
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            From modern e-commerce and restaurant ordering applications to enterprise SaaS and internal CRM systems. Every application is built with clean code and high performance.
          </p>

          <div className="pt-2">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-glow transition"
            >
              <Calculator className="w-4 h-4" />
              Launch Interactive Budget Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-[#F4F5F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {serviceCategories.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-400 p-8 shadow-sm hover:shadow-card transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E31E36] flex items-center justify-center mb-5">
                    <service.icon className="w-6 h-6" />
                  </div>

                  <h2 className="text-xl font-extrabold text-[#101216]">
                    {service.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#E31E36] mt-1">
                    {service.tagline}
                  </p>

                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Highlights */}
                  <div className="mt-5 space-y-2 pt-4 border-t border-gray-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Key Capabilities:
                    </span>
                    {service.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Package Note */}
                  <div className="mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 italic">
                    💡 {service.packageNote}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                  <Link
                    href={`/calculator?type=${encodeURIComponent(service.title)}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#101216] hover:bg-[#E31E36] text-white py-2.5 rounded-xl font-bold text-xs transition duration-200"
                  >
                    <span>Calculate Budget For This Service</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency Note */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-[#E31E36] font-bold text-xs uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> Scope Clarification
          </div>
          <h3 className="text-lg font-extrabold text-[#101216]">
            Every Business Has Unique Requirements
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-2xl mx-auto">
            We do not claim that every feature is automatically included in every starting package. Starting rates (PKR 35,000 without admin and PKR 45,000 with admin) provide standard solid production foundations. Complex integrations, custom algorithms, third-party APIs, and extended modules are configured transparently using our calculator.
          </p>
        </div>
      </section>
    </div>
  );
}
