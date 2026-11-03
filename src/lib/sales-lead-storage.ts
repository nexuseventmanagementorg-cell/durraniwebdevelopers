import type { SalesLeadRecord } from "@/lib/types";
import { DataStore } from "@/lib/store";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

const TABLE_NAME = "sales_leads";

export class SalesLeadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesLeadStorageError";
  }
}

function hasSupabaseBackend(): boolean {
  if (hasPaymentSupabaseConfiguration()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new SalesLeadStorageError(
      "Sales lead storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return false;
}

function storageError(error: { code?: string }): SalesLeadStorageError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new SalesLeadStorageError(
      "Sales lead storage is not installed. Review and apply supabase/sales-leads.sql before enabling the lead workflow."
    );
  }
  return new SalesLeadStorageError("Sales lead storage is unavailable. Check server-side database connectivity and permissions.");
}

interface SalesLeadRow {
  lead_data: SalesLeadRecord;
}

function toStorageRow(lead: SalesLeadRecord) {
  let normalizedDomain: string | null = null;
  if (lead.officialWebsite) {
    try {
      normalizedDomain = new URL(lead.officialWebsite.includes("://")
        ? lead.officialWebsite
        : `https://${lead.officialWebsite}`).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      normalizedDomain = null;
    }
  }
  return {
    id: lead.id,
    normalized_domain: normalizedDomain,
    business_name: lead.businessName,
    country: lead.country,
    verification_status: lead.verificationStatus,
    qualification_status: lead.qualificationStatus,
    lead_data: lead,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

export async function getSalesLeads(): Promise<SalesLeadRecord[]> {
  if (!hasSupabaseBackend()) return DataStore.getSalesLeads();
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("lead_data")
    .order("updated_at", { ascending: false });
  if (error) throw storageError(error);
  return ((data || []) as SalesLeadRow[]).map((row) => row.lead_data);
}

export async function getSalesLeadById(id: string): Promise<SalesLeadRecord | undefined> {
  if (!hasSupabaseBackend()) return DataStore.getSalesLeadById(id);
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("lead_data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw storageError(error);
  return data ? (data as SalesLeadRow).lead_data : undefined;
}

export async function createSalesLeadRecord(lead: SalesLeadRecord): Promise<SalesLeadRecord> {
  if (!hasSupabaseBackend()) return DataStore.createSalesLead(lead);
  const { error } = await getPaymentSupabase().from(TABLE_NAME).insert(toStorageRow(lead));
  if (error) throw storageError(error);
  return lead;
}

export async function updateSalesLeadRecord(
  id: string,
  lead: SalesLeadRecord,
  actor: string
): Promise<SalesLeadRecord | null> {
  if (!hasSupabaseBackend()) return DataStore.updateSalesLead(id, lead, actor);
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .update(toStorageRow(lead))
    .eq("id", id)
    .select("lead_data")
    .maybeSingle();
  if (error) throw storageError(error);
  return data ? (data as SalesLeadRow).lead_data : null;
}
