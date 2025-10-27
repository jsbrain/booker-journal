# Database Migration Guide

## Migration 0001: Update Inventory to Global (User-Based)

### Overview
This migration changes the `inventory_purchases` table from being project-specific to user-specific (global inventory). This aligns with the business model where the admin purchases inventory globally, which is then sold to customers (projects).

### Changes Made
1. Removed foreign key constraint from `inventory_purchases.project_id` to `projects.id`
2. Renamed `project_id` column to `user_id`
3. Added foreign key constraint from `inventory_purchases.user_id` to `user.id`

### Data Migration Notes
**CRITICAL TIMING**: The migration renames the column from `project_id` to `user_id`. You MUST migrate the data values BEFORE the column rename occurs.

If you have existing data in `inventory_purchases`:

**Step 1: Migrate the data (BEFORE schema changes)**
Run this SQL while the column is still named `project_id`:

```sql
-- Update inventory_purchases to use user_id from the project's owner
-- This must be run BEFORE the migration renames the column
UPDATE inventory_purchases ip
SET project_id = (
  SELECT p.user_id 
  FROM projects p 
  WHERE p.id = ip.project_id
);
```

**Step 2: Apply the schema migration**
After Step 1 is complete, apply the migration which will rename the column.

**Warning**: If you run the migration first, the column will be renamed to `user_id` and the above SQL will fail because `project_id` no longer exists.

### How to Apply

#### Development (using db:push)
```bash
# This will automatically apply schema changes
bun run db:push
```

#### Production (using migrations)
```bash
# If you have existing data, run the data migration SQL first
# Then generate and apply migrations
bun run db:migrate
```

### Rollback (if needed)
If you need to rollback this change:

```sql
-- Drop the new foreign key
ALTER TABLE "inventory_purchases" DROP CONSTRAINT "inventory_purchases_user_id_user_id_fk";

-- Rename user_id back to project_id
ALTER TABLE "inventory_purchases" RENAME COLUMN "user_id" TO "project_id";

-- Re-add the project foreign key
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_project_id_projects_id_fk" 
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
```

Note: Rollback will require data migration to restore project_id values.
