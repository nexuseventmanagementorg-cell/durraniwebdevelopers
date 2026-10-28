import type { AddonOption } from "./types";

export type BusinessAddonLevel = "basic" | "expanded" | "complex";

export interface BusinessCategory {
  id: string;
  label: string;
  businessTypes: { id: string; label: string }[];
}

interface BusinessAddonDefinition {
  id: string;
  label: string;
  description: string;
  categoryId: string;
  level: BusinessAddonLevel;
  price?: number;
  existingAddonId?: string;
  businessTypes?: string[];
  relatedAddOnIds?: string[];
  requiresCustomQuote?: boolean;
}

const categories: BusinessCategory[] = [
  { id: "ecommerce-retail", label: "E-Commerce & Retail", businessTypes: [
    { id: "online-retailer", label: "Online Retailer" }, { id: "fashion-store", label: "Fashion & Apparel Store" },
    { id: "grocery-store", label: "Grocery Store" }, { id: "electronics-store", label: "Electronics Store" },
    { id: "online-marketplace", label: "Online Marketplace" },
  ] },
  { id: "food-hospitality", label: "Food & Hospitality", businessTypes: [
    { id: "restaurant", label: "Restaurant" }, { id: "cafe", label: "Cafe" },
    { id: "hotel", label: "Hotel & Guesthouse" }, { id: "catering", label: "Catering Business" },
    { id: "bakery", label: "Bakery & Food Shop" },
  ] },
  { id: "health-wellness-beauty", label: "Health, Wellness & Beauty", businessTypes: [
    { id: "clinic", label: "Clinic & Medical Practice" }, { id: "salon", label: "Salon & Spa" },
    { id: "fitness-studio", label: "Fitness Studio" }, { id: "wellness-coach", label: "Wellness Practitioner" },
    { id: "dental-practice", label: "Dental Practice" },
  ] },
  { id: "professional-services", label: "Professional Services", businessTypes: [
    { id: "legal-firm", label: "Legal Firm" }, { id: "consultancy", label: "Consultancy" },
    { id: "accounting-firm", label: "Accounting Firm" }, { id: "recruitment-agency", label: "Recruitment Agency" },
    { id: "creative-agency", label: "Professional Agency" },
  ] },
  { id: "education-elearning", label: "Education & E-Learning", businessTypes: [
    { id: "school", label: "School" }, { id: "online-academy", label: "Online Academy" },
    { id: "training-center", label: "Training Center" }, { id: "university", label: "College & University" },
    { id: "tutoring", label: "Tutoring Service" },
  ] },
  { id: "home-construction", label: "Home Services & Construction", businessTypes: [
    { id: "contractor", label: "Construction Contractor" }, { id: "home-repair", label: "Home Repair Service" },
    { id: "cleaning-service", label: "Cleaning Service" }, { id: "landscaping", label: "Landscaping Service" },
    { id: "equipment-rental", label: "Equipment Rental" },
  ] },
  { id: "technology-digital", label: "Technology & Digital", businessTypes: [
    { id: "saas-company", label: "SaaS Company" }, { id: "software-agency", label: "Software Agency" },
    { id: "hosting-provider", label: "Hosting Provider" }, { id: "it-consultancy", label: "IT Consultancy" },
    { id: "digital-agency", label: "Digital Agency" },
  ] },
  { id: "real-estate-propertytech", label: "Real Estate & PropertyTech", businessTypes: [
    { id: "real-estate-agency", label: "Real Estate Agency" }, { id: "property-manager", label: "Property Manager" },
    { id: "landlord", label: "Landlord & Rental Owner" }, { id: "property-developer", label: "Property Developer" },
    { id: "short-term-rental", label: "Short-Term Rental Operator" },
  ] },
  { id: "entertainment-events", label: "Entertainment, Events & Leisure", businessTypes: [
    { id: "event-venue", label: "Event Venue" }, { id: "wedding-planner", label: "Wedding Planner" },
    { id: "ticketed-events", label: "Ticketed Event Organizer" }, { id: "tour-operator", label: "Tour & Travel Operator" },
    { id: "photographer", label: "Photography Business" },
  ] },
  { id: "niche-specialized", label: "Niche & Specialized Businesses", businessTypes: [
    { id: "nonprofit", label: "Nonprofit & Charity" }, { id: "courier", label: "Courier & Logistics" },
    { id: "pet-services", label: "Pet Services" }, { id: "laundry-service", label: "Laundry Service" },
    { id: "agriculture", label: "Agriculture & Farming" },
    { id: "vehicle-rental", label: "Vehicle Rental & Fleet" },
  ] },
];

const types = Object.fromEntries(
  categories.map((category) => [category.id, category.businessTypes.map((type) => type.id)])
) as Record<string, string[]>;

const definition = (
  categoryId: string,
  level: BusinessAddonLevel,
  id: string,
  label: string,
  description: string,
  price: number,
  businessTypes?: string[],
  requiresCustomQuote = false,
): BusinessAddonDefinition => ({
  id, label, description, categoryId, level, price,
  businessTypes: businessTypes || types[categoryId],
  ...(requiresCustomQuote ? { requiresCustomQuote: true } : {}),
});

const reuse = (
  categoryId: string,
  level: BusinessAddonLevel,
  existingAddonId: string,
  businessTypes?: string[],
): BusinessAddonDefinition => ({
  id: existingAddonId,
  label: existingAddonId,
  description: "",
  categoryId,
  level,
  existingAddonId,
  businessTypes: businessTypes || types[categoryId],
});

