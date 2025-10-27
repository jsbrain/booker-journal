ALTER TABLE "journal_entries" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_links" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "shared_links" ADD COLUMN "end_date" timestamp;