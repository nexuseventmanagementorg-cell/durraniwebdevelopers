"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Film,
  Globe2,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  calculateCreativeQuote,
  CREATIVE_CATEGORIES,
  CREATIVE_CURRENCIES,
  CREATIVE_CUSTOMER_TYPES,
  CREATIVE_LANGUAGES,
  CREATIVE_PROJECT_KINDS,
  CREATIVE_STYLES,
  DEFAULT_CREATIVE_STUDIO_CONFIG,
  formatCreativeCurrency,
  IMAGE_TYPES,
  VIDEO_DURATIONS,
} from "@/lib/creative-studio";
import type { CreativeQuoteInput, CreativeStudioConfig } from "@/lib/creative-studio";

const COUNTRY_SUGGESTIONS = [
  "Australia", "Canada", "India", "Pakistan", "Saudi Arabia",
  "United Arab Emirates", "United Kingdom", "United States",
];
const CURRENCY_CODES = CREATIVE_CURRENCIES.filter((currency) => currency !== "Other");
const REFERENCE_FILE_SIZE_LIMIT = 10 * 1024 * 1024;
const REFERENCE_FILES_LIMIT = 20;
const TOTAL_REFERENCE_SIZE_LIMIT = 20 * 1024 * 1024;
const REFERENCE_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,.txt,.pdf,.doc,.docx,.rtf,.fountain,.srt";
const WHATSAPP = "923296260778";

const initialLanguages = {
  video: "English",
  script: "English",
  voiceover: "",
  subtitles: "",
  dubbing: "",
};

const BRIEF_SAMPLES = [
  {
    id: "video",
    type: "AI Video Generation",
    title: "Luxury Real Estate Promotional Video — Lahore",
    audience: "Pakistan · Local business",
    description: "A premium property campaign for social media, digital ads, and WhatsApp.",
    content: `Project Title
Luxury Real Estate Promotional Video – Lahore

Project Type: AI Video Generation

Project Overview:
We need a premium promotional video for a luxury residential property project located in Lahore, Pakistan. The video will be used for social media marketing, digital advertisements, and WhatsApp campaigns.

Project Objective:
Create a visually engaging video that highlights the lifestyle, architecture, location, and key features of the property to attract potential buyers and investors.

Target Audience:
• Property investors
• Families looking for luxury homes
• Overseas Pakistanis
• Real estate buyers aged 25–55

Required Deliverables:
• One 30–45 second promotional video
• Vertical format (9:16) for Instagram Reels, TikTok, and YouTube Shorts
• Horizontal format (16:9) for website and YouTube
• AI-generated cinematic property visuals
• Professional voice-over
• Background music
• Logo placement and branded ending screen

Visual Style & Direction:
Modern luxury aesthetic, cinematic camera movements, realistic architectural visuals, warm lighting, elegant transitions, and premium typography.

Content & Assets:
We will provide the project logo, property details, location information, and available reference images. AI-generated scenes can be used where actual footage is unavailable.

Preferred Language:
English with an optional Urdu version.

Deadline:
5–7 working days.

Estimated Budget:
PKR 50,000–80,000 (illustrative only).

Expected Outcome:
A professional promotional video that communicates luxury, trust, and investment value while encouraging viewers to contact our sales team.`,
  },
  {
    id: "image",
    type: "AI Image Generation",
    title: "Premium Skincare Product Campaign",
    audience: "UK · USA · Europe · International brand",
    description: "Consistent product and lifestyle visuals for e-commerce and advertising.",
    content: `Project Title
Premium Skincare Product Campaign – International Brand

Project Type: AI Image Generation

Project Overview:
We are launching a premium skincare product line targeting customers in the UK, USA, and European markets. We need high-quality AI-generated product campaign images for our website, social media, and digital advertisements.

Project Objective:
Create a consistent visual identity through premium product imagery that makes the brand look elegant, trustworthy, modern, and internationally competitive.

Target Audience:
• Women and men aged 20–40
• Premium skincare consumers
• Beauty and lifestyle enthusiasts
• Online shoppers in the UK, USA, and Europe

Required Deliverables:
• 10 unique AI-generated campaign images
• Product hero images
• Lifestyle and product-in-use visuals
• Minimalist studio product photography concepts
• Social media post formats (1:1 and 4:5)
• Website banner images (16:9)
• High-resolution final exports

Visual Style & Direction:
Clean luxury aesthetic, soft natural lighting, neutral backgrounds, elegant compositions, realistic textures, premium editorial photography, and minimal styling.

Content & Assets:
We will provide product photographs, brand logo, packaging references, brand colors, and product descriptions. Product packaging and labels should remain consistent with the supplied references.

Preferred Language:
English.

Target Markets:
United Kingdom, United States, and Europe.

Deadline:
4–6 working days.

Estimated Budget:
USD 250–400 (illustrative only).

Expected Outcome:
A cohesive collection of premium campaign images suitable for e-commerce, social media marketing, and paid advertising.`,
  },
  {
    id: "mvp",
    type: "MVP Development",
    title: "AI-Powered Appointment Booking SaaS",
    audience: "Startup · SaaS",
    description: "A first release to validate an appointment-booking platform with real users.",
    content: `Project Title
AI-Powered Appointment Booking SaaS – MVP

Project Type: MVP Development

Project Overview:
We want to develop an MVP for an AI-powered appointment booking platform designed for salons, clinics, consultants, and small service businesses.

The platform should allow businesses to manage appointments, customers, services, and bookings through a simple online dashboard.

Project Objective:
Build a functional first version of the platform that can be tested with real users, validate the business idea, and provide a foundation for future development.

Target Audience:
• Small and medium-sized businesses
• Beauty salons and clinics
• Independent consultants
• Service providers
• Business owners looking to automate bookings

Core Features Required:
1. User Authentication
• Customer registration and login
• Business owner registration
• Secure account management

2. Business Dashboard
• Manage services and pricing
• View upcoming appointments
• Manage customer information
• Track booking status

3. Appointment Booking
• Public booking page for each business
• Available date and time selection
• Booking confirmation
• Appointment cancellation

4. AI Assistant
• Basic AI-powered customer inquiry handling
• Answers based on business-provided information
• Assistance with booking-related questions

5. Admin Panel
• View registered businesses
• Manage users
• Monitor platform activity

Preferred Technology:
Open to recommendations. We prefer a modern, scalable web application using React or Next.js, a secure backend, and a database such as Supabase or PostgreSQL.

Design & User Experience:
Modern SaaS interface, responsive design, simple navigation, clean dashboard, and mobile-friendly booking experience.

Project Scope:
MVP only. Advanced analytics, mobile applications, automated payment subscriptions, and complex AI workflows can be considered in future phases.

Deadline:
4–6 weeks for the initial MVP, subject to final scope approval.

Estimated Budget:
USD 2,000–3,500 (illustrative only).

Expected Outcome:
A working MVP with essential features, deployed online, ready for initial user testing and feedback.`,
  },
] as const;

