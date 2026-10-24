import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BUSINESS_INFO,
  buildWhatsAppLink,
} from "@/lib/constants";
import { DataStore } from "@/lib/store";
import RegionalPrice from "@/components/RegionalPrice";
import PortfolioOffer from "@/components/PortfolioOffer";
import { DWD_WORKFORCE_AGENTS, DWD_WORKFORCE_DEPARTMENTS } from "@/lib/workforce-agents";
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
  Download,
  ExternalLink,
  Users,
  Bot,
  Workflow,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const publicProjects = DataStore.getPortfolio(false);
  const portfolioHighlights = publicProjects.slice(0, 3);
  const publicLiveProjectCount = publicProjects.filter((project) =>
    ["Completed", "Live", "Delivered"].includes(project.status)
  ).length;

  const processSteps = [
    {
      step: "01",
      title: "Requirements & Calculator",
      image: "/New folder/New folder/Screenshot 2026-10-15 160822.png",
      imageAlt: "Website budget estimator with project types and live price estimate",
      desc: "Calculator mein project type, admin panel aur required features select karein. Aapki choices se foran aik ibtidai budget estimate tayyar hota hai.",
      details: [
        "Restaurant, e-commerce, SaaS ya custom application choose karein.",
        "Admin panel aur optional features add karein.",
        "Estimate aapke selected project currency mein dekhein.",
      ],
      benefit: "Kaam shuru karne se pehle kharchay ka andaza mil jata hai.",
      icon: Calculator,
    },
    {
      step: "02",
      title: "Direct WhatsApp Review",
      image: "/New folder/New folder/Screenshot 2026-10-15 175337.png",
      imageAlt: "Business owner reviewing a WhatsApp conversation on a laptop and phone",
      desc: "Aapki bheji hui requirements hum khud review karte hain aur WhatsApp par seedhi baat karke project ki zarooriyat aur timeline confirm karte hain.",
      details: [
        "Features, pages aur technical requirements confirm hoti hain.",
        "Images, product details aur doosre content ki zaroorat discuss hoti hai.",
        "Delivery ka mutawaqqa waqt aur extra kharchay clear kiye jate hain.",
      ],
      benefit: "Aapko automated jawab ke bajaye apne project ke mutabiq mashwara milta hai.",
      icon: PhoneCall,
    },
    {
      step: "03",
      title: "Scope & Advance Payment",
      image: "/New folder/New folder/Screenshot 2026-10-15 175408.png",
      imageAlt: "Mobile checkout screen showing payment choices and an order summary",
      desc: "Requirements final hone par aapko written quotation milti hai. Ismein agreed features, final price, advance aur baqi payment ka schedule wazeh hota hai.",
      details: [
        "Pakistan ke starting packages PKR 35,000 aur PKR 45,000 se shuru hote hain.",
        "Pakistan ka default advance PKR 10,000 hai; international quote currency ke mutabiq hoti hai.",
        "Payment method aur milestones final quotation mein confirm hote hain.",
      ],
      benefit: "Payment bhejne se pehle aapko maloom hota hai ke kis cheez ki kitni cost hai.",
      icon: ShieldCheck,
    },
    {
      step: "04",
      title: "Architecture & Development",
      image: "/New folder/New folder/Screenshot 2026-10-15 175437.png",
      imageAlt: "Web application dashboard on a laptop, representing application development",
      desc: "Advance payment verify aur project scope approve hone ke baad development shuru hoti hai. Application agreed features aur business workflow ke mutabiq banayi jati hai.",
      details: [
        "Next.js, TypeScript aur Tailwind CSS se responsive interface.",
        "Agreed pages, forms, admin panel aur workflows ki tayyari.",
        "Database, login ya integrations sirf approved scope ke mutabiq configure hote hain.",
      ],
      benefit: "Aapke business ke liye functional application banti hai, sirf demo screens nahi.",
      icon: Code2,
    },
    {
      step: "05",
      title: "Testing & Vercel Delivery",
      image: "/New folder/New folder/Screenshot 2026-10-15 175507.png",
      imageAlt: "Laptop displaying a successful production deployment",
      desc: "Handover se pehle agreed features check kiye jate hain. Phir application live deploy hoti hai aur aapko agreed access aur basic handover diya jata hai.",
      details: [
        "Mobile/desktop layout, forms aur agreed workflows test hote hain.",
        "Configured login, database aur uploads check kiye jate hain.",
        "Vercel par live link, agreed admin access aur basic training milti hai.",
      ],
      benefit: "Aapko internet par chalne wali tested application aur uska live link milta hai.",
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
      a: "Pakistan starting rates are PKR 35,000 without Client Admin Access and PKR 45,000 with it. International starting prices are double the Pakistan rates and shown in the selected local currency. Without Client Admin Access, Durrani Web Developers maintains the backend; requested catalog changes may incur extra charges. With Client Admin, you receive a dashboard to manage products, categories, orders, customers, and inventory.",
    },
    {
      q: "How does the 11-month installment plan work?",
      a: "Pakistan package examples use a PKR 10,000 advance and spread the remaining balance over 11 monthly installments. International base packages are doubled and converted to local currency; each international add-on is 100 units. Exact schedules are confirmed after scope review.",
    },
    {
      q: "Are domains, third-party accounts, and Vercel deployment included?",
      a: "Vercel par web app deploy karne ka hamara kaam agreed web-app budget mein included hai; alag deployment fee nahi. Personal domain setup (for example .com) optional PKR 10,000 add-on hai, lekin domain registrar se purchase aur renewal ki fees alag hain aur client provider ko ada karta hai. Iska matlab Vercel ka paid plan ya hosting subscription included hona nahi hai. Payment gateway accounts ya external API accounts bhi client provider se arrange karta hai; agreed scope mein integration development ho sakti hai, lekin third-party usage charges hamare budget mein shamil nahi.",
    },
    {
      q: "Can I customize the features and add special integrations?",
      a: "Yes! The budget calculator lets you select optional add-ons like Google OAuth, Supabase PostgreSQL, payment integration, AI chatbots, personal domain setup, and bespoke workflows. One-time add-on rates vary by feature complexity and selected e-commerce or SaaS plan; e-commerce add-ons start at PKR 20,000. International one-time add-ons use the published flat 100-unit estimate, and monthly maintenance is priced separately.",
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-12 mx-auto w-full max-w-5xl space-y-6 text-center lg:text-left">
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

            <div className="lg:col-span-12 mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-700 shadow-card-dark">
              <Image
                src="/hero_banner.jpeg"
                alt="Durrani Web Developers web application development banner"
                width={1600}
                height={595}
                priority
                className="h-auto w-full"
              />
            </div>

            {/* Intro Video */}
            <div className="lg:col-span-12 flex justify-center">
              <div className="w-full max-w-5xl rounded-2xl border border-gray-700 bg-gradient-to-b from-[#242830] to-[#181B20] p-3 shadow-card-dark sm:p-5">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Durrani Web Developers introduction video"
                  className="aspect-video w-full rounded-xl border border-gray-800 bg-black object-contain"
                >
                  <source src="/logoanimation2.mp4" type="video/mp4" />
                  Your browser does not support HTML video.
                </video>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-gray-400">
                  <span className="font-semibold text-white">Durrani Web Developers</span>
                  <span className="sm:ml-auto">Ideas • Code • Real Solutions</span>
                  <a
                    href="/logoanimation2.mp4"
                    download="durrani-web-developers-intro.mp4"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-[#E31E36]/60 hover:bg-[#E31E36]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31E36]"
                    aria-label="Download the Durrani Web Developers introduction video"
                  >
                    <Download className="h-4 w-4 text-[#E31E36]" />
                    Download video
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F4F5F7] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31E36]">
                Pricing overview
              </span>
              <h2 className="mt-1 text-xl font-black text-[#101216] sm:text-2xl">
                Rates & Web Application Packages
              </h2>
            </div>
            <Link href="/pricing" className="text-sm font-bold text-[#E31E36] hover:underline">
              View pricing details &rarr;
            </Link>
          </div>
          <Image
            src="/rates-flyer.jpg"
            alt="Durrani Web Developers rates and web application packages flyer"
            width={1024}
            height={1536}
            className="mx-auto h-auto w-full rounded-xl"
          />
        </div>
      </section>

      <section className="bg-white py-10 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-[#F4F5F7] p-6 text-center">
            <span className="block text-3xl font-black text-[#E31E36]">{publicLiveProjectCount}</span>
            <span className="mt-1 block text-sm font-bold text-[#101216]">
              {publicLiveProjectCount === 1 ? "Real live / delivered project publicly featured" : "Real live / delivered projects publicly featured"}
            </span>
            <Link href="/portfolio" className="mt-2 inline-flex text-xs font-bold text-[#E31E36] hover:underline">
              See verified portfolio <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-[#F4F5F7] p-6 text-center">
            <span className="block text-lg font-black text-[#101216]">Not publicly disclosed</span>
            <span className="mt-1 block text-sm font-bold text-gray-600">Lifetime revenue is not published or inferred from estimates.</span>
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
              Pakistan rates are in PKR. International prices are doubled and converted to your selected local currency.
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
                  <RegionalPrice pkrAmount={35000} className="text-4xl font-black text-[#101216]" />
                  <span className="text-xs text-gray-500">starting price</span>
                </div>

                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center text-gray-600">
                  <span>Daily Cost:</span>
                  <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={35000 / 365} /> (per day)</strong>
                </div>

                {/* Payment Breakdown */}
                <div className="mt-6 space-y-3 bg-[#F4F5F7] p-4 rounded-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Advance Payment (at the start):</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={10000} /></strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={25000} /></strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Payment (for 11 months):</span>
                    <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={2272.73} /> / mo</strong>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mt-4 leading-relaxed italic">
                  * Durrani Web Developers maintains the backend administration exclusively. Product and content updates are not included and may incur additional charges; request them via support.
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
                  <RegionalPrice pkrAmount={45000} className="text-4xl font-black text-[#E31E36]" />
                  <span className="text-xs text-gray-500">starting price</span>
                </div>

                <div className="mt-3 bg-red-50/60 p-3 rounded-lg border border-red-200 text-xs flex justify-between items-center text-gray-700">
                  <span>Daily Cost:</span>
                  <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={45000 / 365} /> (per day)</strong>
                </div>

                {/* Payment Breakdown */}
                <div className="mt-6 space-y-3 bg-[#F4F5F7] p-4 rounded-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Advance Payment (at the start):</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={10000} /></strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={35000} /></strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Payment (for 11 months):</span>
                    <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={3181.82} /> / mo</strong>
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

      {/* 3. AI AGENCY WORKFORCE STANDOUT SECTION */}
      <section className="py-24 bg-[#101216] text-white border-b border-[#242830] relative overflow-hidden">
        {/* Subtle background tech grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f242d_1px,transparent_1px),linear-gradient(to_bottom,#1f242d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E31E36]/30 bg-[#242830] px-3.5 py-1 text-xs font-semibold text-gray-200">
                <span className="h-2 w-2 rounded-full bg-[#E31E36] animate-ping" />
                <span className="text-[#E31E36] font-bold">First-Class Product Experience</span>
                <span className="text-gray-400">• 50 Roles across 10 Departments</span>
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mt-4">
                Powered by the DWD{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E31E36] via-red-500 to-rose-400">
                  AI Agency Workforce
                </span>
              </h2>
              <p className="text-gray-300 text-sm sm:text-base mt-3 leading-relaxed">
                Durrani Web Developers organizes every web application project across 50 specialized digital profiles. We pair active model-assisted brief drafting with strict, fail-closed human engineering oversight at every step.
              </p>
            </div>

            <div className="flex-shrink-0">
              <Link
                href="/workforce"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E31E36] hover:bg-[#C8162D] px-6 py-3.5 text-xs font-bold text-white shadow-glow transition transform hover:-translate-y-0.5"
              >
                <Users className="h-4 w-4" />
                Explore All 50 Specialist Profiles &rarr;
              </Link>
            </div>
          </div>

          {/* Capability Transparency Banner */}
          <div className="mb-12 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5 text-xs text-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <span>Capability Transparency &amp; Human Governance</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Verified repository architecture &bull; Zero autonomous shell/production execution
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-gray-400 leading-relaxed">
              <div>
                <strong className="text-white block mb-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Model Pipeline
                </strong>
                Requirements Analyst uses an admin-triggered Google Gemini pipeline to convert client briefs into structured user stories and technical scope.
              </div>
              <div>
                <strong className="text-white block mb-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  50 Specialist Role Profiles
                </strong>
                The 50 digital avatars represent our dedicated operational taxonomy and division of labor across 10 agile departments.
              </div>
              <div>
                <strong className="text-white block mb-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Strict Human Sign-off
                </strong>
                Every task transition, code review, test verification, and deployment is manually authorized and verified by human agency engineers.
              </div>
            </div>
          </div>

          {/* Featured Specialist Roles Grid */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#E31E36]" />
                Featured Specialist Profiles
              </h3>
              <Link href="/workforce" className="text-xs font-bold text-[#E31E36] hover:underline inline-flex items-center gap-1">
                View all 10 departments <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  role: "Business Analyst",
                  task: "Translating needs into scope & user stories",
                  department: "Executive & Project Delivery",
                  avatar: "business-analyst",
                  isModel: true,
                  milestone: "Requirements",
                },
                {
                  role: "Project Manager",
                  task: "Coordinating project delivery & milestone schedules",
                  department: "Executive & Project Delivery",
                  avatar: "project-manager",
                  isModel: false,
                  milestone: "Requirements",
                },
                {
                  role: "Frontend UI Designer",
                  task: "Designing responsive interface screens & UX journeys",
                  department: "Product & Brand Design",
                  avatar: "frontend-ui-designer",
                  isModel: false,
                  milestone: "Planning",
                },
                {
                  role: "Backend Architect",
                  task: "Designing application services & database schemas",
                  department: "Apps & Systems Engineering",
                  avatar: "backend-architect",
                  isModel: false,
                  milestone: "Development",
                },
                {
                  role: "Web Development Coder",
                  task: "Building modern Next.js & TypeScript applications",
                  department: "Web, CMS & Knowledge",
                  avatar: "web-development-coder",
                  isModel: false,
                  milestone: "Development",
                },
                {
                  role: "Ecommerce Specialist",
                  task: "Building product catalog, cart, and checkout flows",
                  department: "Commerce & Operations",
                  avatar: "ecommerce-specialist",
                  isModel: false,
                  milestone: "Development",
                },
                {
                  role: "QA Testing Bot",
                  task: "Testing key website flows & responsive behavior",
                  department: "Cloud, Quality & Knowledge",
                  avatar: "qa-testing-bot",
                  isModel: false,
                  milestone: "Quality",
                },
                {
                  role: "Cybersecurity Guardian",
                  task: "Checking security controls & input sanitation",
                  department: "Cloud, Quality & Knowledge",
                  avatar: "cybersecurity-guardian",
                  isModel: false,
                  milestone: "Quality",
                },
              ].map((spec) => (
                <div
                  key={spec.role}
                  className="rounded-2xl border border-white/10 bg-[#171a20] p-4 flex flex-col justify-between hover:border-[#E31E36]/40 hover:bg-[#1B1F27] transition-all"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black">
                        <Image
                          src={`/agency/avatars/${spec.avatar}.webp`}
                          alt={`${spec.role} avatar`}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-white line-clamp-1">{spec.role}</h4>
                        <span className="text-[10px] text-gray-400 block line-clamp-1 mt-0.5">{spec.department}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{spec.task}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">{spec.milestone}</span>
                    {spec.isModel ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Gemini Model Pipeline
                      </span>
                    ) : (
                      <span className="text-gray-400">Specialist Profile</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6-Stage Human Gates Summary */}
          <div className="rounded-2xl border border-white/10 bg-[#171a20] p-6 sm:p-8">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E31E36]">Project Governance</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                6-Stage Human-Gated Delivery Lifecycle
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Every technical milestone requires verified human developer or client sign-off before advancing.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {[
                { stage: "01. Scope", name: "Requirements", gate: "Admin Scope Sign-off" },
                { stage: "02. Design", name: "Architecture", gate: "Lead Tech Review" },
                { stage: "03. Build", name: "Development", gate: "Code Task Approval" },
                { stage: "04. Test", name: "QA & Security", gate: "Gatekeeper Sign-off" },
                { stage: "05. Review", name: "Client Preview", gate: "Client Acceptance" },
                { stage: "06. Ship", name: "Launch", gate: "Release Authorization" },
              ].map((item) => (
                <div key={item.stage} className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-1">
                  <span className="block font-mono text-[10px] text-gray-500 font-bold">{item.stage}</span>
                  <strong className="block text-xs font-bold text-white">{item.name}</strong>
                  <div className="pt-1 flex items-center justify-center gap-1 text-[10px] text-amber-300 font-semibold">
                    <ShieldCheck className="h-3 w-3 text-amber-400" />
                    <span>{item.gate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-400 text-center sm:text-left">
                Discover all 50 roles, department compositions, and lifecycle mappings in our comprehensive workforce directory.
              </p>
              <Link
                href="/workforce"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-[#242830] hover:bg-[#2E3440] px-5 py-2.5 text-xs font-bold text-white transition shrink-0"
              >
                View Full Workforce Directory <ArrowRight className="h-3.5 w-3.5 text-[#E31E36]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INDUSTRIES WE SERVE */}
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
                    href={ind.name === "SaaS Projects"
                      ? "/calculator?package=saas_starter&type=SaaS%20Projects"
                      : `/calculator?type=${encodeURIComponent(ind.name)}`}
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
                Real client work, added when it is live. Any calculator-based amount is clearly labelled as an estimate.
              </p>
            </div>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 bg-[#242830] hover:bg-[#2E3440] text-white px-4 py-2.5 rounded-lg text-xs font-bold border border-gray-700 mt-4 md:mt-0 transition"
            >
              View Full Portfolio <ExternalLink className="w-3.5 h-3.5 text-[#E31E36]" />
            </Link>
          </div>

          <div
            className={`grid grid-cols-1 gap-8 ${
              portfolioHighlights.length > 1
                ? "md:grid-cols-2 lg:grid-cols-3"
                : "max-w-xl mx-auto"
            }`}
          >
            {portfolioHighlights.map((item, index) => (
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
                      sizes="(max-width: 767px) 100vw, (max-width: 1279px) 33vw, 400px"
                      priority={index === 0}
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
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block break-all text-[10px] font-semibold text-blue-300 underline decoration-blue-800 underline-offset-2 hover:text-white"
                      >
                        {item.demoUrl}
                      </a>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-gray-800 flex flex-col gap-3">
                  {item.approvedPublicBudget ? (
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">
                        {item.budgetLabel || "Project Budget"}
                      </span>
                      <strong className="text-sm font-black text-[#E31E36]">
                        <RegionalPrice pkrAmount={item.approvedPublicBudget} conversion="historical-fx" />
                      </strong>
                      {item.budgetLabel === "Actual Project Fee" && (
                        <span className="block text-[9px] text-gray-500">
                          Original PKR fee converted at current FX only
                        </span>
                      )}
                      {item.budgetLabel === "Estimated Build Price" && (
                        <span className="block text-[9px] text-gray-400">
                          Estimated new-build price based on visible features
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Custom Scope</span>
                  )}
                  <PortfolioOffer project={item} />

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {item.templateAvailable !== false && (
                      <Link
                        href={`/templates?template=${encodeURIComponent(item.id)}`}
                        className="text-xs font-bold text-[#ff6073] hover:text-white inline-flex items-center gap-1"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        Make it yours
                      </Link>
                    )}
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-gray-300 hover:text-white inline-flex items-center gap-1"
                      >
                        Live Website <ExternalLink className="w-3 h-3 text-[#E31E36]" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ORDERING PROCESS */}
      <section className="py-20 bg-[#F4F5F7] border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Simple & Professional Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#101216] tracking-tight mt-1">
              How Our Ordering Process Works
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              Project select karne se le kar tested website live hone tak har qadam aapko pehle se maloom hoga.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#E31E36]/30 transition-all duration-300 flex flex-col"
              >
                <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101216]/70 via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-black text-[#E31E36] shadow">
                    STEP {step.step}
                  </span>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E31E36] shadow-lg">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">Durrani Web Developers</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-extrabold text-sm text-[#101216] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E31E36]">
                      Aapko kya faida?
                    </span>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#101216]">
                      {step.benefit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:px-7">
            <p className="max-w-3xl text-xs leading-relaxed text-gray-600">
              Note: Personal domain setup (jese .com) optional PKR 10,000 add-on hai; domain purchase/renewal registrar fees client alag pay karta hai. Hum paid third-party subscriptions, payment gateway accounts ya external API accounts provide nahi karte. Vercel par app deploy karne ka hamara kaam web-app budget mein included hai, alag deployment fee nahi; Vercel ka paid plan/hosting subscription ismein shamil nahi. Payment verify hone ke baad hi received mark hoti hai.
            </p>
            <Link
              href="/calculator"
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E31E36] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#C8162D]"
            >
              Apna Project Shuru Karein <ArrowRight className="h-4 w-4" />
            </Link>
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
