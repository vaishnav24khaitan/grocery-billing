# Grocery Store Billing App

A simple web platform for a grocery store, built with **Next.js (App Router) + TypeScript + Tailwind CSS**, **MongoDB** (via Mongoose), and Next.js serverless route handlers for the backend. Deployable to **Vercel**.

## Features

- **Admin** (`/admin`, password protected): create, edit, and delete products with name, price, unit, category, stock quantity, and optional image.
- **Billing** (`/`): browse products in a grid, search / filter by category, add items with quantity to a cart, and see a running total in ₹.
- **Checkout → Bill**: no payment step — generates a printable tax invoice with line items and grand total.
- **Export & share**: download the bill as **PDF** or **image**, **print** it, or share it via the browser **Web Share API** (native share sheet → WhatsApp, etc.).
- **Sales reports** (admin): each completed checkout is recorded; the admin **Sales** tab shows today's and this month's totals plus a 30-day daily and 12-month monthly breakdown (grouped in IST).

## Tech

| Layer     | Choice                                   |
| --------- | ---------------------------------------- |
| Framework | Next.js 16 (App Router)                  |
| Language  | TypeScript                               |
| Styling   | Tailwind CSS v4                          |
| Backend   | Next.js route handlers (`src/app/api`)   |
| Database  | MongoDB + Mongoose                       |
| Export    | html2canvas + jsPDF, Web Share API       |

## Getting started (local)

### 1. Prerequisites

- Node.js 20+
- A MongoDB database. The easiest option is a free **MongoDB Atlas** cluster (works both locally and on Vercel).

### 2. Configure environment

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

| Variable                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `MONGODB_URI`           | MongoDB connection string (Atlas SRV string works)     |
| `ADMIN_PASSWORD`        | Password for the `/admin` screen                       |
| `NEXT_PUBLIC_SHOP_NAME` | Shop name shown in header and on the bill              |

### 3. Install & seed

```bash
npm install
npm run seed     # optional: inserts ~14 sample products
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 (billing) and http://localhost:3000/admin (admin).

## Project structure

```
src/
  app/
    api/
      admin/login/route.ts     # POST — set admin session cookie
      admin/logout/route.ts    # POST — clear session
      products/route.ts        # GET list (public), POST create (admin)
      products/[id]/route.ts   # GET, PUT (admin), DELETE (admin)
      sales/route.ts           # POST — record a completed sale (public)
      sales/summary/route.ts   # GET — daily/monthly sales report (admin)
    admin/page.tsx             # server-gated admin screen (Products + Sales tabs)
    page.tsx                   # billing screen
    layout.tsx
  components/                  # UI (SiteHeader, AdminLogin, AdminDashboard, SalesReport, BillingApp, Bill)
  lib/
    db.ts                      # serverless-safe Mongoose connection cache
    auth.ts                    # shared-password session (HMAC cookie)
    products.ts                # validation + serialization
    api.ts                     # client fetch helpers
    types.ts                   # client-safe shared types
  models/
    Product.ts                 # Mongoose Product model
    Sale.ts                    # Mongoose Sale model
scripts/seed.mjs               # sample data seeder
```

## Deployment (Vercel + GitHub)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

## Notes

- Admin auth is intentionally lightweight (a single shared password, no user accounts) per requirements. The session cookie is an HMAC keyed by `ADMIN_PASSWORD`, so rotating the password invalidates old sessions.
- There is **no payment integration** by design.
- Sharing an actual file over WhatsApp uses the browser Web Share API, which requires HTTPS (works on Vercel) and a browser that supports file sharing (most mobile browsers). On unsupported browsers the app falls back to a text share or download.
