import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ADDON_CATEGORY_LABELS,
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  EXTENDED_ADDONS,
  SAAS_PACKAGES,
  getAddonPriceForPackage,
  buildWhatsAppLink,
} from "@/lib/constants";
import RegionalPrice from "@/components/RegionalPrice";
import PricingPackageImage from "@/components/PricingPackageImage";
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
  const featuredAddonIds = new Set([
    "google_auth",
    "supabase_db",
    "payment_gateway",
    "advanced_dashboard",
    "ai_chatbot",
    "custom_advanced_feature",
  ]);
  const addons = Object.values(DEFAULT_PRICING_CONFIG.addons).filter((addon) =>
    featuredAddonIds.has(addon.id)
  );
  const extendedAddonGroups = EXTENDED_ADDONS.reduce<Record<string, typeof EXTENDED_ADDONS>>(
    (groups, addon) => {
      const label = ADDON_CATEGORY_LABELS[addon.category];
      (groups[label] ||= []).push(addon);
      return groups;
    },
    {}
  );
  const ecommercePackages = [
    {
      title: ECOMMERCE_PACKAGES.ecommerce_starter.label,
      id: "ecommerce_starter",
      summary: "Focused online store with the essential catalog, cart, checkout, and order workflow.",
      image: "/Professional%20E-Commerce%20Store%20Solutions.png",
      imageAlt: "E-Commerce Starter package with a PKR 100,000 starting price",
      price: ECOMMERCE_PACKAGES.ecommerce_starter.basePrice,
      priceLabel: "Starting price",
    },
    {
      title: "E-Commerce Business",
      id: "ecommerce_business",
      summary: "Professional online store with client admin panel support.",
      image: "/Professional%20E-Commerce%20Store%20Solutions.png",
      imageAlt: "E-Commerce Business package with a PKR 150,000 price and included store features",
      price: ECOMMERCE_PACKAGES.ecommerce_business.basePrice,
      priceLabel: "Package price",
    },
    {
      title: "E-Commerce Advanced",
      id: "ecommerce_advanced",
      summary: "Feature-rich online store built for growth and advanced workflows.",
      image: "/Advanced%20E-Commerce%20Web%20Development%20Package.png",
      imageAlt: "E-Commerce Advanced package with a PKR 200,000 to 300,000 price range and included features",
      price: ECOMMERCE_PACKAGES.ecommerce_advanced.basePrice,
      maxPrice: ECOMMERCE_PACKAGES.ecommerce_advanced.maximumPrice,
      priceLabel: "Estimated package range",
    },
  ];
  const saasPackages = [
    {
      id: "saas_starter",
      title: "SaaS Starter",
      summary: "Multi-vendor marketplace platform for startups and small businesses.",
      image: "/SaaS%20Starter%20Marketplace%20Package%20(1).png",
      imageAlt: "SaaS Starter marketplace package, PKR 250,000 with PKR 100,000 advance",
      price: SAAS_PACKAGES.saas_starter.basePrice,
      advance: SAAS_PACKAGES.saas_starter.advance,
    },
    {
      id: "saas_business",
      title: "SaaS Business",
      summary: "Scalable marketplace with vendor dashboards, commissions, and advanced analytics.",
      image: "/SaaS%20Business%20Platform%20Marketing%20Poster%20(1).png",
      imageAlt: "SaaS Business marketplace package, PKR 500,000 with PKR 200,000 advance",
      price: SAAS_PACKAGES.saas_business.basePrice,
      advance: SAAS_PACKAGES.saas_business.advance,
    },
    {
      id: "saas_enterprise",
      title: "SaaS Enterprise",
      summary: "Multi-tenant enterprise platform with advanced architecture and dedicated support.",
      image: "/SaaS%20Enterprise%20Platform%20Showcase.png",
      imageAlt: "SaaS Enterprise package starting at PKR 1,000,000 with PKR 400,000 advance",
      price: SAAS_PACKAGES.saas_enterprise.basePrice,
      advance: SAAS_PACKAGES.saas_enterprise.advance,
      startingAt: SAAS_PACKAGES.saas_enterprise.startingAt,
    },
  ];
  const addonDetails: Record<
    string,
    { image: string; explanation: string; example: string; bestFor: string; note?: string }
  > = {
    google_auth: {
      image: "/New%20folder/Screenshot%202026-10-15%20160822.png",
      explanation: "User apne Google account se sign in kar sakta hai, alag password banane ki zaroorat nahi hoti.",
      example: "Customer “Continue with Google” dabata hai aur apne Google account se website mein login ho jata hai.",
      bestFor: "SaaS apps, customer accounts aur members ke private portals.",
    },
    supabase_db: {
      image: "/New%20folder/Screenshot%202026-10-15%20160904.png",
      explanation: "Website ka data online database mein save hota hai, jaise products, orders, users aur settings.",
      example: "Admin naya product add kare; woh website dobara kholne ya update/deploy ke baad bhi mojood rahe.",
      bestFor: "Online stores, CRM aur order-management systems.",
      note: "Database ki zaroorat aur scope project ke mutabiq confirm hoga. Supabase ka account/paid plan ya koi third-party subscription hum provide, purchase ya manage nahi karte; client zaroorat par provider se khud arrange karta hai.",
    },
    payment_gateway: {
      image: "/New%20folder/Screenshot%202026-10-15%20160931.png",
      explanation: "Customer website par payment kar sakta hai ya payment ki details submit kar sakta hai.",
      example: "Customer bank transfer ya supported JazzCash/Easypaisa option choose kare aur admin transaction reference verify kare.",
      bestFor: "Online stores, bookings aur aise projects jahan online payment lena ho.",
      note: "Payment integration ki development approved scope ke mutabiq ho sakti hai, lekin gateway account hum provide nahi karte. Client account khud provider se arrange karta hai aur provider ki fees seedha ada karta hai.",
    },
    advanced_dashboard: {
      image: "/New%20folder/Screenshot%202026-10-15%20160959.png",
      explanation: "Admin charts aur reports ke zariye business ki performance aik jagah dekh sakta hai.",
      example: "Mahine ki total sales, wasool payments, baqi balance aur sab se zyada bikne wale products ki report.",
      bestFor: "E-commerce stores, restaurants aur business dashboards.",
    },
    ai_chatbot: {
      image: "/New%20folder/Screenshot%202026-10-15%20161037.png",
      explanation: "Website ka chatbot customers ke aam sawalon ka jawab available business ya product information se de sakta hai.",
      example: "Customer pooche “Is bracelet ki price kya hai?” aur bot saved product details mein se jawab de.",
      bestFor: "Product catalog wali websites aur customer-support portals.",
      note: "AI service/API account, subscription ya usage plan hum provide, purchase ya manage nahi karte. Client ko zaroorat par provider se khud account lena aur uske charges ada karne honge.",
    },
    custom_advanced_feature: {
      image: "/New%20folder/Screenshot%202026-10-15%20161109.png",
      explanation: "Aapke project ke liye koi khaas feature jo standard package ya listed add-ons mein nahi hai.",
      example: "Automatic PDF invoice, delivery fee calculator, ya kisi doosray software ke saath data connection.",
      bestFor: "Aise business workflows jinhein tayyar feature se poora na kiya ja sake.",
      note: "Yeh configurable starting estimate hai; complex feature ki final price requirements aur scope dekh kar confirm hoti hai.",
    },
  };

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
            Pakistan rates are in PKR. International rates are double the Pakistan equivalents and displayed in your regional currency using the latest available exchange rate. Choose a managed backend solution or client admin dashboard, then review the installment plan in the calculator.
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
                  <RegionalPrice pkrAmount={DEFAULT_PRICING_CONFIG.baseWithoutAdmin} className="text-4xl font-black text-[#101216]" />
                  <span className="text-xs text-gray-500 font-medium">starting price</span>
                </div>

                {/* Daily Cost */}
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center text-gray-600">
                  <span>Daily Cost:</span>
                  <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={DEFAULT_PRICING_CONFIG.baseWithoutAdmin / 365} /> (per day)</strong>
                </div>

                {/* 12-Month Installment Schedule Card */}
                <div className="mt-6 bg-[#F4F5F7] p-5 rounded-xl border border-gray-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center font-semibold text-gray-700 pb-2 border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#E31E36]" />
                      Advance Payment (at start):
                    </span>
                    <strong className="text-[#101216] font-black"><RegionalPrice pkrAmount={10000} /></strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pb-2 border-b border-gray-200">
                    <span>Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={25000} /></strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      10 Monthly Installments:
                    </span>
                    <strong className="text-[#101216] font-black"><RegionalPrice pkrAmount={2272.73} /> / mo</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pt-1 text-[11px]">
                    <span>11th & Final Adjusted Installment:</span>
                    <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={2272.70} /></strong>
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
                      Durrani Web Developers manages backend updates exclusively. Product and catalog updates are not included and may incur additional charges; request them via support.
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
                  <RegionalPrice pkrAmount={DEFAULT_PRICING_CONFIG.baseWithAdmin} className="text-4xl font-black text-[#E31E36]" />
                  <span className="text-xs text-gray-500 font-medium">starting price</span>
                </div>

                {/* Daily Cost */}
                <div className="mt-3 bg-red-50/60 p-3 rounded-lg border border-red-200 text-xs flex justify-between items-center text-gray-700">
                  <span>Daily Cost:</span>
                  <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={DEFAULT_PRICING_CONFIG.baseWithAdmin / 365} /> (per day)</strong>
                </div>

                {/* 12-Month Installment Schedule Card */}
                <div className="mt-6 bg-[#F4F5F7] p-5 rounded-xl border border-gray-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center font-semibold text-gray-700 pb-2 border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#E31E36]" />
                      Advance Payment (at start):
                    </span>
                    <strong className="text-[#101216] font-black"><RegionalPrice pkrAmount={10000} /></strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pb-2 border-b border-gray-200">
                    <span>Remaining Balance:</span>
                    <strong className="text-[#101216] font-bold"><RegionalPrice pkrAmount={35000} /></strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      10 Monthly Installments:
                    </span>
                    <strong className="text-[#E31E36] font-black"><RegionalPrice pkrAmount={3181.82} /> / mo</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pt-1 text-[11px]">
                    <span>11th & Final Adjusted Installment:</span>
                    <strong className="text-[#E31E36] font-bold"><RegionalPrice pkrAmount={3181.80} /></strong>
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

      {/* E-Commerce Packages */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Online Store Packages
            </span>
            <h2 className="text-3xl font-black text-[#101216] mt-1">
              E-Commerce Packages &amp; Rates
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Choose a store package to get started. Final pricing depends on your requirements and confirmed project scope.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {ecommercePackages.map((packageDetails) => (
              <article
                key={packageDetails.title}
                className="bg-[#F4F5F7] rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-6 sm:p-8">
                  <h3 className="text-2xl font-black text-[#101216]">
                    {packageDetails.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {packageDetails.summary}
                  </p>
                  <div className="mt-5">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      {packageDetails.priceLabel}
                    </span>
                    <strong className="text-2xl sm:text-3xl font-black text-[#E31E36]">
                      <RegionalPrice pkrAmount={packageDetails.price} />
                      {packageDetails.maxPrice && (
                        <>
                          {" – "}
                          <RegionalPrice pkrAmount={packageDetails.maxPrice} />
                        </>
                      )}
                    </strong>
                  </div>
                </div>

                <PricingPackageImage
                  src={packageDetails.image}
                  alt={packageDetails.imageAlt}
                  title={packageDetails.title}
                  width={1312}
                  height={1199}
                  sizes="(max-width: 767px) 100vw, 50vw"
                />

                <div className="p-6 sm:p-8 pt-5">
                  <Link
                    href={`/calculator?package=${packageDetails.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition"
                  >
                    Configure This Package
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SaaS Packages */}
      <section className="py-20 bg-[#F4F5F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Marketplace &amp; Platform Plans
            </span>
            <h2 className="text-3xl font-black text-[#101216] mt-1">
              SaaS Project Packages &amp; Rates
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Pakistan rates are in PKR. International rates are doubled and converted to your regional currency. Enterprise pricing starts at the listed amount; final scope is confirmed after review.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {saasPackages.map((packageDetails) => (
              <article
                key={packageDetails.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-6">
                  <h3 className="text-xl font-black text-[#101216]">{packageDetails.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 min-h-8">{packageDetails.summary}</p>
                  <div className="mt-4">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      {packageDetails.startingAt ? "Starting price" : "Package price"}
                    </span>
                    <strong className="text-2xl font-black text-[#E31E36]">
                      <RegionalPrice pkrAmount={packageDetails.price} />
                      {packageDetails.startingAt && "+"}
                    </strong>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Advance payment: <strong className="text-[#101216]"><RegionalPrice pkrAmount={packageDetails.advance} /></strong>
                    {" · "}remaining balance in 11 monthly installments
                  </p>
                </div>
                <PricingPackageImage
                  src={packageDetails.image}
                  alt={packageDetails.imageAlt}
                  title={packageDetails.title}
                  width={1536}
                  height={1024}
                  sizes="(max-width: 1023px) 100vw, 33vw"
                />
                <div className="p-6 pt-5 mt-auto">
                  <Link
                    href={`/calculator?package=${packageDetails.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition"
                  >
                    Configure This Package
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
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
              Apni Zaroorat Ke Mutabiq Optional Features
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Add-on rates vary by feature complexity and selected e-commerce or SaaS plan. E-commerce add-ons start at PKR 20,000; advanced SaaS modules are priced for larger platform scope. Personal domain setup is PKR 10,000; registrar purchase and renewal charges are separate. Monthly maintenance is priced separately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {addons.map((addon) => {
              const details = addonDetails[addon.id];
              return (
                <div
                  key={addon.id}
                  className="bg-[#F4F5F7] rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-gray-200">
                      <Image
                        src={details.image}
                        alt={`${addon.label} feature example`}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-3 gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-500 bg-white px-2 py-0.5 rounded">
                          {addon.category}
                        </span>
                        <strong className="text-xs font-black text-[#E31E36]">
                          {addon.category === "ecommerce" ? (
                            <span className="flex flex-wrap gap-x-2">
                              <span>Starter <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_starter")} conversion="international-addon" /></span>
                              <span>Business <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_business")} conversion="international-addon" /></span>
                              <span>Advanced <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_advanced")} conversion="international-addon" /></span>
                            </span>
                          ) : addon.category === "saas" ? (
                            <span className="flex flex-wrap gap-x-2">
                              <span>Starter <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_starter")} conversion="international-addon" /></span>
                              <span>Business <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_business")} conversion="international-addon" /></span>
                              <span>Enterprise <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_enterprise")} conversion="international-addon" /></span>
                            </span>
                          ) : (
                            <>+<RegionalPrice pkrAmount={addon.price} conversion="international-addon" /> per add-on</>
                          )}
                        </strong>
                      </div>
                      <h3 className="font-bold text-sm text-[#101216] mb-2">
                        {addon.label}
                      </h3>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {details.explanation}
                      </p>
                      <div className="mt-3 rounded-lg bg-white p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-[#101216]">Misal:</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {details.example}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                        <span className="font-bold text-gray-700">Zyada kaam aata hai:</span>{" "}
                        {details.bestFor}
                      </p>
                      {details.note && (
                        <p className="text-[11px] text-amber-800 mt-3 leading-relaxed">
                          {details.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="pt-3 border-t border-gray-200">
                      <Link
                        href={`/calculator?addon=${addon.id}`}
                        className="text-xs font-bold text-[#E31E36] hover:underline inline-flex items-center gap-1"
                      >
                        Calculator mein chunein &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-[#F4F5F7] p-6">
            <h3 className="font-extrabold text-sm text-[#101216]">
              Misaal: Add-ons se estimate kaise banta hai?
            </h3>
            <div className="mt-4 space-y-2 text-xs text-gray-700">
              <div className="flex justify-between gap-4"><span>Base web application</span><strong><RegionalPrice pkrAmount={35000} /></strong></div>
              <div className="flex justify-between gap-4"><span>Supabase database (starting)</span><strong>+<RegionalPrice pkrAmount={10000} /></strong></div>
              <div className="flex justify-between gap-4"><span>Payment integration (starting)</span><strong>+<RegionalPrice pkrAmount={10000} /></strong></div>
              <div className="flex justify-between gap-4"><span>Google authentication (starting)</span><strong>+<RegionalPrice pkrAmount={10000} /></strong></div>
              <div className="flex justify-between gap-4 border-t border-gray-300 pt-2 text-[#101216]"><span className="font-bold">Andazati total</span><strong className="text-[#E31E36]"><RegionalPrice pkrAmount={65000} /></strong></div>
            </div>
            <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
              Yeh sirf misaali estimate hai, final quotation nahi. Database ki zaroorat, selected features aur project scope review ke baad total confirm hota hai. Hum third-party accounts ya subscriptions provide nahi karte; agar client ko zaroorat ho to woh provider se khud le aur uski usage fees seedha ada kare. Vercel par deployment ka hamara kaam web-app budget mein included hai; Vercel ka paid hosting plan ismein shamil nahi.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F4F5F7] border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8">
            <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
              Extended Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#101216] mt-1">
              Business aur industry ke mutabiq add-ons
            </h2>
            <p className="text-xs text-gray-600 mt-2">
              Yeh starting estimates hain; Real Estate & PropertyTech modules ki rates Pakistan ke liye PKR mein hain. Complex scope, third-party accounts, gateway fees, hosting, aur API usage alag ho sakte hain.
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(extendedAddonGroups).map(([group, groupAddons], groupIndex) => (
              <details
                key={group}
                open={groupIndex === 0 || group === "Real Estate & PropertyTech"}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-bold text-sm text-[#101216]">
                  <span>{group}</span>
                  <span className="text-xs font-semibold text-gray-500">{groupAddons.length} modules</span>
                </summary>
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {groupAddons.map((addon) => (
                    <div key={addon.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-[#101216]">{addon.label}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{addon.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-4">
                        <strong className="text-xs font-black text-[#E31E36]">
                          {addon.category === "ecommerce" ? (
                            <span className="flex flex-wrap gap-x-2">
                              <span>Starter <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_starter")} conversion="international-addon" /></span>
                              <span>Business <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_business")} conversion="international-addon" /></span>
                              <span>Advanced <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "ecommerce_advanced")} conversion="international-addon" /></span>
                            </span>
                          ) : addon.category === "saas" ? (
                            <span className="flex flex-wrap gap-x-2">
                              <span>Starter <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_starter")} conversion="international-addon" /></span>
                              <span>Business <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_business")} conversion="international-addon" /></span>
                              <span>Enterprise <RegionalPrice pkrAmount={getAddonPriceForPackage(addon, "saas_enterprise")} conversion="international-addon" /></span>
                            </span>
                          ) : (
                            <><RegionalPrice pkrAmount={addon.price} conversion="international-addon" />{addon.billingPeriod === "monthly" ? " / month" : " per add-on"}</>
                          )}
                        </strong>
                        <Link
                          href={`/calculator?addon=${addon.id}`}
                          className="text-xs font-bold text-[#E31E36] hover:underline"
                        >
                          Add to estimate
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="font-extrabold text-sm text-[#101216]">
              Real Estate & PropertyTech Pricing & Delivery Conditions
            </h3>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs leading-relaxed text-gray-700">
              <li>All prices are starting estimates for an agreed standard scope.</li>
              <li>Complex workflows, multi-agency permissions, large data migrations, and production-grade security require a separate quotation.</li>
              <li>Third-party subscriptions, paid APIs, gateway charges, hosting upgrades, and external accounts are separate unless explicitly included.</li>
              <li>Features are considered delivered only after the agreed acceptance tests pass.</li>
              <li>UI prototypes and sample data are not represented as live production functionality.</li>
              <li>Property verification, ownership checks, and fraud controls require approved procedures and cannot guarantee zero fraud.</li>
              <li>Vercel deployment is included only as specified in the agreed project scope; paid hosting plans remain separate.</li>
              <li>Milestones advance after the agreed delivery criteria and payment-verification rules are satisfied.</li>
            </ul>
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
                  <strong>Third-Party Accounts Are Not Provided:</strong> Hum paid domains, subscriptions, payment gateway accounts ya external API accounts provide, purchase, ya manage nahi karte. Zaroorat par client account/plan seedha provider se arrange karke uski fees provider ko ada karta hai. Hamara Vercel deployment kaam agreed web-app budget mein included hai; koi alag deployment fee nahi. Vercel ka paid hosting plan included nahi.
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
