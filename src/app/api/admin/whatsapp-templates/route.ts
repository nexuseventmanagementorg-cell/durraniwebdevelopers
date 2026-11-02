import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import {
  getWhatsAppTemplates,
  resetWhatsAppTemplate,
  saveWhatsAppTemplate,
  WhatsAppTemplateStorageError,
} from "@/lib/whatsapp-message-template-storage";
import {
  validateWhatsAppTemplateContent,
  WHATSAPP_TEMPLATE_VARIABLES,
  type WhatsAppTemplateCategory,
} from "@/lib/whatsapp-message-templates";

export const dynamic = "force-dynamic";

const CATEGORIES: WhatsAppTemplateCategory[] = ["website_development", "creative_studio"];

function isCategory(value: unknown): value is WhatsAppTemplateCategory {
  return typeof value === "string" && CATEGORIES.includes(value as WhatsAppTemplateCategory);
}

function storageFailure(error: unknown) {
  const message = error instanceof WhatsAppTemplateStorageError
    ? error.message
    : "WhatsApp templates could not be loaded.";
  return NextResponse.json({ success: false, error: message }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await getWhatsAppTemplates();
    return NextResponse.json(
      { success: true, templates, variables: WHATSAPP_TEMPLATE_VARIABLES },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return storageFailure(error);
  }
}

export async function PUT(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body must contain valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "Request body must be a JSON object." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  if (!isCategory(values.category)) {
    return NextResponse.json({ success: false, error: "Select a supported WhatsApp template category." }, { status: 400 });
  }
  const category = values.category;

  try {
    if (values.reset === true) {
      const template = await resetWhatsAppTemplate(category);
      return NextResponse.json({ success: true, template });
    }

    if (
      typeof values.name !== "string" ||
      !values.name.trim() ||
      values.name.trim().length > 100 ||
      typeof values.content !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Enter a template name and message." },
        { status: 400 }
      );
    }

    const contentError = validateWhatsAppTemplateContent(category, values.content);
    if (contentError) {
      return NextResponse.json({ success: false, error: contentError }, { status: 400 });
    }
    const template = await saveWhatsAppTemplate(
      category,
      { name: values.name.trim(), content: values.content },
      admin.email
    );
    return NextResponse.json({ success: true, template });
  } catch (error) {
    return storageFailure(error);
  }
}
