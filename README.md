# Durrani Web Developers — Professional Web Application Platform

A complete, production-oriented web application for **Durrani Web Developers**, a software engineering business that builds custom web applications, e-commerce stores, restaurant ordering systems, SaaS projects, and business management software.

Developed with **Google Antigravity** and **Visual Studio Code**, built on **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**, with dual database readiness (**Local Persistent Store** + **Supabase PostgreSQL**), engineered for seamless deployment on **Vercel**.

---

## 🚀 Live Brand Details
- **Business Name:** Durrani Web Developers
- **Tagline:** Ideas | Code | Real Solutions
- **Headline:** *We Turn Your Ideas Into Powerful Web Applications*
- **Official Email:** `durraniwebdevelopers@gmail.com`
- **Phone / WhatsApp:** `03299669565` (International: `+92 329 9669565`)
- **Default Currency:** Pakistani Rupees (PKR)
- **Deployment Platform:** Vercel

---

## 🎨 Design System & Visual Identity
- **Primary Red:** `#E31E36`
- **Deep Black:** `#101216`
- **Dark Surface:** `#181B20` & `#242830`
- **Light Grey:** `#F4F5F7`
- **Pure White:** `#FFFFFF`

---

## 🌟 Key Application Features

### 1. Public Business Portal
- **Home Page (`/`)**: Hero section with official branding, flyer visual showcase, trust badges, packages overview, industries served, portfolio highlights, ordering workflow, FAQs, and WhatsApp CTAs.
- **Services Page (`/services`)**: In-depth service breakdowns for Restaurant Ordering, E-Commerce, Jewellery Showrooms, Cosmetics, Fashion, Grocery, SaaS, CRM, Booking, and Inventory systems with direct calculator links.
- **Portfolio Archive (`/portfolio`)**: Interactive category filtering, live search by project name or technology, project detail modals, live demo links, and strictly privacy-compliant public budget badges (with client consent checks).
- **Pricing & Rates (`/pricing`)**: Transparent breakdown of Package 1 (Without Client Admin - PKR 35,000) and Package 2 (With Client Admin - PKR 45,000) with exact 11-month installment schedules, daily cost rates (PKR 95.89 vs PKR 123.29), and modular add-on rules.
- **Interactive Budget Calculator (`/calculator`)**: Multi-step questionnaire (8 steps) featuring real-time budget calculations, add-on feature selection (+PKR 10,000 rules), installment projections, inquiry submission, unique reference code generation (`DW-XXXXXX`), confetti celebration, and direct pre-filled WhatsApp links.
- **Inquiry Status Tracker (`/track-order`)**: Sanitized milestone tracker requiring reference ID + matching email, isolating client data while displaying the live pipeline (*New Inquiry* → *Under Review* → *Contacted* → *Quotation Sent* → *Awaiting Advance* → *Approved* → *In Development* → *Delivered*).
- **Contact (`/contact`)**: Form submissions, direct click-to-call, click-to-email, and one-click WhatsApp chat.

### 2. Secure Private Admin Panel
- **Login (`/admin/login`)**: Protected by HMAC session cookies and rate-limiting brute-force guards.
- **Executive Dashboard (`/admin/dashboard`)**: Live metrics (Total Clients, Active Projects, Inquiries Inbox, Verified Revenue Received, Outstanding Balances, Awaiting Verification), monthly revenue bar charts, and recent activity audit stream.
- **Inquiries Inbox (`/admin/inquiries`)**: Full review of customer questionnaire submissions, status changes, direct WhatsApp messaging, and **1-Click Conversion into Active Projects & Registered Clients**.
- **Active Projects (`/admin/projects`)**: Delivery timeline management, Vercel deployment URLs, milestone status updates, and private internal notes.
- **Clients Directory (`/admin/clients`)**: Customer directory, total billed/paid balances, contact details, and soft archiving.
- **Payment Verification (`/admin/payments`)**: Financial ledger supporting JazzCash, EasyPaisa, and Bank Transfer with admin verification before applying funds to project balances.
- **Customer Payments (`/payment`)**: Pakistan-only JazzCash, Easypaisa, and bank-transfer instructions; private receipt submission; and Safepay hosted card checkout when the gateway configuration, payment database table, and public webhook endpoint are ready.
- **Receipt Reviews (`/admin/payment-proofs`)**: Admin-only short-lived links to private customer receipts, with pending/verified/rejected review actions.
- **Payment Instructions (`/admin/settings`)**: Admin-editable wallet and bank-transfer details; no CNIC/identity number is requested or displayed.
- **Project Invoices (`/admin/invoices`)**: Commercial invoice generator with itemized deliverables, payment terms, advance deductions, and print-to-PDF formatting (`window.print()`).
- **Dynamic Pricing Rules (`/admin/pricing`)**: Change base rates (35k / 45k), advance amounts, installment counts, and modular add-on prices in real time without modifying source code.
- **Portfolio & Privacy (`/admin/portfolio`)**: Add/edit portfolio projects, toggle public/private visibility, approve consented public budgets, and manage demo URLs.
- **Automated Monthly Reminders (`/admin/reminders`)**: Automated installment reminder engine supporting 7-day, 3-day, on-due-date, and overdue triggers, with manual WhatsApp dispatch and Vercel Cron worker integration.
- **Settings & Audit Logs (`/admin/settings`)**: System settings, technical runtime statuses, and tamper-evident audit history.