const definitions: BusinessAddonDefinition[] = [
  definition("ecommerce-retail", "basic", "product_badges_labels", "Product Badges & Labels", "Add configurable promotional, stock, and product-information badges to product cards.", 12000),
  reuse("ecommerce-retail", "basic", "advanced_product_management"),
  definition("ecommerce-retail", "basic", "back_in_stock_notifications", "Back-in-Stock Notifications", "Let shoppers request and receive a notification when a selected out-of-stock item is available again.", 18000),
  definition("ecommerce-retail", "basic", "gift_message_option", "Gift Message Option", "Collect an optional gift note at checkout and show it with the order for fulfillment.", 12000),
  definition("ecommerce-retail", "basic", "store_announcement_bar", "Store Announcement Bar", "Manage a dismissible store-wide announcement with a link and optional schedule.", 10000),
  definition("ecommerce-retail", "expanded", "product_bundles", "Product Bundles", "Create curated product bundles with bundle pricing and inventory-aware order records.", 35000),
  definition("ecommerce-retail", "expanded", "returns_exchanges_workflow", "Returns & Exchanges Workflow", "Capture return requests, review decisions, exchange selections, and status updates.", 50000),
  definition("ecommerce-retail", "expanded", "supplier_purchase_orders", "Supplier Purchase Orders", "Create supplier records and purchase orders with item quantities, status, and receiving notes.", 45000),
  definition("ecommerce-retail", "expanded", "personalized_product_options", "Personalized Product Options", "Collect product-specific personalization such as text, choices, and customer-provided instructions.", 30000),
  reuse("ecommerce-retail", "expanded", "loyalty_rewards"),
  definition("ecommerce-retail", "complex", "pos_synchronization", "POS Synchronization", "Synchronize agreed product, price, and sales data with one supported point-of-sale provider.", 120000, undefined, true),
  definition("ecommerce-retail", "complex", "multi_store_inventory_orchestration", "Multi-Store Inventory Orchestration", "Coordinate stock movements, reservations, and availability across separately managed storefront locations.", 160000, undefined, true),
  definition("ecommerce-retail", "complex", "subscription_commerce", "Subscription Commerce", "Implement recurring product plans, renewal state, customer controls, and payment-provider integration.", 150000, undefined, true),
  definition("ecommerce-retail", "complex", "advanced_product_configurator", "Advanced Product Configurator", "Build rule-based product configuration with dependent choices, validation, and calculated pricing.", 140000, undefined, true),
  definition("ecommerce-retail", "complex", "ai_shopping_assistant", "AI Shopping Assistant", "Add an AI-assisted product discovery experience grounded in approved catalog content and provider limits.", 180000, undefined, true),

  definition("food-hospitality", "basic", "menu_filters", "Menu Filters", "Allow visitors to filter menu entries by configured meal, dietary, or menu category.", 12000, ["restaurant", "cafe", "bakery"]),
  definition("food-hospitality", "basic", "allergen_information", "Allergen Information", "Display business-supplied allergen notices on applicable menu items.", 15000, ["restaurant", "cafe", "bakery", "catering"]),
  definition("food-hospitality", "basic", "meal_customization", "Meal Customization", "Capture supported item choices and notes such as add-ons, portions, and preparation preferences.", 18000, ["restaurant", "cafe", "bakery"]),
  definition("food-hospitality", "basic", "opening_hours_manager", "Opening Hours Manager", "Manage weekly opening hours, exceptions, and temporary closure notices.", 15000),
  reuse("food-hospitality", "basic", "table_reservations", ["restaurant", "cafe", "hotel"]),
  definition("food-hospitality", "expanded", "kitchen_display_system", "Kitchen Display System", "Present incoming orders on a kitchen screen with preparation stages and order status controls.", 45000, ["restaurant", "cafe", "hotel"]),
  definition("food-hospitality", "expanded", "customer_waitlist", "Customer Waitlist", "Record walk-in parties, party size, arrival time, and staff-managed waitlist status.", 30000, ["restaurant", "cafe", "hotel"]),
  definition("food-hospitality", "expanded", "recipe_costing", "Recipe Costing", "Calculate recipe cost estimates from ingredient quantities and maintained unit costs.", 40000, ["restaurant", "cafe", "bakery", "catering"]),
  definition("food-hospitality", "expanded", "catering_event_planner", "Catering Event Planner", "Track event requirements, menu selections, guest counts, delivery details, and planning status.", 45000, ["catering", "restaurant", "hotel"]),
  definition("food-hospitality", "expanded", "housekeeping_dashboard", "Housekeeping Dashboard", "Coordinate room cleaning assignments, inspection status, and room readiness for hotel staff.", 55000, ["hotel"]),
  definition("food-hospitality", "complex", "multi_branch_operations", "Multi-Branch Operations", "Manage shared operational settings and branch-specific menus, staff, and reporting.", 150000, undefined, true),
  definition("food-hospitality", "complex", "hotel_pms_integration", "Hotel Property Management System Integration", "Integrate agreed reservation or room-status data with one documented hotel PMS API.", 140000, ["hotel"], true),
  definition("food-hospitality", "complex", "kitchen_delivery_orchestration", "Kitchen-to-Delivery Orchestration", "Coordinate preparation, packing, dispatch, and delivery status across the agreed order workflow.", 130000, ["restaurant", "cafe", "hotel"], true),
  definition("food-hospitality", "complex", "hospitality_demand_forecasting", "Demand Forecasting", "Produce planning estimates from available historical business data; forecasts require human review.", 120000, undefined, true),
  definition("food-hospitality", "complex", "franchise_management", "Franchise Management", "Coordinate franchise locations, shared standards, branch reporting, and delegated permissions.", 180000, undefined, true),

  definition("health-wellness-beauty", "basic", "service_catalog", "Service Catalog", "Publish services with descriptions, durations, preparation notes, and inquiry actions.", 12000),
  definition("health-wellness-beauty", "basic", "consultation_inquiry", "Consultation Inquiry", "Collect a consultation request and preferred contact times without requesting clinical records.", 12000),
  definition("health-wellness-beauty", "basic", "treatment_information_manager", "Treatment Information Manager", "Manage approved treatment descriptions, aftercare guidance, and eligibility notices.", 15000),
  definition("health-wellness-beauty", "basic", "health_opening_hours", "Opening Hours Calendar", "Publish weekly opening hours, holidays, and temporary schedule notices.", 12000),
  definition("health-wellness-beauty", "basic", "class_timetable", "Class Timetable", "Display recurring classes, instructors, capacity notes, and schedule changes.", 18000, ["fitness-studio", "wellness-coach"]),
  definition("health-wellness-beauty", "expanded", "patient_intake_workflow", "Patient Intake Workflow", "Collect a scoped intake form and consent records with restricted access; clinical-data handling requires separate security review.", 55000, ["clinic", "dental-practice"], true),
  definition("health-wellness-beauty", "expanded", "clinic_queue_management", "Clinic Queue Management", "Track arrival, queue order, and visit status for authorized clinic staff.", 45000, ["clinic", "dental-practice"]),
  definition("health-wellness-beauty", "expanded", "staff_commission_calculator", "Staff Commission Calculator", "Calculate staff commissions using configurable service and payment rules.", 30000, ["salon", "fitness-studio"]),
  definition("health-wellness-beauty", "expanded", "membership_passes", "Membership Passes", "Manage class or service membership status, validity periods, and remaining visits.", 45000, ["salon", "fitness-studio", "wellness-coach"]),
  definition("health-wellness-beauty", "expanded", "treatment_progress_tracking", "Treatment Progress Tracking", "Record customer-approved progress notes and milestones with role-restricted access.", 50000, ["clinic", "salon", "dental-practice"], true),
  definition("health-wellness-beauty", "complex", "teleconsultation_platform", "Teleconsultation Platform", "Build a consultation workflow using an agreed video provider and secure appointment handoff.", 160000, ["clinic", "wellness-coach", "dental-practice"], true),
  definition("health-wellness-beauty", "complex", "multi_branch_clinic_operations", "Multi-Branch Clinic Operations", "Coordinate clinic locations, practitioner availability, branch-specific workflows, and reporting.", 170000, ["clinic", "dental-practice"], true),
  definition("health-wellness-beauty", "complex", "patient_portal", "Patient Portal", "Provide authenticated access to agreed appointments, messages, and patient-provided records.", 150000, ["clinic", "dental-practice"], true),
  definition("health-wellness-beauty", "complex", "advanced_practitioner_scheduling", "Advanced Practitioner Scheduling", "Support practitioner rosters, rooms, service durations, and scheduling constraints.", 125000, undefined, true),
  definition("health-wellness-beauty", "complex", "secure_clinical_workflow_integration", "Secure Clinical Workflow Integration", "Integrate agreed clinical workflows with explicit access controls and data-retention requirements; no compliance certification is implied.", 180000, ["clinic", "dental-practice"], true),

  definition("professional-services", "basic", "consultation_request", "Consultation Request", "Collect a prospective client's consultation topic, contact details, and preferred meeting time.", 12000),
  definition("professional-services", "basic", "quote_request_form", "Quote Request Form", "Capture scope, budget range, attachments, and follow-up details for a service quotation.", 15000),
  definition("professional-services", "basic", "document_checklist", "Document Checklist", "Show clients required documents and track submitted or outstanding items.", 18000),
  definition("professional-services", "basic", "deadline_reminders", "Deadline Reminders", "Track key due dates and send agreed reminder notifications to responsible users.", 15000),
  definition("professional-services", "basic", "client_feedback_collection", "Client Feedback Collection", "Collect post-service feedback with configurable rating and comment fields.", 12000),
  definition("professional-services", "expanded", "proposal_builder", "Proposal Builder", "Prepare proposals from reusable sections, client details, scope, and versioned review status.", 45000),
  definition("professional-services", "expanded", "billable_hours_tracking", "Billable Hours Tracking", "Record time entries by client and matter with review and exportable summaries.", 40000),
  definition("professional-services", "expanded", "recruitment_pipeline", "Recruitment Pipeline", "Manage candidate stages, interview notes, and role-specific hiring workflows.", 50000, ["recruitment-agency"]),
  definition("professional-services", "expanded", "client_approval_workflow", "Client Approval Workflow", "Request client review, capture decisions, and maintain approval history for deliverables.", 45000),
  definition("professional-services", "expanded", "contract_renewal_manager", "Contract Renewal Manager", "Track contract dates, renewal notices, responsible staff, and renewal decisions.", 35000),
  definition("professional-services", "complex", "legal_matter_management", "Legal Matter Management", "Coordinate matters, deadlines, assigned staff, and access-restricted documents; legal advice is not provided.", 160000, ["legal-firm"], true),
  definition("professional-services", "complex", "multi_client_workspace", "Multi-Client Workspace", "Provide separated client workspaces with scoped memberships, files, tasks, and activity history.", 150000, undefined, true),
  definition("professional-services", "complex", "advanced_recruitment_automation", "Advanced Recruitment Automation", "Automate configured candidate routing, communications, interviews, and hiring reports.", 135000, ["recruitment-agency"], true),
  definition("professional-services", "complex", "financial_reporting_workflows", "Financial Reporting Workflows", "Coordinate financial reporting inputs, approvals, and exports; accounting decisions remain with the client.", 140000, ["accounting-firm"], true),
  definition("professional-services", "complex", "enterprise_document_approval", "Enterprise Document Approval", "Route sensitive documents through configurable approval chains, version history, and audit events.", 180000, undefined, true),

  definition("education-elearning", "basic", "course_filters", "Course Filters", "Let learners browse courses by subject, level, delivery format, and other configured criteria.", 12000, ["online-academy", "training-center", "university"]),
  definition("education-elearning", "basic", "student_inquiry", "Student Inquiry", "Collect prospective learner inquiries and route them to the appropriate admissions contact.", 10000),
  reuse("education-elearning", "basic", "booking_calendar", ["school", "training-center", "tutoring"]),
  definition("education-elearning", "basic", "instructor_profiles", "Instructor Profiles", "Publish instructor biographies, subjects, credentials supplied by the institution, and availability.", 12000),
  reuse("education-elearning", "basic", "document_generation", ["school", "online-academy", "training-center", "university"]),
  definition("education-elearning", "expanded", "admission_workflow", "Admission Workflow", "Track applications, required documents, review stages, and admission decisions.", 50000),
  definition("education-elearning", "expanded", "exam_scheduling", "Exam Scheduling", "Coordinate exam sessions, candidate lists, locations, and schedule updates.", 45000),
  definition("education-elearning", "expanded", "fee_installment_ledger", "Fee Installment Ledger", "Record student fee installments, balances, due dates, and payment references.", 45000),
  definition("education-elearning", "expanded", "assignment_grading", "Assignment Grading", "Manage assignment submissions, rubric scores, instructor feedback, and return status.", 50000),
  definition("education-elearning", "expanded", "classroom_allocation", "Classroom Allocation", "Assign classes to rooms and time slots while identifying basic schedule conflicts.", 40000),
  definition("education-elearning", "complex", "multi_campus_management", "Multi-Campus Management", "Coordinate campuses, programs, roles, admissions, and institution-wide reporting.", 180000, undefined, true),
  definition("education-elearning", "complex", "adaptive_learning_paths", "Adaptive Learning Paths", "Configure progression rules that recommend learning material based on recorded learner progress.", 145000, ["online-academy", "training-center", "university"], true),
  definition("education-elearning", "complex", "advanced_examination_platform", "Advanced Examination Platform", "Deliver scheduled assessments with question banks, attempt controls, grading, and review workflows.", 175000, undefined, true),
  definition("education-elearning", "complex", "learning_analytics", "Learning Analytics", "Summarize engagement and progress indicators from available platform activity data.", 120000, undefined, true),
  definition("education-elearning", "complex", "multi_institution_lms", "Multi-Institution LMS", "Operate separated learning workspaces with institution-specific roles, courses, and configuration.", 200000, undefined, true),

  definition("home-construction", "basic", "service_area_checker", "Service Area Checker", "Check whether a supplied address or postal area falls within configured service zones.", 12000),
  definition("home-construction", "basic", "instant_quote_calculator", "Instant Quote Calculator", "Estimate a service price from published inputs and clear business-defined assumptions.", 18000),
  definition("home-construction", "basic", "material_calculator", "Material Calculator", "Estimate material quantities from dimensions and formulas approved by the business.", 15000, ["contractor", "landscaping"]),
  definition("home-construction", "basic", "warranty_registration", "Warranty Registration", "Capture product or project warranty registration and issue a reference for follow-up.", 12000),
  definition("home-construction", "basic", "project_gallery", "Project Gallery", "Publish completed project photos with categories, captions, and customer-approved attribution.", 10000),
  definition("home-construction", "expanded", "technician_dispatch", "Technician Dispatch", "Assign service visits to technicians and track work status, time windows, and notes.", 50000, ["home-repair", "cleaning-service"]),
  definition("home-construction", "expanded", "work_order_management", "Work Order Management", "Create work orders with job details, assigned staff, required materials, and completion records.", 50000),
  definition("home-construction", "expanded", "site_inspection_reports", "Site Inspection Reports", "Record structured site inspection findings, photos, and client-ready report output.", 45000, ["contractor", "home-repair"]),
  definition("home-construction", "expanded", "project_milestone_tracking", "Project Milestone Tracking", "Manage project milestones, assigned owners, due dates, and progress updates.", 40000, ["contractor"]),
  definition("home-construction", "expanded", "equipment_allocation", "Equipment Allocation", "Schedule equipment use across jobs and track assignment, return, and availability.", 45000, ["contractor", "equipment-rental"]),
  definition("home-construction", "complex", "dispatch_optimization", "Dispatch Optimization", "Optimize job assignments using agreed service constraints and map-provider capabilities.", 150000, ["home-repair", "cleaning-service"], true),
  definition("home-construction", "complex", "construction_project_control", "Construction Project Control", "Coordinate project schedules, budgets, change records, approvals, and progress reporting.", 180000, ["contractor"], true),
  definition("home-construction", "complex", "procurement_subcontractor_workflows", "Procurement and Subcontractor Workflows", "Manage purchase requests, supplier quotes, subcontractor assignments, and approval states.", 160000, ["contractor"], true),
  definition("home-construction", "complex", "fleet_job_orchestration", "Fleet and Job Orchestration", "Coordinate vehicles, crew assignments, job schedules, and operational status across teams.", 170000, undefined, true),
  definition("home-construction", "complex", "predictive_maintenance_integration", "Predictive Maintenance Integration", "Connect agreed equipment telemetry sources and surface maintenance indicators for human review.", 180000, ["contractor", "equipment-rental"], true),

  definition("technology-digital", "basic", "changelog_manager", "Changelog Manager", "Publish versioned product updates with dates, categories, and draft or published status.", 12000),
  definition("technology-digital", "basic", "api_documentation_portal", "API Documentation Portal", "Publish versioned API guides, endpoint references, and access instructions.", 18000, ["saas-company", "software-agency", "hosting-provider"]),
  definition("technology-digital", "basic", "service_status_page", "Service Status Page", "Publish service availability notices and manually managed incident updates.", 15000),
  reuse("technology-digital", "basic", "support_tickets", ["saas-company", "software-agency", "hosting-provider", "it-consultancy"]),
  definition("technology-digital", "basic", "software_license_information", "Software License Information Page", "Publish product license terms, usage guidance, and version information supplied by the owner.", 10000),
  definition("technology-digital", "expanded", "license_activation", "License Activation", "Issue and manage product license keys with activation status and configured limits.", 50000, ["saas-company", "software-agency"], true),
  definition("technology-digital", "expanded", "developer_sandbox", "Developer Sandbox", "Provide an isolated test workspace with sample data and scoped developer access.", 55000, ["saas-company", "software-agency", "hosting-provider"]),
  definition("technology-digital", "expanded", "client_delivery_workspace", "Client Delivery Workspace", "Share project deliverables, milestones, review requests, and handover materials with clients.", 40000, ["software-agency", "it-consultancy", "digital-agency"]),
  definition("technology-digital", "expanded", "incident_management", "Incident Management", "Record incidents, owners, impact, resolution progress, and post-incident notes.", 50000, ["saas-company", "hosting-provider"]),
  definition("technology-digital", "expanded", "cloud_cost_reporting", "Cloud Cost Reporting", "Import supported provider cost exports and display categorized spend summaries.", 45000, ["saas-company", "hosting-provider", "it-consultancy"]),
  definition("technology-digital", "complex", "api_usage_metering", "API Usage Metering", "Measure API usage by account and period with quota alerts and exportable reports.", 130000, ["saas-company", "hosting-provider"], true),
  definition("technology-digital", "complex", "multi_tenant_developer_platform", "Multi-Tenant Developer Platform", "Build isolated developer workspaces with tenant-aware provisioning and access boundaries.", 200000, ["saas-company", "hosting-provider"], true),
  definition("technology-digital", "complex", "license_enforcement_system", "License Enforcement System", "Enforce configured product entitlements with activation, renewal, and revocation workflows.", 160000, ["saas-company", "software-agency"], true),
  definition("technology-digital", "complex", "cloud_resource_orchestration", "Cloud Resource Orchestration", "Orchestrate approved cloud resource workflows through scoped provider integrations.", 200000, ["saas-company", "hosting-provider"], true),
  definition("technology-digital", "complex", "enterprise_observability_integration", "Enterprise Observability Integration", "Integrate agreed logs, metrics, and alert signals with an existing observability provider.", 150000, ["saas-company", "hosting-provider", "it-consultancy"], true),

  definition("real-estate-propertytech", "basic", "rental_yield_calculator", "Rental Yield Calculator", "Estimate gross or net rental yield using user-entered property and expense assumptions.", 18000, ["real-estate-agency", "property-manager", "landlord"]),
  definition("real-estate-propertytech", "basic", "mortgage_affordability_calculator", "Mortgage Affordability Calculator", "Estimate indicative affordability from user-entered income, deposit, rate, and term assumptions.", 18000, ["real-estate-agency", "landlord"]),
  definition("real-estate-propertytech", "basic", "property_expense_calculator", "Property Expense Calculator", "Estimate recurring property costs from configurable owner-entered expense categories.", 15000, ["property-manager", "landlord", "short-term-rental"]),
  definition("real-estate-propertytech", "basic", "lease_expiry_reminders", "Lease Expiry Reminders", "Track lease dates and send reminders to authorized users before configured milestones.", 16000, ["property-manager", "landlord", "short-term-rental"]),
  definition("real-estate-propertytech", "basic", "property_inspection_checklist", "Property Inspection Checklist", "Record property inspection results, notes, photos, and follow-up actions.", 18000, ["property-manager", "landlord", "property-developer"]),
  definition("real-estate-propertytech", "expanded", "tenant_maintenance_portal", "Tenant Maintenance Portal", "Let tenants submit repair requests and follow status updates through an authenticated portal.", 55000, ["property-manager", "landlord", "short-term-rental"]),
  definition("real-estate-propertytech", "expanded", "property_portfolio_dashboard", "Property Portfolio Dashboard", "Summarize property occupancy, operational status, and owner-configured portfolio indicators.", 50000, ["property-manager", "landlord", "property-developer"]),
  definition("real-estate-propertytech", "expanded", "lease_renewal_workflow", "Lease Renewal Workflow", "Coordinate renewal offers, responses, decision dates, and lease document handoff.", 45000, ["property-manager", "landlord", "short-term-rental"]),
  definition("real-estate-propertytech", "expanded", "property_inspection_reporting", "Inspection Reporting", "Generate structured property inspection reports with findings, photos, and assigned follow-ups.", 45000, ["property-manager", "landlord", "property-developer"]),
  definition("real-estate-propertytech", "expanded", "building_expense_allocation", "Building Expense Allocation", "Allocate shared building expenses across configured units or ownership shares.", 50000, ["property-manager", "property-developer"]),
  definition("real-estate-propertytech", "complex", "multi_property_portfolio_analytics", "Multi-Property Portfolio Analytics", "Compare portfolio performance indicators and trends across managed properties.", 150000, ["property-manager", "landlord", "property-developer"], true),
  definition("real-estate-propertytech", "complex", "advanced_lease_management", "Advanced Lease Management", "Manage lease terms, renewals, document versions, milestones, and role-restricted approvals.", 160000, ["property-manager", "landlord", "short-term-rental"], true),
  definition("real-estate-propertytech", "complex", "building_operations_platform", "Building Operations Platform", "Coordinate building maintenance, service vendors, access requests, and operational reporting.", 180000, ["property-manager", "property-developer"], true),
  definition("real-estate-propertytech", "complex", "investment_scenario_modeling", "Investment Scenario Modeling", "Compare user-defined investment assumptions and scenario outcomes; results are not financial advice.", 140000, ["real-estate-agency", "landlord", "property-developer"], true),
  reuse("real-estate-propertytech", "complex", "property_portal_api_integration", ["real-estate-agency", "property-manager", "property-developer"]),

  definition("entertainment-events", "basic", "guest_rsvp", "Guest RSVP", "Collect guest responses, party counts, and dietary notes for a specified event.", 15000, ["event-venue", "wedding-planner", "ticketed-events"]),
  definition("entertainment-events", "basic", "event_schedule", "Event Schedule", "Publish event sessions, timings, locations, and schedule changes.", 10000),
  definition("entertainment-events", "basic", "itinerary_builder", "Itinerary Builder", "Prepare shareable event or trip itineraries with timed activities and location notes.", 15000, ["wedding-planner", "tour-operator"]),
  definition("entertainment-events", "basic", "digital_invitations", "Digital Invitations", "Create branded invitation pages with event details and RSVP links.", 12000, ["event-venue", "wedding-planner"]),
  definition("entertainment-events", "basic", "gallery_proofing", "Gallery Proofing", "Share password-protected photo selections and collect customer favorites for review.", 18000, ["photographer"]),
  definition("entertainment-events", "expanded", "vendor_coordination", "Vendor Coordination", "Track event vendors, contacts, deliverables, payment milestones, and coordination status.", 45000, ["event-venue", "wedding-planner"]),
  definition("entertainment-events", "expanded", "wedding_budget_planner", "Wedding Budget Planner", "Track planned costs, vendor quotes, deposits, payment milestones, and budget variance.", 35000, ["wedding-planner"]),
  definition("entertainment-events", "expanded", "equipment_rental_management", "Equipment Rental Management", "Manage rental inventory, availability, reservations, check-out, and return records.", 50000, ["event-venue", "wedding-planner", "photographer"]),
  definition("entertainment-events", "expanded", "sponsorship_tracking", "Sponsorship Tracking", "Manage sponsor packages, commitments, deliverables, contacts, and fulfillment status.", 40000, ["event-venue", "ticketed-events"]),
  definition("entertainment-events", "expanded", "photography_selection_workflow", "Photography Selection Workflow", "Collect client image selections and track editing, approval, and delivery status.", 45000, ["photographer"]),
  definition("entertainment-events", "complex", "reserved_seat_selection", "Reserved Seat Selection", "Support venue seating maps, assigned seat inventory, reservations, and checkout handoff.", 150000, ["event-venue", "ticketed-events"], true),
  definition("entertainment-events", "complex", "multi_venue_ticketing_orchestration", "Multi-Venue Ticketing Orchestration", "Coordinate event listings, ticket inventory, and reporting across multiple venues.", 180000, ["event-venue", "ticketed-events"], true),
  definition("entertainment-events", "complex", "event_operations_dashboard", "Event Operations Dashboard", "Coordinate run-of-show, staff assignments, incidents, and live operational status.", 140000, ["event-venue", "wedding-planner", "ticketed-events"], true),
  definition("entertainment-events", "complex", "travel_package_orchestration", "Travel Package Orchestration", "Coordinate tour packages, availability, booking records, suppliers, and itinerary changes.", 180000, ["tour-operator"], true),
  definition("entertainment-events", "complex", "multi_vendor_event_marketplace", "Multi-Vendor Event Marketplace", "Support vendor onboarding, listings, booking requests, marketplace permissions, and commissions.", 200000, ["event-venue", "wedding-planner"], true),

  definition("niche-specialized", "basic", "donation_campaign_page", "Donation Campaign Page", "Publish campaign goals, updates, and links to a configured third-party donation processor.", 12000, ["nonprofit"]),
  definition("niche-specialized", "basic", "pickup_request_system", "Pickup Request System", "Collect pickup requests with address, contact, preferred window, and basic status tracking.", 18000, ["courier", "nonprofit", "pet-services"]),
  definition("niche-specialized", "basic", "pet_service_package_manager", "Pet Service Package Manager", "Publish pet-care packages, service details, eligibility notes, and inquiry actions.", 12000, ["pet-services"]),
  definition("niche-specialized", "basic", "crop_batch_records", "Crop Batch Records", "Record crop batches, planting dates, field references, and basic harvest notes.", 18000, ["agriculture"]),
  definition("niche-specialized", "basic", "vehicle_inspection_checklist", "Vehicle Inspection Checklist", "Record vehicle condition checks, notes, photos, and follow-up maintenance items.", 15000, ["courier", "vehicle-rental"]),
  definition("niche-specialized", "expanded", "volunteer_scheduling", "Volunteer Scheduling", "Coordinate volunteer shifts, availability, assignments, and attendance.", 35000, ["nonprofit"]),
  definition("niche-specialized", "expanded", "courier_exception_dashboard", "Courier Exception Dashboard", "Track delayed, failed, or returned delivery exceptions and resolution status.", 50000, ["courier"]),
  definition("niche-specialized", "expanded", "rental_fleet_management", "Rental Fleet Management", "Manage rental assets, availability, bookings, check-out, return, and condition records.", 55000, ["vehicle-rental", "equipment-rental"]),
  definition("niche-specialized", "expanded", "laundry_order_tracker", "Laundry Order Tracker", "Track laundry orders through intake, processing, ready-for-pickup, and delivery stages.", 35000, ["laundry-service"]),
  definition("niche-specialized", "expanded", "farm_harvest_reporting", "Farm Harvest Reporting", "Record harvest quantities, dates, crop batches, and basic season summaries.", 40000, ["agriculture"]),
  definition("niche-specialized", "complex", "fleet_dispatch_optimization", "Fleet Dispatch Optimization", "Plan fleet assignments using configured constraints and supported mapping services.", 160000, ["courier", "vehicle-rental"], true),
  definition("niche-specialized", "complex", "logistics_control_tower", "Logistics Control Tower", "Monitor shipment milestones, operational exceptions, and fleet activity across connected systems.", 200000, ["courier"], true),
  definition("niche-specialized", "complex", "agricultural_supply_chain", "Agricultural Supply Chain Management", "Coordinate crop lots, suppliers, storage, dispatch, and traceability records.", 180000, ["agriculture"], true),
  definition("niche-specialized", "complex", "multi_branch_rental_operations", "Multi-Branch Rental Operations", "Coordinate rental inventory, reservations, transfers, and performance across locations.", 170000, ["vehicle-rental", "equipment-rental"], true),
  definition("niche-specialized", "complex", "donation_impact_analytics", "Donation and Impact Analytics Platform", "Summarize donation campaigns, contributions, outcomes, and reporting periods from recorded data.", 140000, ["nonprofit"], true),
];

