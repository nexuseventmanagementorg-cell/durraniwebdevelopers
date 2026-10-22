import fs from "fs";
import path from "path";
import {
  Inquiry,
  Project,
  Client,
  PaymentRecord,
  Invoice,
  InstallmentScheduleItem,
  PaymentReminder,
  PortfolioProject,
  PricingRuleConfig,
  AuditLog,
  SystemSettings,
  CalculatorLead,
} from "./types";
import { DEFAULT_PRICING_CONFIG, calculateBudget, mergePricingConfigWithDefaults } from "./constants";

interface DatabaseSchema {
  inquiries: Inquiry[];
  calculatorLeads?: CalculatorLead[];
  projects: Project[];
  clients: Client[];
  payments: PaymentRecord[];
  invoices: Invoice[];
  installments: InstallmentScheduleItem[];
  reminders: PaymentReminder[];
  portfolio: PortfolioProject[];
  pricingConfig: PricingRuleConfig;
  settings: SystemSettings;
  auditLogs: AuditLog[];
}

export const INITIAL_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "grillvi-gtroad",
    title: "GRILLVI - Restaurant Website & Online Ordering",
    category: "Restaurant web applications",
    shortDescription: "Live website for GRILLVI on Main GT Road, Lahore, featuring an online menu, ordering cart, and WhatsApp ordering.",
    fullDescription: "A live restaurant website for GRILLVI, serving charcoal BBQ, rice thaals, and karahi in Baghbanpura, Lahore. Customers can browse the menu and food details, add items to a cart, place an order, and contact the restaurant through WhatsApp. The website also shares restaurant location, opening hours, and contact information.",
    imageUrl: "https://grillvi-gtroad.vercel.app/images/restaurant-interior.jpg",
    technologies: ["Next.js", "Responsive Web Design", "Online Menu", "Online Ordering", "WhatsApp Ordering"],
    status: "Live",
    demoUrl: "https://grillvi-gtroad.vercel.app/",
    isPublic: true,
    approvedPublicBudget: 55000,
    budgetLabel: "Actual Project Fee",
    adminPanelIncluded: true,
    includedAddonIds: ["supabase_db"],
    featured: true,
    clientConsentForBudget: true,
  },
  {
    id: "student-burgers-shawarmas",
    title: "Student Burgers & Shawarmas - Restaurant Website",
    category: "Restaurant web applications",
    shortDescription: "Restaurant website with a digital menu, WhatsApp ordering, and dine-in table QR access.",
    fullDescription: "A live restaurant website for Student Burgers & Shawarmas in Ramgarh, Lahore. Customers can browse its menu and student deals, order directly through WhatsApp, or scan a table QR code for dine-in. The project budget is PKR 65,000. The website uses a Vercel subdomain; a personal domain and its registration are not included.",
    imageUrl: "https://student-burgers-and-shawarmas.vercel.app/images/products/chicken-shawarma-s.webp",
    technologies: ["Next.js", "Responsive Web Design", "Digital Menu", "WhatsApp Ordering", "Dine-In Table QR"],
    status: "Live",
    demoUrl: "https://student-burgers-and-shawarmas.vercel.app/",
    isPublic: true,
    approvedPublicBudget: 65000,
    budgetLabel: "Project Budget",
    featured: true,
    clientConsentForBudget: true,
  },
];

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LEGACY_PORTFOLIO_IMAGE_URLS: Record<string, string> = {
  "student-burgers-shawarmas":
    "https://student-burgers-and-shawarmas.vercel.app/images/hero/hero-shawarma.webp",
};

export function mergePortfolioSeedProjects(
  savedProjects: PortfolioProject[],
  seedProjects: PortfolioProject[] = INITIAL_PORTFOLIO_PROJECTS
): PortfolioProject[] {
  const updatedSavedProjects = savedProjects.map((savedProject) => {
    const seedProject = seedProjects.find((project) => project.id === savedProject.id);
    if (
      !seedProject ||
      savedProject.imageUrl !== LEGACY_PORTFOLIO_IMAGE_URLS[savedProject.id]
    ) {
      return savedProject;
    }

    return { ...savedProject, imageUrl: seedProject.imageUrl };
  });
  const newSeedProjects = seedProjects.filter(
    (project) => !savedProjects.some((savedProject) => savedProject.id === project.id)
  );

  return [...newSeedProjects, ...updatedSavedProjects];
}

