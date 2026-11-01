export type CreativeBillingUnit =
  | "fixed"
  | "per_minute"
  | "per_image"
  | "per_language"
  | "percentage"
  | "custom_quote";

export interface CreativeAddon {
  id: string;
  name: string;
  billingUnit: CreativeBillingUnit;
  price: number | null;
  enabled: boolean;
}

export interface CreativeCountryRate {
  country: string;
  currency: string;
  videoPerMinute: number | null;
  imagePerImage: number | null;
  categoryMultipliers: Record<string, number>;
}

export interface CreativeStudioConfig {
  version: number;
  countries: CreativeCountryRate[];
  categoryMultipliers: Record<string, number>;
  complexityMultipliers: Record<string, number>;
  qualityMultipliers: Record<string, number>;
  addons: CreativeAddon[];
}

export interface CreativeQuoteInput {
  country: string;
  currency: string;
  projectKind: "video" | "image" | "mvp";
  categoryId: string;
  subcategory: string;
  durationSeconds: number;
  imageCount: number;
  complexity: string;
  quality: string;
  languageCount: number;
  addonIds: string[];
}

export interface CreativeQuote {
  currency: string;
  total: number | null;
  base: number | null;
  categoryCharge: number;
  complexityCharge: number;
  qualityCharge: number;
  addonCharges: { id: string; label: string; amount: number | null }[];
  requiresManualReview: boolean;
  reason: string | null;
  delivery: string;
  featureFilmReview: boolean;
}

export interface CreativeInquiry {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CreativeInquiryStatus;
  statusBeforeHold?: CreativeInquiryStatus;
  customer: {
    name: string;
    email: string;
    whatsapp: string;
    country: string;
    customerType: string;
    company: string;
    preferredDeliveryDate: string;
  };
  project: CreativeQuoteInput & {
    style: string;
    vision: string;
    brief: string;
    languages: Record<string, string>;
    resolution: string;
    aspectRatio: string;
    referenceFiles: { name: string; path: string; type: string; size: number }[];
  };
  quote: CreativeQuote;
  quoteSnapshot: CreativeStudioConfig;
  customerQuoteApprovedAt?: string;
  adminApprovedAt?: string;
  paymentVerifiedAt?: string;
  requirementsCompleteAt?: string;
  paymentVerification?: {
    amount: number;
    reference: string;
    note: string;
    verifiedAt: string;
    verifiedBy: string;
  };
  adminNotes: string;
  activity: { at: string; actor: string; action: string; detail: string }[];
}

export type CreativeInquiryStatus =
  | "NEW_INQUIRY"
  | "UNDER_REVIEW"
  | "NEEDS_MORE_INFORMATION"
  | "QUOTATION_PREPARED"
  | "AWAITING_CUSTOMER_APPROVAL"
  | "AWAITING_PAYMENT"
  | "PAYMENT_UNDER_VERIFICATION"
  | "PAYMENT_RECEIVED"
  | "ADMIN_APPROVED"
  | "READY_FOR_PRODUCTION"
  | "IN_PRODUCTION"
  | "QUALITY_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "ON_HOLD";

