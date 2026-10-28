export type OrderStatus =
  | "New Inquiry"
  | "Under Review"
  | "Contacted"
  | "Requirements Discussion"
  | "Quotation Sent"
  | "Awaiting Advance"
  | "Advance Received"
  | "Approved"
  | "In Development"
  | "Testing"
  | "Delivered"
  | "Completed"
  | "On Hold"
  | "Cancelled";

export type PaymentStatus =
  | "Pending"
  | "Awaiting Verification"
  | "Paid"
  | "Partially Paid"
  | "Failed"
  | "Refunded"
  | "Overdue";

export type PaymentMethod =
  | "JazzCash"
  | "Easypaisa"
  | "Bank Transfer"
  | "Manual Entry / Cash";

export interface AddonOption {
  id: string;
  label: string;
  category:
    | "auth"
    | "database"
    | "payment"
    | "admin"
    | "ai"
    | "custom"
    | "feature"
    | "website"
    | "business"
    | "creative"
    | "ecommerce"
    | "saas"
    | "automation"
    | "security"
    | "industry"
    | "propertytech"
    | "businesscatalog";
  price: number;
  description: string;
  enabled: boolean;
  billingPeriod?: "one_time" | "monthly";
  businessCategories?: string[];
  businessTypes?: string[];
  pricingLevel?: "basic" | "expanded" | "complex";
  origin?: "existing" | "new";
  status?: "active" | "inactive" | "archived";
  relatedAddOnIds?: string[];
  requiresCustomQuote?: boolean;
}

export interface PricingRuleConfig {
  baseWithoutAdmin: number;
  baseWithAdmin: number;
  advanceDefault: number;
  installmentsCount: number;
  contingencyPercentage: number;
  addons: Record<string, AddonOption>;
}

export interface CalculationBreakdown {
  basePrice: number;
  adminFee: number;
  addonsTotal: number;
  selectedAddonDetails: {
    id: string;
    label: string;
    price: number;
    billingPeriod?: "one_time" | "monthly";
  }[];
  monthlyAddonTotal: number;
  contingencyAmount: number;
  estimatedTotal: number;
  advanceAmount: number;
  remainingBalance: number;
  installmentsCount: number;
  regularInstallment: number;
  finalInstallment: number;
  dailyCost: number;
}

export interface InquiryScanFeature {
  title: string;
  evidence: string;
}

export interface InquiryScopeReview {
  reviewedAt: string;
  status: "needs_follow_up" | "ready_for_admin_review";
  missingDetails: string[];
  riskFlags: string[];
  recommendedNextAction: string;
}

export type CalculatorLeadStatus = "New" | "Contacted" | "Qualified" | "Converted" | "Closed";

export interface CalculatorLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  language: "roman-ur" | "en";
  locale: string;
  currency: string;
  goal: string;
  budgetBand: string;
  userDescription: string;
  progressStep: number;
  recommendation: {
    title: string;
    projectType: string;
    calculation: CalculationBreakdown;
    included: string[];
    notIncluded: string[];
  };
  questionnaire: Record<string, unknown>;
  convertedInquiryId?: string;
  contactConsentAt: string;
  status: CalculatorLeadStatus;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectReadinessChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ProjectBuildBriefRecord {
  generatedAt: string;
  content: string;
  checklist: ProjectReadinessChecklistItem[];
}

export type ProjectWorkflowTaskStatus = "blocked" | "ready" | "in_progress" | "completed" | "awaiting_admin";

export interface ProjectWorkflowTask {
  id: string;
  role: string;
  title: string;
  status: ProjectWorkflowTaskStatus;
  dependsOn: string[];
  adminApprovalRequired?: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ProjectAutomationWorkflow {
  createdAt: string;
  sourceInquiryId: string;
  mode: "admin_assisted";
  status: "ready" | "in_progress" | "awaiting_admin" | "completed";
  tasks: ProjectWorkflowTask[];
}

export interface WebsiteDraft {
  generatedAt: string;
  generator: "template-v1";
  html: string;
}

export type PublicProjectMilestoneStatus = "waiting" | "ready" | "active" | "awaiting_admin" | "completed";

export interface PublicProjectMilestone {
  id: string;
  label: string;
  status: PublicProjectMilestoneStatus;
}

export interface PublicProjectProgress {
  projectName: string;
  milestones: PublicProjectMilestone[];
  percentComplete: number;
  updatedAt: string;
  previewUrl?: string;
  previewHtml?: string;
}

export interface Inquiry {
  id: string; // e.g. "DW-849201"
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  
  // Step 1: Customer Information
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  cityCountry: string;
  preferredContact: "whatsapp" | "email" | "phone";
  language?: "roman-ur" | "en";
  whatsappConfirmationConsent?: boolean;
  whatsappConfirmationStatus?: "sent" | "failed" | "not_configured" | "not_requested";
  customerIntro: string;

  // Step 2: Project Type
  projectTypes: string[];

