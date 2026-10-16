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
    | "ecommerce"
    | "saas"
    | "automation"
    | "security"
    | "industry";
  price: number;
  description: string;
  enabled: boolean;
  billingPeriod?: "one_time" | "monthly";
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
  customFeatureNotes?: string;
  pricingPackage?: "ecommerce_business" | "ecommerce_advanced" | "saas_starter" | "saas_business" | "saas_enterprise";

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
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  technologies: string[];
  status: "Completed" | "Live" | "Delivered";
  demoUrl?: string;
  isPublic: boolean;
  approvedPublicBudget?: number;
  budgetLabel?: string;
  adminPanelIncluded?: boolean;
  includedAddonIds?: string[];
  featured: boolean;
  clientConsentForBudget: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  targetType: "inquiry" | "project" | "client" | "payment" | "invoice" | "pricing" | "reminder" | "auth";
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
