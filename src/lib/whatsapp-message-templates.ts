import type { Inquiry } from "@/lib/types";
import { CREATIVE_CATEGORIES } from "@/lib/creative-studio";
import type { CreativeInquiry } from "@/lib/creative-studio";

export type WhatsAppTemplateCategory = "website_development" | "creative_studio";

export interface WhatsAppTemplate {
  category: WhatsAppTemplateCategory;
  name: string;
  content: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface WhatsAppReplyOption {
  id: string;
  label: string;
  message: string;
}

interface WhatsAppReplyTemplateDefinition {
  id: string;
  label: string;
  content: string;
}

export const WHATSAPP_TEMPLATE_CATEGORY_LABELS: Record<WhatsAppTemplateCategory, string> = {
  website_development: "Website Development",
  creative_studio: "AI Creative Studio",
};

export const WHATSAPP_TEMPLATE_DEFAULTS: Record<
  WhatsAppTemplateCategory,
  { name: string; content: string }
> = {
  website_development: {
    name: "Website Development Message",
    content: `Hello {customer_name},

Thank you for contacting Durrani Web Developers!

We have received your website development inquiry.

CUSTOMER CONTACT:
- WhatsApp: {customer_whatsapp}
- Email: {email_address}

PROJECT DETAILS:

- Business: {business_name}
- Website Type: {website_type}
- Budget: {budget}
- Timeline: {timeline}

PROJECT REQUIREMENTS:
{project_description}

REQUIRED FEATURES:
{required_features}

REFERENCE WEBSITES:
{reference_websites}

PREFERRED DESIGN / STYLE:
{preferred_style}

ADDITIONAL NOTES:
{additional_requirements}

Inquiry ID: {inquiry_id}
Submitted: {submission_date}

Our team will review your requirements and contact you shortly.

Regards,
Durrani Web Developers`,
  },
  creative_studio: {
    name: "AI Creative Studio Message",
    content: `Hello {customer_name},

Thank you for choosing Durrani Web Developers Creative Studio!

We have received your AI Creative Studio inquiry.

CUSTOMER CONTACT:
- WhatsApp: {customer_whatsapp}
- Email: {email_address}

PROJECT CATEGORY:
{service_category}

PROJECT TITLE:
{project_title}

PROJECT BRIEF:
{project_description}

TARGET AUDIENCE:
{target_audience}

PREFERRED STYLE:
{preferred_style}

EXPECTED DELIVERABLES:
{deliverables}

ESTIMATED BUDGET:
{budget} {currency}

EXPECTED TIMELINE:
{timeline}

REFERENCE LINKS:
{reference_links}

ADDITIONAL REQUIREMENTS:
{additional_requirements}

Inquiry ID: {inquiry_id}
Submitted: {submission_date}

Our team will review your creative project and get back to you shortly.

Regards,
Durrani Web Developers
Creative Studio`,
  },
};

export const WHATSAPP_READY_REPLY_TEMPLATES: Record<
  WhatsAppTemplateCategory,
  WhatsAppReplyTemplateDefinition[]
> = {
  website_development: [
    {
      id: "inquiry_received",
      label: "Inquiry received",
      content: `Assalam-o-Alaikum {customer_name},

Thank you for contacting Durrani Web Developers. We have received your inquiry for {website_type} (Ref: {inquiry_id}).

Our team is reviewing your requirements and will get back to you shortly.

Regards,
Durrani Web Developers`,
    },
    {
      id: "reviewing_requirements",
      label: "Reviewing your requirements",
      content: `Hello {customer_name},

We are reviewing your website project requirements for {business_name}. We will assess the scope, features, budget, and timeline you shared and update you soon.

Inquiry reference: {inquiry_id}

Regards,
Durrani Web Developers`,
    },
    {
      id: "need_more_details",
      label: "Request more project details",
      content: `Hello {customer_name},

Thank you for sharing your website project brief. To understand your requirements better, could you please share any additional details about your goals, required features, or preferred design?

Your inquiry reference is {inquiry_id}. You can reply directly here with the details.

Regards,
Durrani Web Developers`,
    },
    {
      id: "quotation_followup",
      label: "Discuss estimate and timeline",
      content: `Hello {customer_name},

We have reviewed your {website_type} inquiry (Ref: {inquiry_id}). The current estimate is {budget}, with your preferred timeline noted as {timeline}.

This is an initial estimate; we will confirm the final scope and quotation with you before any work begins.

Regards,
Durrani Web Developers`,
    },
    {
      id: "follow_up",
      label: "Follow up on inquiry",
      content: `Hello {customer_name},

We are following up on your website development inquiry {inquiry_id}. Please let us know if you have any questions or would like to discuss the project requirements.

Regards,
Durrani Web Developers`,
    },
  ],
  creative_studio: [
    {
      id: "inquiry_received",
      label: "Inquiry received",
      content: `Assalam-o-Alaikum {customer_name},

Thank you for contacting Durrani Web Developers Creative Studio. We have received your {service_category} inquiry, “{project_title}” (Ref: {inquiry_id}).

Our team is reviewing your brief and will get back to you shortly.

Regards,
Durrani Web Developers Creative Studio`,
    },
    {
      id: "reviewing_brief",
      label: "Reviewing your creative brief",
      content: `Hello {customer_name},

We are reviewing your project “{project_title}” in {service_category}. We will check the brief, deliverables, style, and estimated timeline you provided and update you soon.

Inquiry reference: {inquiry_id}

Regards,
Durrani Web Developers Creative Studio`,
    },
    {
      id: "need_more_details",
      label: "Request more project details",
      content: `Hello {customer_name},

Thank you for sharing your creative project brief for “{project_title}”. Could you please clarify any additional details about the desired outcome, audience, references, or deliverables?

You can reply directly here with the information. Inquiry reference: {inquiry_id}.

Regards,
Durrani Web Developers Creative Studio`,
    },
    {
      id: "quotation_followup",
      label: "Discuss estimate and delivery",
      content: `Hello {customer_name},

We have reviewed your “{project_title}” inquiry (Ref: {inquiry_id}). The current estimate is {budget} {currency}, and the estimated delivery is {timeline}.

This is an estimate; we will confirm the final scope and quotation with you before any work begins.

Regards,
Durrani Web Developers Creative Studio`,
    },
    {
      id: "follow_up",
      label: "Follow up on inquiry",
      content: `Hello {customer_name},

We are following up on your Creative Studio inquiry {inquiry_id} for “{project_title}”. Please let us know if you have any questions or would like to discuss your brief.

Regards,
Durrani Web Developers Creative Studio`,
    },
  ],
};

export const WHATSAPP_TEMPLATE_VARIABLES: Record<WhatsAppTemplateCategory, string[]> = {
  website_development: [
    "customer_name",
    "customer_whatsapp",
    "email_address",
    "business_name",
    "website_type",
    "project_description",
    "required_features",
    "reference_websites",
    "preferred_style",
    "budget",
    "timeline",
    "additional_requirements",
    "inquiry_id",
    "submission_date",
  ],
  creative_studio: [
    "customer_name",
    "customer_whatsapp",
    "email_address",
    "service_category",
    "project_title",
    "project_description",
    "target_audience",
    "preferred_style",
    "deliverables",
    "budget",
    "currency",
    "timeline",
    "reference_links",
    "additional_requirements",
    "inquiry_id",
    "submission_date",
  ],
};

export type WhatsAppTemplateValues = Record<string, string | null | undefined>;

const NOT_PROVIDED = "Not provided";

function present(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return NOT_PROVIDED;
  return value.trim();
}

function list(values: unknown[]): string {
  const clean = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return clean.length ? clean.map((value) => `- ${value}`).join("\n") : NOT_PROVIDED;
}

function featureLabel(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function estimate(inquiry: Inquiry): string {
  const amount = inquiry.internationalCalculation?.estimatedTotal ?? inquiry.calculation.estimatedTotal;
  const currency = inquiry.currency || "PKR";
  return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function getWebsiteInquiryTemplateValues(inquiry: Inquiry): WhatsAppTemplateValues {
  const features = [
    ...inquiry.adminFeatures,
    ...inquiry.productFeatures,
    ...inquiry.orderFeatures,
    ...inquiry.selectedAddons.map(featureLabel),
  ];
  const descriptions = [
    inquiry.problemToSolve ? `Problem to solve: ${inquiry.problemToSolve}` : "",
    inquiry.productsServices ? `Products / services: ${inquiry.productsServices}` : "",
    inquiry.targetAudience ? `Target audience: ${inquiry.targetAudience}` : "",
  ].filter(Boolean);

  return {
    customer_name: present(inquiry.customerName),
    customer_whatsapp: present(inquiry.phone),
    email_address: present(inquiry.email),
    business_name: present(inquiry.businessName),
    website_type: list(inquiry.projectTypes),
    project_description: descriptions.length ? descriptions.join("\n") : NOT_PROVIDED,
    required_features: list(Array.from(new Set(features))),
    reference_websites: present(inquiry.inspirationUrl),
    preferred_style: NOT_PROVIDED,
    budget: present(inquiry.expectedBudgetRange) === NOT_PROVIDED
      ? estimate(inquiry)
      : `${inquiry.expectedBudgetRange.trim()} (estimate ${estimate(inquiry)})`,
    timeline: present(inquiry.preferredLaunchDate),
    additional_requirements: present([inquiry.customerIntro, inquiry.customFeatureNotes].filter(Boolean).join("\n")),
    inquiry_id: present(inquiry.id),
    submission_date: new Date(inquiry.createdAt).toLocaleString(),
  };
}

export function getCreativeInquiryTemplateValues(inquiry: CreativeInquiry): WhatsAppTemplateValues {
  const category = CREATIVE_CATEGORIES.find((item) => item.id === inquiry.project.categoryId);
  const categoryLabel = category?.label || inquiry.project.categoryId;
  const deliverables = inquiry.project.projectKind === "image"
    ? `${inquiry.project.imageCount} AI-generated images`
    : inquiry.project.projectKind === "video"
      ? `${inquiry.project.durationSeconds} second AI-generated video`
      : "MVP development project";
  const selectedAddons = inquiry.project.addonIds.map((id) => featureLabel(id));
  const requirements = [
    `Complexity: ${inquiry.project.complexity}`,
    `Resolution: ${inquiry.project.resolution}`,
    `Aspect ratio: ${inquiry.project.aspectRatio}`,
    inquiry.project.vision ? `Additional vision: ${inquiry.project.vision}` : "",
    selectedAddons.length ? `Selected add-ons: ${selectedAddons.join(", ")}` : "",
    inquiry.project.referenceFiles.length
      ? `Uploaded references: ${inquiry.project.referenceFiles.map((file) => file.name).join(", ")}`
      : "",
  ].filter(Boolean);

  return {
    customer_name: present(inquiry.customer.name),
    customer_whatsapp: present(inquiry.customer.whatsapp),
    email_address: present(inquiry.customer.email),
    service_category: `${categoryLabel} / ${inquiry.project.subcategory}`,
    project_title: inquiry.project.subcategory,
    project_description: present(inquiry.project.brief),
    target_audience: NOT_PROVIDED,
    preferred_style: present(inquiry.project.style),
    deliverables,
    budget: inquiry.quote.total === null
      ? "Manual quote required"
      : inquiry.quote.total.toLocaleString("en-US", { maximumFractionDigits: 2 }),
    currency: present(inquiry.quote.currency),
    timeline: present(inquiry.quote.delivery),
    reference_links: NOT_PROVIDED,
    additional_requirements: requirements.length ? requirements.join("\n") : NOT_PROVIDED,
    inquiry_id: present(inquiry.id),
    submission_date: new Date(inquiry.createdAt).toLocaleString(),
  };
}

export function renderWhatsAppTemplate(content: string, values: WhatsAppTemplateValues): string {
  return content.replace(/\{([a-z0-9_]+)\}/g, (_placeholder, key: string) => {
    const value = values[key];
    return typeof value === "string" && value.trim() ? value.trim() : NOT_PROVIDED;
  });
}

export function validateWhatsAppTemplateContent(
  category: WhatsAppTemplateCategory,
  content: string
): string | null {
  if (!content.trim() || content.length > 12_000) {
    return "Template message must contain 1 to 12,000 characters.";
  }
  const supported = new Set(WHATSAPP_TEMPLATE_VARIABLES[category]);
  const placeholders = content.match(/\{[^{}]*\}/g) || [];
  for (const placeholder of placeholders) {
    const variable = placeholder.slice(1, -1);
    if (!supported.has(variable)) return `Unsupported template variable: ${placeholder}`;
  }
  if (/[{}]/.test(content.replace(/\{[^{}]*\}/g, ""))) {
    return "Template contains an incomplete variable placeholder.";
  }
  return null;
}

export function normalizeWhatsAppRecipient(value: string): string | null {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function buildWhatsAppTemplateLink(recipient: string, message: string): string | null {
  const normalized = normalizeWhatsAppRecipient(recipient);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function createTemplatePreviewValues(category: WhatsAppTemplateCategory): WhatsAppTemplateValues {
  return Object.fromEntries(WHATSAPP_TEMPLATE_VARIABLES[category].map((variable) => [
    variable,
    NOT_PROVIDED,
  ]));
}

export function getWhatsAppReadyReplyOptions(
  category: WhatsAppTemplateCategory,
  values: WhatsAppTemplateValues,
  customTemplate?: { name: string; content: string }
): WhatsAppReplyOption[] {
  const readyOptions = WHATSAPP_READY_REPLY_TEMPLATES[category].map((template) => ({
    id: template.id,
    label: template.label,
    message: renderWhatsAppTemplate(template.content, values),
  }));
  if (!customTemplate) return readyOptions;
  return [
    ...readyOptions,
    {
      id: "saved_custom",
      label: `Inquiry details: ${customTemplate.name}`,
      message: renderWhatsAppTemplate(customTemplate.content, values),
    },
  ];
}