export const BUSINESS_CATEGORIES = categories;
export const BUSINESS_ADDON_DEFINITIONS = definitions;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(value: string): RegExp {
  const pattern = value.trim().split(/(\s+|&)/).map((part) => {
    if (part === "&") return "(?:&|and)";
    if (/^\s+$/.test(part)) return "[\\s_-]+";
    return escapeRegex(part);
  }).join("");
  return new RegExp(`\\b${pattern}\\b`, "i");
}

const ADDON_SCAN_ALIASES: Record<string, string[]> = {
  back_in_stock_notifications: ["notify me when available", "back in stock alert"],
  returns_exchanges_workflow: ["returns portal", "exchange request"],
  pos_synchronization: ["point of sale sync", "pos integration"],
  subscription_commerce: ["recurring orders", "subscribe and save"],
  ai_shopping_assistant: ["product shopping assistant", "ask about products"],
  allergen_information: ["allergen menu", "allergy information"],
  kitchen_display_system: ["kitchen display", "kds"],
  customer_waitlist: ["restaurant waitlist", "wait list"],
  clinic_queue_management: ["patient queue", "clinic queue"],
  treatment_progress_tracking: ["treatment tracking", "care progress"],
  teleconsultation_platform: ["telehealth", "online consultation"],
  billable_hours_tracking: ["time tracking for clients", "billable time"],
  legal_matter_management: ["case management for lawyers", "legal case management"],
  admission_workflow: ["student admissions", "admissions portal"],
  assignment_grading: ["online assignment grading", "grade assignments"],
  service_area_checker: ["check service area", "service availability by postcode"],
  technician_dispatch: ["field service dispatch", "dispatch technicians"],
  api_documentation_portal: ["api docs", "developer documentation"],
  bug_report_form: ["report a bug", "submit a bug report"],
  license_activation: ["activate license", "software activation"],
  rental_yield_calculator: ["rental yield", "rental return calculator"],
  tenant_maintenance_portal: ["tenant repair requests", "tenant maintenance requests"],
  guest_rsvp: ["event rsvp", "respond to invitation"],
  reserved_seat_selection: ["choose your seats", "seat map booking"],
  donation_campaign_page: ["fundraising campaign", "donate to our campaign"],
  courier_exception_dashboard: ["delivery exception tracking", "failed delivery dashboard"],
  fleet_dispatch_optimization: ["fleet route optimization", "vehicle dispatch optimization"],
};

