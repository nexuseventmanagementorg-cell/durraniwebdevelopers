import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import { CREATIVE_CATEGORIES } from "@/lib/creative-studio";
import type { CreativeQuoteInput } from "@/lib/creative-studio";
import {
  createCreativeInquiryId,
  createCreativeInquiry,
  createCreativeTrackingToken,
  CreativeStudioStorageError,
  getCreativeStudioConfig,
  getCreativeInquiry,
  removeCreativeReferenceFiles,
  saveCreativeReferenceFile,
} from "@/lib/creative-studio-storage";
import type { CreativeReferenceFile } from "@/lib/creative-studio-storage";
import { notifyAdminOfSubmission } from "@/lib/admin-notifications";
import { isValidCreativeReferenceFile } from "@/lib/creative-reference-files";
import { calculateCreativeStudioEstimate } from "@/lib/creative-studio-estimate";

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
  const rawAddonIds = value.addonIds === undefined ? [] : value.addonIds;
  if (!Array.isArray(rawAddonIds) || rawAddonIds.length > 40 ||
      !rawAddonIds.every((id): id is string => typeof id === "string")) return null;
  const addonIds = Array.from(new Set(rawAddonIds));
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
    aspectRatio: "9:16",
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
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
    if (idempotencyKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return NextResponse.json({ success: false, error: "The submission retry key is invalid. Refresh the form and try again." }, { status: 400 });
    }
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
    if (!quoteInput || brief.length < 10 || !style ||
        !["720p", "1080p", "2K", "4K"].includes(resolution) ||
        !["9:16", "16:9", "1:1", "4:5"].includes(aspectRatio) &&
          !/^([1-9]\d?):([1-9]\d?)$/.test(aspectRatio)) {
      return NextResponse.json({ success: false, error: "Complete the project category, brief, style, quality, and format selections." }, { status: 400 });
    }
    if (quoteInput.projectKind === "image" && !IMAGE_TYPE_SET.has(quoteInput.subcategory)) {
      return NextResponse.json({ success: false, error: "Select a supported image project type." }, { status: 400 });
    }

    const files = form.getAll("references");
    if (files.length > 20 || files.some((file) => !(file instanceof File))) {
      return NextResponse.json({ success: false, error: "Upload up to 20 reference files." }, { status: 400 });
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
      if (!isValidCreativeReferenceFile(file.name, file.type, bytes)) {
        return NextResponse.json({ success: false, error: "A reference file does not match an allowed image, video, or script format." }, { status: 400 });
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
    const safeQuoteInput = {
      ...quoteInput,
      country,
      aspectRatio,
      languageCount: new Set(Object.values(languages).filter(Boolean)).size || 1,
      addonIds: Array.from(new Set(quoteInput.addonIds)),
    };
    const customerData = {
      name,
      email,
      whatsapp,
      country,
      customerType,
      company: text(customer.company, 160),
      preferredDeliveryDate: text(customer.preferredDeliveryDate, 20),
    };
    const projectData = {
      ...safeQuoteInput,
      style,
      vision,
      brief,
      languages,
      resolution,
      aspectRatio,
      referenceFiles: uploadedReferences,
    };
    const submissionFingerprint = idempotencyKey
      ? createHash("sha256").update(JSON.stringify({
          customer: customerData,
          project: {
            ...projectData,
            referenceFiles: filesToUpload.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.bytes.byteLength,
              digest: createHash("sha256").update(file.bytes).digest("hex"),
            })),
          },
        })).digest("hex")
      : undefined;
    const inquiryId = createCreativeInquiryId(idempotencyKey || undefined);
    const trackingToken = createCreativeTrackingToken(idempotencyKey || undefined);
    if (submissionFingerprint) {
      const existing = await getCreativeInquiry(inquiryId);
      if (existing) {
        if (existing.submissionFingerprint !== submissionFingerprint) {
          return NextResponse.json({ success: false, error: "This submission retry key was already used with different project details. Refresh the form before submitting a changed inquiry." }, { status: 409 });
        }
        return NextResponse.json({
          success: true,
          inquiry: { id: existing.id, status: existing.status, quote: existing.quote },
          trackingToken,
        }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
      }
    }
    const config = await getCreativeStudioConfig();
    const enabledAddonIds = new Set(config.addons.filter((addon) => addon.enabled).map((addon) => addon.id));
    if (safeQuoteInput.addonIds.some((addonId) => !enabledAddonIds.has(addonId))) {
      return NextResponse.json({ success: false, error: "A selected add-on is unavailable. Refresh pricing and try again." }, { status: 400 });
    }
    const originalEstimate = calculateCreativeStudioEstimate({
      inquiryId,
      input: safeQuoteInput,
      config,
      customer: customerData,
      project: projectData,
      estimateId: `${inquiryId}-original`,
    });

    for (const file of filesToUpload) {
      uploadedReferences.push(await saveCreativeReferenceFile(file.name, file.type, file.bytes));
    }

    const result = await createCreativeInquiry({
      customer: customerData,
      project: { ...projectData, referenceFiles: uploadedReferences },
      quote: originalEstimate.quote,
      quoteSnapshot: config,
      originalEstimate,
      ...(submissionFingerprint ? { submissionFingerprint } : {}),
    }, inquiryId, trackingToken);
    inquirySaved = true;

    if (!result.created && uploadedReferences.length > 0) {
      await removeCreativeReferenceFiles(uploadedReferences);
      uploadedReferences.length = 0;
    }
    if (result.created) {
      await notifyAdminOfSubmission({
        type: "Creative Studio inquiry",
        reference: result.inquiry.id,
        customerName: name,
        customerEmail: email,
        customerPhone: whatsapp,
        details: `${quoteInput.subcategory} — ${originalEstimate.estimatedTotal === null ? "manual quotation/review required" : `${originalEstimate.currency} ${originalEstimate.estimatedTotal} preliminary estimate`}`,
      });
    }

    return NextResponse.json({
      success: true,
      inquiry: { id: result.inquiry.id, status: result.inquiry.status, quote: result.inquiry.quote },
      trackingToken: result.trackingToken,
    }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
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
