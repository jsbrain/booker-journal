# Architecture Update: Entry Types vs Products

## Overview

The architecture has been corrected to properly separate entry types and products as two distinct concepts.

## Database Schema

### Entry Types Table
```sql
CREATE TABLE "entry_types" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Purpose**: Categorize the TYPE of transaction
**Default Values**:
- Purchase
- Payment
- Refund
- Adjustment

### Products Table
```sql
CREATE TABLE "products" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Purpose**: Assign PRODUCT to transaction
**Default Values**:
- Cash (as requested)
- (More can be added via admin panel)

### Journal Entries Table
```sql
CREATE TABLE "journal_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "type_id" text NOT NULL,      -- References entry_types
  "product_id" text NOT NULL,    -- References products
  "note" text,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "edit_history" jsonb
);
```

## User Interface

### Create/Edit Entry Dialog

Two separate dropdown fields:

1. **Type**: Purchase / Payment / Refund / Adjustment
   - Determines the nature of the transaction

2. **Product**: Cash / (other products)
   - Assigns a product to the transaction

### Entry Display

Entries show both values:
```
Purchase • Cash        €-50.00
Payment • Cash         €+100.00
```

Format: `[Type] • [Product]`

## Server Actions

### Entry Types (`lib/actions/entry-types.ts`)
- `getEntryTypes()` - List all entry types
- `createEntryType(key, name)` - Create new type
- `updateEntryTypeName(typeId, newName)` - Update type name
- `deleteEntryType(typeId)` - Delete type

### Products (`lib/actions/products.ts`)
- `getProducts()` - List all products
- `createProduct(key, name)` - Create new product
- `updateProductName(productId, newName)` - Update product name
- `deleteProduct(productId)` - Delete product

### Entries (`lib/actions/entries.ts`)
- `createEntry(projectId, amount, price, typeId, productId, note)` - Create with both
- `updateEntry(entryId, projectId, updates)` - Update both fields independently
- Edit history tracks changes to both `typeId` and `productId`

## Seeding

Both are seeded independently:

```typescript
await seedEntryTypes();  // Seeds: Purchase, Payment, Refund, Adjustment
await seedProducts();     // Seeds: Cash
```

## Admin Panel

The admin panel at `/dashboard/admin` currently manages products. Entry types can be managed through a similar interface if needed.

## Migration Path

Old structure (incorrect):
- Products table served dual purpose
- No separate entry types

New structure (correct):
- Entry types for transaction categorization
- Products for product assignment
- Both required when creating entries

## Benefits

1. **Clear Separation**: Entry type vs product assignment are distinct concepts
2. **Flexibility**: Can add more products without affecting entry types
3. **Better Data Model**: Reflects real-world usage (e.g., "Purchase of Cash", "Payment via Cash")
4. **Edit History**: Tracks changes to both fields independently
