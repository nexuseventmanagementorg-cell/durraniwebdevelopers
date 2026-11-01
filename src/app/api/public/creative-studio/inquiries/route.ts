import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { calculateCreativeQuote, CREATIVE_CATEGORIES } from "@/lib/creative-studio";
import type { CreativeQuoteInput } from "@/lib/creative-studio";
import {
  createCreativeInquiry,
  CreativeStudioStorageError,
  getCreativeStudioConfig,
  removeCreativeReferenceFiles,
  saveCreativeReferenceFile,
} from "@/lib/creative-studio-storage";
import type { CreativeReferenceFile } from "@/lib/creative-studio-storage";
import { notifyAdminOfSubmission } from "@/lib/admin-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function hasExpectedFileSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (type === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (type === "video/mp4") {
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  }
  if (type === "video/webm") {
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return false;
}

function hasExpectedFileExtension(name: string, type: string): boolean {
  const allowedExtensions: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "video/mp4": ["mp4"],
    "video/webm": ["webm"],
  };
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return allowedExtensions[type]?.includes(extension) ?? false;
}

function parseQuoteInput(value: unknown): CreativeQuoteInput | null {
  if (!isRecord(value)) return null;
  const projectKind = value.projectKind;
  if (projectKind !== "video" && projectKind !== "image" && projectKind !== "mvp") return null;
  if (typeof value.categoryId !== "string" ||
      !CREATIVE_CATEGORIES.some((category) => category.id === value.categoryId)) return null;
  if (typeof value.subcategory !== "string" || value.subcategory.length > 120) return null;
  const category = CREATIVE_CATEGORIES.find((item) => item.id === value.categoryId);
  const validSubcategory = projectKind === "image"
    ? IMAGE_TYPE_SET.has(value.subcategory)
    : category?.items.includes(value.subcategory as never);
  if (!validSubcategory) return null;
  if (typeof value.country !== "string" || value.country.trim().length < 2 || value.country.length > 100) return null;
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) return null;

  const durationSeconds = Number(value.durationSeconds);
  const imageCount = Number(value.imageCount);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > 9000) return null;
  if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 500) return null;
  if (typeof value.complexity !== "string" || !["basic", "standard", "advanced", "premium"].includes(value.complexity)) return null;
  if (typeof value.quality !== "string" || !["720p", "1080p", "2K", "4K"].includes(value.quality)) return null;
  const addonIds = Array.isArray(value.addonIds)
    ? Array.from(new Set(value.addonIds.filter((id): id is string => typeof id === "string"))).slice(0, 40)
    : [];
  return {
    country: value.country.trim(),
    currency: value.currency,
    projectKind,
    categoryId: value.categoryId,
    subcategory: value.subcategory,
    durationSeconds,
    imageCount,
    complexity: value.complexity,
    quality: value.quality,
    languageCount: 1,
    addonIds,
  };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`creative-studio:${ip}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many submissions. Please wait before submitting again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.resetInSec) } }
    );
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && !/^\d+$/.test(contentLengthHeader)) {
    return NextResponse.json({ success: false, error: "The request content length is invalid." }, { status: 400 });
  }
  const contentLength = Number(contentLengthHeader || 0);
  if (contentLength > MAX_TOTAL_FILE_BYTES + 100_000) {
    return NextResponse.json({ success: false, error: "Reference uploads exceed the 20 MB request limit." }, { status: 413 });
  }

  const uploadedReferences: CreativeReferenceFile[] = [];
  let inquirySaved = false;
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: "The inquiry form data is invalid." }, { status: 400 });
    }
    const customerValue = form.get("customer");
    const projectValue = form.get("project");
    if (typeof customerValue !== "string" || typeof projectValue !== "string") {
      return NextResponse.json({ success: false, error: "Customer details and project brief are required." }, { status: 400 });
    }

    let customer: unknown;
    let project: unknown;
    try {
      customer = JSON.parse(customerValue);
      project = JSON.parse(projectValue);
    } catch {
      return NextResponse.json({ success: false, error: "Customer details or project brief are invalid." }, { status: 400 });
    }
    if (!isRecord(customer) || !isRecord(project)) {
      return NextResponse.json({ success: false, error: "Customer details and project brief must be valid objects." }, { status: 400 });
    }

    const name = text(customer.name, 120);
    const email = text(customer.email, 254).toLowerCase();
    const whatsapp = text(customer.whatsapp, 30);
    const country = text(customer.country, 100);
    const customerType = text(customer.customerType, 30);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        whatsapp.replace(/\D/g, "").length < 8 || country.length < 2 ||
        !["Individual", "Business", "Agency", "Brand", "Enterprise"].includes(customerType)) {
      return NextResponse.json({ success: false, error: "Enter a name, valid email, WhatsApp number, country, and customer type." }, { status: 400 });
    }

    const quoteInput = parseQuoteInput(project.quoteInput);
    const brief = text(project.brief, 4000);
    const vision = text(project.vision, 2000);
    const style = text(project.style, 80);
    const resolution = text(project.resolution, 20);
    const aspectRatio = text(project.aspectRatio, 30);
    if (!quoteInput || !brief || !style ||
        !["720p", "1080p", "2K", "4K"].includes(resolution) ||
        !["9:16", "16:9", "1:1", "4:5"].includes(aspectRatio) &&
          !/^([1-9]\d?):([1-9]\d?)$/.test(aspectRatio)) {
      return NextResponse.json({ success: false, error: "Complete the project category, brief, style, quality, and format selections." }, { status: 400 });
    }
    if (quoteInput.projectKind === "image" && !IMAGE_TYPE_SET.has(quoteInput.subcategory)) {
      return NextResponse.json({ success: false, error: "Select a supported image project type." }, { status: 400 });
    }

    const files = form.getAll("references");
    if (files.length > 3 || files.some((file) => !(file instanceof File))) {
      return NextResponse.json({ success: false, error: "Upload up to 3 image or video reference files." }, { status: 400 });
    }
    let totalFileBytes = 0;
    const filesToUpload: { name: string; type: string; bytes: Uint8Array }[] = [];
    for (const file of files as File[]) {
      if (file.size < 1 || file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ success: false, error: "Each reference file must be 10 MB or smaller." }, { status: 413 });
      }
      totalFileBytes += file.size;
      if (totalFileBytes > MAX_TOTAL_FILE_BYTES) {
        return NextResponse.json({ success: false, error: "Reference uploads exceed the 20 MB total limit." }, { status: 413 });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasExpectedFileExtension(file.name, file.type) ||
          !hasExpectedFileSignature(file.type, bytes)) {
        return NextResponse.json({ success: false, error: "A reference file does not match its allowed image/video format." }, { status: 400 });
      }
      filesToUpload.push({ name: file.name, type: file.type, bytes });
    }

    const languageValues = isRecord(project.languages) ? project.languages : {};
    const allowedLanguages = new Set([
      "English", "Urdu", "Hindi", "Arabic", "French", "German",
      "Spanish", "Italian", "Turkish", "Chinese", "Japanese", "Other",
    ]);
    const languages = Object.fromEntries(
      ["video", "script", "voiceover", "subtitles", "dubbing"].map((key) => {
        const selected = text(languageValues[key], 20);
        return [key, allowedLanguages.has(selected) ? selected : ""];
      })
    );
    const config = await getCreativeStudioConfig();
    const enabledAddonIds = new Set(config.addons.filter((addon) => addon.enabled).map((addon) => addon.id));
    const safeQuoteInput = {
      ...quoteInput,
      country,
      languageCount: new Set(Object.values(languages).filter(Boolean)).size || 1,
      addonIds: quoteInput.addonIds.filter((id) => enabledAddonIds.has(id)),
    };
    const quote = calculateCreativeQuote(safeQuoteInput, config);

    for (const file of filesToUpload) {
      uploadedReferences.push(await saveCreativeReferenceFile(file.name, file.type, file.bytes));
    }

    const result = await createCreativeInquiry({
      customer: {
        name,
        email,
        whatsapp,
        country,
        customerType,
        company: text(customer.company, 160),
        preferredDeliveryDate: text(customer.preferredDeliveryDate, 20),
      },
      project: {
        ...safeQuoteInput,
        style,
        vision,
        brief,
        languages,
        resolution,
        aspectRatio,
        referenceFiles: uploadedReferences,
      },
      quote,
      quoteSnapshot: config,
    });
    inquirySaved = true;

    await notifyAdminOfSubmission({
      type: "Creative Studio inquiry",
      reference: result.inquiry.id,
      customerName: name,
      customerEmail: email,
      customerPhone: whatsapp,
      details: `${quoteInput.subcategory} — ${quote.total === null ? "manual quotation" : `${quote.currency} ${quote.total}`}`,
    });

    return NextResponse.json({
      success: true,
      inquiry: { id: result.inquiry.id, status: result.inquiry.status, quote: result.inquiry.quote },
      trackingToken: result.trackingToken,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!inquirySaved && uploadedReferences.length > 0) {
      try {
        await removeCreativeReferenceFiles(uploadedReferences);
      } catch (cleanupError) {
        const code = typeof cleanupError === "object" && cleanupError !== null && "code" in cleanupError
          ? String(cleanupError.code || "unknown")
          : "unknown";
        console.error("Creative Studio reference cleanup failed", {
          code,
          errorType: cleanupError instanceof Error ? cleanupError.name : typeof cleanupError,
        });
      }
    }
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Creative inquiry could not be saved. Please try again or contact us directly.";
    if (!(error instanceof CreativeStudioStorageError)) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String(error.code || "unknown")
        : "unknown";
      console.error("Creative Studio inquiry submission failed", {
        code,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

const IMAGE_TYPE_SET = new Set([
  "Social Media Images", "Product Images", "AI Portraits", "Professional Headshots",
  "Fashion Images", "Jewellery Images", "Real Estate Images", "Advertising Creatives",
  "YouTube Thumbnails", "Posters", "Banners", "Album Covers", "Book Covers",
  "Digital Illustrations", "Character Designs", "Infographics", "Concept Art", "AI Image Editing",
]);
