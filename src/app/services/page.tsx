import React from "react";
import Link from "next/link";
import Image from "next/image";
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
      image: "/Screenshot 2026-10-15 154914.png",
      icon: Utensils,
      tagline: "Restaurant, cafe ya food lounge ke liye online showcase.",
      description:
        "Aisi website jahan customer restaurant ki details, menu, khanay ki tasveerain aur prices dekh sake aur table booking ki request bhej sake.",
      highlights: [
        "Burger, pizza aur doosray foods ka menu, prices aur daily specials",
        "Table reservation aur event booking request",
        "Address, opening timings aur customer reviews",
        "Owner menu khud update kar sake, agar admin panel package mein ho",
      ],
      packageNote: "Admin panel aur menu updates ka tareeqa selected package aur approved scope par depend karta hai.",
    },
    {
      id: "restaurant-order-taking",
      title: "Restaurant Order-Taking Applications",
      image: "/Screenshot 2026-10-15 155009.png",
      icon: Layers,
      tagline: "Customer ko online food select karke order bhejne ka asaan tareeqa.",
      description:
        "Customer food aur add-ons select karke cart banata hai, delivery ya takeaway chunta hai aur order submit karta hai. Restaurant ko order WhatsApp ya email se mil sakta hai, jab munasib integration configure ki gayi ho.",
      highlights: [
        "Food items, extra cheese aur doosray add-ons select karna",
        "Cart, total bill aur order receipt",
        "Delivery ya takeaway aur delivery charges",
        "WhatsApp button aur automatic WhatsApp dispatch alag features hain",
      ],
      packageNote: "Automatic WhatsApp dispatch ki development scope mein discuss ho sakti hai. WhatsApp/API account ya paid plan hum provide nahi karte; client zaroorat par provider se khud arrange aur pay karta hai.",
    },
    {
      id: "ecommerce-stores",
      title: "E-Commerce Stores",
      image: "/Screenshot 2026-10-15 155035.png",
      icon: ShoppingBag,
      tagline: "Products online dikhane, cart mein rakhne aur order lene ki website.",
      description:
        "Jewellery, cosmetics, kapray, electronics ya grocery ke liye online dukaan. Customer products aur unki details dekh kar cart banata aur order bhejta hai.",
      highlights: [
        "Products, categories, tasveerain, prices aur sizes/colours",
        "Shopping cart, coupons aur order tracking",
        "Client dashboard package mein owner products, prices aur stock manage kar sakta hai",
        "Payment gateway setup/account package mein shamil nahi; client apna account arrange karta hai",
      ],
      packageNote: "Starting package har feature ko cover nahi karta; product updates aur extra features par additional charges lag sakte hain.",
    },
    {
      id: "jewellery-stores",
      title: "Jewellery Stores",
      image: "/Screenshot 2026-10-15 155100.png",
      icon: Gem,
      tagline: "Gold, silver aur doosri jewellery ke liye online showroom.",
      description:
        "Rings, necklaces, bracelets aur doosri jewellery ki tasveerain, details aur prices dikhane wali website. Customer custom design ke liye inquiry bhi bhej sakta hai.",
      highlights: [
        "Jewellery ki bari tasveerain aur zoom",
        "Purity, weight aur product details",
        "Custom jewellery banwanay ki inquiry",
        "Live gold rate ke liye reliable data source/API alag se configure karna hota hai",
      ],
      packageNote: "Live rates ki integration ke liye external API account client ko provider se khud lena hoga; hum API account/subscription provide nahi karte.",
    },
    {
      id: "cosmetic-beauty",
      title: "Cosmetic & Beauty Stores",
      image: "/Screenshot 2026-10-15 155126.png",
      icon: Sparkle,
      tagline: "Makeup, skincare, perfume aur beauty products ki online dukaan.",
      description:
        "Lipstick shades, foundation colours, face wash, serum aur moisturizer jaise products online dikhane aur order lene ka store.",
      highlights: [
        "Lipstick aur foundation ke shades",
        "Product details, tasveerain aur customer reviews",
        "Bundles aur discounts",
        "Skin concern ke mutabiq recommendations extra feature ho sakti hain",
      ],
      packageNote: "Stock management admin panel package aur approved project scope ke mutabiq hoti hai.",
    },
    {
      id: "fashion-stores",
      title: "Fashion Stores",
      image: "/Screenshot 2026-10-15 155147.png",
      icon: Shirt,
      tagline: "Clothing brands aur fashion boutiques ke liye online store.",
      description:
        "Customer kapray dekh sakta hai, size aur colour select kar sakta hai, size chart check kar sakta hai aur order bhej sakta hai.",
      highlights: [
        "Shirts, dresses, trousers aur nayi collections",
        "Size charts aur rangon ke options",
        "Seasonal sale aur product details",
        "Owner sizes, colours aur prices manage kare, agar admin panel shamil ho",
      ],
      packageNote: "Dashboard access selected package par depend karta hai; product updates par extra charges ho sakte hain.",
    },
    {
      id: "grocery-stores",
      title: "Grocery Stores",
      image: "/Screenshot 2026-10-15 155215.png",
      icon: Apple,
      tagline: "Online kiryana ya supermarket jahan se ghar baithe grocery order ho.",
      description:
        "Customer doodh, bread, chawal aur sabziyan dekh kar quantity select karta aur ghar delivery ke liye order bhejta hai.",
      highlights: [
        "Products ko category ke hisaab se dhoondhna",
        "Quantity, jaise 1 kg ya 2 kg, select karna",
        "Minimum order aur delivery charges",
        "Delivery slots, stock alerts aur barcode features scope ke mutabiq ban sakte hain",
      ],
      packageNote: "Advanced delivery, stock aur barcode features extra development maang sakte hain.",
    },
    {
      id: "saas-applications",
      title: "SaaS Applications",
      image: "/Screenshot 2026-10-15 155237.png",
      icon: Cpu,
      tagline: "Internet par chalne wala software jo aksar subscription par use hota hai.",
      description:
        "Misal ke taur par invoicing, appointment management, analytics ya school management software. Mukhtalif businesses ke accounts aur data alag rakhe ja sakte hain.",
      highlights: [
        "Har business ke liye alag account aur data",
        "Users ke roles aur permissions",
        "Google login ya scheduled tasks zaroorat ke mutabiq",
        "Subscription billing integration alag scope ho sakti hai",
      ],
      packageNote: "SaaS project ki complexity ke mutabiq quotation hoti hai; third-party subscriptions hum provide nahi karte.",
    },
    {
      id: "client-management",
      title: "Client Management Systems (CRM)",
      image: "/Screenshot 2026-10-15 155300.png",
      icon: Users,
      tagline: "Customers, inquiries, deals aur follow-ups ka record rakhne wala software.",
      description:
        "Business client ka naam, rabta, project ki zaroorat, quotation, payments aur dobara rabta karne ki tareekh aik jagah par rakh sakta hai.",
      highlights: [
        "Client details aur rabtay ka record",
        "Inquiry se deal tak ka status",
        "Follow-up reminders aur baqi payment ka record",
        "Team ke liye tasks aur reports",
      ],
      packageNote: "Dashboard, staff accounts aur permissions ka scope quotation mein confirm hota hai.",
    },
    {
      id: "booking-systems",
      title: "Booking & Appointment Systems",
      image: "/Screenshot 2026-10-15 155328.png",
      icon: Calendar,
      tagline: "Clinic, salon ya consultant ke saath appointment book karne ka system.",
      description:
        "Customer available din aur waqt chunta hai aur booking request bhejta hai. Business apna schedule manage karta hai.",
      highlights: [
        "Calendar aur available time slots",
        "Service aur team member select karna",
        "Cancellation ya rescheduling ke options",
        "Confirmation messages integration ke zariye bheje ja sakte hain",
      ],
      packageNote: "Automatic messages ya advance payment ki integration approved scope par depend karti hai. Related third-party account ya subscription client khud arrange karta hai; hum provide ya manage nahi karte.",
    },
    {
      id: "inventory-systems",
      title: "Inventory & Product Management Systems",
      image: "/Screenshot 2026-10-15 155354.png",
      icon: Boxes,
      tagline: "Business ke stock aur maal ka record rakhne wala internal system.",
      description:
        "Business dekh sakta hai ke kitna maal mojood hai, kya sell hua, kaunsa item khatam hone wala hai aur supplier se kitna mangwaya gaya.",
      highlights: [
        "Mojooda stock aur bikay huay products ka record",
        "Low-stock alerts aur dobara maal mangwanay ka record",
        "Supplier aur purchase orders",
        "Barcode aur multiple warehouse features project scope ke mutabiq",
      ],
      packageNote: "Yeh online dukaan se mukhtalif internal tool ho sakta hai; staff access aur barcode features quotation mein tay honge.",
    },
    {
      id: "custom-business-apps",
      title: "Custom Business Applications",
      image: "/Screenshot 2026-10-15 155419.png",
      icon: Briefcase,
      tagline: "Business ke khaas kaam ke liye zaroorat ke mutabiq software.",
      description:
        "Jab tayyar software aapke kaam ke liye munasib na ho, toh aapke workflow ke mutabiq quotation, delivery tracking, internal forms ya private portal banaya ja sakta hai.",
      highlights: [
        "Automatic quotation ya PDF invoice banana",
        "Delivery aur logistics tracking",
        "Staff ke internal forms aur company portal",
        "Khaas calculations aur staff permissions",
      ],
      packageNote: "Features aur final price requirements samajhne ke baad calculator aur scope review se confirm hote hain.",
    },
    {
      id: "other-software",
      title: "Other Custom Software Solutions",
      image: "/Screenshot 2026-10-15 155504.png",
      icon: Code2,
      tagline: "Mukhtalif technical projects aur maujooda software mein tabdeeliyan.",
      description:
        "Misal ke taur par do systems ko connect karna, purani website ko naye framework par lana, database behtar banana ya automatic background task tayar karna.",
      highlights: [
        "Existing website ya software migrate karna",
        "Database ki performance behtar banana",
        "External API ya webhook ke zariye systems connect karna",
        "Scheduled automatic tasks aur naye features",
      ],
      packageNote: "Hum external API accounts ya subscriptions provide, purchase, ya manage nahi karte. Zaroorat par client account/plan seedha provider se arrange karta hai; agreed Vercel deployment kaam web-app budget mein included hai.",
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
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-400 overflow-hidden shadow-sm hover:shadow-card transition flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  <Image
                    src={service.image}
                    alt={`${service.title} example`}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div>
                  <div className="p-6 flex flex-col h-full">
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
                </div>

                <div className="px-6 pb-6">
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

      {/* Technical glossary */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-[#E31E36] font-bold text-xs uppercase tracking-widest">
              Seedhi zubaan mein
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#101216] mt-2">
              Technical Lafzon Ka Asaan Matlab
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ["Admin Panel", "Private dashboard jahan se owner website ya business ka data manage karta hai."],
              ["Database", "Jahan products, clients, orders aur settings ka data save hota hai."],
              ["Google Authentication", "Google account se sign in karne ka tareeqa."],
              ["Supabase", "Online database aur user login jaisi services dene wala platform."],
              ["API", "Do software systems ke darmiyan data bhejne aur lene ka tareeqa."],
              ["Webhook", "Ek system mein event hone par doosray system ko automatic khabar dene ka tareeqa."],
              ["Cron Job", "Muqarrar waqt par khud chalne wala task, jaise payment reminder."],
              ["Multi-tenant", "Aik software mein kai businesses ke alag accounts aur alag data."],
              ["Inventory", "Business ke paas mojood stock aur maal ka record."],
              ["SEO", "Website ko search engines mein behtar dikhane ke liye ki jane wali behtari."],
              ["Responsive Design", "Website ka mobile, tablet aur computer par sahi nazar aana."],
              ["Vercel", "Web applications ko internet par deploy aur host karne ka platform."],
            ].map(([term, meaning]) => (
              <div key={term} className="rounded-xl border border-gray-200 bg-[#F4F5F7] p-4">
                <dt className="text-sm font-extrabold text-[#101216]">{term}</dt>
                <dd className="text-xs text-gray-600 mt-1 leading-relaxed">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Feature and third-party cost clarification */}
      <section className="py-12 bg-[#F4F5F7] border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-[#101216]">
              Har Feature Har Package Mein Shamil Nahi Hota
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 mt-3 leading-relaxed">
              Basic online store mein product listing aur order form ho sakta hai. Live payment gateway, automatic WhatsApp messages, Google login, live gold rates aur advanced inventory jaise features ko alag development aur configuration ki zaroorat ho sakti hai. Inhein included samajhne se pehle requirements aur final scope confirm karein.
            </p>
            <p className="text-xs sm:text-sm text-gray-700 mt-3 leading-relaxed">
              Hum third-party subscriptions, paid domains, payment gateway accounts ya external API accounts provide, purchase, ya manage nahi karte. Zaroorat par client account/plan seedha provider se arrange karke uski fees provider ko ada karta hai. Vercel par app deploy karne ka hamara kaam web-app budget mein included hai; alag deployment fee nahi. Vercel ka paid hosting plan ismein shamil nahi. Launch ke baad product ya content updates package mein shamil nahi aur un par extra charges lag sakte hain.
            </p>
            <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-3 leading-relaxed">
              Budget calculator sirf estimate deta hai; final quotation requirements aur formal scope review ke baad confirm hoti hai.
            </p>
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
            Har starting package mein tamam features shamil nahi. PKR 35,000 (admin ke baghair) aur PKR 45,000 (admin ke saath) starting rates hain. Complex integrations, custom features aur additional modules ka scope calculator aur formal review ke zariye tay hota hai.
          </p>
        </div>
      </section>
    </div>
  );
}
