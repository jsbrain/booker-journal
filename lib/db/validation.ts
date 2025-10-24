/**
 * Validation schemas derived from Drizzle schemas using TypeBox
 * 
 * Flow: Drizzle schemas → TypeBox schemas (via drizzle-typebox) → Extended/merged schemas → Inferred types
 */

import { Type, Static } from "@sinclair/typebox";
import { createSelectSchema, createInsertSchema } from "drizzle-typebox";
import { projects, journalEntries, products, sharedLinks } from "./schema";

// ========================================
// Base TypeBox schemas from Drizzle (source of truth)
// ========================================

export const selectProjectSchema = createSelectSchema(projects);
export const insertProjectSchema = createInsertSchema(projects);

export const selectJournalEntrySchema = createSelectSchema(journalEntries);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);

export const selectProductSchema = createSelectSchema(products);
export const insertProductSchema = createInsertSchema(products);

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
  productId: Type.String({ minLength: 1 }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});

// Journal entry update input validation
export const updateEntryInputSchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  projectId: Type.String({ minLength: 1 }),
  amount: Type.Optional(Type.Number()),
  price: Type.Optional(Type.Number()),
  productId: Type.Optional(Type.String({ minLength: 1 })),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
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

export type SelectProduct = Static<typeof selectProductSchema>;
export type InsertProduct = Static<typeof insertProductSchema>;

export type SelectSharedLink = Static<typeof selectSharedLinkSchema>;
export type InsertSharedLink = Static<typeof insertSharedLinkSchema>;

// Input types
export type CreateProjectInput = Static<typeof createProjectInputSchema>;
export type UpdateProjectInput = Static<typeof updateProjectInputSchema>;
export type CreateEntryInput = Static<typeof createEntryInputSchema>;
export type UpdateEntryInput = Static<typeof updateEntryInputSchema>;
export type CreateProductInput = Static<typeof createProductInputSchema>;
export type UpdateProductInput = Static<typeof updateProductInputSchema>;
export type CreateSharedLinkInput = Static<typeof createSharedLinkInputSchema>;
export type SharedLinkToken = Static<typeof sharedLinkTokenSchema>;
export type DeleteProjectInput = Static<typeof deleteProjectInputSchema>;
export type DeleteEntryInput = Static<typeof deleteEntryInputSchema>;
export type DeleteSharedLinkInput = Static<typeof deleteSharedLinkInputSchema>;
export type DeleteProductInput = Static<typeof deleteProductInputSchema>;
export type GetProjectInput = Static<typeof getProjectInputSchema>;
