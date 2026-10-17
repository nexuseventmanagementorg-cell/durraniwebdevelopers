import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { PaymentRecord, PaymentMethod, PaymentStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const payments = DataStore.getPayments();
  return NextResponse.json({ success: true, payments });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, amount, method, transactionRef, adminNotes, verifiedByAdmin } = body;

    const project = DataStore.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const isVerified = verifiedByAdmin === true;
    const verificationNotes = typeof adminNotes === "string" ? adminNotes.trim().slice(0, 500) : "";
    const transactionReference = typeof transactionRef === "string" ? transactionRef.trim().slice(0, 100) : "";
    if (isVerified && (!verificationNotes || !transactionReference)) {
      return NextResponse.json(
        { success: false, error: "A transaction reference and a note identifying the checked bank/provider record are required before marking paid." },
        { status: 400 }
      );
    }
    const paymentStatus: PaymentStatus = isVerified ? "Paid" : "Awaiting Verification";

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      amount: Number(amount),
      method: (method as PaymentMethod) || "Bank Transfer",
      transactionRef: transactionReference || `REF-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString(),
      status: paymentStatus,
      verifiedByAdmin: isVerified,
      adminNotes: verificationNotes || "Recorded by Admin; awaiting independent payment verification.",
      createdAt: new Date().toISOString(),
    };

    DataStore.recordPayment(newPayment, "Admin");
    return NextResponse.json({ success: true, payment: newPayment });
  } catch (error) {
    console.error("Record payment error", error);
    return NextResponse.json({ success: false, error: "Failed to record payment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, verified, status } = body;
    const verificationNote = typeof body.verificationNote === "string"
      ? body.verificationNote.trim().slice(0, 500)
      : "";

    if (!id || verified !== true || status !== "Paid" || !verificationNote) {
      return NextResponse.json(
        { success: false, error: "Confirm the payment as received and include the bank/provider record checked." },
        { status: 400 }
      );
    }

    const updated = DataStore.verifyPayment(
      id,
      true,
      status as PaymentStatus,
      "Admin",
      verificationNote
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error("Verify payment error", error);
    return NextResponse.json({ success: false, error: "Failed to verify payment" }, { status: 500 });
  }
}
