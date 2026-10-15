import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { Invoice, InvoiceItem } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const invoices = DataStore.getInvoices();
  return NextResponse.json({ success: true, invoices });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, dueDate, items, termsAndNotes, paymentMethod } = body;

    const project = DataStore.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const client = DataStore.getClientById(project.clientId);

    const invoiceItems: InvoiceItem[] = Array.isArray(items) && items.length > 0
      ? items
      : [{ description: `Web Application Development: ${project.name}`, amount: project.approvedPrice }];

    const subtotal = invoiceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const advanceDeduction = project.advanceReceived || 0;
    const totalDue = subtotal;
    const amountPaid = advanceDeduction;
    const remainingBalance = Math.max(0, totalDue - amountPaid);

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const invoiceId = `INV-${new Date().getFullYear()}-${randomSuffix}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      clientBusiness: client?.businessName || "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: invoiceItems,
      subtotal,
      advanceDeduction,
      totalDue,
      amountPaid,
      remainingBalance,
      paymentMethod: paymentMethod || "JazzCash / EasyPaisa / Bank Transfer",
      status: remainingBalance === 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Sent",
      termsAndNotes: termsAndNotes || "Standard commercial invoice for software engineering services. Inquiries & support: durraniwebdevelopers@gmail.com",
      scheduleSummary: remainingBalance > 0
        ? `Agreed 11-month installment plan: Monthly installments of PKR ${(remainingBalance / 11).toFixed(2)} due by agreed billing dates.`
        : "Project paid in full.",
      createdAt: new Date().toISOString(),
    };

    DataStore.createInvoice(newInvoice, "Admin");
    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (error) {
    console.error("Create invoice error", error);
    return NextResponse.json({ success: false, error: "Failed to generate invoice" }, { status: 500 });
  }
}
