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
} from "./types";
import { DEFAULT_PRICING_CONFIG, calculateBudget } from "./constants";

interface DatabaseSchema {
  inquiries: Inquiry[];
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

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function getInitialData(): DatabaseSchema {
  const initialPortfolio: PortfolioProject[] = [
    {
      id: "port-1",
      title: "SpiceCraft - Restaurant Web App & Online Ordering",
      category: "Restaurant web applications",
      shortDescription: "Complete digital dining portal with table reservations, live kitchen order dispatch, and mobile menu.",
      fullDescription: "A full-featured restaurant web application featuring dynamic categorised menus, real-time cart, customizable pizza and burger toppings, automated delivery fee calculation, and instant WhatsApp order notifications to the kitchen.",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "WhatsApp API"],
      status: "Live",
      demoUrl: "https://spicecraft-demo.vercel.app",
      isPublic: true,
      approvedPublicBudget: 45000,
      budgetLabel: "Starting Package with Admin Panel",
      featured: true,
      clientConsentForBudget: true,
    },
    {
      id: "port-2",
      title: "Lumina Jewels - Luxury Showcase & Catalog",
      category: "Jewellery stores",
      shortDescription: "High-end bespoke jewellery showroom with 360-degree item views, carat selector, and quote requests.",
      fullDescription: "Designed for premium jewellers featuring gold rate ticker integration, diamond cut filters, secure inquiry submission, and private VIP client lookbooks.",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
      technologies: ["Next.js", "Tailwind CSS", "Cloudflare Images", "PostgreSQL"],
      status: "Completed",
      demoUrl: "https://lumina-jewels-preview.vercel.app",
      isPublic: true,
      approvedPublicBudget: 55000,
      budgetLabel: "Custom Catalog & Quote System",
      featured: true,
      clientConsentForBudget: true,
    },
    {
      id: "port-3",
      title: "GlowAura - Organic Beauty & Cosmetic Store",
      category: "Cosmetic and beauty stores",
      shortDescription: "Fast e-commerce storefront for skincare with skin-quiz matching, reviews, and bundle builder.",
      fullDescription: "A high-conversion cosmetics store with fast loading speed, shade selector, customer reviews, checkout integration with JazzCash/EasyPaisa, and stock tracking.",
      imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
      technologies: ["React", "Next.js", "Tailwind CSS", "JazzCash API"],
      status: "Live",
      demoUrl: "https://glowaura-cosmetics.vercel.app",
      isPublic: true,
      approvedPublicBudget: 45000,
      budgetLabel: "E-Commerce with Admin Panel",
      featured: false,
      clientConsentForBudget: true,
    },
    {
      id: "port-4",
      title: "UrbanVogue - Modern Fashion Apparel",
      category: "Fashion stores",
      shortDescription: "Trendsetting fashion boutique app with size guides, multi-currency display, and flash sales.",
      fullDescription: "Clean, editorial layout with mobile-first browsing, automated inventory alerts, coupon engine, and real-time order tracking for apparel brands.",
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      technologies: ["Next.js", "Tailwind CSS", "Stripe / Local Gateways"],
      status: "Live",
      demoUrl: "https://urbanvogue-app.vercel.app",
      isPublic: true,
      approvedPublicBudget: 65000,
      budgetLabel: "Advanced E-Commerce Store",
      featured: true,
      clientConsentForBudget: true,
    },
    {
      id: "port-5",
      title: "FreshBasket - Express Hyperlocal Grocery",
      category: "Grocery stores",
      shortDescription: "Instant grocery delivery web application with pin-code availability check and schedule picker.",
      fullDescription: "Built for local supermarkets with barcode inventory lookup, bulk discounting, delivery slot booking, and thermal receipt printing format.",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
      status: "Completed",
      demoUrl: "https://freshbasket-grocer.vercel.app",
      isPublic: true,
      approvedPublicBudget: 55000,
      budgetLabel: "Inventory & Ordering App",
      featured: false,
      clientConsentForBudget: true,
    },
    {
      id: "port-6",
      title: "PulseSync - Multi-Tenant SaaS Client Manager",
      category: "SaaS applications",
      shortDescription: "Cloud SaaS portal for service agencies to manage clients, invoices, milestones, and deliverables.",
      fullDescription: "Comprehensive SaaS solution featuring multi-tenant workspace isolation, subscription billing, client messaging, automated milestone reminders, and role-based permissions.",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase PostgreSQL", "Vercel Cron"],
      status: "Live",
      demoUrl: "https://pulsesync-saas.vercel.app",
      isPublic: true,
      approvedPublicBudget: 75000,
      budgetLabel: "Enterprise SaaS Application",
      featured: true,
      clientConsentForBudget: true,
    },
  ];

