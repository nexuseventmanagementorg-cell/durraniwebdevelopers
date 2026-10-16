import type { Inquiry } from "@/lib/types";
import { getPaymentSupabase } from "@/lib/payment-server";

export function sumVerifiedInquiryAdvances(
  proofs: Array<{ amount: number | string; status: string }>
): number {
  return proofs.reduce((total, proof) => {
    const amount = Number(proof.amount);
    return proof.status === "verified" && Number.isFinite(amount) && amount > 0
      ? total + amount
      : total;
  }, 0);
}

export function canStartProjectAfterVerifiedAdvance(
  inquiryStatus: Inquiry["status"],
  verifiedAdvance: number,
  requiredAdvance: number
): boolean {
  const quoteAcceptedStage = inquiryStatus === "Awaiting Advance" || inquiryStatus === "Advance Received";
  return quoteAcceptedStage &&
    Number.isFinite(verifiedAdvance) &&
    Number.isFinite(requiredAdvance) &&
    requiredAdvance > 0 &&
    verifiedAdvance >= requiredAdvance;
}

export async function getVerifiedInquiryAdvanceAmount(inquiryReference: string): Promise<number> {
  const { data, error } = await getPaymentSupabase()
    .from("payment_proofs")
    .select("amount,status")
    .eq("inquiry_reference", inquiryReference)
    .eq("status", "verified");
  if (error) throw error;
  return sumVerifiedInquiryAdvances(data || []);
}