---

## 🛠 Local Setup & Running Instructions

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **npm**: v9+ or v10+

### 2. Installation
```bash
# Clone or navigate to the project directory
cd durrani-web-developers

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

There are no source-code default admin credentials. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in the ignored `.env.local` file before signing in. For Vercel, configure these as server-side environment variables; use the requested dashboard username and enter the initial password privately in the Vercel dashboard. Production authentication stays disabled until explicit credentials and a session secret are configured.

The Settings dashboard includes an admin password-change form. To persist password changes across Vercel deployments, first run [`supabase/admin-credentials.sql`](./supabase/admin-credentials.sql) in the dedicated DWD Supabase project and configure `NEXT_PUBLIC_SUPABASE_URL` plus the server-only `SUPABASE_SERVICE_ROLE_KEY`. Passwords are stored as salted scrypt hashes; the initial `ADMIN_PASSWORD` is used only until the first successful password change is saved. Do not put the password in source files or `NEXT_PUBLIC_*` variables.

### Automatic admin notifications

New calculator inquiries, contact messages, payment orders/receipts, and confirmed Safepay payments trigger independent email and WhatsApp alerts. A provider failure is logged and does not discard a successfully saved submission.

- **Email:** Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` with a sender verified in Resend. Set `ADMIN_NOTIFICATION_EMAIL` to override the default DWD business email.
- **WhatsApp:** Configure `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ADMIN_PHONE` in international digits. Create and get Meta approval for the WhatsApp message template named by `WHATSAPP_ADMIN_TEMPLATE_NAME`, then set its language. The template body must contain four placeholders, in order: alert type, reference, customer name/phone, and details.
- Keep all provider secrets server-side in `.env.local`/Vercel environment variables. Without the corresponding provider settings, that channel is logged as not configured and cannot deliver alerts.

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the public website or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) for the admin portal.

### 5. Running the Test Suite
```bash
npm test
```
Runs the automated unit test suite verifying:
- Package 1 & 2 budget formulas
- Exact 11-month installment reconciliation
- Add-on deduplication
- WhatsApp link formatting
- Admin token cryptography & security
- Rate limiter enforcement
- DataStore ledger isolation

---

## 🗄 Database & Supabase Deployment

The application features a dual data architecture:
1. **Core application store**: `DataStore` continues to use `data/db.json` for inquiries, clients, projects, invoices, the existing financial ledger, and general settings.
2. **Supabase PostgreSQL schema**: Core tables are defined in `supabase/schema.sql`. The separate `supabase/payment-workflow.sql` migration adds Supabase-backed payment instructions and private customer receipt submissions; those payment workflows do not imply that the rest of `DataStore` has migrated from JSON.

To deploy to Supabase:
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql`, copy all contents, and execute.
4. Copy your project URL, anon key, and service role key into your Vercel Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Daily visitor counts

The public footer reports unique daily visitors, visitors who opened the budget calculator, and visitors who completed a successful URL estimate. Counts use Pakistan's calendar day and refresh every 30 seconds. The browser keeps a random, per-day identifier; only its SHA-256 hash is sent to the server, and per-visitor hashes older than two days are cleaned up when new events are recorded. Aggregated daily totals remain available.

1. Run [`supabase/visitor-analytics.sql`](./supabase/visitor-analytics.sql) in the dedicated DWD Supabase SQL Editor.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` and Vercel.
3. Restart/redeploy and load any public page. If Supabase or the migration is unavailable, the footer explicitly shows that visitor counts are unavailable rather than showing a false zero.

### Private payment receipt setup