  const initialClients: Client[] = [
    {
      id: "cli-101",
      name: "Hamza Tariq",
      businessName: "SpiceCraft Grill House",
      email: "hamza@spicecraft.pk",
      phone: "03001234567",
      cityCountry: "Lahore, Pakistan",
      notes: "Met via WhatsApp referral. Needs monthly maintenance checks on delivery integrations.",
      createdAt: "2026-08-10T10:00:00Z",
      archived: false,
      totalProjects: 1,
      totalBilled: 45000,
      totalPaid: 45000,
      outstandingBalance: 0,
    },
    {
      id: "cli-102",
      name: "Farhan Durrani",
      businessName: "Lumina Jewels International",
      email: "farhan@luminajewels.com",
      phone: "03219876543",
      cityCountry: "Karachi, Pakistan",
      notes: "Opted for 12-month installment plan. Always pays promptly around the 5th of each month.",
      createdAt: "2026-09-01T14:30:00Z",
      archived: false,
      totalProjects: 1,
      totalBilled: 55000,
      totalPaid: 20000,
      outstandingBalance: 35000,
    },
    {
      id: "cli-103",
      name: "Ayesha Malik",
      businessName: "GlowAura Beauty Lab",
      email: "ayesha@glowaura.pk",
      phone: "03335558899",
      cityCountry: "Islamabad, Pakistan",
      notes: "Requested JazzCash integration. In progress of testing product variants.",
      createdAt: "2026-10-02T11:15:00Z",
      archived: false,
      totalProjects: 1,
      totalBilled: 45000,
      totalPaid: 10000,
      outstandingBalance: 35000,
    },
  ];

  const initialProjects: Project[] = [
    {
      id: "proj-201",
      clientId: "cli-101",
      clientName: "Hamza Tariq",
      clientEmail: "hamza@spicecraft.pk",
      clientPhone: "03001234567",
      name: "SpiceCraft Ordering System",
      category: "Restaurant web applications",
      description: "Online table reservation and menu ordering with custom toppings and kitchen notifications.",
      approvedPrice: 45000,
      advanceRequired: 10000,
      advanceReceived: 10000,
      remainingBalance: 0,
      status: "Completed",
      deliveryTimeline: "3 Weeks",
      deploymentUrl: "https://spicecraft-demo.vercel.app",
      selectedFeatures: ["Admin Panel", "Google Auth", "Supabase DB", "WhatsApp Orders"],
      adminNotes: "Fully delivered and accepted. Client satisfied.",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-09-05T18:00:00Z",
    },
    {
      id: "proj-202",
      clientId: "cli-102",
      clientName: "Farhan Durrani",
      clientEmail: "farhan@luminajewels.com",
      clientPhone: "03219876543",
      name: "Lumina Jewels Digital Showroom",
      category: "Jewellery stores",
      description: "Exclusive jewellery showcase with gold rate calculation and custom quote builder.",
      approvedPrice: 55000,
      advanceRequired: 10000,
      advanceReceived: 10000,
      remainingBalance: 35000,
      status: "In Development",
      deliveryTimeline: "4 Weeks",
      deploymentUrl: "https://lumina-jewels-preview.vercel.app",
      selectedFeatures: ["Admin Panel", "Supabase DB", "Custom Feature", "Analytics Dashboard"],
      adminNotes: "Milestone 2 frontend delivered. Working on real-time price calculator.",
      createdAt: "2026-09-02T09:00:00Z",
      updatedAt: "2026-10-10T14:00:00Z",
    },
    {
      id: "proj-203",
      clientId: "cli-103",
      clientName: "Ayesha Malik",
      clientEmail: "ayesha@glowaura.pk",
      clientPhone: "03335558899",
      name: "GlowAura Skincare Store",
      category: "Cosmetic and beauty stores",
      description: "Beauty e-commerce store with shade match questionnaire and JazzCash checkout.",
      approvedPrice: 45000,
      advanceRequired: 10000,
      advanceReceived: 10000,
      remainingBalance: 35000,
      status: "Testing",
      deliveryTimeline: "2.5 Weeks",
      selectedFeatures: ["Admin Panel", "Payment Gateway", "Product Variants", "Cart & Checkout"],
      adminNotes: "Testing checkout flow with sandbox JazzCash accounts.",
      createdAt: "2026-10-03T12:00:00Z",
      updatedAt: "2026-10-14T16:00:00Z",
    },
  ];

