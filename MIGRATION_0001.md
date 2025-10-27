# Database Migration Guide

## Migration 0001: Update Inventory to Global (User-Based)

### Overview
This migration changes the `inventory_purchases` table from being project-specific to user-specific (global inventory). This aligns with the business model where the admin purchases inventory globally, which is then sold to customers (projects).

### Changes Made
1. Removed foreign key constraint from `inventory_purchases.project_id` to `projects.id`
2. Renamed `project_id` column to `user_id`
3. Added foreign key constraint from `inventory_purchases.user_id` to `user.id`

### Data Migration Notes
**IMPORTANT:** If you have existing data in `inventory_purchases`:
- The migration will rename `project_id` to `user_id`
- You need to update the values to point to user IDs instead of project IDs
- SQL to migrate data (run BEFORE applying the migration):

```sql
-- Update inventory_purchases to use user_id from the project's owner
UPDATE inventory_purchases ip
SET project_id = (
  SELECT p.user_id 
  FROM projects p 
  WHERE p.id = ip.project_id
);
```

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
