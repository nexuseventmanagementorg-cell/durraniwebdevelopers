import type { PortfolioProject } from "./types";

export interface PortfolioOffer {
  tag: string;
  discountPercent: number;
  originalPrice: number;
  offerPrice: number;
  endsAt: number;
}

export function getPortfolioOffer(
  project: PortfolioProject,
  now = Date.now()
): PortfolioOffer | undefined {
  const endsAt = project.offerEndsAt ? new Date(project.offerEndsAt).getTime() : Number.NaN;
  const originalPrice = project.approvedPublicBudget;
  const discountPercent = project.offerDiscountPercent;
  if (
    !project.offerEnabled ||
    project.templateAvailable === false ||
    !project.offerTag?.trim() ||
    !Number.isFinite(endsAt) ||
    endsAt <= now ||
    !originalPrice ||
    !Number.isFinite(originalPrice) ||
    originalPrice <= 0 ||
    !discountPercent ||
    !Number.isFinite(discountPercent) ||
    discountPercent <= 0 ||
    discountPercent >= 100
  ) {
    return undefined;
  }

  return {
    tag: project.offerTag.trim(),
    discountPercent,
    originalPrice,
    offerPrice: Math.round(originalPrice * (1 - discountPercent / 100)),
    endsAt,
  };
}