  const initialInquiries: Inquiry[] = [
    {
      id: "DW-948210",
      createdAt: "2026-10-14T08:30:00Z",
      updatedAt: "2026-10-14T08:30:00Z",
      status: "New Inquiry",
      customerName: "Bilal Ashraf",
      businessName: "Royal Cutlery & Kitchenware",
      email: "bilal@royalcutlery.pk",
      phone: "03124455667",
      cityCountry: "Gujranwala, Pakistan",
      preferredContact: "whatsapp",
      customerIntro: "We are an established export manufacturer expanding into domestic direct-to-consumer sales.",
      projectTypes: ["E-commerce store", "Inventory system"],
      problemToSolve: "We need a clean website where wholesale and retail customers can see live stock and place bulk orders.",
      targetAudience: "Home chefs, hotels, and restaurant kitchen procurement managers.",
      productsServices: "Stainless steel pots, cutlery sets, knife blocks, and kitchen gadgets.",
      inspirationUrl: "https://zwilling.com",
      isNewOrUpgrade: "new",
      preferredLaunchDate: "Within 4 weeks",
      expectedBudgetRange: "PKR 50,000 - 70,000",
      displayFixedOnly: false,
      needsProductCatalog: true,
      productFeatures: ["categories", "variants", "stock", "images", "pricing"],
      acceptOrdersOnline: true,
      orderFeatures: ["cart", "checkout", "coupons", "delivery_fees"],
      needsReviewsOrAccounts: true,
      adminPanelType: "client_admin",
      adminFeatures: ["products", "orders", "stock", "customers", "payments", "reports"],
      selectedAddons: ["supabase_db", "payment_gateway", "advanced_dashboard"],
      customFeatureNotes: "Would like tiered discounts for orders exceeding 50 units.",
      calculation: calculateBudget("client_admin", ["supabase_db", "payment_gateway", "advanced_dashboard"]),
      disclaimerAccepted: true,
      adminNotes: "High-value inquiry. Need to discuss bulk tiering logic on WhatsApp call.",
    },
    {
      id: "DW-839102",
      createdAt: "2026-10-12T15:20:00Z",
      updatedAt: "2026-10-13T10:00:00Z",
      status: "Contacted",
      customerName: "Dr. Samina Khan",
      businessName: "DermaGlow Aesthetic Clinic",
      email: "info@dermaglow.pk",
      phone: "03451122334",
      cityCountry: "Rawalpindi, Pakistan",
      preferredContact: "whatsapp",
      customerIntro: "Skin clinic seeking online consultation and treatment package booking.",
      projectTypes: ["Booking system", "Custom web application"],
      problemToSolve: "Patients currently call reception; reception is overwhelmed with scheduling appointments.",
      targetAudience: "Clinic patients booking skin treatments and consultations.",
      productsServices: "Aesthetic services, consultations, skincare serum packages.",
      inspirationUrl: "",
      isNewOrUpgrade: "new",
      preferredLaunchDate: "As soon as possible",
      expectedBudgetRange: "PKR 45,000 - 55,000",
      displayFixedOnly: false,
      needsProductCatalog: false,
      productFeatures: [],
      acceptOrdersOnline: true,
      orderFeatures: ["checkout"],
      needsReviewsOrAccounts: true,
      adminPanelType: "client_admin",
      adminFeatures: ["orders", "customers", "notifications"],
      selectedAddons: ["google_auth", "supabase_db"],
      calculation: calculateBudget("client_admin", ["google_auth", "supabase_db"]),
      disclaimerAccepted: true,
      adminNotes: "Discussed on WhatsApp. Sending final scope proposal by tomorrow.",
    },
  ];

