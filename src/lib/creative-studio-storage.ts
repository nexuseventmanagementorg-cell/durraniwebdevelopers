import { randomBytes, randomInt, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CREATIVE_STATUSES,
  DEFAULT_CREATIVE_STUDIO_CONFIG,
  getCreativeInquiryTransitions,
} from "@/lib/creative-studio";
import type {
  CreativeInquiry,
  CreativeInquiryStatus,
  CreativeStudioConfig,
} from "@/lib/creative-studio";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

const DATA_FILE = path.join(process.cwd(), "data", "creative-studio.json");
const LOCAL_FILES_DIR = path.join(process.cwd(), "data", "creative-studio-references");
const SETTINGS_TABLE = "creative_studio_settings";
const INQUIRIES_TABLE = "creative_studio_inquiries";
const FILE_BUCKET = "creative-studio-references";

interface LocalCreativeData {
  config: CreativeStudioConfig;
  inquiries: Array<{ inquiry: CreativeInquiry; trackingTokenHash: string }>;
}

export class CreativeStudioStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreativeStudioStorageError";
  }
}

export interface CreativeReferenceFile {
  name: string;
  path: string;
  type: string;
  size: number;
}

export type CreativeStudioReadinessStatus =
  | "NOT_INSTALLED"
  | "PARTIALLY_INSTALLED"
  | "READY"
  | "CONFIGURATION_ERROR"
  | "UNAVAILABLE";

export interface CreativeStudioReadiness {
  status: CreativeStudioReadinessStatus;
  missing: string[];
  message: string;
}

function isProductionWithoutSupabase(): boolean {
  return process.env.NODE_ENV === "production" && !hasPaymentSupabaseConfiguration();
}

async function readLocalData(): Promise<LocalCreativeData> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" && parsed !== null &&
      "config" in parsed && "inquiries" in parsed &&
      typeof parsed.config === "object" && parsed.config !== null &&
      Array.isArray(parsed.inquiries)
    ) {
      return parsed as LocalCreativeData;
    }
    throw new CreativeStudioStorageError("Local creative studio data has an invalid format.");
  } catch (error) {
    if (error instanceof CreativeStudioStorageError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return { config: DEFAULT_CREATIVE_STUDIO_CONFIG, inquiries: [] };
    }
    throw new CreativeStudioStorageError("Creative studio local storage could not be read.");
  }
}

