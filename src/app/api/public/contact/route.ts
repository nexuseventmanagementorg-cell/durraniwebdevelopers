import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { saveInquiry } from "@/lib/inquiry-storage";
import { notifyAdminOfSubmission } from "@/lib/admin-notifications";

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "client";
    const rateLimit = checkRateLimit(`contact_${ip}`, 5, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${rateLimit.resetInSec} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, phone, message, subject } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Save as general inquiry in store for admin to see
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const inquiryId = `MSG-${randomSuffix}`;

    const savedInquiry = await saveInquiry({
      id: inquiryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "New Inquiry",
      customerName: name,
      businessName: "",
      email,
      phone: phone || "Not provided",
      cityCountry: "",
      preferredContact: "whatsapp",
      customerIntro: message,
      projectTypes: [subject || "General Inquiry"],
      problemToSolve: message,
      targetAudience: "",
      productsServices: "",
      inspirationUrl: "",
      isNewOrUpgrade: "new",
      preferredLaunchDate: "",
      expectedBudgetRange: "",
      displayFixedOnly: true,
      needsProductCatalog: false,
      productFeatures: [],
      acceptOrdersOnline: false,
      orderFeatures: [],
      needsReviewsOrAccounts: false,
      adminPanelType: "none",
      adminFeatures: [],
      selectedAddons: [],
      calculation: {
        basePrice: 0,
        adminFee: 0,
        addonsTotal: 0,
        selectedAddonDetails: [],
        monthlyAddonTotal: 0,
        contingencyAmount: 0,
        estimatedTotal: 0,
        advanceAmount: 0,
        remainingBalance: 0,
        installmentsCount: 0,
        regularInstallment: 0,
        finalInstallment: 0,
        dailyCost: 0,
      },
      disclaimerAccepted: true,
      adminNotes: `Contact form message: ${subject || "General Inquiry"}`,
    });
    await notifyAdminOfSubmission({
      type: "Contact inquiry",
      reference: savedInquiry.id,
      customerName: savedInquiry.customerName,
      customerEmail: savedInquiry.email,
      customerPhone: savedInquiry.phone,
      details: `${subject || "General Inquiry"}\n${message}`,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been received! We will respond shortly via WhatsApp or email.",
    });
  } catch (error) {
    console.error("Contact form error", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message." },
      { status: 500 }
    );
  }
}