export function getBusinessAddonDetectionRules() {
  return definitions
    .filter((entry) => !entry.existingAddonId)
    .map((entry) => ({
      id: entry.id,
      categoryId: entry.categoryId,
      pattern: new RegExp(
        [entry.label, ...(ADDON_SCAN_ALIASES[entry.id] || [])]
          .map((phrase) => phrasePattern(phrase).source.slice(2, -2))
          .join("|"),
        "i"
      ),
    }));
}

export function getBusinessAddonCatalog(
  addons: Record<string, AddonOption>,
  includeDisabled = false,
) {
  const definedAddons = definitions.flatMap((entry) => {
    const addon = addons[entry.existingAddonId || entry.id];
    if (!addon || (!includeDisabled && (!addon.enabled || addon.status === "archived"))) return [];
    const categoryIds = addon.businessCategories?.length
      ? addon.businessCategories
      : [entry.categoryId];
    return categoryIds.map((categoryId) => ({
        id: addon.id,
        key: addon.id,
        label: addon.label,
        description: addon.description || entry.description,
        price: addon.price,
        currency: "PKR" as const,
        level: addon.pricingLevel || entry.level,
        categoryId,
        categoryLabel: categories.find((category) => category.id === categoryId)?.label || categoryId,
        businessTypes: addon.businessTypes || entry.businessTypes || types[categoryId] || [],
        origin: addon.origin || (entry.existingAddonId ? "existing" : "new"),
        enabled: addon.enabled,
        requiresCustomQuote: addon.requiresCustomQuote ?? entry.requiresCustomQuote ?? false,
        relatedAddOnIds: addon.relatedAddOnIds || [],
        existingAddonId: entry.existingAddonId,
      }));
  });
  const knownIds = new Set(definitions.map((entry) => entry.id));
  const customAddons = Object.values(addons)
    .filter((addon) =>
      Boolean(addon.businessCategories?.length) &&
      !knownIds.has(addon.id) &&
      (includeDisabled || (addon.enabled && addon.status !== "archived"))
    )
    .flatMap((addon) => (addon.businessCategories || []).map((categoryId) => ({
      id: addon.id,
      key: addon.id,
      label: addon.label,
      description: addon.description,
      price: addon.price,
      currency: "PKR" as const,
      level: addon.pricingLevel || "basic",
      categoryId,
      categoryLabel: categories.find((category) => category.id === categoryId)?.label || categoryId,
      businessTypes: addon.businessTypes || types[categoryId] || [],
      origin: addon.origin || "new",
      enabled: addon.enabled,
      requiresCustomQuote: addon.requiresCustomQuote || false,
      relatedAddOnIds: addon.relatedAddOnIds || [],
      existingAddonId: undefined,
    })));
  return [...definedAddons, ...customAddons];
}

