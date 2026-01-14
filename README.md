# Booker Journal

A modern business inventory and customer sales management system built with Next.js 16, shadcn-ui, better-auth, and Drizzle ORM with PostgreSQL.

## Overview

Booker Journal is designed for business owners to manage global inventory and track sales to customers. Each project represents a customer with their own ledger of sales, payments, and outstanding balances. The admin purchases inventory globally which is then sold to customers, with automatic profit/cost tracking.

## Features

### Core Features

- 🔐 **Email/password authentication** with better-auth
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

- **Framework:** Next.js 16.0.0
- **UI Library:** shadcn-ui (Radix UI primitives)
- **Authentication:** better-auth 1.3.29
- **Database:** PostgreSQL 17 with Drizzle ORM
- **Validation:** TypeBox with drizzle-typebox integration
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Runtime:** Bun 1.3+

## Getting Started

### Prerequisites

- **Bun 1.3+** installed ([Install Bun](https://bun.sh))
- **Docker Desktop** (for local PostgreSQL) or access to hosted PostgreSQL

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/jsbrain/booker-journal.git
cd booker-journal
```

2. **Install dependencies:**

```bash
bun install
```

3. **Set up environment variables:**

Copy `.env.example` to `.env` and configure:

```env
# Authentication
BETTER_AUTH_SECRET=your-secret-key-change-in-production
PORT=3005
NEXT_PUBLIC_APP_URL=http://localhost:${PORT}

# Database - PostgreSQL (Docker Compose)
POSTGRES_DB=booker_journal
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=35432

# Database URL (uses variable substitution)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

4. **Start PostgreSQL with Docker:**

```bash
docker compose -f docker-compose.dev.yaml up -d
```

5. **Run database migrations:**

```bash
bun run db:generate
bun run db:migrate
```

6. **Seed initial data (optional):**

```bash
bun run db:seed
```

This seeds entry types (Sale, Payment, Refund, Adjustment) and sample products.

7. **Start the development server:**

```bash
bun run dev
```

8. **Open your browser:**
   Navigate to [http://localhost:3005](http://localhost:3005) (or whatever `PORT` you set)

## Usage Guide

### First-Time Setup

1. **Sign Up**: Create your admin account at `/login`
2. **Access Dashboard**: You'll be redirected to `/dashboard`
3. **Create Products** (optional): Visit `/dashboard/admin` to set up your product catalog
4. **Create Customer**: Click "New Project" to add your first customer

### Managing Customers (Projects)

Each project represents a customer:

1. Click "New Project" in the dashboard
2. Enter customer name (e.g., "John Doe" or "ABC Company")
3. Set initial balance:
   - **Positive** = customer owes you (e.g., 100 for €100 debt)
   - **Negative** = you owe customer (e.g., -100 for €100 credit)
   - **Zero** = fresh start

### Recording Sales & Transactions

1. Open a customer's project
2. Click "New Entry"
3. Select entry type:
   - **Sale** - Selling products (typically negative price)
   - **Payment** - Customer payments (typically positive price)
   - **Refund** - Returns or refunds
   - **Adjustment** - Manual balance adjustments
4. If it's a sale, select the product (only shows for Purchase/Sale types)
5. Enter quantity and price per unit
6. Optionally add notes and timestamp
7. For purchases, check "Paid immediately" to auto-create payment entry

**Balance Calculation (displayed):** Balance = -Σ(amount × price) for all entries

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

- Average buying price = Total inventory cost ÷ Total quantity purchased
- COGS = Quantity sold × Average buying price
- Profit = Revenue - COGS

### Sharing Customer Views

Create read-only links for customers:

1. Open a customer project
2. Click "Share" button
3. Set expiration (in days)
4. Copy the generated link
5. Share with customer - they can view entries without login
6. Links expire automatically

### Editing Entries

1. Click pencil icon on any entry
2. Modify amount, price, product, or notes
3. Save changes
4. Click "Edited" badge to view full edit history

### Admin Features

Access via Dashboard → Admin button:

- **Product Management**: Create, edit, delete products
- **Set Default Prices**: Configure default buying prices for products
- **Entry Types**: Manage transaction categories (pre-seeded)

## Project Structure

```
booker-journal/
├── app/
│   ├── api/auth/[...all]/        # Better-auth API routes
│   ├── dashboard/                 # Protected dashboard
│   │   ├── admin/                 # Admin panel for products
│   │   └── projects/[id]/         # Customer detail pages
│   ├── shared/[token]/            # Public shared links
│   ├── login/                     # Login/signup page
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # shadcn-ui components
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
│   │   └── shared-links.ts        # Link sharing
│   ├── db/
│   │   ├── schema.ts              # Drizzle schemas (source of truth)
│   │   ├── validation.ts          # TypeBox validation schemas
│   │   ├── validate.ts            # Validation utilities
│   │   └── seed-data.ts           # Database seeding
│   ├── auth.ts                    # Better-auth server config
│   ├── auth-client.ts             # Auth client hooks
│   └── utils.ts
├── docker-compose.dev.yaml        # PostgreSQL container (local dev)
├── drizzle.config.ts              # Drizzle configuration
└── .env                           # Environment variables
```

## Database Schema

### Core Tables

**users** (managed by better-auth)

- Authentication and user data

**projects**

- Customer ledgers
- Each project = one customer
- Tracks customer name and ownership

**journal_entries**

- Sales, payments, refunds, adjustments
- Links to products for sales
- Edit history tracked in JSONB

**products**

- Product catalog
- Optional default buying prices
- Used for both sales and inventory

**entry_types**

- Transaction categories (Sale, Payment, Refund, Adjustment)
- Pre-seeded during initialization

**inventory_purchases**

- Global inventory tracking (not per-customer)
- Records quantity and buying price at purchase time
- Used for COGS and profit calculations

**shared_links**

- Shareable read-only customer views
- Secure token-based access
- Automatic expiration

**Better-auth tables:** `user`, `session`, `account`, `verification`

## Available Scripts

```bash
# Development
bun run dev              # Start Next.js dev server with Turbopack
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint

# Database
bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply migrations to database
bun run db:push          # Push schema directly (dev only)
bun run db:studio        # Open Drizzle Studio (DB GUI)
bun run db:seed          # Seed entry types and products
bun run db:setup         # Generate + migrate in one command

# Docker
docker compose up -d     # Start PostgreSQL
docker compose down      # Stop PostgreSQL
```

## Architecture Patterns

### Validation Flow

All data follows a strict validation pattern:

1. **Drizzle Schema** (`lib/db/schema.ts`) - Database structure (source of truth)
2. **TypeBox Schema** (`lib/db/validation.ts`) - Derived from Drizzle using `drizzle-typebox`
3. **Extended Schemas** - Merge or extend base schemas for API-specific needs
4. **Type Inference** - TypeScript types inferred from TypeBox schemas
5. **Runtime Validation** - All server actions validate with TypeBox before execution

```typescript
// Example pattern
export const projects = pgTable("projects", {...})  // 1. Drizzle
export const selectProjectSchema = createSelectSchema(projects)  // 2. TypeBox
export const createProjectInput = Type.Object({...})  // 3. Extended
export type CreateProjectInput = Static<typeof createProjectInput>  // 4. Infer
validate(createProjectInput, data)  // 5. Validate
```

### Server Actions Pattern

All mutations use Next.js Server Actions:

```typescript
'use server'

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user
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
- ✅ Project access restricted to owners
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
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_URL=<your-postgres-connection-string>
```

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

## License

MIT License - see LICENSE file for details.