Receipt files and editable transfer instructions require a **dedicated Durrani Web Developers Supabase project**. Do not reuse a customer or GRILLVI database.

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/payment-workflow.sql`](./supabase/payment-workflow.sql). It creates a locked-down settings table, a receipt metadata table, and a **private** `payment-receipts` Storage bucket. There is no public read policy for uploaded receipts.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to local `.env.local` and Vercel project environment variables. Obtain the service-role key from Supabase project settings. Keep it server-side only; never put it in client code or share it in chat.
4. Restart the local server / redeploy Vercel, then sign in to `/admin/settings` and enter the JazzCash/Easypaisa recipient, bank/account information, and enabled Pakistan payment methods. The website only shows a method once its required details have been saved.
5. Open `/payment` from a Pakistan connection, make a small test transfer, submit the receipt, and review it at `/admin/payment-proofs`. An uploaded receipt stays pending until an authenticated admin confirms the money was actually received in the relevant provider/bank account. Receipt verification is stored in Supabase and does not automatically mark a row in the separate legacy project financial ledger as paid.

### Safepay hosted card checkout

The integration uses Safepay's official Node SDK and hosted checkout. Card data is entered on Safepay, never collected by this application. A checkout stays pending until a valid `X-SFPY-SIGNATURE` webhook for `payment.succeeded` matches the saved tracker, order reference, amount, and currency. The browser return URL is informational only and never marks a payment paid.

1. In the dedicated DWD Supabase project, review and run [`supabase/safepay-checkout.sql`](./supabase/safepay-checkout.sql). This adds an isolated `gateway_payments` table and does not alter existing payment records.
2. In the Safepay **sandbox** dashboard, retrieve its **Public API Key** (used as `merchant_api_key`), **Private API Secret Key**, and webhook shared secret. Add them to `.env.local` as `SAFEPAY_PUBLIC_KEY`, `SAFEPAY_SECRET_KEY`, and `SAFEPAY_WEBHOOK_SECRET`. Do not use production credentials for sandbox tests and do not put secrets in `NEXT_PUBLIC_*` variables.
3. Set `SAFEPAY_ENVIRONMENT=sandbox` and set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin where this app can be reached. `http://localhost:3000` is not a reachable webhook destination; for local checkout tests, use a secure public HTTPS tunnel that forwards to the local app.
4. In the Safepay sandbox dashboard, add the webhook endpoint `https://<your-public-host>/api/webhooks/safepay` and subscribe to the `payment.succeeded` event. Use that endpoint's sandbox webhook secret in `SAFEPAY_WEBHOOK_SECRET`.
5. Restart the app, then check `/admin/settings`. Safepay is ready only when its server-side variables, the `gateway_payments` table, and the configured HTTPS origin are available. Try a sandbox test card from [Safepay's test-card guide](https://safepay-docs.netlify.app/developers/safepay/test-cards); confirm the signed webhook is received and the transaction appears at `/admin/payment-proofs`.
6. This implementation is Sandbox-only: `SAFEPAY_ENVIRONMENT=production` is rejected and live card checkout is disabled. Do not use production keys or enable live payments. A separately reviewed change is required after merchant approval and confirmation of supported presentment/settlement currencies and fees.

Card checkout remains unavailable if required configuration or the database migration is missing. Valid webhook confirmations are recorded in the Supabase gateway table; they do not automatically modify the separate legacy project-finance ledger.

---

## ☁ Vercel Deployment Instructions

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project** → Select your repository.
3. In **Environment Variables**, add:
   - `ADMIN_USERNAME`: Your production admin username
   - `ADMIN_PASSWORD`: Strong production admin password
   - `SESSION_SECRET`: A secure random 64-character string
   - `CRON_SECRET`: Random secret string for Vercel Cron jobs
   - `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: Required to persist a changed admin password
   - For Sandbox card testing only, also configure `SAFEPAY_PUBLIC_KEY`, `SAFEPAY_SECRET_KEY`, `SAFEPAY_WEBHOOK_SECRET`, `SAFEPAY_ENVIRONMENT=sandbox`, and `NEXT_PUBLIC_SITE_URL` using values/origin for the public HTTPS deployment. Register `https://<your-public-host>/api/webhooks/safepay` in Safepay's Sandbox dashboard.
4. Click **Deploy**.
5. Your web application is now live on Vercel!

**Preview/persistence note:** Do not use the Vercel preview to accept customer inquiries, orders, or business payment updates yet. Core `DataStore` records still use `data/db.json`, which is not durable on Vercel's serverless filesystem. Migrate those workflows to persistent storage before accepting real customer submissions. The local `data/db.json` is intentionally excluded from Git because it can contain private customer and payment information.

---

## 🔒 Security Best Practices
- **No Secret Leaks**: No credentials, private tokens, or Supabase service keys are included in public frontend bundles.
- **Client Data Isolation**: Public order tracking requires both reference code and matching email. Private notes and other client financial ledgers are strictly filtered out on the server.
- **Verification Before Paid**: Payments submitted manually (JazzCash / EasyPaisa) require an administrator's verification action before advancing project balance or status.
