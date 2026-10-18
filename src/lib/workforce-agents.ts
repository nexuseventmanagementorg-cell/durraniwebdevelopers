import type { PublicProjectMilestone } from "@/lib/types";

export interface WorkforceAgent {
  role: string;
  task: string;
  milestoneId: PublicProjectMilestone["id"];
  avatar: string;
}

export interface WorkforceDepartment {
  name: string;
  agentRoles: string[];
  tone: "blue" | "violet" | "green" | "amber" | "rose";
}

export const DWD_WORKFORCE_AGENTS: WorkforceAgent[] = [
  { role: "AI CEO Strategist", task: "Setting product direction", milestoneId: "requirements", avatar: "ceo-strategist" },
  { role: "Project Manager", task: "Coordinating project delivery", milestoneId: "requirements", avatar: "project-manager" },
  { role: "Business Analyst", task: "Translating needs into scope", milestoneId: "requirements", avatar: "business-analyst" },
  { role: "Proposal Writer", task: "Preparing the approved scope", milestoneId: "requirements", avatar: "proposal-writer" },
  { role: "Client Onboarding Agent", task: "Organizing project inputs", milestoneId: "requirements", avatar: "client-onboarding-agent" },
  { role: "Sales Lead Finder", task: "Researching opportunities", milestoneId: "requirements", avatar: "sales-lead-finder" },
  { role: "Lead Qualification Agent", task: "Checking project fit", milestoneId: "requirements", avatar: "lead-qualification-agent" },
  { role: "Appointment Booking Agent", task: "Organizing consultations", milestoneId: "requirements", avatar: "appointment-booking-agent" },
  { role: "Customer Support Assistant", task: "Helping clients get answers", milestoneId: "requirements", avatar: "customer-support-assistant" },
  { role: "Community Manager", task: "Coordinating client updates", milestoneId: "preview", avatar: "community-manager" },
  { role: "Market Research Analyst", task: "Researching customer needs", milestoneId: "planning", avatar: "market-research-analyst" },
  { role: "Competitor Research Agent", task: "Reviewing market context", milestoneId: "planning", avatar: "competitor-research-agent" },
  { role: "Data Analyst", task: "Turning requirements into decisions", milestoneId: "planning", avatar: "data-analyst" },
  { role: "Reputation Monitor", task: "Tracking trust signals", milestoneId: "planning", avatar: "reputation-monitor" },
  { role: "AI Research Scientist", task: "Evaluating useful approaches", milestoneId: "planning", avatar: "ai-research-scientist" },
  { role: "Frontend UI Designer", task: "Designing interface screens", milestoneId: "planning", avatar: "frontend-ui-designer" },
  { role: "UX Researcher", task: "Mapping customer journeys", milestoneId: "planning", avatar: "ux-researcher" },
  { role: "Brand Identity Designer", task: "Creating the visual identity", milestoneId: "planning", avatar: "brand-identity-designer" },
  { role: "Digital Marketing Strategist", task: "Planning customer acquisition", milestoneId: "planning", avatar: "digital-marketing-strategist" },
  { role: "Legal Document Assistant", task: "Organizing required legal content", milestoneId: "planning", avatar: "legal-document-assistant" },
  { role: "Web Development Coder", task: "Building the approved website", milestoneId: "development", avatar: "web-development-coder" },
  { role: "WordPress Specialist", task: "Building WordPress features", milestoneId: "development", avatar: "wordpress-specialist" },
  { role: "Shopify Developer", task: "Building store features", milestoneId: "development", avatar: "shopify-developer" },
  { role: "Mobile App Developer", task: "Building mobile experiences", milestoneId: "development", avatar: "mobile-app-developer" },
  { role: "Content Writer", task: "Creating approved website copy", milestoneId: "development", avatar: "content-writer" },
  { role: "Backend Architect", task: "Designing application services", milestoneId: "development", avatar: "backend-architect" },
  { role: "Database Engineer", task: "Modeling project data", milestoneId: "development", avatar: "database-engineer" },
  { role: "API Integration Specialist", task: "Connecting approved services", milestoneId: "development", avatar: "api-integration-specialist" },
  { role: "CRM Automation Specialist", task: "Connecting customer workflows", milestoneId: "development", avatar: "crm-automation-specialist" },
  { role: "Automation Workflow Engineer", task: "Automating approved processes", milestoneId: "development", avatar: "automation-workflow-engineer" },
  { role: "Ecommerce Specialist", task: "Building catalog and checkout", milestoneId: "development", avatar: "ecommerce-specialist" },
  { role: "Product Description Writer", task: "Preparing product information", milestoneId: "development", avatar: "product-description-writer" },
  { role: "Localization Translator", task: "Adapting approved content", milestoneId: "development", avatar: "localization-translator" },
  { role: "Image Generation Artist", task: "Preparing approved visual assets", milestoneId: "development", avatar: "image-generation-artist" },
  { role: "Video Content Producer", task: "Producing approved media", milestoneId: "development", avatar: "video-content-producer" },
  { role: "Podcast Production Agent", task: "Preparing audio content", milestoneId: "development", avatar: "podcast-production-agent" },
  { role: "Motion Graphics Designer", task: "Creating motion assets", milestoneId: "development", avatar: "motion-graphics-designer" },
  { role: "SEO Specialist", task: "Improving site discoverability", milestoneId: "quality", avatar: "seo-specialist" },
  { role: "SEO Technical Auditor", task: "Auditing structure and metadata", milestoneId: "quality", avatar: "seo-technical-auditor" },
  { role: "Web Performance Optimizer", task: "Tuning speed and loading", milestoneId: "quality", avatar: "web-performance-optimizer" },
  { role: "Email Campaign Manager", task: "Preparing approved communications", milestoneId: "preview", avatar: "email-campaign-manager" },
  { role: "Cybersecurity Guardian", task: "Checking security controls", milestoneId: "quality", avatar: "cybersecurity-guardian" },
  { role: "QA Testing Bot", task: "Testing key website flows", milestoneId: "quality", avatar: "qa-testing-bot" },
  { role: "DevOps Cloud Engineer", task: "Preparing reliable environments", milestoneId: "quality", avatar: "devops-cloud-engineer" },
  { role: "Accessibility Auditor", task: "Reviewing inclusive design", milestoneId: "quality", avatar: "accessibility-auditor" },
  { role: "Compliance Monitor", task: "Checking agreed requirements", milestoneId: "quality", avatar: "compliance-monitor" },
  { role: "Backup & Recovery Agent", task: "Planning recoverable releases", milestoneId: "launch", avatar: "backup-recovery-agent" },
  { role: "Invoice & Billing Assistant", task: "Organizing project billing", milestoneId: "launch", avatar: "invoice-billing-assistant" },
  { role: "Knowledge Base Builder", task: "Documenting project operations", milestoneId: "preview", avatar: "knowledge-base-builder" },
  { role: "Copywriter", task: "Refining website messaging", milestoneId: "development", avatar: "copywriter" },
];

