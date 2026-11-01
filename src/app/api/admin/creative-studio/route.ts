import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminFromRequest } from "@/lib/auth";
import {
  CreativeStudioStorageError,
  getCreativeInquiry,
  getCreativeInquiries,
  updateCreativeInquiry,
  updateCreativeInquiryStatus,
} from "@/lib/creative-studio-storage";
import type { CreativeInquiryStatus } from "@/lib/creative-studio";
import { CREATIVE_STATUSES } from "@/lib/creative-studio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const inquiries = await getCreativeInquiries();
    return NextResponse.json({ success: true, inquiries }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Creative inquiries could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") {
      return NextResponse.json({ success: false, error: "Inquiry ID is required." }, { status: 400 });
    }
    const record = body as Record<string, unknown>;
    const id = body.id.trim();
    const current = await getCreativeInquiry(id);
    if (!current) return NextResponse.json({ success: false, error: "Inquiry not found." }, { status: 404 });

    let updated;
    if (record.action === "set_status") {
      if (typeof record.status !== "string" ||
          !CREATIVE_STATUSES.includes(record.status as CreativeInquiryStatus)) {
        return NextResponse.json({ success: false, error: "Select a valid Creative Studio status." }, { status: 400 });
      }
      updated = await updateCreativeInquiryStatus(id, record.status as CreativeInquiryStatus, admin.email);
    } else if (record.action === "prepare_quote") {
      if (current.status !== "NEW_INQUIRY" && current.status !== "UNDER_REVIEW" &&
          current.status !== "NEEDS_MORE_INFORMATION" && current.status !== "QUOTATION_PREPARED") {
        return NextResponse.json({ success: false, error: "Quotation cannot be changed after customer approval or payment begins." }, { status: 409 });
      }
      const amount = Number(record.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
        return NextResponse.json({ success: false, error: "Enter a valid final quotation amount." }, { status: 400 });
      }
      const quote = {
        ...current.quote,
        total: amount,
        requiresManualReview: false,
        reason: null,
      };
      updated = await updateCreativeInquiry(
        id,
        { quote, status: "AWAITING_CUSTOMER_APPROVAL" },
        admin.email,
        "QUOTATION_SENT",
        `Final quotation ${quote.currency} ${amount} sent for customer approval.`
      );
    } else if (record.action === "verify_payment") {
      const amount = Number(record.amount);
      const reference = typeof record.reference === "string" ? record.reference.trim().slice(0, 120) : "";
      const note = typeof record.note === "string" ? record.note.trim().slice(0, 1000) : "";
      if (record.confirmed !== true ||
          !["AWAITING_PAYMENT", "PAYMENT_UNDER_VERIFICATION"].includes(current.status) ||
          !current.customerQuoteApprovedAt || current.paymentVerifiedAt ||
          current.quote.total === null || !Number.isFinite(amount) || amount < current.quote.total ||
          !reference || !note) {
        return NextResponse.json({ success: false, error: "Confirm the funds were actually received and verified, and provide the full amount, transaction reference, and verification note." }, { status: 400 });
      }
      const verifiedAt = new Date().toISOString();
      updated = await updateCreativeInquiry(
        id,
        {
          paymentVerifiedAt: verifiedAt,
          paymentVerification: { amount, reference, note, verifiedAt, verifiedBy: admin.email },
          status: "PAYMENT_RECEIVED",
        },
        admin.email,
        "PAYMENT_VERIFIED",
        `Manually verified ${current.quote.currency} ${amount}; reference ${reference}. ${note}`
      );
    } else if (record.action === "approve_project") {
      if (current.status !== "PAYMENT_RECEIVED" || !current.customerQuoteApprovedAt || !current.paymentVerifiedAt) {
        return NextResponse.json({ success: false, error: "Customer quote approval and verified payment are required before admin approval." }, { status: 409 });
      }
      const approvedAt = new Date().toISOString();
      updated = await updateCreativeInquiry(
        id,
        { adminApprovedAt: approvedAt, status: "ADMIN_APPROVED" },
        admin.email,
        "ADMIN_APPROVED",
        "Administrator approved the project after checking quote approval and payment."
      );
    } else if (record.action === "complete_requirements") {
      if (current.status === "CANCELLED" || current.project.brief.trim().length < 20 || !current.project.subcategory ||
          !current.customer.email || !current.customer.whatsapp) {
        return NextResponse.json({ success: false, error: "Complete the project brief and customer contact details before marking requirements complete." }, { status: 409 });
      }
      const completedAt = new Date().toISOString();
      updated = await updateCreativeInquiry(
        id,
        { requirementsCompleteAt: completedAt },
        admin.email,
        "REQUIREMENTS_COMPLETED",
        "Administrator confirmed the project requirements are ready."
      );
    } else {
      return NextResponse.json({ success: false, error: "Unknown Creative Studio administration action." }, { status: 400 });
    }

    return NextResponse.json({ success: true, inquiry: updated }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Creative inquiry could not be updated.";
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }
}
