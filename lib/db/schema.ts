import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Entry types table - for enum-like behavior with editable names
export const entryTypes = pgTable("entry_types", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Internal key like 'purchase', 'payment'
  name: text("name").notNull(), // Display name that can be edited
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(), // Reference to better-auth user
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // e.g., quantity of items
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Price per unit (can be negative or positive)
  typeId: integer("type_id").notNull().references(() => entryTypes.id),
  note: text("note"), // Optional note
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shared links table for read-only access
export const sharedLinks = pgTable("shared_links", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  entries: many(journalEntries),
  sharedLinks: many(sharedLinks),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  project: one(projects, {
    fields: [journalEntries.projectId],
    references: [projects.id],
  }),
  type: one(entryTypes, {
    fields: [journalEntries.typeId],
    references: [entryTypes.id],
  }),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  project: one(projects, {
    fields: [sharedLinks.projectId],
    references: [projects.id],
  }),
}));

export const entryTypesRelations = relations(entryTypes, ({ many }) => ({
  entries: many(journalEntries),
}));