export const DWD_WORKFORCE_DEPARTMENTS: WorkforceDepartment[] = [
  { name: "Executive & Project Delivery", tone: "blue", agentRoles: ["AI CEO Strategist", "Project Manager", "Business Analyst", "Proposal Writer", "Client Onboarding Agent"] },
  { name: "Client Growth & Support", tone: "rose", agentRoles: ["Sales Lead Finder", "Lead Qualification Agent", "Appointment Booking Agent", "Customer Support Assistant", "Community Manager"] },
  { name: "Research & Insights", tone: "violet", agentRoles: ["Market Research Analyst", "Competitor Research Agent", "Data Analyst", "Reputation Monitor", "AI Research Scientist"] },
  { name: "Product & Brand Design", tone: "violet", agentRoles: ["Frontend UI Designer", "UX Researcher", "Brand Identity Designer", "Image Generation Artist", "Accessibility Auditor"] },
  { name: "Web, CMS & Knowledge", tone: "green", agentRoles: ["Web Development Coder", "WordPress Specialist", "Shopify Developer", "Mobile App Developer", "Knowledge Base Builder"] },
  { name: "Apps & Systems Engineering", tone: "blue", agentRoles: ["Backend Architect", "Database Engineer", "API Integration Specialist", "CRM Automation Specialist", "Automation Workflow Engineer"] },
  { name: "Commerce & Operations", tone: "amber", agentRoles: ["Ecommerce Specialist", "Product Description Writer", "Invoice & Billing Assistant", "Legal Document Assistant", "Backup & Recovery Agent"] },
  { name: "Content & Media Studio", tone: "rose", agentRoles: ["Content Writer", "Copywriter", "Video Content Producer", "Podcast Production Agent", "Motion Graphics Designer"] },
  { name: "SEO & Digital Marketing", tone: "amber", agentRoles: ["SEO Specialist", "SEO Technical Auditor", "Web Performance Optimizer", "Digital Marketing Strategist", "Email Campaign Manager"] },
  { name: "Cloud, Quality & Knowledge", tone: "green", agentRoles: ["Cybersecurity Guardian", "QA Testing Bot", "DevOps Cloud Engineer", "Localization Translator", "Compliance Monitor"] },
];