  const initialPayments: PaymentRecord[] = [
    {
      id: "pay-501",
      projectId: "proj-201",
      projectName: "SpiceCraft Ordering System",
      clientId: "cli-101",
      clientName: "Hamza Tariq",
      amount: 10000,
      method: "Bank Transfer",
      transactionRef: "HBL-TRX-9823190",
      paymentDate: "2026-08-12T11:00:00Z",
      status: "Paid",
      verifiedByAdmin: true,
      adminNotes: "Advance payment verified via bank statement.",
      createdAt: "2026-08-12T11:05:00Z",
    },
    {
      id: "pay-502",
      projectId: "proj-201",
      projectName: "SpiceCraft Ordering System",
      clientId: "cli-101",
      clientName: "Hamza Tariq",
      amount: 35000,
      method: "Bank Transfer",
      transactionRef: "HBL-TRX-9948211",
      paymentDate: "2026-09-05T17:30:00Z",
      status: "Paid",
      verifiedByAdmin: true,
      adminNotes: "Final milestone payment upon delivery.",
      createdAt: "2026-09-05T17:35:00Z",
    },
    {
      id: "pay-503",
      projectId: "proj-202",
      projectName: "Lumina Jewels Digital Showroom",
      clientId: "cli-102",
      clientName: "Farhan Durrani",
      amount: 10000,
      method: "JazzCash",
      transactionRef: "JC-88291039",
      paymentDate: "2026-09-02T10:00:00Z",
      status: "Paid",
      verifiedByAdmin: true,
      adminNotes: "Project advance received.",
      createdAt: "2026-09-02T10:05:00Z",
    },
    {
      id: "pay-504",
      projectId: "proj-202",
      projectName: "Lumina Jewels Digital Showroom",
      clientId: "cli-102",
      clientName: "Farhan Durrani",
      amount: 10000,
      method: "Easypaisa",
      transactionRef: "EP-44910283",
      paymentDate: "2026-10-04T12:00:00Z",
      status: "Paid",
      verifiedByAdmin: true,
      adminNotes: "Installment #1 paid.",
      createdAt: "2026-10-04T12:05:00Z",
    },
    {
      id: "pay-505",
      projectId: "proj-203",
      projectName: "GlowAura Skincare Store",
      clientId: "cli-103",
      clientName: "Ayesha Malik",
      amount: 10000,
      method: "Easypaisa",
      transactionRef: "EP-91823711",
      paymentDate: "2026-10-03T14:00:00Z",
      status: "Paid",
      verifiedByAdmin: true,
      adminNotes: "Project advance received.",
      createdAt: "2026-10-03T14:10:00Z",
    },
  ];

  const initialInvoices: Invoice[] = [
    {
      id: "INV-2026-001",
      projectId: "proj-201",
      projectName: "SpiceCraft Ordering System",
      clientId: "cli-101",
      clientName: "Hamza Tariq",
      clientEmail: "hamza@spicecraft.pk",
      clientPhone: "03001234567",
      clientBusiness: "SpiceCraft Grill House",
      invoiceDate: "2026-08-12",
      dueDate: "2026-09-05",
      items: [
        { description: "Base Web Application Development with Client Admin Panel Support", amount: 45000 },
      ],
      subtotal: 45000,
      advanceDeduction: 10000,
      totalDue: 45000,
      amountPaid: 45000,
      remainingBalance: 0,
      paymentMethod: "Bank Transfer (HBL)",
      status: "Paid",
      termsAndNotes: "Thank you for choosing Durrani Web Developers. Application delivered and running smoothly on Vercel.",
      scheduleSummary: "Advance PKR 10,000 + Final Delivery Balance PKR 35,000 paid in full.",
      createdAt: "2026-08-12T10:00:00Z",
    },
    {
      id: "INV-2026-002",
      projectId: "proj-202",
      projectName: "Lumina Jewels Digital Showroom",
      clientId: "cli-102",
      clientName: "Farhan Durrani",
      clientEmail: "farhan@luminajewels.com",
      clientPhone: "03219876543",
      clientBusiness: "Lumina Jewels International",
      invoiceDate: "2026-09-02",
      dueDate: "2026-10-05",
      items: [
        { description: "Web Application with Client Admin Panel Support", amount: 45000 },
        { description: "Supabase Database & Real-Time Gold API Integration", amount: 10000 },
      ],
      subtotal: 55000,
      advanceDeduction: 10000,
      totalDue: 55000,
      amountPaid: 20000,
      remainingBalance: 35000,
      paymentMethod: "JazzCash / Easypaisa",
      status: "Partially Paid",
      termsAndNotes: "Remaining balance spread across 11 monthly installments of PKR 3,181.82. Payment due by 5th of each month.",
      scheduleSummary: "Advance PKR 10,000 (Paid) + Installment 1 PKR 10,000 (Paid). Remaining: PKR 35,000.",
      createdAt: "2026-09-02T10:00:00Z",
    },
  ];

