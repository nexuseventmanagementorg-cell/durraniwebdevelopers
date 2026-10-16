import type { Inquiry } from "@/lib/types";

function listOrFallback(items: string[], fallback: string): string[] {
  return items.length > 0 ? items : [fallback];
}

export function buildInquiryProjectBrief(inquiry: Inquiry): string {
  const projectTypes = listOrFallback(inquiry.projectTypes, "Custom web application");
  const selectedAddons = inquiry.calculation.selectedAddonDetails.map((addon) =>
    `${addon.label} (${addon.billingPeriod === "monthly" ? `${addon.price} PKR/month` : `${addon.price} PKR`})`
  );
  const scanFeatures = inquiry.scanFeatures?.map((feature) =>
    `${feature.title}: ${feature.evidence}`
  ) || [];
  const assetChecklist = [
    "Collect approved logo, brand colors, and any existing style guide.",
    "Collect approved page copy, photos, and rights/permission to use each asset.",
    ...(inquiry.needsProductCatalog ? ["Collect the product/service catalog, categories, prices, variants, and stock details."] : []),
    ...(inquiry.acceptOrdersOnline ? ["Confirm delivery areas, delivery charges, order workflow, and customer notification wording."] : []),
    ...(inquiry.selectedAddons.includes("payment_gateway") ? ["Confirm the client's chosen payment provider and account readiness; never request or store provider passwords in the brief."] : []),
    ...(inquiry.inspirationUrl ? [`Use this reference for scope only; do not copy its branding or content: ${inquiry.inspirationUrl}`] : []),
  ];
  const openQuestions = [
    !inquiry.targetAudience.trim() ? "Who is the primary target audience?" : null,
    !inquiry.productsServices.trim() ? "Which products or services must launch in version one?" : null,
    !inquiry.preferredLaunchDate.trim() ? "What launch date should the client approve?" : null,
    !inquiry.businessName.trim() ? "What business/brand name should appear in the project?" : null,
  ].filter((question): question is string => Boolean(question));

  return [
    `# Project Build Brief: ${inquiry.businessName || inquiry.customerName}`,
    "",
    `Inquiry: ${inquiry.id}`,
    `Project types: ${projectTypes.join(", ")}`,
    `Client: ${inquiry.customerName}${inquiry.businessName ? ` / ${inquiry.businessName}` : ""}`,
    `Workflow status: ${inquiry.status}`,
    `Approved estimate: PKR ${inquiry.calculation.estimatedTotal.toLocaleString("en-PK")}`,
    `Verified advance: ${inquiry.status === "Advance Received" || inquiry.convertedProjectId ? "recorded" : "not confirmed; do not start development"}`,
    "",
    "## Client goals",
    inquiry.problemToSolve.trim() || "Not provided; ask the client before implementation.",
    "",
    "## Audience and offering",
    `Audience: ${inquiry.targetAudience.trim() || "Not provided"}`,
    `Products/services: ${inquiry.productsServices.trim() || "Not provided"}`,
    `New or upgrade: ${inquiry.isNewOrUpgrade}`,
    "",
    "## Functional scope",
    `Admin panel: ${inquiry.adminPanelType}`,
    `Admin features: ${listOrFallback(inquiry.adminFeatures, "None selected").join(", ")}`,
    `Product features: ${listOrFallback(inquiry.productFeatures, "None selected").join(", ")}`,
    `Order features: ${listOrFallback(inquiry.orderFeatures, "None selected").join(", ")}`,
    `Selected add-ons: ${listOrFallback(selectedAddons, "None").join("; ")}`,
    `Custom requirements: ${inquiry.customFeatureNotes?.trim() || "None provided"}`,
    `Public URL scan evidence: ${listOrFallback(scanFeatures, "No URL scan attached").join("; ")}`,
    "",
    "## Client assets to collect",
    ...assetChecklist.map((item) => `- [ ] ${item}`),
    "",
    "## Questions to resolve before build",
    ...listOrFallback(openQuestions, "No required questionnaire fields are missing." ).map((item) => `- [ ] ${item}`),
    "",
    "## Build and QA checklist",
    "- [ ] Confirm the approved scope and quotation with the client.",
    "- [ ] Confirm advance receipt is verified before starting implementation.",
    "- [ ] Build with responsive layouts and accessible controls.",
    "- [ ] Test forms, roles, add-ons, and payment flows included in the scope.",
    "- [ ] Run production build and review mobile/desktop preview with the admin.",
    "- [ ] Get Kaleem Durrani's approval before production deployment or client delivery.",
    "",
    "## Safety constraints",
    "- Use only client-provided or approved assets; do not invent business facts or prices.",
    "- Never place secrets, payment credentials, or private customer data in source code or prompts.",
    "- Do not purchase services, deploy to production, or promise a delivery date without admin approval.",
  ].join("\n");
}
