import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  isAllowedReceiptImage,
  logPaymentBackendError,
  readPaymentSettings,
  RECEIPT_BUCKET,
} from "@/lib/payment-server";
import { MANUAL_PAYMENT_METHODS, type ManualPaymentMethod } from "@/lib/payment-types";
import { notifyAdminOfSubmission } from "@/lib/admin-notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "client";
  const rateLimit = checkRateLimit(`payment_proof_${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many receipt submissions. Try again in ${rateLimit.resetInSec} seconds.` },
      { status: 429 }
    );
  }

  let uploadedPath: string | undefined;
  let failureOperation: "database" | "storage" = "database";

  try {
    const country = request.headers.get("x-vercel-ip-country")?.toUpperCase() || "PK";
    if (country !== "PK") {
      return NextResponse.json(
        { success: false, error: "Manual JazzCash, Easypaisa, and bank transfers are only available to Pakistan customers." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const customerName = String(form.get("customerName") || "").trim();
    const customerEmail = String(form.get("customerEmail") || "").trim().toLowerCase();
    const customerPhone = String(form.get("customerPhone") || "").trim();
    const inquiryReference = String(form.get("inquiryReference") || "").trim();
    const transactionReference = String(form.get("transactionReference") || "").trim();
    const method = String(form.get("method") || "");
    const amount = Number(form.get("amount"));
    const receipt = form.get("receipt");

    if (
      customerName.length < 2 ||
      customerName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      customerEmail.length > 254 ||
      customerPhone.length < 7 ||
      customerPhone.length > 30 ||
      inquiryReference.length > 50 ||
      transactionReference.length < 3 ||
      transactionReference.length > 100
    ) {
      return NextResponse.json(
        { success: false, error: "Please check your contact details, inquiry reference, and transaction ID." },
        { status: 400 }
      );
    }

    if (
      !MANUAL_PAYMENT_METHODS.includes(method as ManualPaymentMethod) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 100_000_000
    ) {
      return NextResponse.json(
        { success: false, error: "Select an available payment method and enter a valid PKR amount." },
        { status: 400 }
      );
    }

    if (
      typeof File === "undefined" ||
      !(receipt instanceof File) ||
      receipt.size < 1 ||
      receipt.size > 5 * 1024 * 1024
    ) {
      return NextResponse.json(
        { success: false, error: "Upload one receipt image up to 5 MB." },
        { status: 400 }
      );
    }

    const settings = await readPaymentSettings();
    const methodEnabled =
      method === "JazzCash"
        ? settings.jazzcashEnabled && Boolean(settings.accountHolder && settings.walletNumber)
        : method === "Easypaisa"
          ? settings.easypaisaEnabled && Boolean(settings.accountHolder && settings.walletNumber)
          : settings.bankTransferEnabled &&
            Boolean(settings.accountHolder && settings.bankName && (settings.accountNumber || settings.iban));

    if (!methodEnabled) {
      return NextResponse.json(
        { success: false, error: "This payment method is not currently available." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await receipt.arrayBuffer());
    if (!isAllowedReceiptImage(receipt, bytes)) {
      return NextResponse.json(
        { success: false, error: "Receipt must be a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    const supabase = getPaymentSupabase();
    const id = randomUUID();
    const extension = receipt.type === "image/jpeg" ? "jpg" : receipt.type.slice("image/".length);
    uploadedPath = `${new Date().toISOString().slice(0, 7)}/${id}.${extension}`;

    failureOperation = "storage";
    const upload = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(uploadedPath, bytes, { contentType: receipt.type, upsert: false });
    if (upload.error) throw upload.error;

    failureOperation = "database";
    const { error } = await supabase.from("payment_proofs").insert({
      id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      inquiry_reference: inquiryReference || null,
      method,
      amount: Math.round(amount * 100) / 100,
      currency: "PKR",
      transaction_reference: transactionReference,
      storage_path: uploadedPath,
      status: "pending",
    });

    if (error) {
      const cleanup = await supabase.storage.from(RECEIPT_BUCKET).remove([uploadedPath]);
      if (cleanup.error) {
        logPaymentBackendError("Could not clean up receipt after database insert failure", cleanup.error);
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "This transaction reference has already been submitted for this payment method." },
          { status: 409 }
        );
      }
      throw error;
    }

    await notifyAdminOfSubmission({
      type: "Payment order",
      reference: inquiryReference || id,
      customerName,
      customerEmail,
      customerPhone,
      details: `Manual payment receipt submitted: ${method}, PKR ${Math.round(amount * 100) / 100}; transaction reference ${transactionReference}. Verification is pending.`,
    });

    return NextResponse.json(
      { success: true, message: "Receipt submitted. Payment remains pending until an admin verifies it." },
      { status: 201 }
    );
  } catch (error) {
    logPaymentBackendError("Payment receipt submission failed", error);
    return NextResponse.json(
      {
        success: false,
        error: describePaymentBackendError(error, failureOperation),
      },
      { status: 503 }
    );
  }
}
