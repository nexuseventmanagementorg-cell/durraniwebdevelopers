import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { getInquiries, getInquiryById, updateInquiry } from "@/lib/inquiry-storage";
import { canStartProjectAfterVerifiedAdvance, getVerifiedInquiryAdvanceAmount } from "@/lib/inquiry-advance";
import { Client, Project, OrderStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inquiries = await getInquiries();
    return NextResponse.json({ success: true, inquiries });
  } catch (error) {
    console.error("Admin inquiry list failed", error);
    return NextResponse.json({ success: false, error: "Inquiries could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, adminNotes, revisedApprovedPrice } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Inquiry ID is required" }, { status: 400 });
    }
    if (status === "Advance Received") {
      return NextResponse.json(
        { success: false, error: "Advance Received is set automatically after an admin verifies the customer's payment receipt." },
        { status: 409 }
      );
    }
    if (status === "Awaiting Advance") {
      const current = await getInquiryById(id);
      if (!current) {
        return NextResponse.json({ success: false, error: "Inquiry not found" }, { status: 404 });
      }
      if (current.status !== "Quotation Sent" && current.status !== "Awaiting Advance") {
        return NextResponse.json(
          { success: false, error: "Mark the final quotation as sent before awaiting an advance." },
          { status: 409 }
        );
      }
    }
    if (["Approved", "In Development", "Testing", "Delivered", "Completed"].includes(status)) {
      const current = await getInquiryById(id);
      if (!current) {
        return NextResponse.json({ success: false, error: "Inquiry not found" }, { status: 404 });
      }
      if (!current.convertedProjectId) {
        return NextResponse.json(
          { success: false, error: "Convert the inquiry to a project after verifying its advance before setting a project lifecycle status." },
          { status: 409 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status as OrderStatus;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    if (revisedApprovedPrice !== undefined) {
      const current = await getInquiryById(id);
      if (current) {
        updates.calculation = {
          ...current.calculation,
          estimatedTotal: Number(revisedApprovedPrice),
          remainingBalance: Math.max(0, Number(revisedApprovedPrice) - current.calculation.advanceAmount),
        };
      }
    }

    const updated = await updateInquiry(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error) {
    console.error("Update inquiry error", error);
    return NextResponse.json({ success: false, error: "Failed to update inquiry" }, { status: 500 });
  }
}

// Convert inquiry to Project & Client
export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { inquiryId, deliveryTimeline } = body;

    const inquiry = await getInquiryById(inquiryId);
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Inquiry not found" }, { status: 404 });
    }
    if (inquiry.convertedProjectId) {
      return NextResponse.json({ success: false, error: "This inquiry has already been converted to a project." }, { status: 409 });
    }
    if (inquiry.status !== "Awaiting Advance" && inquiry.status !== "Advance Received") {
      return NextResponse.json(
        { success: false, error: "Send and confirm the quotation first, then move the inquiry to Awaiting Advance." },
        { status: 409 }
      );
    }

    // 1. Check if client already exists or create new one
    const clients = DataStore.getClients();
    let client = clients.find(
      (c) => c.email.toLowerCase() === inquiry.email.toLowerCase()
    );

    const approvedPrice = inquiry.calculation.estimatedTotal;
    const advanceRequired = inquiry.calculation.advanceAmount;
    const advanceReceived = await getVerifiedInquiryAdvanceAmount(inquiry.id);
    if (!canStartProjectAfterVerifiedAdvance(inquiry.status, advanceReceived, advanceRequired)) {
      return NextResponse.json(
        {
          success: false,
          error: `Project start is blocked until an admin verifies receipts totaling at least PKR ${advanceRequired.toLocaleString("en-PK")} for this inquiry.`,
        },
        { status: 409 }
      );
    }
    if (advanceReceived > approvedPrice) {
      return NextResponse.json(
        { success: false, error: "Verified payments exceed the approved project fee. Review the payment records before creating a project." },
        { status: 409 }
      );
    }
    const remainingBalance = Math.max(0, approvedPrice - advanceReceived);

    if (!client) {
      const newClientId = `cli-${Date.now().toString().slice(-6)}`;
      client = {
        id: newClientId,
        name: inquiry.customerName,
        businessName: inquiry.businessName || inquiry.customerName,
        email: inquiry.email,
        phone: inquiry.phone,
        cityCountry: inquiry.cityCountry || "Pakistan",
        notes: `Converted from inquiry ${inquiry.id}. Preferred contact: ${inquiry.preferredContact}.`,
        createdAt: new Date().toISOString(),
        archived: false,
        totalProjects: 1,
        totalBilled: approvedPrice,
        totalPaid: advanceReceived,
        outstandingBalance: remainingBalance,
      };
      DataStore.createClient(client);
    } else {
      DataStore.updateClient(client.id, {
        totalProjects: (client.totalProjects || 0) + 1,
        totalBilled: (client.totalBilled || 0) + approvedPrice,
        totalPaid: (client.totalPaid || 0) + advanceReceived,
        outstandingBalance: (client.outstandingBalance || 0) + remainingBalance,
      });
    }

    // 2. Create project
    const newProjectId = `proj-${Date.now().toString().slice(-6)}`;
    const newProject: Project = {
      id: newProjectId,
      inquiryId: inquiry.id,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      name: `${inquiry.businessName || inquiry.customerName} - ${inquiry.projectTypes[0] || "Web Application"}`,
      category: inquiry.projectTypes[0] || "Custom web applications",
      description: inquiry.problemToSolve || inquiry.productsServices || "Custom web application development.",
      approvedPrice,
      advanceRequired,
      advanceReceived,
      remainingBalance,
      status: advanceReceived >= advanceRequired ? "In Development" : "Awaiting Advance",
      deliveryTimeline: deliveryTimeline || "3 to 4 Weeks",
      selectedFeatures: [
        ...inquiry.projectTypes,
        inquiry.adminPanelType === "client_admin" ? "Client Admin Panel" : "Internal Managed",
        ...inquiry.selectedAddons,
      ],
      adminNotes: `Converted from inquiry ${inquiry.id}. Original budget estimate: PKR ${inquiry.calculation.estimatedTotal}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DataStore.createProject(newProject);

    // 3. If initial advance was recorded, log payment record
    if (advanceReceived > 0) {
      DataStore.recordPayment({
        id: `pay-${Date.now().toString().slice(-6)}`,
        projectId: newProjectId,
        projectName: newProject.name,
        clientId: client.id,
        clientName: client.name,
        amount: advanceReceived,
        method: "Manual Entry / Cash",
        transactionRef: `CONV-ADV-${inquiry.id}`,
        paymentDate: new Date().toISOString(),
        status: "Paid",
        verifiedByAdmin: true,
        adminNotes: `Initial advance recorded on inquiry conversion.`,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Update inquiry with converted project ID and status
    await updateInquiry(inquiry.id, {
      status: advanceReceived >= advanceRequired ? "Approved" : "Awaiting Advance",
      convertedProjectId: newProjectId,
      adminNotes: `Converted into project #${newProjectId} on ${new Date().toLocaleDateString()}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Inquiry successfully converted to active Project #${newProjectId}!`,
      project: newProject,
      client,
    });
  } catch (error) {
    console.error("Conversion error", error);
    return NextResponse.json({ success: false, error: "Failed to convert inquiry" }, { status: 500 });
  }
}
