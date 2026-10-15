import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { Client } from "@/lib/types";

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
    const { name, businessName, email, phone, cityCountry, notes } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    const newClient: Client = {
      id: `cli-${Date.now().toString().slice(-6)}`,
      name,
      businessName: businessName || "",
      email,
      phone,
      cityCountry: cityCountry || "",
      notes: notes || "",
      createdAt: new Date().toISOString(),
      archived: false,
      totalProjects: 0,
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
    };

    DataStore.createClient(newClient);
    return NextResponse.json({ success: true, client: newClient });
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