function getInitialData(): DatabaseSchema {
  const initialClients: Client[] = [];

  const initialProjects: Project[] = [];

  const initialInquiries: Inquiry[] = [];

  const initialPayments: PaymentRecord[] = [];

  const initialInvoices: Invoice[] = [];

  const initialReminders: PaymentReminder[] = [];

  const initialAuditLogs: AuditLog[] = [];

  const initialSettings: SystemSettings = {
    businessName: "Durrani Web Developers",
    businessEmail: "durraniwebdevelopers@gmail.com",
    businessPhone: "03054359098",
    currency: "PKR",
    enablePublicBudgetDisplay: true,
    reminderLeadDays: [7, 3, 0],
    emailSenderConfigured: false,
    whatsAppApiConfigured: false,
    autoRemindersEnabled: true,
  };

  return {
    inquiries: initialInquiries,
    calculatorLeads: [],
    projects: initialProjects,
    clients: initialClients,
    payments: initialPayments,
    invoices: initialInvoices,
    installments: [],
    reminders: initialReminders,
    portfolio: INITIAL_PORTFOLIO_PROJECTS,
    pricingConfig: DEFAULT_PRICING_CONFIG,
    settings: initialSettings,
    auditLogs: initialAuditLogs,
  };
}

export class DataStore {
  private static ensureDataFile(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        const initial = getInitialData();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
        return initial;
      }
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      console.error("Error reading database file, returning fallback initial data", err);
      return getInitialData();
    }
  }

  private static writeData(data: DatabaseSchema, propagateError = false): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing database file", err);
      if (propagateError) {
        throw err;
      }
    }
  }

  // Inquiries
  static getInquiries(): Inquiry[] {
    const data = this.ensureDataFile();
    return data.inquiries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getInquiryById(id: string): Inquiry | undefined {
    const data = this.ensureDataFile();
    return data.inquiries.find((i) => i.id.toUpperCase() === id.toUpperCase());
  }

  static createInquiry(inquiry: Inquiry): Inquiry {
    const data = this.ensureDataFile();
    data.inquiries.unshift(inquiry);
    this.addAuditLog({
      action: "INQUIRY_CREATED",
      actor: inquiry.customerName,
      targetType: "inquiry",
      targetId: inquiry.id,
      details: `New inquiry submitted for estimated ${inquiry.calculation.estimatedTotal} PKR.`,
    }, data);
    this.writeData(data, true);
    return inquiry;
  }

  static updateInquiry(id: string, updates: Partial<Inquiry>, actor: string = "Admin"): Inquiry | null {
    const data = this.ensureDataFile();
    const idx = data.inquiries.findIndex((i) => i.id.toUpperCase() === id.toUpperCase());
    if (idx === -1) return null;

    data.inquiries[idx] = {
      ...data.inquiries[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addAuditLog({
      action: "INQUIRY_UPDATED",
      actor,
      targetType: "inquiry",
      targetId: id,
      details: `Inquiry status changed or details updated. Status: ${data.inquiries[idx].status}`,
    }, data);

    this.writeData(data);
    return data.inquiries[idx];
  }

  static getCalculatorLeads(): CalculatorLead[] {
    const data = this.ensureDataFile();
    return [...(data.calculatorLeads || [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static getCalculatorLeadById(id: string): CalculatorLead | undefined {
    const data = this.ensureDataFile();
    return (data.calculatorLeads || []).find((lead) => lead.id === id);
  }

  static createCalculatorLead(lead: CalculatorLead): CalculatorLead {
    const data = this.ensureDataFile();
    data.calculatorLeads = data.calculatorLeads || [];
    data.calculatorLeads.unshift(lead);
    this.addAuditLog({
      action: "CALCULATOR_LEAD_CREATED",
      actor: "Prospective client",
      targetType: "calculator-lead",
      targetId: lead.id,
      details: `Consented calculator lead saved. Goal: ${lead.goal}; estimate: ${lead.recommendation.calculation.estimatedTotal} ${lead.currency}.`,
    }, data);
    this.writeData(data, true);
    return lead;
  }

  static updateCalculatorLead(
    id: string,
    updates: Partial<CalculatorLead>,
    actor = "Admin"
  ): CalculatorLead | null {
    const data = this.ensureDataFile();
    data.calculatorLeads = data.calculatorLeads || [];
    const index = data.calculatorLeads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;

    data.calculatorLeads[index] = {
      ...data.calculatorLeads[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.addAuditLog({
      action: "CALCULATOR_LEAD_UPDATED",
      actor,
      targetType: "calculator-lead",
      targetId: id,
      details: `Calculator lead updated. Status: ${data.calculatorLeads[index].status}.`,
    }, data);
    this.writeData(data, true);
    return data.calculatorLeads[index];
  }

  // Projects
  static getProjects(): Project[] {
    const data = this.ensureDataFile();
    return data.projects.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getProjectById(id: string): Project | undefined {
    const data = this.ensureDataFile();
    return data.projects.find((p) => p.id === id);
  }

  static createProject(project: Project, actor: string = "Admin"): Project {
    const data = this.ensureDataFile();
    data.projects.unshift(project);
    this.addAuditLog({
      action: "PROJECT_CREATED",
      actor,
      targetType: "project",
      targetId: project.id,
      details: `Project "${project.name}" approved and created for client ${project.clientName}. Total: PKR ${project.approvedPrice}.`,
    }, data);
    this.writeData(data);
    return project;
  }

  static updateProject(id: string, updates: Partial<Project>, actor: string = "Admin"): Project | null {
    const data = this.ensureDataFile();
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    data.projects[idx] = {
      ...data.projects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addAuditLog({
      action: "PROJECT_UPDATED",
      actor,
      targetType: "project",
      targetId: id,
      details: `Project "${data.projects[idx].name}" updated. Status: ${data.projects[idx].status}`,
    }, data);

    this.writeData(data);
    return data.projects[idx];
  }

  // Clients
  static getClients(): Client[] {
    const data = this.ensureDataFile();
    return data.clients.filter((c) => !c.archived);
  }

  static getAllClientsIncludingArchived(): Client[] {
    const data = this.ensureDataFile();
    return data.clients;
  }

  static getClientById(id: string): Client | undefined {
    const data = this.ensureDataFile();
    return data.clients.find((c) => c.id === id);
  }

  static createClient(client: Client, actor: string = "Admin"): Client {
    const data = this.ensureDataFile();
    data.clients.unshift(client);
    this.addAuditLog({
      action: "CLIENT_CREATED",
      actor,
      targetType: "client",
      targetId: client.id,
      details: `Client "${client.name}" (${client.businessName}) registered.`,
    }, data);
    this.writeData(data);
    return client;
  }

  static createClientWithProject(
    client: Client,
    project: Project,
    installments: InstallmentScheduleItem[],
    initialPayment?: PaymentRecord,
    actor: string = "Admin"
  ): { client: Client; project: Project } {
    const data = this.ensureDataFile();
    data.clients.unshift(client);
    data.projects.unshift(project);
    data.installments = [...installments, ...(data.installments || [])];
    if (initialPayment) data.payments.unshift(initialPayment);

    this.addAuditLog({
      action: "CLIENT_CREATED",
      actor,
      targetType: "client",
      targetId: client.id,
      details: `Client "${client.name}" (${client.businessName}) registered with project "${project.name}" at PKR ${project.approvedPrice}.`,
    }, data);
    this.addAuditLog({
      action: "PROJECT_CREATED",
      actor,
      targetType: "project",
      targetId: project.id,
      details: `Project "${project.name}" created for client ${client.name}. Total: PKR ${project.approvedPrice}.`,
    }, data);
    if (initialPayment) {
      this.addAuditLog({
        action: "PAYMENT_RECORDED",
        actor,
        targetType: "payment",
        targetId: initialPayment.id,
        details: `Initial advance of PKR ${initialPayment.amount} recorded for project "${project.name}".`,
      }, data);
    }

    this.writeData(data, true);
    return { client, project };
  }

  static updateClient(id: string, updates: Partial<Client>, actor: string = "Admin"): Client | null {
    const data = this.ensureDataFile();
    const idx = data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    data.clients[idx] = { ...data.clients[idx], ...updates };
    this.addAuditLog({
      action: "CLIENT_UPDATED",
      actor,
      targetType: "client",
      targetId: id,
      details: `Client "${data.clients[idx].name}" details updated.`,
    }, data);
    this.writeData(data);
    return data.clients[idx];
  }

  // Payments
  static getPayments(): PaymentRecord[] {
    const data = this.ensureDataFile();
    return data.payments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static recordPayment(payment: PaymentRecord, actor: string = "Admin"): PaymentRecord {
    const data = this.ensureDataFile();
    data.payments.unshift(payment);

    // If verified, update project and client finances
    if (payment.status === "Paid" && payment.verifiedByAdmin) {
      const proj = data.projects.find((p) => p.id === payment.projectId);
      if (proj) {
        proj.advanceReceived = (proj.advanceReceived || 0) + payment.amount;
        proj.remainingBalance = Math.max(0, proj.approvedPrice - proj.advanceReceived);
      }
      const cli = data.clients.find((c) => c.id === payment.clientId);
      if (cli) {
        cli.totalPaid = (cli.totalPaid || 0) + payment.amount;
        cli.outstandingBalance = Math.max(0, (cli.totalBilled || 0) - cli.totalPaid);
      }
    }

    this.addAuditLog({
      action: "PAYMENT_RECORDED",
      actor,
      targetType: "payment",
      targetId: payment.id,
      details: `Payment of PKR ${payment.amount} recorded via ${payment.method} (Ref: ${payment.transactionRef}). Status: ${payment.status}`,
    }, data);

    this.writeData(data);
    return payment;
  }

  static verifyPayment(
    id: string,
    verified: boolean,
    status: PaymentRecord["status"],
    actor: string = "Admin",
    verificationNote = ""
  ): PaymentRecord | null {
    const data = this.ensureDataFile();
    const idx = data.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const previousStatus = data.payments[idx].status;
    data.payments[idx].verifiedByAdmin = verified;
    data.payments[idx].status = status;
    if (verified && verificationNote.trim()) {
      data.payments[idx].adminNotes = `${data.payments[idx].adminNotes || ""}\nAdmin verification note: ${verificationNote.trim()}`.trim();
    }

    // Recalculate financial balances if transitioning to Paid
    if (status === "Paid" && previousStatus !== "Paid") {
      const payment = data.payments[idx];
      const proj = data.projects.find((p) => p.id === payment.projectId);
      if (proj) {
        proj.advanceReceived = (proj.advanceReceived || 0) + payment.amount;
        proj.remainingBalance = Math.max(0, proj.approvedPrice - proj.advanceReceived);
      }
      const cli = data.clients.find((c) => c.id === payment.clientId);
      if (cli) {
        cli.totalPaid = (cli.totalPaid || 0) + payment.amount;
        cli.outstandingBalance = Math.max(0, (cli.totalBilled || 0) - cli.totalPaid);
      }
    }

    this.addAuditLog({
      action: "PAYMENT_VERIFIED",
      actor,
      targetType: "payment",
      targetId: id,
      details: `Payment #${id} status changed to ${status} (Admin marked paid: ${verified}; verification note recorded: ${Boolean(verificationNote.trim())}).`,
    }, data);

    this.writeData(data);
    return data.payments[idx];
  }

  // Invoices
  static getInvoices(): Invoice[] {
    const data = this.ensureDataFile();
    return data.invoices.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getInvoiceById(id: string): Invoice | undefined {
    const data = this.ensureDataFile();
    return data.invoices.find((inv) => inv.id === id);
  }

  static createInvoice(invoice: Invoice, actor: string = "Admin"): Invoice {
    const data = this.ensureDataFile();
    data.invoices.unshift(invoice);
    this.addAuditLog({
      action: "INVOICE_GENERATED",
      actor,
      targetType: "invoice",
      targetId: invoice.id,
      details: `Invoice #${invoice.id} created for ${invoice.clientName} (Total: PKR ${invoice.totalDue}).`,
    }, data);
    this.writeData(data);
    return invoice;
  }

  // Portfolio
  static getPortfolio(includePrivate: boolean = false): PortfolioProject[] {
    const data = this.ensureDataFile();
    const portfolio = mergePortfolioSeedProjects(data.portfolio);
    if (includePrivate) return portfolio;
    return portfolio.filter((p) => p.isPublic);
  }

  static savePortfolioProject(project: PortfolioProject, actor: string = "Admin"): PortfolioProject {
    const data = this.ensureDataFile();
    const idx = data.portfolio.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      data.portfolio[idx] = project;
      this.addAuditLog({
        action: "PORTFOLIO_UPDATED",
        actor,
        targetType: "project",
        targetId: project.id,
        details: `Portfolio item "${project.title}" updated. Visibility: ${project.isPublic ? "Public" : "Private"}.`,
      }, data);
    } else {
      data.portfolio.unshift(project);
      this.addAuditLog({
        action: "PORTFOLIO_CREATED",
        actor,
        targetType: "project",
        targetId: project.id,
        details: `New portfolio item "${project.title}" created.`,
      }, data);
    }
    this.writeData(data);
    return project;
  }

  // Pricing configuration
  static getPricingConfig(): PricingRuleConfig {
    const data = this.ensureDataFile();
    return mergePricingConfigWithDefaults(data.pricingConfig);
  }

  static updatePricingConfig(config: PricingRuleConfig, actor: string = "Admin"): PricingRuleConfig {
    const data = this.ensureDataFile();
    const mergedConfig = mergePricingConfigWithDefaults(config);
    data.pricingConfig = mergedConfig;
    this.addAuditLog({
      action: "PRICING_RULES_UPDATED",
      actor,
      targetType: "pricing",
      targetId: "config",
      details: `Pricing rules updated. Base without admin: PKR ${mergedConfig.baseWithoutAdmin}, Base with admin: PKR ${mergedConfig.baseWithAdmin}.`,
    }, data);
    this.writeData(data);
    return mergedConfig;
  }

  // Reminders
  static getReminders(): PaymentReminder[] {
    const data = this.ensureDataFile();
    return data.reminders;
  }

  static saveReminder(reminder: PaymentReminder, actor: string = "Admin"): PaymentReminder {
    const data = this.ensureDataFile();
    const idx = data.reminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) {
      data.reminders[idx] = reminder;
    } else {
      data.reminders.unshift(reminder);
    }
    this.addAuditLog({
      action: "REMINDER_SAVED",
      actor,
      targetType: "reminder",
      targetId: reminder.id,
      details: `Reminder status: ${reminder.status} for project ${reminder.projectName}.`,
    }, data);
    this.writeData(data);
    return reminder;
  }

  // Audit logs
  static getAuditLogs(): AuditLog[] {
    const data = this.ensureDataFile();
    return data.auditLogs.slice(0, 100);
  }

  private static addAuditLog(
    log: Omit<AuditLog, "id" | "timestamp">,
    data: DatabaseSchema
  ): void {
    const entry: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    data.auditLogs.unshift(entry);
    if (data.auditLogs.length > 250) {
      data.auditLogs = data.auditLogs.slice(0, 250);
    }
  }

  // System settings
  static getSettings(): SystemSettings {
    const data = this.ensureDataFile();
    return data.settings;
  }

  static updateSettings(settings: Partial<SystemSettings>, actor: string = "Admin"): SystemSettings {
    const data = this.ensureDataFile();
    data.settings = { ...data.settings, ...settings };
    this.addAuditLog({
      action: "SETTINGS_UPDATED",
      actor,
      targetType: "auth",
      targetId: "system",
      details: "System settings modified.",
    }, data);
    this.writeData(data);
    return data.settings;
  }
}