function getProjectKind(id: string): CreativeQuoteInput["projectKind"] {
  if (id === "image" || id === "mvp") return id;
  return "video";
}

function getFileSignature(file: File): Promise<boolean> {
  return file.slice(0, 16).arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (file.type === "image/webp") {
      return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }
    if (file.type === "video/mp4") {
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    }
    if (file.type === "video/webm") {
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    }
    if (file.type === "application/pdf") {
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
    }
    if (file.type === "application/msword") {
      return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
        bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1;
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    }
    if (["application/rtf", "text/rtf", "application/x-rtf"].includes(file.type)) {
      return new TextDecoder().decode(bytes).startsWith("{\\rtf");
    }
    if (file.type === "text/plain" || file.type === "application/x-subrip") {
      try {
        return !bytes.includes(0) && new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim().length > 0;
      } catch {
        return false;
      }
    }
    return false;
  });
}

function isSupportedReferenceType(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const expectedMimeTypes: Record<string, string[]> = {
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    png: ["image/png"],
    webp: ["image/webp"],
    mp4: ["video/mp4"],
    webm: ["video/webm"],
    txt: ["text/plain"],
    srt: ["text/plain", "application/x-subrip"],
    fountain: ["text/plain"],
    pdf: ["application/pdf"],
    doc: ["application/msword"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    rtf: ["application/rtf", "text/rtf", "application/x-rtf"],
  };
  return expectedMimeTypes[extension || ""]?.includes(file.type) ?? false;
}

export default function CreativeStudioClient() {
  const router = useRouter();
  const [config, setConfig] = useState<CreativeStudioConfig>(DEFAULT_CREATIVE_STUDIO_CONFIG);
  const [configReady, setConfigReady] = useState(false);
  const [configError, setConfigError] = useState("");
  const [projectKindId, setProjectKindId] = useState("video");
  const [categoryId, setCategoryId] = useState("social");
  const [projectType, setProjectType] = useState<string>(CREATIVE_CATEGORIES[0].items[0]);
  const [country, setCountry] = useState("Pakistan");
  const [currency, setCurrency] = useState("PKR");
  const [durationValue, setDurationValue] = useState("30");
  const [customDuration, setCustomDuration] = useState("60");
  const [imageCount, setImageCount] = useState(1);
  const [complexity, setComplexity] = useState("standard");
  const [quality, setQuality] = useState("1080p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [customAspectRatio, setCustomAspectRatio] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [customStyle, setCustomStyle] = useState("");
  const [vision, setVision] = useState("");
  const [languages, setLanguages] = useState(initialLanguages);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [references, setReferences] = useState<File[]>([]);
  const [referenceError, setReferenceError] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    whatsapp: "",
    customerType: "Individual",
    company: "",
    preferredDeliveryDate: "",
  });
  const [brief, setBrief] = useState("");
  const [expandedBriefSample, setExpandedBriefSample] = useState<string | null>(null);
  const [editingBriefSample, setEditingBriefSample] = useState<string | null>(null);
  const [briefSampleDrafts, setBriefSampleDrafts] = useState<Record<string, string>>({});
  const [briefReferenceMessage, setBriefReferenceMessage] = useState("");
  const [pendingBriefSample, setPendingBriefSample] = useState<string | null>(null);
  const briefInputRef = useRef<HTMLTextAreaElement>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/public/creative-studio/config", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(
            result.readiness?.message ||
            result.error ||
            "Creative Studio pricing could not be loaded."
          );
        }
        if (active) {
          setConfig(result.config as CreativeStudioConfig);
          setConfigReady(true);
        }
      })
      .catch((error: unknown) => {
        if (active) setConfigError(error instanceof Error ? error.message : "Creative Studio pricing could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const projectKind = getProjectKind(projectKindId);
  const category = CREATIVE_CATEGORIES.find((item) => item.id === categoryId) || CREATIVE_CATEGORIES[0];
  const currentDuration = durationValue === "custom"
    ? Math.max(10, Math.min(9000, Number(customDuration) || 10))
    : Number(durationValue);
  const currentAspectRatio = aspectRatio === "Custom" ? customAspectRatio : aspectRatio;
  const quoteInput = useMemo<CreativeQuoteInput>(() => ({
    country,
    currency,
    projectKind,
    categoryId,
    subcategory: projectType,
    durationSeconds: currentDuration,
    imageCount,
    complexity,
    quality,
    aspectRatio: currentAspectRatio,
    languageCount: new Set(Object.values(languages).filter(Boolean)).size || 1,
    addonIds: selectedAddons,
  }), [
    country,
    currency,
    projectKind,
    categoryId,
    projectType,
    currentDuration,
    imageCount,
    complexity,
    quality,
    currentAspectRatio,
    languages,
    selectedAddons,
  ]);
  const quote = useMemo(() => {
    const calculated = calculateCreativeQuote(quoteInput, config);
    if (configReady) return calculated;
    return {
      ...calculated,
      total: null,
      base: null,
      categoryCharge: 0,
      complexityCharge: 0,
      qualityCharge: 0,
      aspectRatioCharge: 0,
      requiresManualReview: true,
      reason: configError || "Loading administrator-approved pricing.",
    };
  }, [quoteInput, config, configReady, configError]);
  const rateCard = configReady ? config.countries.find((rate) =>
    rate.country.toLowerCase() === country.trim().toLowerCase() && rate.currency === currency
  ) : undefined;
  const pakistanRate = configReady
    ? config.countries.find((rate) => rate.country.toLowerCase() === "pakistan" && rate.currency === "PKR")
    : undefined;
  const priceFormatter = (amount: number) => formatCreativeCurrency(amount, currency);
  const priceIsManual = quote.total === null;

  const changeProjectKind = (kind: string) => {
    setProjectKindId(kind);
    if (kind === "image") setProjectType(IMAGE_TYPES[0]);
    else if (kind === "mvp") {
      setCategoryId("ai-development");
      setProjectType(CREATIVE_CATEGORIES.find((item) => item.id === "ai-development")!.items[0]);
    } else {
      const currentCategory = CREATIVE_CATEGORIES.find((item) => item.id === categoryId) || CREATIVE_CATEGORIES[0];
      setProjectType(currentCategory.items[0]);
    }
  };

  const changeCountry = (value: string) => {
    setCountry(value);
    const profile = config.countries.find((rate) => rate.country.toLowerCase() === value.trim().toLowerCase());
    if (profile) setCurrency(profile.currency);
    else if (value.trim().toLowerCase() !== "pakistan" && currency === "PKR") setCurrency("USD");
  };

  const changeReferences = async (event: ChangeEvent<HTMLInputElement>) => {
    setReferenceError("");
    const picked = Array.from(event.target.files || []);
    if (picked.length > REFERENCE_FILES_LIMIT) {
      setReferenceError(`You can upload up to ${REFERENCE_FILES_LIMIT} reference files.`);
      event.target.value = "";
      return;
    }
    if (picked.some((file) => file.size > REFERENCE_FILE_SIZE_LIMIT || file.size === 0)) {
      setReferenceError("Each reference must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (picked.reduce((sum, file) => sum + file.size, 0) > TOTAL_REFERENCE_SIZE_LIMIT) {
      setReferenceError("All reference files together must be 20 MB or smaller.");
      event.target.value = "";
      return;
    }
    for (const file of picked) {
      if (!isSupportedReferenceType(file) || !await getFileSignature(file)) {
        setReferenceError(`${file.name} is not a supported or valid image, video, or script file.`);
        event.target.value = "";
        return;
      }
    }
    setReferences(picked);
  };

  const onCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    const nextCategory = CREATIVE_CATEGORIES.find((item) => item.id === nextCategoryId);
    if (nextCategory) setProjectType(nextCategory.items[0]);
  };

  const onLanguageChange = (field: keyof typeof languages, value: string) => {
    setLanguages((current) => ({ ...current, [field]: value }));
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const updateCustomer = (field: keyof typeof customer, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  const resetCalculation = () => {
    setProjectKindId("video");
    setCategoryId("social");
    setProjectType(CREATIVE_CATEGORIES[0].items[0]);
    setCountry("Pakistan");
    setCurrency(config.countries.find((rate) => rate.country === "Pakistan")?.currency || "PKR");
    setDurationValue("30");
    setCustomDuration("60");
    setImageCount(1);
    setComplexity("standard");
    setQuality("1080p");
    setAspectRatio("9:16");
    setCustomAspectRatio("");
    setStyle("Cinematic");
    setCustomStyle("");
    setVision("");
    setLanguages(initialLanguages);
    setSelectedAddons([]);
    setReferences([]);
    setBrief("");
    setEditingBriefSample(null);
    setBriefSampleDrafts({});
    setBriefReferenceMessage("");
    setPendingBriefSample(null);
    setDisclaimerAccepted(false);
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!configReady) throw new Error(configError || "Pricing configuration is not ready.");
      if (!disclaimerAccepted) throw new Error("Please accept the estimate and production disclaimer.");
      const form = new FormData();
      form.set("customer", JSON.stringify({
        ...customer,
        country,
        preferredDeliveryDate: customer.preferredDeliveryDate,
      }));
      form.set("project", JSON.stringify({
        quoteInput,
        brief,
        vision,
        style: style === "Custom Style" ? customStyle : style,
        languages,
        resolution: quality,
        aspectRatio: currentAspectRatio,
      }));
      references.forEach((file) => form.append("references", file));
      const response = await fetch("/api/public/creative-studio/inquiries", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Your project inquiry could not be submitted.");
      }
      try {
        window.sessionStorage.setItem(`creative-studio:${result.inquiry.id}`, result.trackingToken);
      } catch {
        setSubmitError(`Your inquiry ${result.inquiry.id} was received, but private tracking could not be saved in this browser. Keep this ID and contact the creative team; do not submit the form again.`);
        return;
      }
      router.push(`/creative-studio/confirmation?id=${encodeURIComponent(result.inquiry.id)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your project inquiry could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappMessage = [
    "Hello DWD AI Creator, I would like to discuss a creative project.",
    `Project: ${projectType}`,
    `Estimate: ${quote.total === null ? "Manual quotation requested" : priceFormatter(quote.total)}`,
    `Duration: ${projectKind === "image" ? `${imageCount} images` : `${currentDuration} seconds`}`,
    `Language: ${languages.video || "To be discussed"}`,
    `Brief: ${brief || "I would like to discuss the brief."}`,
  ].join("\n");
  const whatsappHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <main className="min-h-screen bg-[#f7f8fb] pb-24 text-slate-950">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #creative-quotation, #creative-quotation * { visibility: visible !important; }
          #creative-quotation { position: absolute; inset: 0; width: 100%; padding: 32px; }
        }
      `}</style>
      <section className="relative overflow-hidden bg-[#101729] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 left-1/4 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-indigo-100">
            <Sparkles className="h-4 w-4 text-rose-300" /> Durrani AI Creative Studio
          </div>
          <div className="mt-7 grid gap-10 lg:grid-cols-[1.4fr_.6fr] lg:items-end">
            <div>
              <p className="text-sm font-bold tracking-wide text-rose-300">FROM IMAGINATION TO CREATION</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Make your next creative idea real.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Plan an AI-assisted video, image, animation, or prototype. Review a transparent estimate and send your brief to our creative team.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                This is a quotation and production service. AI generation is not offered as an automated website feature.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <span className="font-bold">Reviewed before production</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Quotes, production scope, delivery plans, and payments require human review. No project enters production automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-14">
        <form onSubmit={submitInquiry} className="space-y-6">
          {(configError || !configReady) && (
            <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${configError ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-600"}`}>
              {configError || "Loading the current approved pricing…"}
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <StepHeading number="01" title="What are we creating?" subtitle="Choose a production type, category, and project." />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {CREATIVE_PROJECT_KINDS.map((kind) => {
                const Icon = kind.id === "image" ? ImageIcon : kind.id === "mvp" ? Layers3 : Film;
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => changeProjectKind(kind.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition ${projectKindId === kind.id ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-400"}`}
                  >
                    <Icon className="h-5 w-5" /> {kind.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Category
                <select
                  value={categoryId}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  disabled={projectKindId === "mvp"}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                >
                  {CREATIVE_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Project type
                <select
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {(projectKind === "image" ? IMAGE_TYPES : category.items).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <StepHeading number="02" title="Set the scope" subtitle="Duration, quantity, complexity, and delivery format." />
            {projectKind !== "image" && (
              <label className="mt-6 block text-sm font-semibold text-slate-700">
                Video duration
                <select
                  value={durationValue}
                  onChange={(event) => setDurationValue(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {VIDEO_DURATIONS.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
                  <option value="custom">Custom duration…</option>
                </select>
                {durationValue === "custom" && (
                  <span className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min="10"
                      max="9000"
                      value={customDuration}
                      onChange={(event) => setCustomDuration(event.target.value)}
                      className="w-40 rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                      aria-label="Custom duration in seconds"
                    />
                    <span className="font-normal text-slate-500">seconds (10 sec to 150 min)</span>
                  </span>
                )}
              </label>
            )}
            {projectKind === "image" && (
              <label className="mt-6 block text-sm font-semibold text-slate-700">
                Number of images
                <input type="number" min="1" max="500" value={imageCount} onChange={(event) => setImageCount(Math.max(1, Math.min(500, Number(event.target.value) || 1)))} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-3 font-normal sm:w-48" />
              </label>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Complexity
                <select value={complexity} onChange={(event) => setComplexity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  <option value="basic">Basic</option><option value="standard">Standard</option><option value="advanced">Advanced</option><option value="premium">Premium / complex</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Resolution
                <select value={quality} onChange={(event) => setQuality(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  <option>720p</option><option>1080p</option><option>2K</option><option>4K</option>
                </select>
              </label>
              {projectKind !== "image" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Video aspect ratio
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                    <option value="9:16">Vertical — 9:16</option><option value="16:9">Horizontal — 16:9</option><option value="1:1">Square — 1:1</option><option value="Custom">Custom aspect ratio</option>
                  </select>
                </label>
              )}
              {aspectRatio === "Custom" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Custom ratio
                  <input value={customAspectRatio} onChange={(event) => setCustomAspectRatio(event.target.value)} placeholder="e.g. 4:3" pattern="[1-9][0-9]?:[1-9][0-9]?" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
                </label>
              )}
              {projectKind === "image" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Image aspect ratio
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                    <option value="1:1">Square — 1:1</option><option value="4:5">Portrait — 4:5</option><option value="9:16">Story — 9:16</option><option value="16:9">Landscape — 16:9</option><option value="Custom">Custom aspect ratio</option>
                  </select>
                </label>
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" /> {quote.delivery}</p>
            {quote.featureFilmReview && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Feature-film budgets are indicative only and require manual review before a final quotation.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <StepHeading number="03" title="Creative direction" subtitle="Tell us what you want the audience to see and feel." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Visual style
                <select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  {CREATIVE_STYLES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              {style === "Custom Style" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Describe your custom style
                  <input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} maxLength={80} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                </label>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Video / image language
                <select value={languages.video} onChange={(event) => onLanguageChange("video", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  {CREATIVE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Script language
                <select value={languages.script} onChange={(event) => onLanguageChange("script", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  {CREATIVE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Voiceover language
                <select value={languages.voiceover} onChange={(event) => onLanguageChange("voiceover", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  <option value="">No voiceover / undecided</option>{CREATIVE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Subtitle language
                <select value={languages.subtitles} onChange={(event) => onLanguageChange("subtitles", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  <option value="">No subtitles / undecided</option>{CREATIVE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Dubbing language
                <select value={languages.dubbing} onChange={(event) => onLanguageChange("dubbing", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  <option value="">No dubbing / undecided</option>{CREATIVE_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Creative vision (optional)
              <textarea value={vision} onChange={(event) => setVision(event.target.value)} maxLength={2000} rows={3} placeholder="Mood, references, audience, or the story you want to tell…" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Upload reference files (optional, up to {REFERENCE_FILES_LIMIT} files)
              <input type="file" accept={REFERENCE_FILE_ACCEPT} multiple onChange={changeReferences} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" />
              <span className="mt-1 block text-xs font-normal text-slate-500">Upload logos, images, MP4/WebM video references, or scripts (TXT, PDF, DOC, DOCX, RTF, SRT, Fountain). Up to 20 files, 10 MB per file and 20 MB total. Only upload files you own or have permission to share.</span>
              {references.length > 0 && <span className="mt-2 block text-xs text-slate-600">{references.map((file) => file.name).join(", ")}</span>}
              {referenceError && <span role="alert" className="mt-2 block text-sm text-red-700">{referenceError}</span>}
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <StepHeading number="04" title="Optional production services" subtitle="Pricing is administrator-configured. Unpriced options need a custom quote." />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {config.addons.filter((addon) => addon.enabled).map((addon) => {
                const selected = selectedAddons.includes(addon.id);
                return (
                  <label key={addon.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${selected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleAddon(addon.id)} className="mt-1 accent-indigo-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{addon.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {addon.billingUnit === "custom_quote" || addon.price === null
                          ? "Custom quotation"
                          : addon.billingUnit === "percentage"
                            ? `${addon.price}%`
                            : `${priceFormatter(addon.price)} · ${addon.billingUnit.replace("_", " ")}`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {config.addons.filter((addon) => addon.enabled).length === 0 && (
              <p className="mt-4 text-sm text-slate-500">No priced add-ons are currently configured.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <StepHeading number="05" title="Country & contact" subtitle="Country selection is manual; location detection is not used." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Country
                <input list="creative-country-list" value={country} onChange={(event) => changeCountry(event.target.value)} required maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
                <datalist id="creative-country-list">{Array.from(new Set([...config.countries.map((rate) => rate.country), ...COUNTRY_SUGGESTIONS])).map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Currency
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={Boolean(rateCard)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal disabled:bg-slate-100">
                  {CURRENCY_CODES.map((item) => <option key={item}>{item}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-500">{rateCard ? "Using this country's configured pricing." : "No rate card exists yet; a manual quote will be requested."}</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Customer type
                <select value={customer.customerType} onChange={(event) => updateCustomer("customerType", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal">
                  {CREATIVE_CUSTOMER_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input value={customer.name} onChange={(event) => updateCustomer("name", event.target.value)} required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input type="email" value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} required maxLength={254} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                WhatsApp number
                <input type="tel" value={customer.whatsapp} onChange={(event) => updateCustomer("whatsapp", event.target.value)} required minLength={8} maxLength={30} placeholder="+92…" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Company / brand (optional)
                <input value={customer.company} onChange={(event) => updateCustomer("company", event.target.value)} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Preferred delivery date (optional)
                <input type="date" value={customer.preferredDeliveryDate} onChange={(event) => updateCustomer("preferredDeliveryDate", event.target.value)} min={new Date().toISOString().slice(0, 10)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
              </label>
            </div>
            <section aria-labelledby="sample-briefs-title" className="mt-7 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h3 id="sample-briefs-title" className="text-lg font-black text-slate-950">Need Help Writing Your Project Brief?</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Explore these sample briefs to understand how to describe your project, share your expectations, and get a more accurate project estimate.</p>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                These are fictional illustrative samples, not actual client projects, guaranteed quotations, or fixed offers. Sample budgets are examples only.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {BRIEF_SAMPLES.map((sample) => {
                  const isExpanded = expandedBriefSample === sample.id;
                  const SampleIcon = sample.id === "video" ? Film : sample.id === "image" ? ImageIcon : Layers3;
                  const thumbnailClass = sample.id === "video"
                    ? "from-slate-900 via-indigo-900 to-indigo-500"
                    : sample.id === "image"
                      ? "from-rose-100 via-amber-50 to-indigo-100"
                      : "from-emerald-950 via-teal-800 to-cyan-500";
                  const iconClass = sample.id === "image" ? "text-rose-600" : "text-white";

                  return (
                    <article key={sample.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className={`relative grid h-28 place-items-center overflow-hidden bg-gradient-to-br ${thumbnailClass}`}>
                        <div className="absolute -right-4 -top-8 h-28 w-28 rounded-full border border-white/30" />
                        <div className="absolute -bottom-12 -left-3 h-28 w-28 rounded-full border border-white/20" />
                        <SampleIcon aria-hidden="true" className={`relative h-10 w-10 ${iconClass}`} />
                        <span className="absolute bottom-2 left-3 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{sample.type}</span>
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">{sample.audience}</p>
                        <h4 className="mt-1 text-sm font-black leading-5 text-slate-900">{sample.title}</h4>
                        <p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">{sample.description}</p>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`sample-brief-${sample.id}`}
                          onClick={() => setExpandedBriefSample(isExpanded ? null : sample.id)}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 px-3 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          {isExpanded ? "Hide Sample Brief" : "View Sample Brief"}
                        </button>
                      </div>
                      {isExpanded && (
                        <div id={`sample-brief-${sample.id}`} className="border-t border-slate-200 bg-slate-50 p-4">
                          {editingBriefSample === sample.id ? (
                            <div>
                              <label htmlFor={`sample-editor-${sample.id}`} className="text-xs font-bold text-slate-800">Edit this sample before using it</label>
                              <textarea
                                id={`sample-editor-${sample.id}`}
                                value={briefSampleDrafts[sample.id] ?? sample.content}
                                onChange={(event) => setBriefSampleDrafts((drafts) => ({ ...drafts, [sample.id]: event.target.value }))}
                                maxLength={4000}
                                rows={10}
                                className="mt-2 max-h-[28rem] min-h-48 w-full rounded-lg border border-slate-300 bg-white p-3 font-sans text-xs leading-5 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                              <p className="mt-1 text-right text-[11px] text-slate-500">{(briefSampleDrafts[sample.id] ?? sample.content).length}/4000 characters</p>
                            </div>
                          ) : (
                            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-5 text-slate-700">{briefSampleDrafts[sample.id] ?? sample.content}</pre>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (editingBriefSample === sample.id) {
                                setEditingBriefSample(null);
                              } else {
                                setBriefSampleDrafts((drafts) => ({
                                  ...drafts,
                                  [sample.id]: drafts[sample.id] ?? sample.content,
                                }));
                                setEditingBriefSample(sample.id);
                              }
                            }}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                          >
                            {editingBriefSample === sample.id ? "Done Editing Sample" : "Edit Sample"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sampleContent = briefSampleDrafts[sample.id] ?? sample.content;
                              if (brief.trim()) {
                                setPendingBriefSample(sample.id);
                                setBriefReferenceMessage("Your brief already contains text. Choose whether to replace it with this sample or keep your current brief.");
                              } else {
                                setBrief(sampleContent);
                                setPendingBriefSample(null);
                                setBriefReferenceMessage(`${sample.type} sample added to your brief. You can edit the text or clear it below.`);
                              }
                              briefInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                              briefInputRef.current?.focus({ preventScroll: true });
                            }}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                          >
                            {editingBriefSample === sample.id ? "Use Edited Sample" : "Use as Reference"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="creative-project-brief" className="text-sm font-semibold text-slate-700">
                  Project brief (required)<span aria-hidden="true" className="ml-1 text-red-600">*</span>
                </label>
                {brief.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrief("");
                      setBriefReferenceMessage("");
                      setPendingBriefSample(null);
                      briefInputRef.current?.focus();
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    Clear brief
                  </button>
                )}
              </div>
              <div className="mt-2 block overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50">
                <span id="creative-brief-guidance" lang="ur-Latn" translate="yes" className="block border-b border-indigo-100 px-4 py-3 text-xs font-normal leading-5 text-indigo-950">
                  <strong className="block text-sm">Brief mein yeh zaroor likhein:</strong>
                  <span className="mt-1 block">• Kya banwana hai: video, image, animation ya prototype; aur kitni duration ya quantity chahiye.</span>
                  <span className="block">• Yeh kis audience, mulk ya platform ke liye hai; viewer ya customer kaun hai.</span>
                  <span className="block">• Project ka maqsad, main paigham, aur dekhne wale se aap kya action chahte hain.</span>
                  <span className="block">• Video ya image mein kya dikhana hai: scenes, products, services, zaroori features ya kahani.</span>
                  <span className="block">• Pasandeeda style, tone, language, aur koi example ya reference; logo aur brand assets ki availability bhi batayein.</span>
                  <span className="block">• Zaroori text, call-to-action, khaas pabandiyan, aur agar ho to deadline.</span>
                  <span className="mt-1 block font-semibold">Passwords ya sensitive personal maloomat na bhejein. Sirf woh files share karein jinhein bhejne ki ijazat ho.</span>
                </span>
                {briefReferenceMessage && (
                  <span role="status" className="block border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-normal text-indigo-800">
                    {briefReferenceMessage}
                    {pendingBriefSample && (
                      <span className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const sample = BRIEF_SAMPLES.find((item) => item.id === pendingBriefSample);
                            if (!sample) return;
                            setBrief(briefSampleDrafts[pendingBriefSample] ?? sample.content);
                            setPendingBriefSample(null);
                            setBriefReferenceMessage(`${sample.type} sample added to your brief. You can edit the text or clear it below.`);
                            briefInputRef.current?.focus();
                          }}
                          className="rounded-md bg-indigo-600 px-2.5 py-1.5 font-bold text-white hover:bg-indigo-700"
                        >
                          Replace with sample
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingBriefSample(null);
                            setBriefReferenceMessage("Your existing brief has been kept unchanged.");
                          }}
                          className="rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 font-bold text-indigo-800 hover:bg-indigo-100"
                        >
                          Keep my brief
                        </button>
                      </span>
                    )}
                  </span>
                )}
                <textarea
                  id="creative-project-brief"
                  ref={briefInputRef}
                  value={brief}
                  onChange={(event) => {
                    setBrief(event.target.value);
                    setBriefReferenceMessage("");
                    setPendingBriefSample(null);
                  }}
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  aria-describedby="creative-brief-guidance"
                  placeholder="Apna project brief yahan likhein..."
                  lang="ur-Latn"
                  translate="yes"
                  className="w-full border-0 bg-white px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input type="checkbox" checked={disclaimerAccepted} onChange={(event) => setDisclaimerAccepted(event.target.checked)} required className="mt-1 accent-indigo-600" />
              <span>This is an estimated project budget. Final pricing, production scope and delivery schedule are subject to creative team review and approval. I confirm I have permission to share any reference files.</span>
            </label>
            {submitError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</p>}
            <button type="submit" disabled={submitting || !configReady || Boolean(configError)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Submit project inquiry
            </button>
          </section>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section id="creative-quotation" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-indigo-600">Live estimate</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Project budget</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><WandSparkles className="h-5 w-5" /></div>
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              {priceIsManual ? "Manual quote" : priceFormatter(quote.total!)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{country} · {currency}</p>
            <div className="my-5 border-t border-slate-100" />
            <dl className="space-y-3 text-sm">
              <BreakdownRow label="Project" value={projectType} />
              <BreakdownRow label="Duration / quantity" value={projectKind === "image" ? `${imageCount} image${imageCount === 1 ? "" : "s"}` : `${currentDuration} sec`} />
              {quote.base !== null && <BreakdownRow label="Base estimate" value={priceFormatter(quote.base)} />}
              {quote.categoryCharge !== 0 && <BreakdownRow label="Category adjustment" value={priceFormatter(quote.categoryCharge)} />}
              {quote.complexityCharge !== 0 && <BreakdownRow label="Complexity adjustment" value={priceFormatter(quote.complexityCharge)} />}
              {quote.qualityCharge !== 0 && <BreakdownRow label="Quality adjustment" value={priceFormatter(quote.qualityCharge)} />}
              {quote.aspectRatioCharge !== 0 && <BreakdownRow label="Aspect ratio adjustment" value={priceFormatter(quote.aspectRatioCharge)} />}
              {quote.addonCharges.map((item) => <BreakdownRow key={item.id} label={item.label} value={item.amount === null ? "Custom quote" : priceFormatter(item.amount)} />)}
              <BreakdownRow label="Estimated delivery" value={quote.delivery} />
              <BreakdownRow label="Languages" value={Object.values(languages).filter(Boolean).join(", ") || "To be discussed"} />
              <BreakdownRow label="Style" value={style === "Custom Style" ? customStyle || style : style} />
              <BreakdownRow label="Format" value={`${quality} · ${currentAspectRatio}`} />
            </dl>
            {quote.reason && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{quote.reason}</p>}
            <p className="mt-4 text-xs leading-5 text-slate-500">Delivery estimates are provisional and are not confirmed until the creative team approves the project.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> Download / print quote</button>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> Contact AI Creator DWD</a>
            </div>
          </section>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900"><Globe2 className="h-4 w-4 text-indigo-600" /> Country-specific pricing</div>
            <p className="mt-2">
              {configReady
                ? `Pakistan video base rate: ${pakistanRate?.videoPerMinute === null || pakistanRate?.videoPerMinute === undefined ? "manual quotation" : `${formatCreativeCurrency(pakistanRate.videoPerMinute, "PKR")} per minute`}. International rate cards and image prices are managed by an administrator; no automatic currency conversion is used as a market quote.`
                : "Administrator-approved pricing could not be loaded. Estimates are unavailable until the database migration and rate configuration are installed."}
            </p>
          </div>
          <button type="button" onClick={resetCalculation} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><Check className="h-4 w-4" /> Start a new calculation</button>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pl-4 pr-24 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:pr-40" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Project budget</p>
            <p className="truncate text-lg font-black text-slate-950">{priceIsManual ? "Manual quote" : priceFormatter(quote.total!)}</p>
          </div>
          <button type="button" onClick={() => document.getElementById("creative-quotation")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">
            View breakdown
          </button>
        </div>
      </div>
    </main>
  );
}

function StepHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{number}</span>
      <span>
        <span className="block text-lg font-black tracking-tight text-slate-950">{title}</span>
        <span className="mt-1 block text-sm text-slate-500">{subtitle}</span>
      </span>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="min-w-0 text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