export function buildBusinessCatalogAddons(): AddonOption[] {
  return definitions
    .filter((entry) => !entry.existingAddonId)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      category: "businesscatalog",
      price: entry.price || 0,
      description: entry.description,
      enabled: true,
      businessCategories: [entry.categoryId],
      businessTypes: entry.businessTypes || types[entry.categoryId] || [],
      pricingLevel: entry.level,
      origin: "new",
      status: "active",
      relatedAddOnIds: entry.relatedAddOnIds || [],
      requiresCustomQuote: entry.requiresCustomQuote || false,
    }));
}

export function getBusinessCategoryForType(typeId: string): string | undefined {
  return categories.find((category) => category.businessTypes.some((type) => type.id === typeId))?.id;
}

export function inferBusinessCategoryForLabels(labels: string[]): string | undefined {
  const value = labels.join(" ").toLowerCase();
  const categoryRules: Array<{ id: string; pattern: RegExp }> = [
    { id: "ecommerce-retail", pattern: /\b(e-commerce|ecommerce|retail|online store|jewellery|jewelry|cosmetics|fashion|grocery)\b/i },
    { id: "food-hospitality", pattern: /\b(restaurant|cafe|café|hotel|catering|bakery|food)\b/i },
    { id: "health-wellness-beauty", pattern: /\b(clinic|health|salon|beauty|fitness|wellness|dental|medical)\b/i },
    { id: "professional-services", pattern: /\b(legal|law firm|consult|accounting|recruitment|professional service)\b/i },
    { id: "education-elearning", pattern: /\b(school|education|course|learning|university|college|tutor|training)\b/i },
    { id: "home-construction", pattern: /\b(construction|contractor|home service|repair|cleaning|landscap|equipment rental)\b/i },
    { id: "technology-digital", pattern: /\b(saas|software|technology|digital agency|hosting|it consultancy|crm)\b/i },
    { id: "real-estate-propertytech", pattern: /\b(real estate|property|landlord|rental yield)\b/i },
    { id: "entertainment-events", pattern: /\b(event|entertainment|wedding|ticket|travel|tour operator|photograph|leisure)\b/i },
    { id: "niche-specialized", pattern: /\b(nonprofit|charity|courier|pet service|agriculture|farm|fleet|logistics|laundry)\b/i },
  ];
  return categoryRules.find((rule) => rule.pattern.test(value))?.id;
}