async function writeLocalData(data: LocalCreativeData): Promise<void> {
  const directory = path.dirname(DATA_FILE);
  const temporary = `${DATA_FILE}.${process.pid}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
  await rename(temporary, DATA_FILE);
}

function requireBackend(): void {
  if (isProductionWithoutSupabase()) {
    throw new CreativeStudioStorageError(
      "Creative Studio storage is not configured. Configure Supabase and apply the approved Creative Studio migrations."
    );
  }
}

function isStorageTableMissing(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

function describeStorageError(error: { code?: string }): CreativeStudioStorageError {
  if (isStorageTableMissing(error)) {
    return new CreativeStudioStorageError(
      "Creative Studio database tables are missing. Review and apply the approved Creative Studio migrations to the DWD Supabase project."
    );
  }
  return new CreativeStudioStorageError(
    "Creative Studio storage is unavailable. Check Supabase connectivity and service-role permissions."
  );
}

export async function getCreativeStudioReadiness(): Promise<CreativeStudioReadiness> {
  if (!hasPaymentSupabaseConfiguration()) {
    const production = process.env.NODE_ENV === "production";
    return {
      status: production ? "CONFIGURATION_ERROR" : "NOT_INSTALLED",
      missing: production
        ? ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        : [SETTINGS_TABLE, INQUIRIES_TABLE, FILE_BUCKET],
      message: production
        ? "Creative Studio Supabase configuration is missing."
        : "Creative Studio is using local development storage; the Supabase schema is not installed.",
    };
  }

  try {
    const supabase = getPaymentSupabase();
    const [settings, inquiries, buckets] = await Promise.all([
      supabase.from(SETTINGS_TABLE).select("id").limit(1),
      supabase.from(INQUIRIES_TABLE).select("inquiry_id").limit(1),
      supabase.storage.listBuckets(),
    ]);
    const tableErrors = [
      { name: SETTINGS_TABLE, error: settings.error },
      { name: INQUIRIES_TABLE, error: inquiries.error },
    ];
    const unexpectedError = tableErrors.find(({ error }) =>
      error && !isStorageTableMissing(error)
    )?.error || buckets.error;

    if (unexpectedError) {
      const code = "code" in unexpectedError ? String(unexpectedError.code || "unknown") : "unknown";
      console.error("Creative Studio readiness check failed", { code });
      return {
        status: "UNAVAILABLE",
        missing: [],
        message: "Creative Studio storage could not be verified. Check Supabase connectivity and service-role permissions.",
      };
    }

    const missing = tableErrors
      .filter(({ error }) => error && isStorageTableMissing(error))
      .map(({ name }) => name);
    if (!buckets.data?.some((bucket) => bucket.name === FILE_BUCKET)) {
      missing.push(FILE_BUCKET);
    }

    if (missing.length === 0) {
      return { status: "READY", missing, message: "Creative Studio storage is ready." };
    }

    const tablesMissing = missing.includes(SETTINGS_TABLE) && missing.includes(INQUIRIES_TABLE);
    const status = tablesMissing ? "NOT_INSTALLED" : "PARTIALLY_INSTALLED";
    return {
      status,
      missing,
      message: `Creative Studio setup is incomplete. Missing: ${missing.join(", ")}. Review and apply the approved Creative Studio migrations to the configured DWD Supabase project.`,
    };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code || "unknown")
      : "unknown";
    console.error("Creative Studio readiness check failed", {
      code,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return {
      status: "UNAVAILABLE",
      missing: [],
      message: "Creative Studio storage could not be verified. Check Supabase connectivity and service-role permissions.",
    };
  }
}

export function isValidCreativeStudioConfig(value: unknown): value is CreativeStudioConfig {
  if (!isRecord(value)) return false;
  const config = value;
  const isPositiveRate = (rate: unknown) =>
    rate === null || (
      typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 1_000_000_000
    );
  const validNumberMap = (map: unknown) =>
    typeof map === "object" && map !== null && !Array.isArray(map) &&
    Object.values(map).every((number) =>
      typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 100
    );
  const countries = config.countries;
  const addons = config.addons;
  return Number.isInteger(config.version) && Number(config.version) > 0 &&
    Array.isArray(countries) && countries.length <= 100 &&
    countries.every((country) =>
      isRecord(country) &&
      typeof country.country === "string" && country.country.trim().length > 0 &&
      country.country.length <= 100 && typeof country.currency === "string" &&
      /^[A-Z]{3}$/.test(country.currency) &&
      isPositiveRate(country.videoPerMinute) &&
      isPositiveRate(country.imagePerImage) &&
      validNumberMap(country.categoryMultipliers)
    ) &&
    validNumberMap(config.categoryMultipliers) &&
    validNumberMap(config.complexityMultipliers) &&
    validNumberMap(config.qualityMultipliers) &&
    Array.isArray(addons) && addons.length <= 100 &&
    addons.every((addon) =>
      isRecord(addon) &&
      typeof addon.id === "string" && /^[a-z0-9-]{1,80}$/.test(addon.id) &&
      typeof addon.name === "string" && addon.name.trim().length > 0 &&
      addon.name.length <= 120 &&
      typeof addon.billingUnit === "string" &&
      ["fixed", "per_minute", "per_image", "per_language", "percentage", "custom_quote"].includes(addon.billingUnit) &&
      isPositiveRate(addon.price) &&
      typeof addon.enabled === "boolean"
    ) &&
    new Set(countries.map((country) =>
      isRecord(country) && typeof country.country === "string" ? country.country.toLowerCase() : ""
    )).size === countries.length &&
    new Set(addons.map((addon) => isRecord(addon) ? addon.id : "")).size === addons.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getCreativeStudioConfig(): Promise<CreativeStudioConfig> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    return (await readLocalData()).config;
  }

  const { data, error } = await getPaymentSupabase()
    .from(SETTINGS_TABLE)
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw describeStorageError(error);
  if (!data) return DEFAULT_CREATIVE_STUDIO_CONFIG;
  if (!isValidCreativeStudioConfig(data.config)) {
    throw new CreativeStudioStorageError("Saved Creative Studio pricing configuration is invalid.");
  }
  return data.config;
}

export async function saveCreativeStudioConfig(
  config: CreativeStudioConfig,
  actor: string
): Promise<CreativeStudioConfig> {
  requireBackend();
  if (!isValidCreativeStudioConfig(config)) {
    throw new CreativeStudioStorageError("Pricing configuration contains invalid rates or add-ons.");
  }
  const updated = { ...config, version: Math.max(1, config.version) + 1 };
  if (!hasPaymentSupabaseConfiguration()) {
    const local = await readLocalData();
    local.config = updated;
    await writeLocalData(local);
    return updated;
  }

  const { error } = await getPaymentSupabase()
    .from(SETTINGS_TABLE)
    .upsert({
      id: "default",
      config: updated,
      version: updated.version,
      updated_at: new Date().toISOString(),
      updated_by: actor,
    });
  if (error) throw describeStorageError(error);
  return updated;
}

function newInquiryId(): string {
  return `DAC-${new Date().getUTCFullYear()}-${randomInt(100000, 1000000)}`;
}

function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createTrackingToken(): string {
  return randomBytes(32).toString("base64url");
}

async function getCreativeTrackingTokenHash(id: string): Promise<string | undefined> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    const local = await readLocalData();
    return local.inquiries.find((item) => item.inquiry.id === id)?.trackingTokenHash;
  }
  const { data, error } = await getPaymentSupabase()
    .from(INQUIRIES_TABLE)
    .select("tracking_token_hash")
    .eq("inquiry_id", id)
    .maybeSingle();
  if (error) throw describeStorageError(error);
  return data?.tracking_token_hash;
}

async function verifyCreativeTrackingToken(id: string, token: string): Promise<boolean> {
  const trackingTokenHash = await getCreativeTrackingTokenHash(id);
  if (!trackingTokenHash || !/^[A-Za-z0-9_-]{32,100}$/.test(token)) return false;
  const expected = Buffer.from(trackingTokenHash, "hex");
  const received = Buffer.from(hashTrackingToken(token), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function createCreativeInquiry(
  inquiry: Omit<CreativeInquiry, "id" | "createdAt" | "updatedAt" | "status" | "activity" | "adminNotes">,
): Promise<{ inquiry: CreativeInquiry; trackingToken: string }> {
  requireBackend();
  const createdAt = new Date().toISOString();
  const trackingToken = createTrackingToken();
  const inquiryData: CreativeInquiry = {
    ...inquiry,
    id: newInquiryId(),
    createdAt,
    updatedAt: createdAt,
    status: "NEW_INQUIRY",
    activity: [{
      at: createdAt,
      actor: "Customer",
      action: "INQUIRY_SUBMITTED",
      detail: "Creative project inquiry received with a stored quotation snapshot.",
    }],
    adminNotes: "",
  };

  if (!hasPaymentSupabaseConfiguration()) {
    const local = await readLocalData();
    if (local.inquiries.some((item) => item.inquiry.id === inquiryData.id)) {
      throw new CreativeStudioStorageError("Could not generate a unique inquiry ID. Please try again.");
    }
    local.inquiries.unshift({
      inquiry: inquiryData,
      trackingTokenHash: hashTrackingToken(trackingToken),
    });
    await writeLocalData(local);
    return { inquiry: inquiryData, trackingToken };
  }

  const { error } = await getPaymentSupabase().from(INQUIRIES_TABLE).insert({
    inquiry_id: inquiryData.id,
    status: inquiryData.status,
    inquiry_data: inquiryData,
    tracking_token_hash: hashTrackingToken(trackingToken),
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (error) {
    console.error("Creative Studio inquiry insert failed", { code: error.code });
    throw describeStorageError(error);
  }
  return { inquiry: inquiryData, trackingToken };
}

export async function getCreativeInquiries(): Promise<CreativeInquiry[]> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    return (await readLocalData()).inquiries.map((item) => item.inquiry);
  }

  const { data, error } = await getPaymentSupabase()
    .from(INQUIRIES_TABLE)
    .select("inquiry_data")
    .order("created_at", { ascending: false });
  if (error) throw describeStorageError(error);
  return (data || []).map((row) => row.inquiry_data as CreativeInquiry);
}

export async function getCreativeInquiry(id: string): Promise<CreativeInquiry | null> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    const match = (await readLocalData()).inquiries.find((item) => item.inquiry.id === id);
    return match?.inquiry || null;
  }

  const { data, error } = await getPaymentSupabase()
    .from(INQUIRIES_TABLE)
    .select("inquiry_data")
    .eq("inquiry_id", id)
    .maybeSingle();
  if (error) throw describeStorageError(error);
  return data ? data.inquiry_data as CreativeInquiry : null;
}

export async function updateCreativeInquiry(
  id: string,
  updates: Partial<CreativeInquiry>,
  actor: string,
  action: string,
  detail: string,
): Promise<CreativeInquiry | null> {
  requireBackend();
  const current = await getCreativeInquiry(id);
  if (!current) return null;
  const updated: CreativeInquiry = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    activity: [
      ...current.activity,
      { at: new Date().toISOString(), actor, action, detail: detail.slice(0, 1000) },
    ],
  };

  if (!hasPaymentSupabaseConfiguration()) {
    const local = await readLocalData();
    const index = local.inquiries.findIndex((item) => item.inquiry.id === id);
    if (index < 0) return null;
    local.inquiries[index] = { ...local.inquiries[index], inquiry: updated };
    await writeLocalData(local);
    return updated;
  }

  const { data, error } = await getPaymentSupabase()
    .from(INQUIRIES_TABLE)
    .update({
      status: updated.status,
      inquiry_data: updated,
      updated_at: updated.updatedAt,
    })
    .eq("inquiry_id", id)
    .select("inquiry_id")
    .maybeSingle();
  if (error) throw describeStorageError(error);
  return data ? updated : null;
}

export async function updateCreativeInquiryStatus(
  id: string,
  status: CreativeInquiryStatus,
  actor: string,
): Promise<CreativeInquiry | null> {
  if (!CREATIVE_STATUSES.includes(status)) return null;
  const current = await getCreativeInquiry(id);
  if (!current) return null;
  if (!getCreativeInquiryTransitions(current.status, current.statusBeforeHold).includes(status)) {
    throw new CreativeStudioStorageError(
      `The project cannot move from ${current.status.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}.`
    );
  }

  if (status === "READY_FOR_PRODUCTION") {
    if (
      current.status !== "ADMIN_APPROVED" ||
      !current.customerQuoteApprovedAt ||
      !current.adminApprovedAt ||
      !current.paymentVerifiedAt ||
      !current.requirementsCompleteAt
    ) {
      throw new CreativeStudioStorageError(
        "Production requires customer quote approval, admin approval, verified payment, and complete project requirements."
      );
    }
  }
  return updateCreativeInquiry(
    id,
    {
      status,
      statusBeforeHold: status === "ON_HOLD" ? current.status : undefined,
    },
    actor,
    "STATUS_CHANGED",
    `Status changed from ${current.status} to ${status}.`
  );
}

export async function approveCreativeCustomerQuote(
  id: string,
  token: string,
): Promise<CreativeInquiry | null> {
  if (!await verifyCreativeTrackingToken(id, token)) return null;

  const current = await getCreativeInquiry(id);
  if (!current || current.status !== "AWAITING_CUSTOMER_APPROVAL") {
    throw new CreativeStudioStorageError("This quotation is not awaiting customer approval.");
  }
  const approvedAt = new Date().toISOString();
  return updateCreativeInquiry(
    id,
    { customerQuoteApprovedAt: approvedAt, status: "AWAITING_PAYMENT" },
    "Customer",
    "QUOTE_APPROVED",
    "Customer approved the quotation. Payment is still pending verification."
  );
}

export async function getPublicCreativeInquiry(
  id: string,
  token: string
): Promise<Pick<CreativeInquiry, "id" | "status" | "quote" | "createdAt" | "updatedAt" | "customerQuoteApprovedAt"> & {
  project: Pick<CreativeInquiry["project"],
    "subcategory" | "projectKind" | "durationSeconds" | "imageCount" | "style" |
    "brief" | "languages" | "resolution" | "aspectRatio"
  >;
} | null> {
  if (!await verifyCreativeTrackingToken(id, token)) return null;
  const inquiry = await getCreativeInquiry(id);
  if (!inquiry) return null;
  return {
    id: inquiry.id,
    status: inquiry.status,
    quote: inquiry.quote,
    project: {
      subcategory: inquiry.project.subcategory,
      projectKind: inquiry.project.projectKind,
      durationSeconds: inquiry.project.durationSeconds,
      imageCount: inquiry.project.imageCount,
      style: inquiry.project.style,
      brief: inquiry.project.brief,
      languages: inquiry.project.languages,
      resolution: inquiry.project.resolution,
      aspectRatio: inquiry.project.aspectRatio,
    },
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
    ...(inquiry.customerQuoteApprovedAt
      ? { customerQuoteApprovedAt: inquiry.customerQuoteApprovedAt }
      : {}),
  };
}

export async function saveCreativeReferenceFile(
  name: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<CreativeReferenceFile> {
  requireBackend();
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new CreativeStudioStorageError("Reference must be a JPEG, PNG, WebP, MP4, or WebM file.");
  const safeName = name.replace(/[^\w.-]+/g, "-").slice(-120) || `reference.${extension}`;
  const storagePath = `${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;

  if (!hasPaymentSupabaseConfiguration()) {
    const filePath = path.join(LOCAL_FILES_DIR, storagePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes, { flag: "wx" });
    return { name: safeName, path: `local:${storagePath}`, type: mimeType, size: bytes.byteLength };
  }

  const { error } = await getPaymentSupabase()
    .storage
    .from(FILE_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (error) {
    if (error.message.toLowerCase().includes("bucket")) {
      throw new CreativeStudioStorageError(
        "Private reference storage is not installed. Apply the approved Creative Studio bucket migration."
      );
    }
    console.error("Creative Studio reference upload failed", {
      errorType: error.constructor.name,
    });
    throw new CreativeStudioStorageError("Reference file could not be uploaded.");
  }
  return { name: safeName, path: storagePath, type: mimeType, size: bytes.byteLength };
}

export async function removeCreativeReferenceFiles(
  files: readonly CreativeReferenceFile[]
): Promise<void> {
  const localPaths: string[] = [];
  const remotePaths: string[] = [];

  for (const file of files) {
    if (file.path.startsWith("local:")) {
      const relativePath = file.path.slice("local:".length);
      if (!/^\d{4}\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(relativePath)) {
        throw new CreativeStudioStorageError("Reference cleanup path is invalid.");
      }
      const resolvedPath = path.resolve(LOCAL_FILES_DIR, relativePath);
      if (!resolvedPath.startsWith(`${LOCAL_FILES_DIR}${path.sep}`)) {
        throw new CreativeStudioStorageError("Reference cleanup path is invalid.");
      }
      localPaths.push(resolvedPath);
      continue;
    }

    if (!/^\d{4}\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(file.path)) {
      throw new CreativeStudioStorageError("Reference cleanup path is invalid.");
    }
    remotePaths.push(file.path);
  }

  for (const localPath of localPaths) {
    try {
      await unlink(localPath);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  if (remotePaths.length > 0) {
    if (!hasPaymentSupabaseConfiguration()) {
      throw new CreativeStudioStorageError("Supabase is not configured for reference cleanup.");
    }
    const { error } = await getPaymentSupabase()
      .storage
      .from(FILE_BUCKET)
      .remove(remotePaths);
    if (error) {
      console.error("Creative Studio reference cleanup failed", {
        errorType: error.constructor.name,
      });
      throw new CreativeStudioStorageError("Uploaded reference files could not be cleaned up.");
    }
  }
}

export async function getCreativeReferenceUrl(filePath: string): Promise<string | null> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration() || !/^\d{4}\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(filePath)) {
    return null;
  }
  const { data, error } = await getPaymentSupabase()
    .storage
    .from(FILE_BUCKET)
    .createSignedUrl(filePath, 60);
  if (error) {
    console.error("Creative Studio reference link failed", {
      errorType: error.constructor.name,
    });
    throw new CreativeStudioStorageError("Reference file could not be accessed.");
  }
  return data.signedUrl;
}
