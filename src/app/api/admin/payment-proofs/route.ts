import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  logPaymentBackendError,
  RECEIPT_BUCKET,
} from "@/lib/payment-server";
import type { PaymentProof } from "@/lib/payment-types";
import { getInquiryById, updateInquiry } from "@/lib/inquiry-storage";
import {
  canStartProjectAfterVerifiedAdvance,
  getVerifiedInquiryAdvanceAmount,
} from "@/lib/inquiry-advance";

interface GatewayPaymentRecord {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  inquiry_reference: string | null;
  amount_minor: number | string;
  currency: string;
  status: "pending" | "paid";
  created_at: string;
  paid_at: string | null;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let failureOperation: "database" | "storage" = "database";
  try {
    const supabase = getPaymentSupabase();
    const { data, error } = await supabase
      .from("payment_proofs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const proofs = await Promise.all(
      (data as PaymentProof[]).map(async (proof) => {
        failureOperation = "storage";
        const { data: signed, error: signedUrlError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .createSignedUrl(proof.storage_path, 5 * 60);
        if (signedUrlError) throw signedUrlError;
        return { ...proof, receipt_url: signed.signedUrl };
      })
    );

    let gatewayPayments: GatewayPaymentRecord[] = [];
    let gatewayPaymentsError: string | null = null;
    const gatewayResult = await supabase
      .from("gateway_payments")
      .select("id,customer_name,customer_email,customer_phone,inquiry_reference,amount_minor,currency,status,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (gatewayResult.error) {
      logPaymentBackendError("Could not load Safepay payment records", gatewayResult.error);
      gatewayPaymentsError =
        gatewayResult.error.code === "42P01" || gatewayResult.error.code === "PGRST205"
          ? "Safepay payment table is not installed. Apply supabase/safepay-checkout.sql to enable card checkout."
          : describePaymentBackendError(gatewayResult.error, "database");
    } else {
      gatewayPayments = gatewayResult.data as GatewayPaymentRecord[];
    }

    return NextResponse.json({ success: true, proofs, gatewayPayments, gatewayPaymentsError });
  } catch (error) {
    logPaymentBackendError("Could not load payment receipts for admin", error);
    return NextResponse.json(
      { success: false, error: describePaymentBackendError(error, failureOperation) },
      { status: 503 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status;
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 500) : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["verified", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "A valid receipt and review status are required." }, { status: 400 });
    }

    const supabase = getPaymentSupabase();
    const { data, error } = await supabase
      .from("payment_proofs")
      .update({
        status,
        admin_note: adminNote || null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id,status,inquiry_reference,amount")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Receipt not found or already reviewed." },
        { status: 409 }
      );
    }

    let inquiryAdvanced = false;
    if (status === "verified" && data.inquiry_reference) {
      try {
        const inquiry = await getInquiryById(data.inquiry_reference);
        if (inquiry && (inquiry.status === "Quotation Sent" || inquiry.status === "Awaiting Advance")) {
          const verifiedAdvance = await getVerifiedInquiryAdvanceAmount(inquiry.id);
          if (canStartProjectAfterVerifiedAdvance(
            inquiry.status,
            verifiedAdvance,
            inquiry.calculation.advanceAmount
          )) {
            const updatedInquiry = await updateInquiry(inquiry.id, {
              status: "Advance Received",
              adminNotes: `${inquiry.adminNotes || ""}\nAdvance verified against receipt ${id} on ${new Date().toLocaleDateString()}.`.trim(),
            });
            inquiryAdvanced = updatedInquiry?.status === "Advance Received";
          }
        }
      } catch (inquiryError) {
        console.error(`Verified receipt ${id}, but inquiry stage could not be updated`, inquiryError);
      }
    }

    return NextResponse.json({ success: true, proof: data, inquiryAdvanced });
  } catch (error) {
    logPaymentBackendError("Could not update payment receipt review", error);
    return NextResponse.json(
      { success: false, error: describePaymentBackendError(error, "database") },
      { status: 503 }
    );
  }
}