export const CREATIVE_CATEGORIES = [
  {
    id: "social",
    label: "Social media",
    multiplierKey: "social",
    items: [
      "Instagram Posts", "Instagram Reels", "Instagram Stories", "Facebook Posts",
      "Facebook Reels", "Facebook Advertisements", "TikTok Videos", "YouTube Shorts",
      "YouTube Videos", "YouTube Thumbnails", "LinkedIn Content", "Pinterest Creatives",
      "Social Media Carousels", "Social Media Campaigns", "Influencer Content",
    ],
  },
  {
    id: "business",
    label: "Business & commercial",
    multiplierKey: "business",
    items: [
      "Corporate Videos", "Company Introduction Videos", "Brand Advertisements",
      "Product Advertisements", "Promotional Videos", "Product Photography",
      "Product Animation", "Business Presentations", "Corporate Explainer Videos",
      "Sales Campaigns", "Real Estate Advertisements", "Website Promotional Videos",
      "App Promotional Videos",
    ],
  },
  {
    id: "film",
    label: "Entertainment & film",
    multiplierKey: "film",
    items: [
      "Hollywood-Style AI Films", "Bollywood-Style AI Films", "Short Films",
      "Feature Films", "Film Trailers", "Movie Teasers", "Documentary Films",
      "Web Series", "Episodic Content", "Music Videos", "Lyrics Videos",
      "Animated Movies", "Cinematic Storytelling",
    ],
  },
  {
    id: "music",
    label: "Music",
    multiplierKey: "music",
    items: [
      "AI Music Videos", "Song Visualizers", "Lyrics Videos", "Animated Music Videos",
      "Cinematic Music Videos", "Album Covers", "Music Promotional Content",
      "Audio-to-Video Production", "Original AI Music Composition", "Music Video Editing",
    ],
  },
  {
    id: "education",
    label: "Education",
    multiplierKey: "education",
    items: [
      "Educational Videos", "Online Courses", "Tutorials", "Training Videos",
      "Animated Lessons", "E-learning Content", "Science Explainers",
      "Language Learning Content", "Academic Presentations",
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    multiplierKey: "business",
    items: [
      "Wedding Videos", "Birthday Videos", "Anniversary Videos", "Travel Videos",
      "Family Celebration Videos", "Fashion Videos", "Beauty Content", "Fitness Videos",
      "Food Videos", "Restaurant Promotions", "Personal Branding",
      "Motivational Videos", "Cultural Videos", "Event Invitations",
    ],
  },
  {
    id: "real-estate",
    label: "Real estate & architecture",
    multiplierKey: "realEstate",
    items: [
      "Property Videos", "Virtual Property Tours", "Architectural Visualization",
      "Interior Design Visualization", "Exterior Visualization", "Virtual Staging",
      "Real Estate Advertisements", "Construction Progress Videos",
      "Property Promotional Films",
    ],
  },
  {
    id: "animation",
    label: "Animation & digital art",
    multiplierKey: "animation",
    items: [
      "2D Animation", "3D Animation", "Motion Graphics", "Animated Characters",
      "AI Character Design", "Game Trailers", "Game Assets", "Cartoon Videos",
      "Fantasy Environments", "Visual Effects", "Logo Animation", "Product Animation",
    ],
  },
  {
    id: "documentary",
    label: "News & documentary",
    multiplierKey: "education",
    items: [
      "News Explainers", "Historical Documentaries", "Social Awareness Videos",
      "Research-Based Videos", "Interview Visualizations", "Public Awareness Campaigns",
      "Educational Documentaries",
    ],
  },
  {
    id: "ai-development",
    label: "AI development & MVP",
    multiplierKey: "mvp",
    items: [
      "MVP Application Prototype", "Website Prototype", "Mobile Application Prototype",
      "SaaS Product Prototype", "AI Chatbot Prototype", "AI Business Assistant",
      "Product Demonstration Video", "Software Explainer Video",
      "AI Automation Demonstration",
    ],
  },
  {
    id: "other",
    label: "Other",
    multiplierKey: "custom",
    items: ["Custom Creative Project", "Multiple Category Campaign", "Other Custom Requirements"],
  },
] as const;

export const VIDEO_DURATIONS = [
  { seconds: 10, label: "10 seconds" },
  { seconds: 20, label: "20 seconds" },
  { seconds: 30, label: "30 seconds" },
  { seconds: 40, label: "40 seconds" },
  { seconds: 50, label: "50 seconds" },
  { seconds: 60, label: "1 minute" },
  { seconds: 120, label: "2 minutes" },
  { seconds: 180, label: "3 minutes" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 600, label: "10 minutes" },
  { seconds: 900, label: "15 minutes" },
  { seconds: 1200, label: "20 minutes" },
  { seconds: 1500, label: "25 minutes" },
  { seconds: 1800, label: "30 minutes" },
  { seconds: 2700, label: "45 minutes" },
  { seconds: 3600, label: "60 minutes" },
  { seconds: 5400, label: "90 minutes — feature film" },
  { seconds: 7200, label: "120 minutes — extended film" },
  { seconds: 9000, label: "150 minutes — feature film" },
] as const;

export const CREATIVE_PROJECT_KINDS = [
  { id: "video", label: "Video production" },
  { id: "image", label: "Image creation" },
  { id: "mvp", label: "MVP / prototype" },
] as const;

export const CREATIVE_STYLES = [
  "Realistic", "Hyper-realistic", "Cinematic", "Hollywood-inspired",
  "Bollywood-inspired", "Documentary", "Commercial Advertisement", "Animated",
  "2D Animation", "3D Animation", "Cartoon", "Anime-inspired", "Minimalist",
  "Luxury", "Futuristic", "Fantasy", "Vintage", "Corporate", "Educational",
  "Emotional Storytelling", "Custom Style",
] as const;

export const CREATIVE_LANGUAGES = [
  "English", "Urdu", "Hindi", "Arabic", "French", "German", "Spanish", "Italian",
  "Turkish", "Chinese", "Japanese", "Other",
] as const;

export const IMAGE_TYPES = [
  "Social Media Images", "Product Images", "AI Portraits", "Professional Headshots",
  "Fashion Images", "Jewellery Images", "Real Estate Images", "Advertising Creatives",
  "YouTube Thumbnails", "Posters", "Banners", "Album Covers", "Book Covers",
  "Digital Illustrations", "Character Designs", "Infographics", "Concept Art",
  "AI Image Editing",
] as const;

export const CREATIVE_ADDON_NAMES = [
  "Professional Scriptwriting", "Storyboarding", "AI Voiceover", "Multiple Voice Options",
  "Urdu Dubbing", "English Dubbing", "Multilingual Dubbing", "Lip-sync", "AI Avatar",
  "Character Consistency", "Background Music", "Original AI Music", "Sound Design",
  "Professional Editing", "Cinematic Colour Grading", "Subtitles", "Translation",
  "4K Upscaling", "Advanced Animation", "Visual Effects", "Thumbnail Design",
  "Poster Design", "Social Media Cutdowns", "Multiple Aspect Ratios", "Source Files",
  "Additional Revisions", "Express Delivery", "Commercial Usage Licence",
  "Campaign Bundle", "Monthly Content Package",
] as const;

export const CREATIVE_CURRENCIES = [
  "USD", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "INR", "Other",
] as const;

export const CREATIVE_CUSTOMER_TYPES = [
  "Individual", "Business", "Agency", "Brand", "Enterprise",
] as const;

export const CREATIVE_STATUSES: CreativeInquiryStatus[] = [
  "NEW_INQUIRY",
  "UNDER_REVIEW",
  "NEEDS_MORE_INFORMATION",
  "QUOTATION_PREPARED",
  "AWAITING_CUSTOMER_APPROVAL",
  "AWAITING_PAYMENT",
  "PAYMENT_UNDER_VERIFICATION",
  "PAYMENT_RECEIVED",
  "ADMIN_APPROVED",
  "READY_FOR_PRODUCTION",
  "IN_PRODUCTION",
  "QUALITY_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
];

const CREATIVE_STATUS_TRANSITIONS: Partial<Record<CreativeInquiryStatus, CreativeInquiryStatus[]>> = {
  NEW_INQUIRY: ["UNDER_REVIEW", "NEEDS_MORE_INFORMATION"],
  UNDER_REVIEW: ["NEEDS_MORE_INFORMATION"],
  NEEDS_MORE_INFORMATION: ["UNDER_REVIEW"],
  QUOTATION_PREPARED: ["UNDER_REVIEW", "NEEDS_MORE_INFORMATION"],
  AWAITING_PAYMENT: ["PAYMENT_UNDER_VERIFICATION"],
  PAYMENT_UNDER_VERIFICATION: ["AWAITING_PAYMENT"],
  ADMIN_APPROVED: ["READY_FOR_PRODUCTION"],
  READY_FOR_PRODUCTION: ["IN_PRODUCTION"],
  IN_PRODUCTION: ["QUALITY_REVIEW"],
  QUALITY_REVIEW: ["REVISION_REQUESTED", "APPROVED_FOR_DELIVERY"],
  REVISION_REQUESTED: ["IN_PRODUCTION"],
  APPROVED_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
};

export function getCreativeInquiryTransitions(
  status: CreativeInquiryStatus,
  statusBeforeHold?: CreativeInquiryStatus
): CreativeInquiryStatus[] {
  if (status === "CANCELLED" || status === "COMPLETED") return [];
  if (status === "ON_HOLD") {
    return [statusBeforeHold || "UNDER_REVIEW", "CANCELLED"];
  }
  return Array.from(new Set([
    ...(CREATIVE_STATUS_TRANSITIONS[status] || []),
    "ON_HOLD" as CreativeInquiryStatus,
    "CANCELLED" as CreativeInquiryStatus,
  ]));
}

export const DEFAULT_CREATIVE_STUDIO_CONFIG: CreativeStudioConfig = {
  version: 1,
  countries: [
    {
      country: "Pakistan",
      currency: "PKR",
      videoPerMinute: 10000,
      imagePerImage: null,
      categoryMultipliers: {},
    },
  ],
  categoryMultipliers: {
    social: 1,
    business: 1,
    film: 2.5,
    featureFilm: 3,
    music: 2,
    education: 1.25,
    realEstate: 1.75,
    animation: 2,
    mvp: 3,
    custom: 1,
  },
  complexityMultipliers: { basic: 1, standard: 1, advanced: 1, premium: 1 },
  qualityMultipliers: { "720p": 1, "1080p": 1, "2K": 1, "4K": 1 },
  addons: CREATIVE_ADDON_NAMES.map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    billingUnit: "custom_quote",
    price: null,
    enabled: true,
  })),
};

