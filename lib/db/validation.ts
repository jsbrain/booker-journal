/**
 * Validation schemas derived from Drizzle schemas using TypeBox
 * 
 * Flow: Drizzle schemas → TypeBox schemas (via drizzle-typebox) → Extended/merged schemas → Inferred types
 */

import { Type, Static } from "@sinclair/typebox";
import { createSelectSchema, createInsertSchema } from "drizzle-typebox";
import { projects, journalEntries, entryTypes, products, sharedLinks, inventoryPurchases } from "./schema";

// ========================================
// Base TypeBox schemas from Drizzle (source of truth)
// ========================================

export const selectProjectSchema = createSelectSchema(projects);
export const insertProjectSchema = createInsertSchema(projects);

export const selectJournalEntrySchema = createSelectSchema(journalEntries);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);

export const selectEntryTypeSchema = createSelectSchema(entryTypes);
export const insertEntryTypeSchema = createInsertSchema(entryTypes);

export const selectProductSchema = createSelectSchema(products);
export const insertProductSchema = createInsertSchema(products);

export const selectInventoryPurchaseSchema = createSelectSchema(inventoryPurchases);
export const insertInventoryPurchaseSchema = createInsertSchema(inventoryPurchases);

export const selectSharedLinkSchema = createSelectSchema(sharedLinks);
export const insertSharedLinkSchema = createInsertSchema(sharedLinks);

// ========================================
// Extended schemas for API validation
// ========================================

// Project creation input validation
export const createProjectInputSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  initialAmount: Type.Number(),
});

// Project update input validation
export const updateProjectInputSchema = Type.Partial(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 }),
  })
);

// Journal entry creation input validation
export const createEntryInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  amount: Type.Number(),
  price: Type.Number(),
  typeId: Type.String({ minLength: 1 }),
  productId: Type.String({ minLength: 1 }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});

// Journal entry update input validation
export const updateEntryInputSchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  amount: Type.Optional(Type.Number()),
  price: Type.Optional(Type.Number()),
  typeId: Type.Optional(Type.String({ minLength: 1 })),
  productId: Type.Optional(Type.String({ minLength: 1 })),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});

// Entry type creation input validation
export const createEntryTypeInputSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 100, pattern: "^[a-z_]+$" }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
});

// Entry type update input validation
export const updateEntryTypeInputSchema = Type.Object({
  typeId: Type.String({ minLength: 1 }),
  newName: Type.String({ minLength: 1, maxLength: 255 }),
});

// Entry type delete input validation
export const deleteEntryTypeInputSchema = Type.Object({
  typeId: Type.String({ minLength: 1 }),
});

// Product creation input validation
export const createProductInputSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 100, pattern: "^[a-z_]+$" }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
});

// Product update input validation
export const updateProductInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  newName: Type.String({ minLength: 1, maxLength: 255 }),
});

// Product update buying price validation
export const updateProductBuyingPriceInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  defaultBuyingPrice: Type.Number({ minimum: 0 }),
});

// Inventory purchase creation input validation
export const createInventoryPurchaseInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Number({ minimum: 0 }),
  buyingPrice: Type.Number({ minimum: 0 }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
  purchaseDate: Type.Optional(Type.String()), // ISO date string
});

// Inventory purchase update input validation
export const updateInventoryPurchaseInputSchema = Type.Object({
  purchaseId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  quantity: Type.Optional(Type.Number({ minimum: 0 })),
  buyingPrice: Type.Optional(Type.Number({ minimum: 0 })),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
  purchaseDate: Type.Optional(Type.String()),
});

// Delete inventory purchase input validation
export const deleteInventoryPurchaseInputSchema = Type.Object({
  purchaseId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
});

// Get metrics for period input validation
export const getMetricsInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  startDate: Type.String(), // ISO date string
  endDate: Type.String(), // ISO date string
});

// Shared link creation input validation
export const createSharedLinkInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
  expiresInDays: Type.Integer({ minimum: 1, maximum: 365 }),
});

// Shared link token validation
export const sharedLinkTokenSchema = Type.Object({
  token: Type.String({ minLength: 1, maxLength: 128 }),
});

// Delete operations validation
export const deleteProjectInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
});

export const deleteEntryInputSchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
});

export const deleteSharedLinkInputSchema = Type.Object({
  linkId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
});

export const deleteProductInputSchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
});

// Get project validation
export const getProjectInputSchema = Type.Object({
  projectId: Type.String({ minLength: 1 }),
});

// ========================================
// Inferred TypeScript types from schemas
// ========================================

export type SelectProject = Static<typeof selectProjectSchema>;
export type InsertProject = Static<typeof insertProjectSchema>;

export type SelectJournalEntry = Static<typeof selectJournalEntrySchema>;
export type InsertJournalEntry = Static<typeof insertJournalEntrySchema>;

export type SelectEntryType = Static<typeof selectEntryTypeSchema>;
export type InsertEntryType = Static<typeof insertEntryTypeSchema>;

export type SelectProduct = Static<typeof selectProductSchema>;
export type InsertProduct = Static<typeof insertProductSchema>;

export type SelectInventoryPurchase = Static<typeof selectInventoryPurchaseSchema>;
export type InsertInventoryPurchase = Static<typeof insertInventoryPurchaseSchema>;

export type SelectSharedLink = Static<typeof selectSharedLinkSchema>;
export type InsertSharedLink = Static<typeof insertSharedLinkSchema>;

// Input types
export type CreateProjectInput = Static<typeof createProjectInputSchema>;
export type UpdateProjectInput = Static<typeof updateProjectInputSchema>;
export type CreateEntryInput = Static<typeof createEntryInputSchema>;
export type UpdateEntryInput = Static<typeof updateEntryInputSchema>;
export type CreateEntryTypeInput = Static<typeof createEntryTypeInputSchema>;
export type UpdateEntryTypeInput = Static<typeof updateEntryTypeInputSchema>;
export type DeleteEntryTypeInput = Static<typeof deleteEntryTypeInputSchema>;
export type CreateProductInput = Static<typeof createProductInputSchema>;
export type UpdateProductInput = Static<typeof updateProductInputSchema>;
export type UpdateProductBuyingPriceInput = Static<typeof updateProductBuyingPriceInputSchema>;
export type CreateInventoryPurchaseInput = Static<typeof createInventoryPurchaseInputSchema>;
export type UpdateInventoryPurchaseInput = Static<typeof updateInventoryPurchaseInputSchema>;
export type DeleteInventoryPurchaseInput = Static<typeof deleteInventoryPurchaseInputSchema>;
export type GetMetricsInput = Static<typeof getMetricsInputSchema>;
export type CreateSharedLinkInput = Static<typeof createSharedLinkInputSchema>;
export type SharedLinkToken = Static<typeof sharedLinkTokenSchema>;
export type DeleteProjectInput = Static<typeof deleteProjectInputSchema>;
export type DeleteEntryInput = Static<typeof deleteEntryInputSchema>;
export type DeleteSharedLinkInput = Static<typeof deleteSharedLinkInputSchema>;
export type DeleteProductInput = Static<typeof deleteProductInputSchema>;
export type GetProjectInput = Static<typeof getProjectInputSchema>;
