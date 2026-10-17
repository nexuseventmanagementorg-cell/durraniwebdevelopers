import type { Inquiry } from "@/lib/types";
import { DataStore } from "@/lib/store";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";
import { reviewInquiryScope } from "@/lib/inquiry-review";

const TABLE_NAME = "inquiries";

export class InquiryStorageError extends Error {
  constructor(message = "Inquiry storage is unavailable. Apply supabase/website-inquiries.sql and verify the Supabase service-role configuration.") {
    super(message);
    this.name = "InquiryStorageError";
  }
}

interface InquiryRow {
  id: string;
  inquiry_data?: Inquiry | null;
  customer_name: string;
  business_name: string | null;
  email: string;
  phone: string;
  city_country: string | null;
  preferred_contact: string | null;
  customer_intro: string | null;
  project_types: string[] | null;
  problem_to_solve: string | null;
  target_audience: string | null;
  products_services: string | null;
  inspiration_url: string | null;
  is_new_or_upgrade: string | null;
  preferred_launch_date: string | null;
  expected_budget_range: string | null;
  display_fixed_only: boolean | null;
  needs_product_catalog: boolean | null;
  product_features: string[] | null;
  accept_orders_online: boolean | null;
  order_features: string[] | null;
  needs_reviews_or_accounts: boolean | null;
  admin_panel_type: string | null;
  admin_features: string[] | null;
  selected_addons: string[] | null;
  custom_feature_notes: string | null;
  calculation: Inquiry["calculation"] & { _inquirySnapshot?: Inquiry };
  disclaimer_accepted: boolean | null;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}

function toInquiry(row: InquiryRow): Inquiry {
  if (row.inquiry_data) return row.inquiry_data;
  if (row.calculation?._inquirySnapshot) return row.calculation._inquirySnapshot;
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as Inquiry["status"],
    customerName: row.customer_name,
    businessName: row.business_name || "",
    email: row.email,
    phone: row.phone,
    cityCountry: row.city_country || "",
    preferredContact: (row.preferred_contact || "whatsapp") as Inquiry["preferredContact"],
    customerIntro: row.customer_intro || "",
    projectTypes: row.project_types || [],
    problemToSolve: row.problem_to_solve || "",
    targetAudience: row.target_audience || "",
    productsServices: row.products_services || "",
    inspirationUrl: row.inspiration_url || "",
    isNewOrUpgrade: row.is_new_or_upgrade === "upgrade" ? "upgrade" : "new",
    preferredLaunchDate: row.preferred_launch_date || "",
    expectedBudgetRange: row.expected_budget_range || "",
    displayFixedOnly: row.display_fixed_only === true,
    needsProductCatalog: row.needs_product_catalog === true,
    productFeatures: row.product_features || [],
    acceptOrdersOnline: row.accept_orders_online === true,
    orderFeatures: row.order_features || [],
    needsReviewsOrAccounts: row.needs_reviews_or_accounts === true,
    adminPanelType: row.admin_panel_type === "client_admin" ? "client_admin" : "none",
    adminFeatures: row.admin_features || [],
    selectedAddons: row.selected_addons || [],
    customFeatureNotes: row.custom_feature_notes || "",
    calculation: row.calculation,
    disclaimerAccepted: row.disclaimer_accepted !== false,
    adminNotes: row.admin_notes || "",
    ...(row.converted_project_id ? { convertedProjectId: row.converted_project_id } : {}),
  };
}

function toStorageRow(inquiry: Inquiry, includeLegacySnapshot = false) {
  return {
    id: inquiry.id,
    customer_name: inquiry.customerName,
    business_name: inquiry.businessName,
    email: inquiry.email,
    phone: inquiry.phone,
    city_country: inquiry.cityCountry,
    preferred_contact: inquiry.preferredContact,
    customer_intro: inquiry.customerIntro,
    project_types: inquiry.projectTypes,
    problem_to_solve: inquiry.problemToSolve,
    target_audience: inquiry.targetAudience,
    products_services: inquiry.productsServices,
    inspiration_url: inquiry.inspirationUrl,
    is_new_or_upgrade: inquiry.isNewOrUpgrade,
    preferred_launch_date: inquiry.preferredLaunchDate,
    expected_budget_range: inquiry.expectedBudgetRange,
    display_fixed_only: inquiry.displayFixedOnly,
    needs_product_catalog: inquiry.needsProductCatalog,
    product_features: inquiry.productFeatures,
    accept_orders_online: inquiry.acceptOrdersOnline,
    order_features: inquiry.orderFeatures,
    needs_reviews_or_accounts: inquiry.needsReviewsOrAccounts,
    admin_panel_type: inquiry.adminPanelType,
    admin_features: inquiry.adminFeatures,
    selected_addons: inquiry.selectedAddons,
    custom_feature_notes: inquiry.customFeatureNotes,
    calculation: includeLegacySnapshot
      ? { ...inquiry.calculation, _inquirySnapshot: inquiry }
      : inquiry.calculation,
    disclaimer_accepted: inquiry.disclaimerAccepted,
    status: inquiry.status,
    admin_notes: inquiry.adminNotes,
    created_at: inquiry.createdAt,
    updated_at: inquiry.updatedAt,
    inquiry_data: inquiry,
  };
}

