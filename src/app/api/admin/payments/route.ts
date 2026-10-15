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
    const { projectId, amount, method, transactionRef, status, adminNotes, verifiedByAdmin } = body;

    const project = DataStore.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const isVerified = Boolean(verifiedByAdmin);
    const paymentStatus: PaymentStatus = isVerified ? (status || "Paid") : "Awaiting Verification";

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      amount: Number(amount),
      method: (method as PaymentMethod) || "Bank Transfer",
      transactionRef: transactionRef || `REF-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString(),
      status: paymentStatus,
      verifiedByAdmin: isVerified,
      adminNotes: adminNotes || "Recorded by Admin in ledger",
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

    if (!id) {
      return NextResponse.json({ success: false, error: "Payment ID is required" }, { status: 400 });
    }

    const updated = DataStore.verifyPayment(
      id,
      Boolean(verified),
      (status as PaymentStatus) || "Paid",
      "Admin"
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
