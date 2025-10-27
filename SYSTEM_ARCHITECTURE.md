# System Architecture: Business Inventory and Customer Sales

## Overview

The Booker Journal system is designed for a business owner (admin) to manage global inventory and track sales to customers. Each project represents a customer, and the admin purchases inventory globally which is then sold to customers.

## Core Concepts

### 1. Admin User
- The business owner who manages the entire system
- Purchases inventory globally (not customer-specific)
- Creates products and manages product catalog
- Tracks sales to customers and profitability

### 2. Products
- Items that the business sells (e.g., Blumen, Pfannen, Schokolade)
- Managed in the admin panel
- Have optional default buying prices
- Used for both inventory purchases and sales

### 3. Global Inventory
- **Key Change**: Inventory is now GLOBAL, not per-customer
- Admin purchases products (e.g., 100 Blumen for €5 each on 01.01.2025)
- Inventory is tracked centrally across all customer sales
- Current stock = Total purchased - Total sold (across all customers)

### 4. Customers (Projects)
- Each project represents a customer
- Admin makes sales to customers
- Tracks what each customer owes (outstanding balance)
- Calculates revenue, cost, and profit per customer

### 5. Entry Types
- Sale: Selling products to customers (creates debt/receivable)
- Payment: Customer paying their debt
- Refund: Returning products or issuing refunds
- Adjustment: Manual corrections

## Database Schema

### Users Table
```sql
CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
```

### Products Table (Admin-managed catalog)
```sql
CREATE TABLE "products" (
  "id" text PRIMARY KEY,
  "key" text UNIQUE,
  "name" text,
  "default_buying_price" numeric(10, 2),
  "created_at" timestamp DEFAULT now()
);
```

### Inventory Purchases (GLOBAL per admin user)
```sql
CREATE TABLE "inventory_purchases" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,  -- CHANGED FROM project_id
  "product_id" text NOT NULL,
  "quantity" numeric(10, 2),
  "buying_price" numeric(10, 2),
  "total_cost" numeric(10, 2),
  "purchase_date" timestamp,
  FOREIGN KEY ("user_id") REFERENCES "user"("id"),
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
```

**Key Point**: `user_id` makes inventory global to the admin, not tied to any specific customer.

### Projects (Customers)
```sql
CREATE TABLE "projects" (
  "id" text PRIMARY KEY,
  "name" text,            -- Customer name
  "user_id" text,         -- Admin who owns this customer
  "created_at" timestamp,
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
);
```

### Journal Entries (Sales and Payments)
```sql
CREATE TABLE "journal_entries" (
  "id" text PRIMARY KEY,
  "project_id" text,      -- Which customer
  "amount" numeric(10, 2),
  "price" numeric(10, 2),
  "type_id" text,         -- Sale, Payment, etc.
  "product_id" text,      -- What product (for sales only)
  "timestamp" timestamp,
  FOREIGN KEY ("project_id") REFERENCES "projects"("id"),
  FOREIGN KEY ("type_id") REFERENCES "entry_types"("id"),
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
```

## Business Flow Example

### Scenario: Selling Blumen to Customer A

1. **Admin purchases global inventory**:
   - Buy 100 Blumen for €5 each on 01.01.2025
   - Record in `inventory_purchases` with `user_id` = admin's ID
   - Total cost: €500

2. **Admin creates customer**:
   - Create project "Customer A" representing the customer

3. **Admin makes sales**:
   - Sale 1: 10 Blumen to Customer A for €10 each on 10.01.2025
     - Entry type: "Sale"
     - Product: Blumen
     - Amount: 10, Price: €10
     - Creates receivable: €100
   
   - Sale 2: 20 Blumen to Customer A for €12 each on 10.02.2025
     - Creates receivable: €240
   
   - Sale 3: 20 Blumen to Customer A for €8 each on 01.03.2025
     - Creates receivable: €160

4. **System calculates metrics**:
   - **Total Revenue**: €100 + €240 + €160 = €500
   - **Total Quantity Sold**: 10 + 20 + 20 = 50 units
   - **Average Purchase Cost**: €5 per unit (from inventory)
   - **Cost of Goods Sold**: 50 × €5 = €250
   - **Profit**: €500 - €250 = €250
   - **Current Inventory**: 100 - 50 = 50 Blumen remaining
   - **Outstanding Balance**: €500 (if no payments made)

