# Durrani Web Developers

**Ideas | Code | Real Solutions**

Modern, responsive, and scalable web applications built for businesses, startups, and entrepreneurs.

Durrani Web Developers provides custom web development solutions, including restaurant applications, e-commerce stores, SaaS platforms, order-taking systems, booking applications, and business management software.

## 🚀 About the Project

This project is the official website and business management platform for **Durrani Web Developers**.

It is designed to help potential clients explore our services, calculate estimated project costs, submit project requirements, and contact us directly for consultation.

The platform also aims to provide an administrative dashboard for managing inquiries, clients, projects, pricing, payments, and business content.

## ✨ Key Features

- **Professional Portfolio:** Showcase services and approved projects.
- **Interactive Budget Calculator:** Estimate project costs based on selected requirements and add-ons.
- **Project Inquiry System:** Collect customer information and project specifications.
- **WhatsApp Consultation:** Enable direct communication with potential clients.
- **Service Management:** Present web development services and custom solutions.
- **Flexible Pricing:** Configure packages, additional features, and payment plans.
- **Admin Dashboard:** Manage inquiries, clients, projects, and business settings, according to the implemented features.
- **Payment Tracking:** Record advance payments, installment schedules, outstanding balances, and payment verification.
- **Responsive Design:** Support desktop, tablet, and mobile devices.
- **Production Deployment:** Deploy the application to Vercel.

## 🛠️ Services

Our services include:

1. Restaurant Web Applications
2. Restaurant Order-Taking Applications
3. E-commerce Stores
4. Jewellery Store Websites
5. Cosmetics and Beauty Stores
6. Fashion Store Applications
7. Grocery Ordering Systems
8. SaaS Applications
9. Customer Relationship Management (CRM)
10. Booking and Appointment Systems
11. Inventory and Product Management Systems
12. Custom Business Applications
13. Other Custom Software Solutions

## 🧩 Modular Extensions

Additional features can be integrated according to project requirements:

- Google Authentication
- Supabase Database Integration
- Payment Integration
- Advanced Analytics and Reporting
- AI-Powered Chatbot
- Custom Advanced Features

The availability and cost of each extension depend on the final project scope and technical requirements.

## 💰 Pricing Overview

| Package | Starting Price |
|---|---:|
| Web Application Without Client Admin Support | PKR 35,000 |
| Web Application With Client Admin Support | PKR 45,000 |

**Advance Payment:** PKR 10,000

The remaining amount can be arranged through an agreed installment plan, subject to the final quotation.

Additional features, custom domains, paid third-party services, and other project-specific requirements may incur extra charges.

All prices are estimates until the project scope and final quotation are confirmed.

## 💻 Technology Stack

The intended technology stack includes:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js server-side functionality and API routes, where implemented
- **Database:** Supabase PostgreSQL, where configured
- **Authentication:** Secure server-side authentication appropriate to the application
- **Deployment:** Vercel
- **Version Control:** Git and GitHub

*Note: The exact technologies and integrations depend on the current implementation of the repository.*

## ⚙️ Getting Started

Follow these steps to run the project locally.

### Prerequisites

Install the following tools:

- Node.js (a version compatible with the project's Next.js version)
- npm
- Git
- A Supabase project, if database integration is enabled

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate to the project directory:

```bash
cd YOUR_PROJECT_FOLDER
```

Replace the example values with your actual GitHub repository URL and project folder name.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root if the application requires environment variables.

Example:

```env
# Supabase — configure only if used by the application
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Admin authentication — use only if required by the implementation
ADMIN_DEFAULT_USER=
ADMIN_DEFAULT_PASS=
JWT_SECRET=
```

Fill in only the variables required by the actual application code.

**Security requirements:**

- Never commit `.env.local` or other files containing secrets.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser-side code.
- Never expose `JWT_SECRET` or administrator credentials.
- Use strong, unique production credentials.
- Configure production environment variables in the Vercel project settings.
- Keep `.env.example` free of real passwords, API keys, and other secrets.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local application at:

```text
http://localhost:3000
```

### 5. Build for Production

```bash
npm run build
```

If the build completes successfully, start the production server locally with:

```bash
npm run start
```

## 🗄️ Database Setup

If the application uses Supabase:

1. Create a Supabase project.
2. Apply the database schema and migrations required by the application.
3. Configure the required environment variables.
4. Enable appropriate Row Level Security (RLS) policies.
5. Verify that database access is restricted to authorized users.
6. Test reading and writing data before production deployment.

Database tables and migrations must match the application's actual code. Creating tables alone does not automatically migrate existing data or guarantee that every application feature is connected.

## 🌐 Deployment on Vercel

1. Push the project to GitHub.
2. Sign in to Vercel.
3. Import the GitHub repository.
4. Configure the required environment variables in **Project Settings → Environment Variables**.
5. Deploy the application.
6. Check the build and runtime logs.
7. Test the live website, forms, database connectivity, authentication, and administrative functions.
8. Redeploy after changing production environment variables when required.

A successful deployment does not automatically guarantee that every integration is working. Test all critical functionality before handing the application over to a client.

## 🔄 Project Development Workflow

Our standard workflow is:

1. Requirements submission and budget estimation.
2. Direct WhatsApp consultation.
3. Scope confirmation and advance payment.
4. Application architecture and development.
5. Testing, production deployment, and handover.

Project timelines, features, and payment milestones are confirmed individually for each project.

## 🔐 Security

Security is an important part of our development process.

- Protect administrator routes and sensitive API endpoints.
- Validate user input on the server.
- Use secure authentication and session management.
- Apply appropriate database permissions and RLS policies.
- Keep private credentials on the server.
- Verify payments before marking them as received.
- Avoid storing sensitive customer or payment information unnecessarily.
- Review logs and errors without exposing secrets.

## 📞 Contact Us

**Durrani Web Developers**

- **Email:** durraniwebdevelopers@gmail.com
- **WhatsApp / Phone:** +92 329 966 9565
- **Deployment Platform:** Vercel

For project inquiries, custom requirements, or pricing clarification, contact us directly.

## 📄 License

Unless a separate license is included in this repository, the source code is provided for project development and demonstration purposes. Reuse, redistribution, and commercial use should be authorized by the repository owner.

---

**Durrani Web Developers — Ideas | Code | Real Solutions**
