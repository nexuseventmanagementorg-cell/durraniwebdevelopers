import type { CalculatorLead } from "@/lib/types";
import { DataStore } from "@/lib/store";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

const TABLE_NAME = "calculator_leads";

export function isIncompleteCalculatorLead(
  lead: Pick<CalculatorLead, "convertedInquiryId" | "status">
): boolean {
  return !lead.convertedInquiryId && lead.status !== "Converted";
}

export class CalculatorLeadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculatorLeadStorageError";
  }
}

function hasSupabaseBackend(): boolean {
  if (hasPaymentSupabaseConfiguration()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new CalculatorLeadStorageError(
      "Lead storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return false;
}

function describeStorageError(error: { code?: string }): CalculatorLeadStorageError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new CalculatorLeadStorageError(
      "Calculator lead storage is not installed. Run supabase/calculator-leads.sql in the DWD Supabase project."
    );
  }
  return new CalculatorLeadStorageError("Calculator lead storage is unavailable. Check Supabase connectivity and service-role permissions.");
}

interface CalculatorLeadRow {
  lead_data: CalculatorLead;
}

function toStorageRow(lead: CalculatorLead) {
  return {
    id: lead.id,
    name: lead.name || null,
    email: lead.email || null,
    phone: lead.phone || null,
    status: lead.status,
    currency: lead.currency,
    goal: lead.goal,
    budget_band: lead.budgetBand,
    progress_step: lead.progressStep,
    contact_consent_at: lead.contactConsentAt,
    lead_data: lead,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

export async function getCalculatorLeads(): Promise<CalculatorLead[]> {
  if (!hasSupabaseBackend()) return DataStore.getCalculatorLeads();

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("lead_data")
    .order("updated_at", { ascending: false });
  if (error) throw describeStorageError(error);
  return ((data || []) as CalculatorLeadRow[]).map((row) => row.lead_data);
}

export async function getCalculatorLeadById(id: string): Promise<CalculatorLead | undefined> {
  if (!hasSupabaseBackend()) return DataStore.getCalculatorLeadById(id);

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("lead_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw describeStorageError(error);
  return data ? (data as CalculatorLeadRow).lead_data : undefined;
}

export async function createCalculatorLead(lead: CalculatorLead): Promise<CalculatorLead> {
  if (!hasSupabaseBackend()) return DataStore.createCalculatorLead(lead);

  const { error } = await getPaymentSupabase().from(TABLE_NAME).insert(toStorageRow(lead));
  if (error) throw describeStorageError(error);
  return lead;
}

export async function updateCalculatorLead(
  id: string,
  updates: Partial<CalculatorLead>,
  actor = "Prospective client"
): Promise<CalculatorLead | null> {
  if (!hasSupabaseBackend()) return DataStore.updateCalculatorLead(id, updates, actor);

  const current = await getCalculatorLeadById(id);
  if (!current) return null;
  const updated: CalculatorLead = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .update(toStorageRow(updated))
    .eq("id", id)
    .select("lead_data")
    .maybeSingle();
  if (error) throw describeStorageError(error);
  return data ? (data as CalculatorLeadRow).lead_data : null;
}