5. **Customer makes payment**:
   - Payment entry: €500
   - Reduces outstanding balance to €0

## Profit Calculation Method

The system uses **Weighted Average Cost** for COGS:

```typescript
// Calculate average buying price from ALL inventory purchases
avgBuyingPrice = totalCostOfPurchases / totalQuantityPurchased

// Calculate COGS for sales
costOfGoodsSold = quantitySold × avgBuyingPrice

// Calculate profit
profit = revenue - costOfGoodsSold
```

### Example with Multiple Purchase Prices

If admin buys:
- 50 Blumen for €3 each on 01.06.2025 (€150)
- Previous: 100 Blumen for €5 each (€500)

New weighted average:
- Total quantity: 150 units
- Total cost: €650
- Avg price: €650 / 150 = €4.33 per unit

When making the same sales (50 units):
- Revenue: €500 (unchanged)
- COGS: 50 × €4.33 = €216.50
- **Profit: €283.50** (higher than before due to lower average cost)

## Server Actions

### Inventory Management (`lib/actions/inventory.ts`)
- `createInventoryPurchase(productId, quantity, buyingPrice, note?, purchaseDate?)` - Add global inventory
- `getInventoryPurchases()` - List all inventory purchases for the user
- `getCurrentInventory()` - Get current stock levels (purchased - sold)
- `getProductInventory(productId)` - Get inventory for specific product
- `deleteInventoryPurchase(purchaseId)` - Remove inventory purchase

### Product Management (`lib/actions/products.ts`)
- `getProducts()` - List all products
- `createProduct(key, name)` - Add new product to catalog
- `updateProductName(productId, newName)` - Rename product
- `updateProductBuyingPrice(productId, defaultBuyingPrice)` - Set default price
- `deleteProduct(productId)` - Remove product

### Customer/Project Management (`lib/actions/projects.ts`)
- `createProject(name, initialAmount)` - Create new customer
- `getProjects()` - List all customers
- `getProject(projectId)` - Get customer details
- `deleteProject(projectId)` - Remove customer

### Sales/Entry Management (`lib/actions/entries.ts`)
- `createEntry(projectId, amount, price, typeId, productId, note?, timestamp?)` - Record sale/payment
- `getEntries(projectId)` - List customer's transaction history
- `getProjectBalance(projectId)` - Calculate customer's outstanding balance
- `updateEntry(entryId, projectId, updates)` - Modify existing entry
- `deleteEntry(entryId, projectId)` - Remove entry

### Metrics/Analytics (`lib/actions/metrics.ts`)
- `getProjectMetrics(projectId, startDate, endDate)` - Customer profitability
  - Revenue, Cost, Profit
  - Product breakdown
- `getGlobalMetrics(startDate, endDate)` - Overall business metrics
  - Total revenue across all customers
  - Total cost and profit
- `getCurrentMonthRange()` - Helper for date ranges

## UI Structure

### Admin Panel (`/dashboard/admin`)
- Manage products (add, edit, delete)
- Set default buying prices

### Dashboard (`/dashboard`)
- **Projects Tab**: List all customers with their balances
- **Inventory Tab**: 
  - View global inventory summary
  - Add inventory purchases
  - See purchase history
  - Monitor stock levels

### Customer Detail Page (`/dashboard/projects/[id]`)
- **Entries Tab**: Transaction history (sales, payments)
- **Metrics Tab**: Profitability analysis
  - Revenue by product
  - Cost breakdown
  - Profit margins
  - Date range filtering

## Key Differences from Previous System

| Aspect | Old System | New System |
|--------|-----------|------------|
| Inventory Scope | Per project/customer | Global (per admin user) |
| Purchase Location | `project_id` | `user_id` |
| Inventory Tracking | Each customer had own inventory | Centralized inventory pool |
| COGS Calculation | Per-project purchase prices | Weighted average of all purchases |
| Business Model | Project-specific costs | True business with global inventory |

## Migration Impact

When migrating from old to new system:
1. Existing `inventory_purchases.project_id` → `user_id`
2. Data needs conversion: Get user_id from project's owner
3. All inventory becomes global to that admin
4. Metrics calculations automatically use global inventory
5. No changes needed to sales/entry records

See `MIGRATION_0001.md` for detailed migration steps.
