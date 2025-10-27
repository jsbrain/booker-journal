-- Migration: Change inventory_purchases from project-based to user-based (global inventory)
-- This aligns with the business model where admin purchases inventory globally, not per customer

-- Drop the foreign key constraint from project_id
ALTER TABLE "inventory_purchases" DROP CONSTRAINT "inventory_purchases_project_id_projects_id_fk";

-- Rename project_id column to user_id
ALTER TABLE "inventory_purchases" RENAME COLUMN "project_id" TO "user_id";

-- Add foreign key constraint to user table
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