function isMissingSnapshotColumn(error: { code?: string; message?: string }): boolean {
  return (error.code === "42703" || error.code === "PGRST204") &&
    Boolean(error.message?.includes("inquiry_data"));
}

function requireSupabaseInProduction(): void {
  if (process.env.NODE_ENV === "production" && !hasPaymentSupabaseConfiguration()) {
    throw new InquiryStorageError("Inquiry storage is not configured. Contact Durrani Web Developers using WhatsApp.");
  }
}

export async function saveInquiry(inquiry: Inquiry): Promise<Inquiry> {
  const reviewedInquiry: Inquiry = {
    ...inquiry,
    scopeReview: reviewInquiryScope(inquiry),
  };
  if (!hasPaymentSupabaseConfiguration()) {
    requireSupabaseInProduction();
    return DataStore.createInquiry(reviewedInquiry);
  }

  const supabase = getPaymentSupabase();
  const row = toStorageRow(reviewedInquiry);
  let { error } = await supabase.from(TABLE_NAME).insert(row);
  if (error && isMissingSnapshotColumn(error)) {
    const { inquiry_data: _unusedSnapshot, ...legacyRow } = toStorageRow(reviewedInquiry, true);
    const fallback = await supabase.from(TABLE_NAME).insert(legacyRow);
    error = fallback.error;
  }
  if (error) {
    console.error("Supabase inquiry insert failed", error);
    throw new InquiryStorageError();
  }
  return reviewedInquiry;
}

export async function getInquiries(): Promise<Inquiry[]> {
  if (!hasPaymentSupabaseConfiguration()) {
    requireSupabaseInProduction();
    return DataStore.getInquiries();
  }

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase inquiry list failed", error);
    throw new InquiryStorageError("Inquiries could not be loaded. Check the Supabase inquiry migration and service-role configuration.");
  }
  return ((data || []) as InquiryRow[]).map(toInquiry);
}

export async function getInquiryById(id: string): Promise<Inquiry | undefined> {
  if (!hasPaymentSupabaseConfiguration()) {
    requireSupabaseInProduction();
    return DataStore.getInquiryById(id);
  }

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id.toUpperCase())
    .maybeSingle();
  if (error) {
    console.error("Supabase inquiry lookup failed", error);
    throw new InquiryStorageError("Inquiry could not be loaded. Check the Supabase inquiry migration and service-role configuration.");
  }
  return data ? toInquiry(data as InquiryRow) : undefined;
}

export async function updateInquiry(
  id: string,
  updates: Partial<Inquiry>,
  actor = "Admin"
): Promise<Inquiry | null> {
  if (!hasPaymentSupabaseConfiguration()) {
    requireSupabaseInProduction();
    return DataStore.updateInquiry(id, updates, actor);
  }

  const current = await getInquiryById(id);
  if (!current) return null;
  const updatedInquiry: Inquiry = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const supabase = getPaymentSupabase();
  const row = toStorageRow(updatedInquiry);
  let { error } = await supabase
    .from(TABLE_NAME)
    .update({
      status: updatedInquiry.status,
      updated_at: updatedInquiry.updatedAt,
      admin_notes: updatedInquiry.adminNotes,
      calculation: row.calculation,
      inquiry_data: updatedInquiry,
    })
    .eq("id", id.toUpperCase());
  if (error && isMissingSnapshotColumn(error)) {
    const { inquiry_data: _unusedSnapshot, ...legacyRow } = toStorageRow(updatedInquiry, true);
    const fallback = await supabase
      .from(TABLE_NAME)
      .update({
        status: updatedInquiry.status,
        updated_at: updatedInquiry.updatedAt,
        admin_notes: updatedInquiry.adminNotes,
        calculation: legacyRow.calculation,
      })
      .eq("id", id.toUpperCase());
    error = fallback.error;
  }
  if (error) {
    console.error("Supabase inquiry update failed", error);
    throw new InquiryStorageError("Inquiry update failed. Check Supabase permissions and service-role configuration.");
  }
  return updatedInquiry;
}