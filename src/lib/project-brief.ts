import type { Inquiry, ProjectBuildBriefRecord } from "@/lib/types";
import type { ProjectReadinessChecklistItem } from "@/lib/types";

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

export function buildProjectReadinessChecklist(inquiry: Inquiry): ProjectReadinessChecklistItem[] {
  return [
    { id: "scope-approved", label: "Client-approved scope and quotation", completed: false },
    { id: "brand-assets", label: "Logo, brand colors, and approved imagery collected", completed: false },
    { id: "content-approved", label: "Page copy and business facts approved by client", completed: false },
    ...(inquiry.needsProductCatalog
      ? [{ id: "catalog-ready", label: "Product/service catalog, prices, variants, and stock confirmed", completed: false }]
      : []),
    ...(inquiry.acceptOrdersOnline
      ? [{ id: "order-flow", label: "Order flow, delivery areas, and fees confirmed", completed: false }]
      : []),
    ...(inquiry.selectedAddons.includes("payment_gateway")
      ? [{ id: "payment-provider", label: "Client-owned payment provider account and requirements confirmed", completed: false }]
      : []),
    { id: "implementation", label: "Build completed against the approved brief", completed: false },
    { id: "functional-qa", label: "Forms, roles, selected add-ons, and error states tested", completed: false },
    { id: "responsive-qa", label: "Mobile and desktop preview reviewed", completed: false },
    { id: "admin-approval", label: "Kaleem Durrani approved production deployment", completed: false },
  ];
}

export function buildProjectBuildBriefRecord(inquiry: Inquiry): ProjectBuildBriefRecord {
  const previousCompletion = new Map(
    inquiry.projectBuildBrief?.checklist.map((item) => [item.id, item.completed]) || []
  );

  return {
    generatedAt: inquiry.projectBuildBrief?.generatedAt || new Date().toISOString(),
    content: buildInquiryProjectBrief(inquiry),
    checklist: buildProjectReadinessChecklist(inquiry).map((item) => ({
      ...item,
      completed: previousCompletion.get(item.id) ?? false,
    })),
  };
}