  // Step 3: Project Description
  problemToSolve: string;
  targetAudience: string;
  productsServices: string;
  inspirationUrl: string;
  isNewOrUpgrade: "new" | "upgrade";
  preferredLaunchDate: string;
  expectedBudgetRange: string;

  // Step 4: Website and Product Management
  displayFixedOnly: boolean;
  needsProductCatalog: boolean;
  productFeatures: string[]; // ['categories', 'variants', 'stock', 'images', 'pricing']
  acceptOrdersOnline: boolean;
  orderFeatures: string[]; // ['cart', 'checkout', 'coupons', 'delivery_fees']
  needsReviewsOrAccounts: boolean;

  // Step 5: Admin Panel Requirements
  adminPanelType: "none" | "client_admin";
  adminFeatures: string[];

  // Step 6: Advanced Features
  selectedAddons: string[];
  scanFeatures?: InquiryScanFeature[];
  scopeReview?: InquiryScopeReview;
  customFeatureNotes?: string;
  websiteCreationPrompt?: string;
  pricingPackage?: "ecommerce_starter" | "ecommerce_business" | "ecommerce_advanced" | "saas_starter" | "saas_business" | "saas_enterprise";
  manualAdvanceVerification?: {
    amount: number;
    method: PaymentMethod;
    transactionReference: string;
    note: string;
    verifiedAt: string;
    verifiedBy: string;
  };
  projectBuildBrief?: ProjectBuildBriefRecord;

  // Step 7 & 8: Pricing breakdown snapshot
  calculation: CalculationBreakdown;
  currency?: string;
  internationalPricing?: boolean;
  exchangeRate?: number;
  internationalCalculation?: CalculationBreakdown;
  disclaimerAccepted: boolean;

  // Admin follow-up
  adminNotes?: string;
  convertedProjectId?: string;
  reviewedBy?: string;
}

export interface Client {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  cityCountry: string;
  notes: string;
  createdAt: string;
  archived: boolean;
  totalProjects: number;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
}

export interface Project {
  id: string;
  inquiryId?: string;
  projectBuildBrief?: ProjectBuildBriefRecord;
  automationWorkflow?: ProjectAutomationWorkflow;
  websiteDraft?: WebsiteDraft;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  name: string;
  category: string;
  description: string;
  approvedPrice: number;
  advanceRequired: number;
  advanceReceived: number;
  remainingBalance: number;
  installmentsCount?: number;
  monthlyInstallmentAmount?: number;
  firstInstallmentDueDate?: string;
  status: OrderStatus;
  deliveryTimeline: string;
  deploymentUrl?: string;
  selectedFeatures: string[];
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  amount: number;
  method: PaymentMethod;
  transactionRef: string;
  paymentDate: string;
  status: PaymentStatus;
  verifiedByAdmin: boolean;
  adminNotes: string;
  proofAttachment?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string; // e.g. "INV-2026-001"
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness?: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  advanceDeduction: number;
  totalDue: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod?: string;
  status: "Draft" | "Sent" | "Paid" | "Partially Paid" | "Overdue";
  termsAndNotes: string;
  scheduleSummary: string;
  createdAt: string;
}

export interface InstallmentScheduleItem {
  id: string;
  projectId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: "Pending" | "Paid" | "Overdue";
  paymentId?: string;
  paidDate?: string;
}

export interface PaymentReminder {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  reminderType: "7_days_before" | "3_days_before" | "on_due_date" | "overdue";
  channel: "email" | "whatsapp" | "in_app";
  scheduledDate: string;
  status: "Scheduled" | "Pending Manual Action" | "Sent" | "Failed" | "Cancelled";
  messageText: string;
  sentAt?: string;
  errorMessage?: string;
}

export interface PortfolioProject {
  id: string;
  templateFeatureVersion?: number;
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  technologies: string[];
  status: "Completed" | "Live" | "Delivered";
  availabilityStatus?: "Online" | "Offline";
  templateAvailable?: boolean;
  templatePricingPackage?: "ecommerce_starter" | "ecommerce_business" | "ecommerce_advanced" | "saas_starter" | "saas_business" | "saas_enterprise";
  templateStartingPrice?: number;
  templateIncludedAddonIds?: string[];
  templateIncludedAddonPrices?: Record<string, number>;
  demoUrl?: string;
  isPublic: boolean;
  approvedPublicBudget?: number;
  budgetLabel?: string;
  offerEnabled?: boolean;
  offerTag?: string;
  offerDiscountPercent?: number;
  offerEndsAt?: string;
  adminPanelIncluded?: boolean;
  includedAddonIds?: string[];
  featured: boolean;
  clientConsentForBudget: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  targetType: "inquiry" | "project" | "client" | "payment" | "invoice" | "pricing" | "reminder" | "calculator-lead" | "auth";
  targetId: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  currency: string;
  enablePublicBudgetDisplay: boolean;
  reminderLeadDays: number[];
  emailSenderConfigured: boolean;
  whatsAppApiConfigured: boolean;
  autoRemindersEnabled: boolean;
}
