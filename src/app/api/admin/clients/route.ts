import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { buildInstallmentSchedule } from "@/lib/client-finances";
import {
  Client,
  InstallmentScheduleItem,
  PaymentMethod,
  PaymentRecord,
  Project,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "true";
  const clients = includeArchived
    ? DataStore.getAllClientsIncludingArchived()
    : DataStore.getClients();

  return NextResponse.json({ success: true, clients });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      businessName,
      email,
      phone,
      cityCountry,
      notes,
      projectName,
      projectCategory,
      agreedBudget,
      advanceRequired,
      advanceReceived,
      installmentsCount,
      firstInstallmentDueDate,
      advanceMethod,
      advanceReference,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof projectName !== "string" ||
      !projectName.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "Name, email, phone, and project name are required" },
        { status: 400 }
      );
    }

    const budget = Number(agreedBudget);
    const advance = Number(advanceRequired);
    const received = Number(advanceReceived);
    const count = Number(installmentsCount);
    const validPaymentMethods: PaymentMethod[] = [
      "JazzCash",
      "Easypaisa",
      "Bank Transfer",
      "Manual Entry / Cash",
    ];

    if (
      !Number.isFinite(budget) ||
      budget <= 0 ||
      !Number.isFinite(advance) ||
      advance < 0 ||
      advance > budget ||
      !Number.isFinite(received) ||
      received < 0 ||
      received > budget
    ) {
      return NextResponse.json(
        { success: false, error: "Budget and advance amounts must be valid and within the agreed budget." },
        { status: 400 }
      );
    }

    const installmentBalance = Number((budget - Math.max(advance, received)).toFixed(2));
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count > 36 ||
      (installmentBalance > 0 && count < 1)
    ) {
      return NextResponse.json(
        { success: false, error: "Set 1–36 monthly installments for the balance, or zero if the advance covers the full budget." },
        { status: 400 }
      );
    }

    if (
      received > 0 &&
      (typeof advanceMethod !== "string" || !validPaymentMethods.includes(advanceMethod as PaymentMethod))
    ) {
      return NextResponse.json(
        { success: false, error: "Choose a valid method for the advance already received." },
        { status: 400 }
      );
    }

    const clientId = `cli-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
    const projectId = `proj-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    let installments: InstallmentScheduleItem[] = [];
    if (installmentBalance > 0) {
      try {
        installments = buildInstallmentSchedule(
          projectId,
          installmentBalance,
          count,
          firstInstallmentDueDate
        );
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Installment schedule is invalid.",
          },
          { status: 400 }
        );
      }
    }
    const monthlyInstallmentAmount = count > 0
      ? Number((installmentBalance / count).toFixed(2))
      : 0;

    const newClient: Client = {
      id: clientId,
      name: name.trim(),
      businessName: typeof businessName === "string" ? businessName.trim() : "",
      email: email.trim(),
      phone: phone.trim(),
      cityCountry: typeof cityCountry === "string" ? cityCountry.trim() : "",
      notes: typeof notes === "string" ? notes.trim() : "",
      createdAt: now,
      archived: false,
      totalProjects: 1,
      totalBilled: budget,
      totalPaid: received,
      outstandingBalance: Number((budget - received).toFixed(2)),
    };

    const project: Project = {
      id: projectId,
      clientId,
      clientName: newClient.name,
      clientEmail: newClient.email,
      clientPhone: newClient.phone,
      name: projectName.trim(),
      category: typeof projectCategory === "string" && projectCategory.trim()
        ? projectCategory.trim()
        : "Custom web application",
      description: "",
      approvedPrice: budget,
      advanceRequired: advance,
      advanceReceived: received,
      remainingBalance: Number((budget - received).toFixed(2)),
      installmentsCount: installmentBalance > 0 ? count : 0,
      monthlyInstallmentAmount,
      firstInstallmentDueDate: installments[0]?.dueDate,
      status: received >= advance ? "Approved" : "Awaiting Advance",
      deliveryTimeline: "3 to 4 Weeks",
      selectedFeatures: [],
      adminNotes: "",
      createdAt: now,
      updatedAt: now,
    };
    const initialPayment: PaymentRecord | undefined = received > 0
      ? {
          id: `pay-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
          projectId,
          projectName: project.name,
          clientId,
          clientName: newClient.name,
          amount: received,
          method: advanceMethod as PaymentMethod,
          transactionRef: typeof advanceReference === "string" && advanceReference.trim()
            ? advanceReference.trim()
            : "Admin recorded during client registration",
          paymentDate: now,
          status: "Paid",
          verifiedByAdmin: true,
          adminNotes: "Initial advance recorded during client registration",
          createdAt: now,
        }
      : undefined;

    DataStore.createClientWithProject(newClient, project, installments, initialPayment);
    return NextResponse.json({ success: true, client: newClient, project });
  } catch (error) {
    console.error("Create client error", error);
    return NextResponse.json({ success: false, error: "Failed to create client" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, businessName, email, phone, cityCountry, notes, archived } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Client ID is required" }, { status: 400 });
    }

    const updates: Partial<Client> = {};
    if (name !== undefined) updates.name = name;
    if (businessName !== undefined) updates.businessName = businessName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (cityCountry !== undefined) updates.cityCountry = cityCountry;
    if (notes !== undefined) updates.notes = notes;
    if (archived !== undefined) updates.archived = Boolean(archived);

    const updated = DataStore.updateClient(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client: updated });
  } catch (error) {
    console.error("Update client error", error);
    return NextResponse.json({ success: false, error: "Failed to update client" }, { status: 500 });
  }
}
