import { NextRequest, NextResponse } from "next/server";
import { getInquiryById } from "@/lib/inquiry-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    const email = searchParams.get("email");

    if (!ref || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Both inquiry reference ID (e.g. DW-123456) and your registered email address are required.",
        },
        { status: 400 }
      );
    }

    const inquiry = await getInquiryById(ref.trim());
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "No inquiry found matching this reference code." },
        { status: 404 }
      );
    }

    // Verify email matches to prevent unauthorized ID scanning
    if (inquiry.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification failed. The provided email does not match the record for this inquiry reference.",
        },
        { status: 403 }
      );
    }

    // Sanitize response: do NOT expose internal admin notes, other clients, etc.
    const sanitizedInquiry = {
      id: inquiry.id,
      customerName: inquiry.customerName,
      businessName: inquiry.businessName,
      status: inquiry.status,
      projectTypes: inquiry.projectTypes,
      adminPanelType: inquiry.adminPanelType,
      estimatedTotal: inquiry.calculation.estimatedTotal,
      advanceAmount: inquiry.calculation.advanceAmount,
      remainingBalance: inquiry.calculation.remainingBalance,
      installmentsCount: inquiry.calculation.installmentsCount,
      regularInstallment: inquiry.calculation.regularInstallment,
      finalInstallment: inquiry.calculation.finalInstallment,
      submittedAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      hasConvertedProject: Boolean(inquiry.convertedProjectId),
    };

    return NextResponse.json({
      success: true,
      inquiry: sanitizedInquiry,
    });
  } catch (error) {
    console.error("Tracking lookup error", error);
    return NextResponse.json(
      { success: false, error: "Failed to look up inquiry status" },
      { status: 500 }
    );
  }
}