  const initialReminders: PaymentReminder[] = [
    {
      id: "rem-101",
      projectId: "proj-202",
      projectName: "Lumina Jewels Digital Showroom",
      clientId: "cli-102",
      clientName: "Farhan Durrani",
      clientPhone: "03219876543",
      clientEmail: "farhan@luminajewels.com",
      installmentNumber: 2,
      amount: 3181.82,
      dueDate: "2026-11-05",
      reminderType: "7_days_before",
      channel: "whatsapp",
      scheduledDate: "2026-10-29",
      status: "Scheduled",
      messageText: "Dear Farhan Durrani, your next monthly installment of PKR 3,181.82 for Lumina Jewels Digital Showroom is scheduled for 05 Nov 2026. Please let us know once transferred.",
    },
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: "log-1",
      action: "SYSTEM_INITIALIZED",
      actor: "System Administrator",
      targetType: "auth",
      targetId: "admin",
      details: "Durrani Web Developers platform system initialized with default pricing models and portfolio showcase.",
      timestamp: "2026-10-15T09:00:00Z",
    },
  ];

  const initialSettings: SystemSettings = {
    businessName: "Durrani Web Developers",
    businessEmail: "durraniwebdevelopers@gmail.com",
    businessPhone: "03299669565",
    currency: "PKR",
    enablePublicBudgetDisplay: true,
    reminderLeadDays: [7, 3, 0],
    emailSenderConfigured: false,
    whatsAppApiConfigured: false,
    autoRemindersEnabled: true,
  };

  return {
    inquiries: initialInquiries,
    projects: initialProjects,
    clients: initialClients,
    payments: initialPayments,
    invoices: initialInvoices,
    installments: [],
    reminders: initialReminders,
    portfolio: initialPortfolio,
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

  private static writeData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing database file", err);
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
    this.writeData(data);
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

  static verifyPayment(id: string, verified: boolean, status: PaymentRecord["status"], actor: string = "Admin"): PaymentRecord | null {
    const data = this.ensureDataFile();
    const idx = data.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const previousStatus = data.payments[idx].status;
    data.payments[idx].verifiedByAdmin = verified;
    data.payments[idx].status = status;

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
      details: `Payment #${id} status changed to ${status} (Verified: ${verified}).`,
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
    if (includePrivate) return data.portfolio;
    return data.portfolio.filter((p) => p.isPublic);
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
    return data.pricingConfig || DEFAULT_PRICING_CONFIG;
  }

  static updatePricingConfig(config: PricingRuleConfig, actor: string = "Admin"): PricingRuleConfig {
    const data = this.ensureDataFile();
    data.pricingConfig = config;
    this.addAuditLog({
      action: "PRICING_RULES_UPDATED",
      actor,
      targetType: "pricing",
      targetId: "config",
      details: `Pricing rules updated. Base without admin: PKR ${config.baseWithoutAdmin}, Base with admin: PKR ${config.baseWithAdmin}.`,
    }, data);
    this.writeData(data);
    return config;
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
