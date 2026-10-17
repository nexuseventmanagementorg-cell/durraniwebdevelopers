import type { Inquiry, InquiryScopeReview } from "@/lib/types";

type InquiryScopeInput = Pick<
  Inquiry,
  | "businessName"
  | "problemToSolve"
  | "targetAudience"
  | "productsServices"
  | "preferredLaunchDate"
  | "inspirationUrl"
  | "scanFeatures"
  | "selectedAddons"
  | "customFeatureNotes"
>;

export function reviewInquiryScope(
  inquiry: InquiryScopeInput,
  reviewedAt = new Date().toISOString()
): InquiryScopeReview {
  const missingDetails = [
    !inquiry.businessName.trim() ? "Business or brand name" : null,
    !inquiry.problemToSolve.trim() ? "Primary problem or goal" : null,
    !inquiry.targetAudience.trim() ? "Target audience" : null,
    !inquiry.productsServices.trim() ? "Products or services for launch" : null,
    !inquiry.preferredLaunchDate.trim() ? "Preferred launch date" : null,
  ].filter((item): item is string => Boolean(item));
  const riskFlags = [
    inquiry.selectedAddons.includes("payment_gateway")
      ? "Confirm the client's payment provider and account readiness; never collect credentials."
      : null,
    inquiry.inspirationUrl && !inquiry.scanFeatures?.length
      ? "Review the reference URL manually; no scan evidence was attached."
      : null,
    inquiry.customFeatureNotes?.trim()
      ? "Clarify custom requirements and include agreed items in the final quotation."
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    reviewedAt,
    status: missingDetails.length > 0 ? "needs_follow_up" : "ready_for_admin_review",
    missingDetails,
    riskFlags,
    recommendedNextAction: missingDetails.length > 0
      ? "Ask the client for the missing scope details before sending a final quotation."
      : "Admin: validate the scope and price, then approve the final quotation.",
  };
}