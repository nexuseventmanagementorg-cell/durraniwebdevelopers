import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getInquiryById } from "@/lib/inquiry-storage";
import { DataStore } from "@/lib/store";
import { getProjectRecord, updateProjectRecord } from "@/lib/project-storage";
import {
  assessClientOnboarding,
  buildClientOnboardingAssessment,
  ClientOnboardingValidationError,
  CLIENT_ONBOARDING_HISTORY_LIMIT,
  isClientOnboardingCurrent,
  reviewClientOnboardingAssessment,
  validateClientOnboardingRecord,
  type ClientOnboardingRecord,
  type ClientOnboardingInput,
  type VerifiedPaymentReference,
} from "@/lib/client-onboarding";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseForError(error: unknown) {
  if (error instanceof ClientOnboardingValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  console.error("Client Onboarding request failed", error);
  return NextResponse.json(
    { success: false, error: "The onboarding readiness assessment could not be completed." },
    { status: 503 }
  );
}

async function loadVerifiedPayments(projectId: string, inquiryId: string): Promise<VerifiedPaymentReference[]> {
  if (hasPaymentSupabaseConfiguration()) {
    const { data, error } = await getPaymentSupabase()
      .from("payment_proofs")
      .select("id,amount,verified_at")
      .eq("inquiry_reference", inquiryId)
      .eq("status", "verified")
      .limit(100);
    if (error) throw error;
    return (data || [])
      .filter((row) => typeof row.id === "string" && Number.isFinite(Number(row.amount)) && Number(row.amount) > 0)
      .map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
      }));
  }
  return DataStore.getPayments()
    .filter((payment) =>
      payment.projectId === projectId &&
      payment.status === "Paid" &&
      payment.verifiedByAdmin &&
      Number.isFinite(payment.amount) &&
      payment.amount > 0
    )
    .map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      verifiedAt: payment.paymentDate || payment.createdAt || null,
    }));
}

async function loadOnboardingInput(projectId: string): Promise<ClientOnboardingInput> {
  if (!projectId.trim() || projectId.length > 100) {
    throw new ClientOnboardingValidationError("A valid project ID is required.");
  }
  const project = await getProjectRecord(projectId);
  if (!project) throw new ClientOnboardingValidationError("The requested project was not found.");
  if (!project.inquiryId) {
    throw new ClientOnboardingValidationError("The project does not have a converted source inquiry.");
  }
  const inquiry = await getInquiryById(project.inquiryId);
  if (!inquiry) throw new ClientOnboardingValidationError("The project's source inquiry could not be loaded.");
  const verifiedPayments = await loadVerifiedPayments(project.id, inquiry.id);
  return { project, inquiry, verifiedPayments };
}

function validateHistory(projectId: string, value: unknown): ClientOnboardingRecord[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length >= CLIENT_ONBOARDING_HISTORY_LIMIT) {
    throw new ClientOnboardingValidationError("The onboarding history is malformed or exceeds its supported bound.");
  }
  const versions = new Set<number>();
  const ids = new Set<string>();
  for (const record of value) {
    validateClientOnboardingRecord(record, projectId);
    if (versions.has(record.recordVersion) || ids.has(record.id)) {
      throw new ClientOnboardingValidationError("The onboarding history contains duplicate versions.");
    }
    versions.add(record.recordVersion);
    ids.add(record.id);
  }
  return value;
}

