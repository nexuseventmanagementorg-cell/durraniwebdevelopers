# Restaurant Website Template

A customizable restaurant website with an online menu, ordering, QR table service, and a staff dashboard.

## Features

- Responsive menu, product, and deal pages
- Customer checkout and order tracking
- QR-based dine-in ordering
- Staff dashboard for menus, orders, tables, settings, and reports
- Local file storage by default, with optional Supabase support
- Business name, contact information, address, menu, and hours managed in settings

## Getting started

1. Install Node.js 20 or later.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set unique admin credentials and a session secret.
4. Start the development server with `npm run dev`.
5. Open `http://localhost:3000` and sign in at `/admin/login`.
6. Add the restaurant's WhatsApp number in Settings before enabling customer orders.

The app starts with a neutral restaurant name and no business phone number, address, map, or social-media links. Add a real business identity and contact details only after configuring this template for its owner.

## Commands

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — start the production server
- `npm run lint` — check the source with ESLint

## Configuration

- Admin credentials: `.env.local`
- Restaurant profile and WhatsApp number: Admin → Settings
- Products, deals, and tables: Admin dashboard
- Optional database and storage: Supabase environment variables in `.env.example`

The WhatsApp order flow remains disabled until a restaurant WhatsApp number is configured.
