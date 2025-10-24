import { pgTable, text, serial, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

// Better-auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Products table - for categorizing journal entries
export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  key: text("key").notNull().unique(), // Internal key like 'purchase', 'payment', 'cash'
  name: text("name").notNull(), // Display name that can be edited
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull(), // Reference to better-auth user
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // e.g., quantity of items
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Price per unit (can be negative or positive)
  productId: text("product_id").notNull().references(() => products.id),
  note: text("note"), // Optional note
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  editHistory: jsonb("edit_history").$type<EditHistoryEntry[]>(), // Track edits
});

// Edit history entry type
export type EditHistoryEntry = {
  editedAt: string;
  editedBy: string;
  changes: {
    field: string;
    oldValue: string | number;
    newValue: string | number;
  }[];
};

// Shared links table for read-only access
export const sharedLinks = pgTable("shared_links", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
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
  product: one(products, {
    fields: [journalEntries.productId],
    references: [products.id],
  }),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  project: one(projects, {
    fields: [sharedLinks.projectId],
    references: [projects.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  entries: many(journalEntries),
}));
