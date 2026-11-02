import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";
import {
  WHATSAPP_TEMPLATE_DEFAULTS,
  type WhatsAppTemplate,
  type WhatsAppTemplateCategory,
} from "@/lib/whatsapp-message-templates";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const TABLE = "system_settings";
const CATEGORIES: WhatsAppTemplateCategory[] = ["website_development", "creative_studio"];

function getDataFile(): string {
  return process.env.WHATSAPP_TEMPLATE_DATA_FILE ||
    path.join(process.cwd(), "data", "whatsapp-message-templates.json");
}

interface StoredTemplate {
  name?: unknown;
  content?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
}

export class WhatsAppTemplateStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppTemplateStorageError";
  }
}

function settingKey(category: WhatsAppTemplateCategory): string {
  return `whatsapp_message_template:${category}`;
}

function defaultTemplate(category: WhatsAppTemplateCategory): WhatsAppTemplate {
  const defaults = WHATSAPP_TEMPLATE_DEFAULTS[category];
  return {
    category,
    ...defaults,
    updatedAt: null,
    updatedBy: null,
  };
}

function parseStoredTemplate(category: WhatsAppTemplateCategory, value: unknown): WhatsAppTemplate {
  const fallback = defaultTemplate(category);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const stored = value as StoredTemplate;
  return {
    ...fallback,
    name: typeof stored.name === "string" && stored.name.trim() ? stored.name : fallback.name,
    content: typeof stored.content === "string" && stored.content.trim() ? stored.content : fallback.content,
    updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : null,
    updatedBy: typeof stored.updatedBy === "string" ? stored.updatedBy : null,
  };
}

async function readLocalValues(): Promise<Record<string, unknown>> {
  try {
    const dataFile = getDataFile();
    const parsed: unknown = JSON.parse(await readFile(dataFile, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new WhatsAppTemplateStorageError("Local WhatsApp template storage has an invalid format.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof WhatsAppTemplateStorageError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return {};
    throw new WhatsAppTemplateStorageError("WhatsApp template storage could not be read.");
  }
}

async function writeLocalValues(values: Record<string, unknown>): Promise<void> {
  const dataFile = getDataFile();
  const directory = path.dirname(dataFile);
  const temporary = `${dataFile}.${process.pid}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, JSON.stringify(values, null, 2), "utf8");
  await rename(temporary, dataFile);
}

function requireBackend(): void {
  if (process.env.NODE_ENV === "production" && !hasPaymentSupabaseConfiguration()) {
    throw new WhatsAppTemplateStorageError(
      "WhatsApp template storage is unavailable. Configure Supabase before editing templates."
    );
  }
}

function describeDatabaseError(error: { code?: string }): WhatsAppTemplateStorageError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new WhatsAppTemplateStorageError(
      "The system_settings table is missing. Apply the project's reviewed Supabase schema before saving WhatsApp templates."
    );
  }
  return new WhatsAppTemplateStorageError(
    "WhatsApp templates could not be saved or loaded from Supabase."
  );
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    const values = await readLocalValues();
    return CATEGORIES.map((category) => parseStoredTemplate(category, values[settingKey(category)]));
  }

  const { data, error } = await getPaymentSupabase()
    .from(TABLE)
    .select("key,value")
    .in("key", CATEGORIES.map(settingKey));
  if (error) throw describeDatabaseError(error);

  const values = new Map<string, unknown>(
    (data || []).map((row: { key: string; value: unknown }) => [row.key, row.value])
  );
  return CATEGORIES.map((category) => parseStoredTemplate(category, values.get(settingKey(category))));
}

export async function saveWhatsAppTemplate(
  category: WhatsAppTemplateCategory,
  template: { name: string; content: string },
  updatedBy: string
): Promise<WhatsAppTemplate> {
  requireBackend();
  const updatedAt = new Date().toISOString();
  const value = {
    name: template.name,
    content: template.content,
    updatedAt,
    updatedBy,
  };

  if (!hasPaymentSupabaseConfiguration()) {
    const values = await readLocalValues();
    values[settingKey(category)] = value;
    await writeLocalValues(values);
  } else {
    const { error } = await getPaymentSupabase()
      .from(TABLE)
      .upsert(
        { key: settingKey(category), value, updated_at: updatedAt },
        { onConflict: "key" }
      );
    if (error) throw describeDatabaseError(error);
  }

  return parseStoredTemplate(category, value);
}

export async function resetWhatsAppTemplate(
  category: WhatsAppTemplateCategory
): Promise<WhatsAppTemplate> {
  requireBackend();
  if (!hasPaymentSupabaseConfiguration()) {
    const values = await readLocalValues();
    delete values[settingKey(category)];
    await writeLocalValues(values);
  } else {
    const { error } = await getPaymentSupabase()
      .from(TABLE)
      .delete()
      .eq("key", settingKey(category));
    if (error) throw describeDatabaseError(error);
  }

  return defaultTemplate(category);
}
