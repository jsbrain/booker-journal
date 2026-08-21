# Booker Journal

A modern business inventory and customer sales management system built with Next.js 16, shadcn-ui, better-auth, and Drizzle ORM with PostgreSQL.

## Overview

Booker Journal is designed for business owners to manage global inventory and track sales to customers. Each project represents a customer with their own ledger of sales, payments, and outstanding balances. The admin purchases inventory globally which is then sold to customers, with automatic profit/cost tracking.

Operating model:

- The first registered account becomes the single approved admin.
- Additional internal users can register only when explicitly enabled and must
  be approved by the admin before they can access the app.
- Customers do not get accounts.
- Customers can only view data via read-only, expiring shared links.

See [PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md) for the operating assumptions
behind filtered activity, live portals, signed balances, negative inventory, and
accepted calculation precision.

## Features

### Core Features

- 🔐 **Email/password authentication** with better-auth
- ✅ **Controlled registration** - First-user admin bootstrap and approval for later users
- 📊 **Customer ledger tracking** - Each project represents a customer
- 🏪 **Global inventory management** - Track product purchases centrally
- 💰 **Automatic metrics** - Revenue, cost, profit calculations per customer or globally
- 📈 **Date-based analytics** - Filter metrics by custom date ranges
- 🛒 **Product catalog** - Manage products with default buying prices
- 💸 **Flexible entry types** - Sales, payments, refunds, adjustments
- ✏️ **Entry editing with history** - Full audit trail of changes
- 🔗 **Shareable links** - Read-only customer views with expiration
- ⚡ **Immediate payment option** - Create sale + payment in one action

### Technical Features

- 🎨 Beautiful dark mode UI with shadcn-ui components
- 🚀 Next.js 16 with App Router and Turbopack
- 📱 Fully responsive design with Tailwind CSS v4
- 🔒 Protected routes with session management
- 💾 PostgreSQL database with Drizzle ORM
- ✅ Type-safe validation with TypeBox
- 🐳 Docker Compose for local development

## Tech Stack

- **Framework:** Next.js 16
- **UI Library:** shadcn-ui (Radix UI primitives)
- **Authentication:** better-auth 1.x
- **Database:** PostgreSQL 17 with Drizzle ORM
- **Validation:** TypeBox request schemas plus database constraints
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Runtime:** Bun 1.3+

## Getting Started

### Prerequisites

