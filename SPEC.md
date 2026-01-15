# Booker Journal — Product & Technical Specification

Last updated: 2026-01-14

## 1) Purpose

Booker Journal is a lightweight business ledger and inventory tracker for a small business owner.

It supports:

- A global product catalog
- Global inventory purchases (what you buy to later sell)
- Per-customer ledgers (sales, payments, refunds, adjustments)
- Reporting (revenue, COGS, profit) per customer and globally
- Read-only sharing via expiring links

## 2) Glossary

- **User / Admin**: The authenticated business owner account.
- **Project**: A customer account / customer ledger.
- **Journal Entry**: A ledger line item (sale/payment/refund/adjustment).
- **Entry Type**: Category of journal entry (key: `sale`, `payment`, `refund`, `adjustment`).
- **Product**: A sellable item.
- **Inventory Purchase**: A record of buying inventory (quantity and buying price) for a product.
- **Balance**: The customer’s outstanding balance (receivable/payable) computed from entries.
- **Shared Link**: A public token granting read-only access to a project’s ledger.

## 3) Tenancy & Ownership

This app is intentionally designed for a **single admin user** (you). Customers do **not** get accounts.
They only access data via **read-only shared links** you generate.

### 3.1 Projects

- Each project belongs to exactly one user (`projects.userId`).
- All reads/writes to a project must verify ownership by the current user.

Operational assumption:

- There is only one real admin user in production. The ownership checks still remain to prevent accidental exposure and to keep the codebase safe if a second user ever exists.

### 3.2 Inventory

- Inventory purchases are global **per user** (`inventory_purchases.userId`).
- Inventory is not tied to a project/customer.

### 3.3 Customer access (shared links)

- Customers access the ledger only through a `shared_links.token` URL.
- Shared links are:
  - read-only
  - time-limited (`expiresAt`)
  - optionally date-filtered (`startDate` / `endDate`)

## 4) Data Model (authoritative)

Authoritative DB schema is in `lib/db/schema.ts`.

### 4.1 Tables

- **projects**: customer accounts
  - `id`, `name`, `userId`, timestamps
- **journal_entries**: ledger items
  - `id`, `projectId`, `amount`, `price`, `typeId`, `productId?`, `note?`, `timestamp`, `editHistory?`
- **entry_types**: categories
  - `id`, `key`, `name`
- **products**: sellable items
  - `id`, `key`, `name`, `defaultBuyingPrice?`
- **inventory_purchases**: inventory buying history
  - `id`, `userId`, `productId`, `quantity`, `buyingPrice`, `totalCost`, `purchaseDate`, `note?`
- **shared_links**: read-only access tokens
  - `id`, `projectId`, `token`, `expiresAt`, `startDate?`, `endDate?`

## 5) Ledger Sign Conventions (critical)

This system is implemented as a ledger with signed totals.

### 5.1 Entry total

For a journal entry:

- `entryTotal = amount × price`

Recommended input conventions:

- `amount` is typically a positive quantity.
- `price` is signed based on entry type.

### 5.2 Entry types

- **sale**: represents a customer purchase that increases receivable
  - implemented as a **negative** price
  - example: `amount=10`, `price=-5` ⇒ `entryTotal=-50`
- **payment**: reduces receivable
  - implemented as a **positive** price
  - example: `amount=10`, `price=+5` ⇒ `entryTotal=+50`
- **refund** / **adjustment**:
  - must follow the same invariant: the sign of `price` determines whether it increases receivable (negative) or decreases it (positive).
  - the UI should guide users consistently for these types.

### 5.3 Balance definition

Displayed **project balance** is:

- `balance = - Σ(entryTotal)` across that project’s entries

Interpretation:

- `balance > 0`: customer owes money (receivable)
- `balance < 0`: customer has credit (you owe them / payable)

This definition is consistent with:

- sales recorded as negative totals
- payments recorded as positive totals

### 5.4 Initial balance

User-facing initial balance input is defined as:

- **positive** value ⇒ customer owes you (receivable)
- **negative** value ⇒ customer has credit (you owe them)

Implementation requirement:

- The app must translate this user-facing value into the ledger convention (sale negative, payment positive) so the displayed balance matches user intent.

## 6) Workflows

### 6.1 Create customer (project)

- Validate input
- Ensure seed data exists (entry types + products)
- Insert project
- Insert initial journal entry

### 6.2 Record a sale

- Validate entry input
- Verify project ownership
- Require `productId` when type is `sale`
- Insert journal entry

### 6.3 Record a payment

- Validate entry input
- Verify project ownership
- Payments should not have a product
- Insert journal entry

### 6.4 “Immediate payment” sale

- Insert sale entry
- Insert matching payment entry (same quantity, same magnitude, opposite sign)

### 6.5 Inventory purchase

- Validate input
- Insert inventory purchase for the current user
- `totalCost = quantity × buyingPrice`

### 6.6 Sharing

- Generate random token
- Store token with expiry + optional date range
- Public route can read project + entries via token and expiry

## 7) Reporting & Metrics

### 7.1 Revenue

- Revenue is derived from sales entries only.
- With negative-price sales, revenue for a sale entry is `abs(amount × price)`.

### 7.2 COGS and Profit (Average Cost)

COGS is computed using a **moving weighted-average cost** per product:

- Purchases update the running average cost at their `purchaseDate`.
- Each sale is costed using the average cost **as-of the sale timestamp**.
- Metrics are computed by replaying purchase + sale events up to the report `endDate`, but only accumulating totals for sales inside the selected `[startDate, endDate]`.

Profit is:

$\text{profit} = \text{revenue} - \text{COGS}$

### 7.3 Known limitations (current implementation)

- Not FIFO / lot-tracking: costs are computed via moving weighted-average, not FIFO/LIFO/per-lot.
- No stock validation: sales can exceed purchased quantity (inventory can go negative).
- Numeric math uses floating point after parsing strings; may drift for high volume.

### 7.4 Optional metrics verification dataset

The default seed (`bun run db:seed`) includes a deterministic dataset to validate date-range behavior (Dec vs Jan vs Dec–Jan).

This creates a single scenario project/product with:

- Purchases: 100 @ 1.00 (Nov 2025), 100 @ 2.00 (Jan 2026)
- Sales: 50 @ -3.00 (Dec 2025), 50 @ -3.00 (Jan 2026)

Expected (approx) totals:

- Dec 2025 only: revenue ≈ 150, COGS ≈ 50, profit ≈ 100
- Jan 2026 only: revenue ≈ 150, COGS ≈ 83.33, profit ≈ 66.67
- Dec–Jan: revenue ≈ 300, COGS ≈ 133.33, profit ≈ 166.67

## 8) Validation and Error Handling

- All server actions must follow: Validate → Authenticate → Execute.
- Validation schemas are derived from Drizzle using drizzle-typebox and extended via TypeBox.

## 9) Security

- Auth via better-auth (email/password)
- Project access restricted to owner
- Shared links are read-only, token-based, and expire

## 10) Non-goals (for now)

- Multi-user roles/permissions beyond “owner”
- Purchase orders, suppliers, invoicing, taxes
- FIFO/LIFO inventory accounting

## 11) Future enhancements

- Per-user scoping for products and entry types
- Enforce invariants in validation (e.g., amount ≥ 0, product required for sale)
- Historical metrics using inventory purchases “as-of” period end
- Decimal arithmetic for money (or integer cents)
- Stock enforcement and low-stock alerts
