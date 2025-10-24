import { pgTable, text, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
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

// Entry types table - for type of entry (Purchase, Payment, etc.)
export const entryTypes = pgTable("entry_types", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  key: text("key").notNull().unique(), // Internal key like 'purchase', 'payment'
  name: text("name").notNull(), // Display name that can be edited
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table - for product assignment to journal entries
export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  key: text("key").notNull().unique(), // Internal key like 'cash', 'materials', etc.
  name: text("name").notNull(), // Display name that can be edited
  defaultBuyingPrice: numeric("default_buying_price", { precision: 10, scale: 2 }), // Optional default buying price
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
  typeId: text("type_id").notNull().references(() => entryTypes.id), // Entry type (Purchase, Payment, etc.)
  productId: text("product_id").references(() => products.id), // Product assignment - only required for Purchase type
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

// Inventory purchases table - for tracking buying prices and inventory
export const inventoryPurchases = pgTable("inventory_purchases", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(), // Amount purchased
  buyingPrice: numeric("buying_price", { precision: 10, scale: 2 }).notNull(), // Price per unit when purchased
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(), // quantity × buyingPrice
  note: text("note"), // Optional note about the purchase
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  inventoryPurchases: many(inventoryPurchases),
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

export const entryTypesRelations = relations(entryTypes, ({ many }) => ({
  entries: many(journalEntries),
}));

export const productsRelations = relations(products, ({ many }) => ({
  entries: many(journalEntries),
  inventoryPurchases: many(inventoryPurchases),
}));

export const inventoryPurchasesRelations = relations(inventoryPurchases, ({ one }) => ({
  project: one(projects, {
    fields: [inventoryPurchases.projectId],
    references: [projects.id],
  }),
  product: one(products, {
    fields: [inventoryPurchases.productId],
    references: [products.id],
  }),
}));