function validateCurrent(projectId: string, value: unknown): ClientOnboardingRecord | null {
  if (value === undefined || value === null) return null;
  validateClientOnboardingRecord(value as ClientOnboardingRecord, projectId);
  return value as ClientOnboardingRecord;
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
  try {
    const input = await loadOnboardingInput(projectId);
    const project = input.project;
    const eligibility = assessClientOnboarding(input);
    const assessmentPreview = buildClientOnboardingAssessment(input);
    const record = validateCurrent(project.id, project.clientOnboarding);
    const history = validateHistory(project.id, project.clientOnboardingHistory);
    if (record && history.some((item) =>
      item.id === record.id || item.recordVersion >= record.recordVersion
    )) {
      throw new ClientOnboardingValidationError("The current onboarding assessment conflicts with its saved history.");
    }
    return NextResponse.json(
      {
        success: true,
        projectId: project.id,
        eligible: eligibility.eligible,
        blockers: eligibility.blockers,
        sourceCurrent: Boolean(record && isClientOnboardingCurrent(record, input)),
        record,
        assessmentPreview,
        history,
        customerAuthenticationAvailable: false,
        secureProjectAssetUploadAvailable: false,
        customerAcceptanceEvidenceAvailable: false,
        agreementEvidenceAvailable: false,
        notifications: "PREPARED_NOT_SENT",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string" ||
      !("action" in payload) || payload.action !== "prepare_assessment" ||
      Object.keys(payload).some((key) => !["projectId", "action"].includes(key))) {
    return NextResponse.json(
      { success: false, error: "Only a project ID and prepare_assessment action are accepted; customer approvals and payment claims are never accepted from the client." },
      { status: 400 }
    );
  }
  try {
    const input = await loadOnboardingInput(payload.projectId);
    const previous = validateCurrent(input.project.id, input.project.clientOnboarding);
    const history = validateHistory(input.project.id, input.project.clientOnboardingHistory);
    if (previous && history.some((item) =>
      item.id === previous.id || item.recordVersion >= previous.recordVersion
    )) {
      throw new ClientOnboardingValidationError("The current onboarding assessment conflicts with its saved history.");
    }
    if (previous && isClientOnboardingCurrent(previous, input)) {
      return NextResponse.json({
        success: true,
        projectId: input.project.id,
        record: previous,
        blockers: previous.handoff.blockers,
        message: "The current readiness assessment is unchanged. The customer onboarding workflow has not started.",
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const record = buildClientOnboardingAssessment(input);
    record.recordVersion = Math.max(0, ...history.map((item) => item.recordVersion), previous?.recordVersion || 0) + 1;
    record.auditHistory[0].details = record.status === "BLOCKED"
      ? "BLOCKED readiness assessment saved; no customer onboarding workflow started."
      : "Onboarding draft prepared after eligibility validation; customer contact and project-start authorization have not occurred.";
    const updated = await updateProjectRecord(input.project.id, {
      clientOnboarding: record,
      clientOnboardingHistory: [...history, ...(previous ? [previous] : [])]
        .slice(-(CLIENT_ONBOARDING_HISTORY_LIMIT - 1)),
    });
    if (!updated) throw new ClientOnboardingValidationError("The project workspace was not found while saving the assessment.");
    const blocked = record.status === "BLOCKED";
    return NextResponse.json(
      {
        success: true,
        projectId: input.project.id,
        record: updated.clientOnboarding,
        blockers: record.handoff.blockers,
        message: blocked
          ? "BLOCKED readiness assessment saved; the customer onboarding workflow has not started."
          : "Onboarding draft prepared for human review; no customer communication or project execution occurred.",
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string" ||
      !("recordId" in payload) || typeof payload.recordId !== "string" ||
      !("action" in payload) || payload.action !== "review" ||
      Object.keys(payload).some((key) => !["projectId", "recordId", "action"].includes(key))) {
    return NextResponse.json(
      { success: false, error: "Only a project ID, current assessment ID, and restricted review action are accepted." },
      { status: 400 }
    );
  }
  try {
    const input = await loadOnboardingInput(payload.projectId);
    const current = validateCurrent(input.project.id, input.project.clientOnboarding);
    if (!current || current.id !== payload.recordId) {
      return NextResponse.json({ success: false, error: "The requested onboarding assessment is not current." }, { status: 409 });
    }
    if (!isClientOnboardingCurrent(current, input)) {
      return NextResponse.json({ success: false, error: "Onboarding sources changed; prepare a new readiness assessment." }, { status: 409 });
    }
    const reviewed = reviewClientOnboardingAssessment(current, admin.email);
    const updated = await updateProjectRecord(input.project.id, { clientOnboarding: reviewed });
    if (!updated) throw new ClientOnboardingValidationError("The project workspace was not found while recording review.");
    return NextResponse.json(
      {
        success: true,
        record: updated.clientOnboarding,
        message: "Blocked readiness assessment reviewed. This does not start onboarding or authorize project work.",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