const FEATURE_FILM_SECONDS = new Set([5400, 7200, 9000]);
const MANUAL_QUOTE_ITEMS = new Set(["MVP Application Prototype", "Mobile Application Prototype", "SaaS Product Prototype"]);

function roundToHundred(amount: number): number {
  return Math.round(amount / 100) * 100;
}

export function getDeliveryEstimate(projectKind: CreativeQuoteInput["projectKind"], seconds: number): string {
  if (projectKind === "image") return "1–3 working days (estimate; subject to approval)";
  if (projectKind === "mvp") return "Manual scope and delivery review required";
  if (seconds >= 9000) return "90–180 working days (estimate; subject to approval)";
  if (seconds >= 5400) return "60–120 working days (estimate; subject to approval)";
  if (seconds > 1800) return "30–60 working days (estimate; subject to approval)";
  if (seconds > 600) return "14–30 working days (estimate; subject to approval)";
  if (seconds > 300) return "7–14 working days (estimate; subject to approval)";
  if (seconds > 60) return "5–10 working days (estimate; subject to approval)";
  return "2–5 working days (estimate; subject to approval)";
}

export function calculateCreativeQuote(
  input: CreativeQuoteInput,
  config: CreativeStudioConfig
): CreativeQuote {
  const countryRate = config.countries.find(
    (rate) => rate.country.toLowerCase() === input.country.trim().toLowerCase() &&
      rate.currency === input.currency
  );
  const category = CREATIVE_CATEGORIES.find((item) => item.id === input.categoryId);
  const featureFilmReview = FEATURE_FILM_SECONDS.has(input.durationSeconds);
  const isManualProject = input.projectKind === "mvp" ||
    MANUAL_QUOTE_ITEMS.has(input.subcategory) ||
    input.subcategory === "Other Custom Requirements" ||
    input.subcategory === "Multiple Category Campaign";
  const multiplierKey = category?.multiplierKey || "custom";
  const effectiveMultiplierKey = featureFilmReview ? "featureFilm" : multiplierKey;
  const categoryMultiplier = countryRate?.categoryMultipliers[effectiveMultiplierKey] ??
    config.categoryMultipliers[effectiveMultiplierKey] ?? 1;
  const complexityMultiplier = config.complexityMultipliers[input.complexity] ?? 1;
  const qualityMultiplier = config.qualityMultipliers[input.quality] ?? 1;
  const countryConfigured = Boolean(countryRate);
  const baseRate = input.projectKind === "image"
    ? countryRate?.imagePerImage
    : countryRate?.videoPerMinute;
  const quantity = input.projectKind === "image"
    ? Math.max(1, Math.min(500, Math.floor(input.imageCount)))
    : Math.max(10, Math.min(9000, Math.floor(input.durationSeconds)));
  const billableUnits = input.projectKind === "image" ? quantity : quantity / 60;
  const base = countryConfigured && baseRate !== null && baseRate !== undefined && !isManualProject
    ? roundToHundred(baseRate * billableUnits)
    : null;

  const addonCharges: CreativeQuote["addonCharges"] = [];
  Array.from(new Set(input.addonIds)).forEach((id) => {
    const addon = config.addons.find((item) => item.id === id && item.enabled);
    if (!addon) return;
    if (addon.billingUnit === "custom_quote" || addon.price === null) {
      addonCharges.push({ id, label: addon.name, amount: null });
      return;
    }
    let units = 1;
    if (addon.billingUnit === "per_minute") units = input.durationSeconds / 60;
    if (addon.billingUnit === "per_image") units = input.imageCount;
    if (addon.billingUnit === "per_language") units = Math.max(1, input.languageCount);
    const amount = addon.billingUnit === "percentage"
      ? roundToHundred((base || 0) * addon.price / 100)
      : roundToHundred(addon.price * units);
    addonCharges.push({ id, label: addon.name, amount });
  });

  const needsReview = !countryConfigured || base === null || isManualProject ||
    addonCharges.some((addon) => addon.amount === null);
  const reason = !countryConfigured
    ? "No administrator-approved rate card exists for this country and currency."
    : base === null
      ? input.projectKind === "image"
        ? "Image pricing has not yet been configured by the creative team."
        : "A manual quotation is required for this project type."
      : addonCharges.some((addon) => addon.amount === null)
        ? "One or more selected services need a custom quotation."
        : null;
  const categoryCharge = base === null ? 0 : roundToHundred(base * (categoryMultiplier - 1));
  const afterCategory = base === null ? 0 : base + categoryCharge;
  const complexityCharge = base === null
    ? 0
    : roundToHundred(afterCategory * (complexityMultiplier - 1));
  const afterComplexity = afterCategory + complexityCharge;
  const qualityCharge = base === null
    ? 0
    : roundToHundred(afterComplexity * (qualityMultiplier - 1));
  const configuredAddonsTotal = addonCharges.reduce((total, item) => total + (item.amount ?? 0), 0);

  return {
    currency: input.currency,
    total: needsReview || base === null
      ? null
      : roundToHundred(base + categoryCharge + complexityCharge + qualityCharge + configuredAddonsTotal),
    base,
    categoryCharge,
    complexityCharge,
    qualityCharge,
    addonCharges,
    requiresManualReview: needsReview || featureFilmReview,
    reason: featureFilmReview
      ? "Feature-film budgets are indicative and require a manual production review."
      : reason,
    delivery: getDeliveryEstimate(input.projectKind, input.durationSeconds),
    featureFilmReview,
  };
}

export function formatCreativeCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en")}`;
  }
}