- **Bun 1.3+** installed ([Install Bun](https://bun.sh))
- **Docker Desktop** (for local PostgreSQL) or access to hosted PostgreSQL

This repo uses Bun as the package manager/runtime (no npm/yarn/pnpm).

### Verification

Run the complete local quality check with:

```bash
bun run check
```

This runs ESLint, Next.js route type generation, TypeScript, the Bun regression
tests, and the repository-wide formatting check. Use `bun run build` separately
to verify the production bundle.

The TypeScript and ESLint major ranges are intentionally kept on the newest
versions supported by the TypeScript-ESLint stack included with
`eslint-config-next`; upgrading either across that compatibility boundary makes
ESLint fail before it can analyze the project.

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/jsbrain/booker-journal.git
cd booker-journal
```

1. **Install dependencies:**

```bash
bun install
```

1. **Set up environment variables:**

Copy `.env.example` to `.env` and configure:

```env
# Authentication
BETTER_AUTH_SECRET=your-secret-key-change-in-production
PORT=3005
BETTER_AUTH_URL=http://localhost:${PORT}
NEXT_PUBLIC_APP_URL=http://localhost:${PORT}

# Registration
# The first account is always created as the approved admin. Later signups are
# disabled by default; enable them temporarily so the admin can approve users.
ALLOW_USER_SIGNUP=false

# Shared link unlock protections
SHARED_LINK_UNLOCK_WINDOW_MS=600000
SHARED_LINK_UNLOCK_LOCKOUT_MS=900000
SHARED_LINK_UNLOCK_MAX_ATTEMPTS=5
SHARED_LINK_UNLOCK_MAX_TRACKED_KEYS=5000
# Two-minute browser access session after a successful password unlock.
SHARED_LINK_ACCESS_TOKEN_TTL_MS=120000

# Database - PostgreSQL (Docker Compose)
POSTGRES_DB=booker_journal
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=35432

# Database URL (uses variable substitution)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

1. **Start PostgreSQL with Docker:**

```bash
docker compose -f docker-compose.yaml up -d
```

1. **Run database migrations:**

```bash
# Local dev: push schema directly (fastest)
bun run db:push

# Optional (migration workflow):
# bun run db:generate
# bun run db:migrate
```

1. **Seed initial data (optional):**

```bash
bun run db:seed
```

This seeds a full demo dataset for local development (admin user, products, entry types, inventory purchases, sample customers/projects, and journal entries).

Seeding behavior is deterministic (no random values and no seed mode switch).
To recreate the seeded dataset for the same user, run with `FORCE_SEED=1 bun run db:seed`.

Default seeded login:

- Email: `manuel.maute@bradbit.com`
- Password: `examplepassword`

1. **Start the development server:**

```bash
bun run dev
```

1. **Open your browser:**
   Navigate to [http://localhost:3005](http://localhost:3005) (or whatever `PORT` you set)

## Usage Guide

### First-Time Setup

1. **Create the Admin**: On an empty database, sign up at `/login`. The first
   account is automatically approved and assigned the admin role.
2. **Access Dashboard**: You'll be redirected to `/dashboard`
3. **Create Products** (optional): Visit `/dashboard/admin` to set up your product catalog
4. **Create Customer**: Click "New Project" to add your first customer

For local development, you can instead use the seeded admin credentials after
running `bun run db:seed`.

Later signups are disabled by default. Set `ALLOW_USER_SIGNUP=true` and restart
the app to expose signup temporarily. Every later account starts unapproved and
cannot create a session or access application data until the admin approves it
under Dashboard → Admin. Set the variable back to `false` after registration.

### Managing Customers (Projects)

Each project represents a customer:

1. Click "New Project" in the dashboard
2. Enter customer name (e.g., "John Doe" or "ABC Company")
3. Set initial balance:
   - **Positive** = customer owes you (e.g., 100 for €100 debt)
   - **Negative** = you owe customer (e.g., -100 for €100 credit)
   - **Zero** = fresh start

Non-zero opening balances are stored as balance adjustments. They do not count
as sales, payments, revenue, or inventory movement.

### Recording Sales & Transactions

1. Open a customer's project
2. Click "New Entry"
3. Select entry type:
   - **Sale** - Selling products
   - **Payment** - Customer payments
   - **Refund** - Returns or refunds
   - **Adjustment** - Manual balance adjustments
4. If it's a sale, select the product (product is required only for `sale` entries)
5. Enter quantity and price per unit. For sales and payments, enter a positive
   price; the app applies the correct ledger sign.
6. Optionally add notes and timestamp
7. For sales, check "Paid immediately" to auto-create a matching payment entry

**Balance Calculation (displayed):** Balance = -Σ(amount × price) for all entries

**Ledger sign convention (important):**

- Sales are recorded with a negative `price`.
- Payments are recorded with a positive `price`.
- Displayed balance is computed as `-Σ(amount × price)`, so:
  - positive balance = customer owes you
  - negative balance = customer has credit

### Managing Inventory

Track what you purchase to sell:

1. Go to Dashboard → Click on the **Inventory** tab
2. Click "New Purchase"
3. Select product, enter quantity and buying price
4. Inventory is **global** - not tied to any specific customer
5. View total inventory across all purchases

### Viewing Metrics & Profitability

See revenue, costs, and profits:

1. Open a customer project → **Metrics** tab (per-customer metrics)
   OR
   Dashboard → **Metrics** tab (global metrics across all customers)

2. Select date range using the date picker
3. View:
   - **Revenue** - Total sales amount
   - **Cost** - Cost of goods sold (COGS) using weighted average
   - **Profit** - Revenue minus COGS
   - **Product breakdown** - Profitability per product

**Profit Calculation:**

- COGS uses a **moving weighted-average cost** per product, based on inventory purchases over time.
- Each sale is costed using the average cost **as of the sale timestamp**.
- Profit = Revenue - COGS

**Intentional limitations (current):**

- **Not FIFO / lot-tracking**: costs are computed via moving weighted-average (not FIFO, LIFO, or per-lot costing).
- **No stock enforcement**: inventory may go negative intentionally, making restocking needs visible.
- **Floating-point math**: database `numeric` values are parsed and calculated using JavaScript `number`, which may introduce small rounding differences.

This is an internal operational tool, not an accounting or statutory reporting
system. The calculations favor useful day-to-day visibility over accounting-grade
precision.

### Seeded Metrics Verification Dataset

`bun run db:seed` includes a small, deterministic dataset to verify date-range COGS behavior (Dec vs Jan vs Dec–Jan).

This creates:

- Product: **Metrics Scenario Flower**
- Project: **Metrics Scenario Customer**
- Purchases: 100 @ 1.00 (Nov 2025), 100 @ 2.00 (Jan 2026)
- Sales: 50 @ -3.00 (Dec 2025), 50 @ -3.00 (Jan 2026)

Suggested checks in the Metrics UI (values are approximate due to rounding):

- `2025-12-01 → 2025-12-31`: revenue ≈ 150, cost ≈ 50, profit ≈ 100
- `2026-01-01 → 2026-01-31`: revenue ≈ 150, cost ≈ 83.33, profit ≈ 66.67
- `2025-12-01 → 2026-01-31`: revenue ≈ 300, cost ≈ 133.33, profit ≈ 166.67

### Sharing Customer Views

Create read-only links for customers:

1. Open a customer project
1. Click "Share" button
1. Set expiration (hours or days)
1. Optionally set a date range (entries outside the range are hidden)
1. Copy the generated link
1. Share with customer - they can unlock a live, read-only view without login
1. Links expire automatically

Shared links are live portals: edits and new entries appear when the viewer
refreshes. When a date range is selected, the displayed **Activity Balance** is
the net change from the entries in that period, not the project’s complete
current balance. After password verification, each live JSON payload is
AES-256-GCM encrypted using a fresh key wrapped to an ephemeral RSA-OAEP key
generated by the viewer’s browser. Links never store customer-facing payload
snapshots or reusable decryption keys. A successful unlock creates a two-minute
browser access session by default; configure it with
`SHARED_LINK_ACCESS_TOKEN_TTL_MS`.

### Editing Entries

1. Click pencil icon on any entry
2. Modify amount, price, product, or notes
3. Save changes
4. Click "Edited" badge to view full edit history

### Admin Features

Access via Dashboard → Admin button:

- **Product Management**: Create, edit, delete products
- **Set Default Prices**: Configure default buying prices for products
- **User Approval**: Approve newly registered internal users before they can sign in

## Project Structure

```text
booker-journal/
├── app/
│   ├── api/auth/[...all]/        # Better-auth API routes
│   ├── api/shared/[token]/        # Shared link metadata/unlock/live-data APIs
│   ├── dashboard/                 # Protected dashboard
│   │   ├── admin/                 # Admin panel for products
│   │   └── projects/[id]/         # Customer detail pages
│   ├── shared/[token]/            # Public shared links
│   ├── login/                     # Sign-in and controlled registration page
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # shadcn-ui components
│   ├── admin/                     # Admin page sections/dialogs
│   ├── create-project-dialog.tsx  # New customer dialog
│   ├── create-entry-dialog.tsx    # New transaction dialog
│   ├── edit-entry-dialog.tsx      # Edit transaction dialog
│   ├── metrics-dashboard.tsx      # Revenue/profit metrics
│   ├── inventory-list.tsx         # Global inventory view
│   └── share-project-dialog.tsx   # Share link generator
├── lib/
│   ├── actions/                   # Server actions
│   │   ├── projects.ts            # Customer CRUD
│   │   ├── entries.ts             # Transaction CRUD
│   │   ├── products.ts            # Product catalog
│   │   ├── inventory.ts           # Inventory purchases
│   │   ├── metrics.ts             # Analytics calculations
│   │   ├── entry-types.ts         # Transaction types
│   │   ├── shared-links.ts        # Link sharing
│   │   └── users.ts               # Admin user approval
│   ├── domain/                    # Pure ledger, inventory, and metrics calculations
│   ├── db/
│   │   ├── schema.ts              # Drizzle schemas (source of truth)
│   │   ├── validation.ts          # TypeBox validation schemas
│   │   ├── validate.ts            # Validation utilities
│   │   └── seed-data.ts           # Database seeding
│   ├── authz/                     # Authz/session helpers
│   │   ├── session.ts             # getCurrentUserOrThrow
│   │   └── admin.ts               # Admin role guard
│   ├── auth-registration.ts       # Signup availability/bootstrap policy
│   ├── auth.ts                    # Better-auth server config
│   ├── auth-client.ts             # Auth client hooks
│   ├── shared-links.ts            # Public live-view access and response projection
│   ├── utils.ts
│   └── utils/env.ts               # Env parsing helpers
├── tests/                          # Bun domain and validation regression tests
├── PRODUCT_DECISIONS.md            # Confirmed operating assumptions
├── docker-compose.yaml            # PostgreSQL container (local dev)
├── drizzle.config.ts              # Drizzle configuration
└── .env                           # Environment variables
```

## Database Schema

### Core Tables

#### Users (managed by better-auth)

- Authentication, `admin`/`user` role, and approval state

#### Projects

- Customer ledgers
- Each project = one customer
- Tracks customer name and ownership

#### Journal Entries

- Sales, payments, refunds, adjustments
- Links to products for sales
- Edit history tracked in JSONB

#### Products

- Product catalog
- Optional default buying prices
- Used for both sales and inventory

#### Entry Types

- Transaction categories (Sale, Payment, Refund, Adjustment)
- Pre-seeded during initialization

#### Inventory Purchases

- Global inventory tracking (not per-customer)
- Records quantity and buying price at purchase time
- Used for COGS and profit calculations

#### Shared Links

- Shareable read-only customer views
- Secure token-based access
- Password verification with short-lived access sessions
- Automatic expiration
- Optional inclusive date filtering
- Live database reads with per-response browser-targeted encryption

**Better-auth tables:** `user`, `session`, `account`, `verification`

## Available Scripts

```bash
# Development
bun run dev              # Start Next.js dev server with Turbopack
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint
bun run typecheck        # Generate route types and check TypeScript
bun run test             # Run Bun regression tests
bun run format:check     # Verify formatting
bun run check            # Run lint, types, tests, and formatting

# Database
bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply migrations to database
bun run db:push          # Push schema directly (dev only)
bun run db:studio        # Open Drizzle Studio (DB GUI)
bun run db:seed          # Seed deterministic demo dataset
bun run db:setup         # Generate + migrate in one command

# Docker
docker compose up -d     # Start PostgreSQL
docker compose down      # Stop PostgreSQL
```

## Database Workflow (Deterministic)

- Local development:
  - Start DB: `docker compose -f docker-compose.yaml up -d`
  - Apply schema quickly: `bun run db:push`
  - Seed deterministic demo data (optional): `bun run db:seed`
  - Force reseed for existing seeded user data: `FORCE_SEED=1 bun run db:seed`
- Migration workflow (recommended for production):
  - Generate: `bun run db:generate`
  - Apply: `bun run db:migrate`

The migration history is a single clean baseline because the application has
not been deployed yet. It includes ownership foreign keys, positive-value
checks for transactional quantities, and indexes for project activity,
inventory, and shared-link access.

Note: On first project creation, the app also ensures entry types/products exist by calling `seedEntryTypes()` and `seedProducts()`.

## Architecture Patterns

### Validation Flow

All mutations follow a strict validation pattern:

1. **TypeBox request schema** (`lib/db/validation.ts`) validates the action or
   API boundary.
2. **Authentication and ownership checks** establish who may perform it.
3. **Domain invariants** enforce rules such as sale signs and product usage.
4. **Drizzle schema** (`lib/db/schema.ts`) provides types, foreign keys, checks,
   indexes, and the database source of truth.

```typescript
// Example pattern
validate(createProjectInputSchema, input)
const user = await getCurrentUserOrThrow()
const openingEntry = buildOpeningBalanceEntry(input.initialAmount)
await db.transaction(async (tx) => {
  /* compound write */
})
```

### Server Actions Pattern

All mutations use Next.js Server Actions:

```typescript
'use server'

async function getCurrentUser() {
  return getCurrentUserOrThrow()
}

export async function createProject(name: string, amount: number) {
  validate(createProjectInputSchema, { name, amount }) // 1. Validate
  const user = await getCurrentUser() // 2. Authenticate
  // 3. Execute operation
}
```

**Pattern:** Validate → Authenticate → Execute

### Environment Variable Expansion

Uses `dotenv-expand` for variable substitution in `.env`:

```env
POSTGRES_USER=postgres
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

Both `drizzle.config.ts` and `lib/auth.ts` use `expand(config())` to resolve variables.

## Key Concepts

### Balance Calculation

Displayed Balance = -Σ(amount × price) for all entries

- Positive balance = customer owes you money
- Negative balance = you owe customer (credit)
- Zero = account settled

### Profit Calculation (Average Cost Method)

1. Calculate weighted average buying price across all inventory purchases
2. COGS = Quantity sold × Average buying price
3. Profit = Revenue - COGS

### Global Inventory Model

- Admin purchases inventory globally (not per-customer)
- Inventory is tracked centrally across all sales
- When selling to customers, stock is deducted from global pool
- Buying prices from purchases are used for COGS calculation

### Numeric Fields

Drizzle `numeric` columns return strings. Always parse:

```typescript
const total = parseFloat(entry.amount) * parseFloat(entry.price)
```

## Security

- ✅ Passwords hashed with better-auth
- ✅ Secure session token storage
- ✅ Input validation on all server actions (TypeBox)
- ✅ Environment variables for sensitive config
- ✅ Cryptographically secure shared link tokens
- ✅ Bounded shared-link unlock anti-bruteforce controls (window/lockout/max attempts)
- ✅ Project access restricted to owners
- ✅ First-user admin bootstrap, disabled-by-default later signup, and admin approval
- ✅ Role guard for global admin resources and session denial for unapproved users
- ✅ Read-only mode for shared links
- ✅ Edit history tracking with user attribution

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Use Vercel Postgres or connect external PostgreSQL
5. Run migrations: `bun run db:migrate`

### Environment Variables for Production

```env
BETTER_AUTH_SECRET=<generate-strong-secret>
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOW_USER_SIGNUP=false
SHARED_LINK_ACCESS_TOKEN_TTL_MS=120000
DATABASE_URL=<your-postgres-connection-string>
```

## Production Checklist

- Set a strong `BETTER_AUTH_SECRET` (required in production).
- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your real public URL.
- Create the first account as admin on the production database, then keep
  `ALLOW_USER_SIGNUP=false` except during intentional registration windows.
- Approve every additional internal account from Dashboard → Admin.
- Provide a production PostgreSQL `DATABASE_URL` and run `bun run db:migrate`.
- Confirm the shared-link expiry, bounded unlock policy (`SHARED_LINK_UNLOCK_*`),
  and access-session TTL (`SHARED_LINK_ACCESS_TOKEN_TTL_MS`, two minutes by
  default) match your needs.
- Set up database backups and a restore procedure.
- Logging: avoid logging secrets/PII; rely on platform logs for server-side errors and keep client errors user-friendly.

**Database Options:**

- Vercel Postgres
- Supabase
- Neon
- Railway
- Self-hosted PostgreSQL

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [better-auth Documentation](https://www.better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Bun Documentation](https://bun.sh/docs)

## Contributing

This is a private project. For questions or issues, contact the repository owner.
