import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { CalculatorLeadStorageError, getCalculatorLeads, isIncompleteCalculatorLead, updateCalculatorLead } from "@/lib/calculator-lead-storage";
import type { CalculatorLeadStatus } from "@/lib/types";

const LEAD_STATUSES: CalculatorLeadStatus[] = ["New", "Contacted", "Qualified", "Converted", "Closed"];

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = (await getCalculatorLeads()).filter(isIncompleteCalculatorLead);
    return NextResponse.json(
      { success: true, leads },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const message = error instanceof CalculatorLeadStorageError
      ? error.message
      : "Calculator leads could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
    const updates: { status?: CalculatorLeadStatus; adminNotes?: string } = {};
    if (typeof body.status === "string") {
      if (!LEAD_STATUSES.includes(body.status as CalculatorLeadStatus)) {
        return NextResponse.json({ success: false, error: "Choose a valid lead status." }, { status: 400 });
      }
      updates.status = body.status as CalculatorLeadStatus;
    }
    if (body.adminNotes !== undefined) {
      if (typeof body.adminNotes !== "string") {
        return NextResponse.json({ success: false, error: "Admin notes must be text." }, { status: 400 });
      }
      updates.adminNotes = body.adminNotes.trim().slice(0, 3000);
    }
    if (!id || Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Lead ID and an update are required." }, { status: 400 });
    }

    const lead = await updateCalculatorLead(id, updates, "Admin");
    if (!lead) return NextResponse.json({ success: false, error: "Calculator lead not found." }, { status: 404 });
    return NextResponse.json({ success: true, lead }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof CalculatorLeadStorageError
      ? error.message
      : "Calculator lead could not be updated.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}