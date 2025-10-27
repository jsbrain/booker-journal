"use server";

import { db } from "@/lib/db";
import { journalEntries, projects, entryTypes, type EditHistoryEntry } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import {
  createEntryInputSchema,
  updateEntryInputSchema,
  deleteEntryInputSchema,
  getProjectInputSchema,
} from "@/lib/db/validation";

// Update data interface for journal entries
interface JournalEntryUpdateData {
  updatedAt: Date;
  editHistory: EditHistoryEntry[];
  amount?: string;
  price?: string;
  typeId?: string;
  productId?: string | null;
  note?: string;
}

// Get current user session
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  return session.user;
}

// Verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, userId)
    ),
  });
  
  if (!project) {
    throw new Error("Project not found or unauthorized");
  }
  
  return project;
}

export async function createEntry(
  projectId: string,
  amount: number,
  price: number,
  typeId: string,
  productId: string | undefined,
  note?: string,
  timestamp?: string
) {
  // Validate input
  validate(createEntryInputSchema, { projectId, amount, price, typeId, productId, note, timestamp });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  // Get the entry type to check if it's a sale
  const entryType = await db.query.entryTypes.findFirst({
    where: eq(entryTypes.id, typeId),
  });
  
  // If it's a sale type, productId is required
  if (entryType?.key === "sale" && !productId) {
    throw new Error("Product is required for sale entries");
  }
  
  const [entry] = await db.insert(journalEntries).values({
    projectId,
    amount: amount.toString(),
    price: price.toString(),
    typeId,
    productId: productId || null,
    note,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  }).returning();
  
  return entry;
}

export async function createEntryWithPayment(
  projectId: string,
  amount: number,
  price: number,
  typeId: string,
  productId: string | undefined,
  note?: string,
  timestamp?: string
) {
  // Validate input for both entries
  validate(createEntryInputSchema, { projectId, amount, price, typeId, productId, note, timestamp });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  // Get the payment entry type
  const entryTypesList = await db.query.entryTypes.findMany();
  const paymentType = entryTypesList.find(t => t.key === 'payment');
  
  if (!paymentType) {
    throw new Error("Payment entry type not found");
  }
  
  const timestampDate = timestamp ? new Date(timestamp) : new Date();
  
  // Create the sale entry first
  const [saleEntry] = await db.insert(journalEntries).values({
    projectId,
    amount: amount.toString(),
    price: price.toString(),
    typeId,
    productId: productId || null,
    note,
    timestamp: timestampDate,
  }).returning();
  
  // Create the payment entry immediately after (positive price to offset the sale)
  // Payment entries don't have products
  const [paymentEntry] = await db.insert(journalEntries).values({
    projectId,
    amount: amount.toString(),
    price: Math.abs(price).toString(), // Make price positive for payment
    typeId: paymentType.id,
    productId: null, // Payments don't have products
    note: note ? `${note} (immediate payment)` : "Immediate payment",
    timestamp: timestampDate,
  }).returning();
  
  return { saleEntry, paymentEntry };
}

export async function updateEntry(
  entryId: string,
  projectId: string,
  updates: {
    amount?: number;
    price?: number;
    typeId?: string;
    productId?: string;
    note?: string;
  }
) {
  // Validate input
  validate(updateEntryInputSchema, { entryId, projectId, ...updates });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  // Get current entry to track changes
  const currentEntry = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.id, entryId),
      eq(journalEntries.projectId, projectId)
    ),
    with: {
      type: true,
    },
  });
  
  if (!currentEntry) {
    throw new Error("Entry not found");
  }
  
  // If updating to sale type, productId is required
  if (updates.typeId) {
    const newType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.id, updates.typeId),
    });
    if (newType?.key === "sale" && !updates.productId) {
      throw new Error("Product is required for sale entries");
    }
  } else if (currentEntry.type.key === "sale" && updates.productId === undefined && !currentEntry.productId) {
    // If it's already a sale and productId wasn't provided and there isn't one already
    throw new Error("Product is required for sale entries");
  }
  
  // Build edit history entry
  const changes: EditHistoryEntry["changes"] = [];
  
  if (updates.amount !== undefined && updates.amount.toString() !== currentEntry.amount) {
    changes.push({
      field: "amount",
      oldValue: parseFloat(currentEntry.amount),
      newValue: updates.amount,
    });
  }
  
  if (updates.price !== undefined && updates.price.toString() !== currentEntry.price) {
    changes.push({
      field: "price",
      oldValue: parseFloat(currentEntry.price),
      newValue: updates.price,
    });
  }
  
  if (updates.typeId !== undefined && updates.typeId !== currentEntry.typeId) {
    changes.push({
      field: "typeId",
      oldValue: currentEntry.typeId,
      newValue: updates.typeId,
    });
  }
  
  if (updates.productId !== undefined && updates.productId !== currentEntry.productId) {
    changes.push({
      field: "productId",
      oldValue: currentEntry.productId || "",
      newValue: updates.productId,
    });
  }
  
  if (updates.note !== undefined && updates.note !== currentEntry.note) {
    changes.push({
      field: "note",
      oldValue: currentEntry.note || "",
      newValue: updates.note,
    });
  }
  
  // Only update if there are actual changes
  if (changes.length === 0) {
    return currentEntry;
  }
  
  // Create new edit history entry
  const editHistoryEntry: EditHistoryEntry = {
    editedAt: new Date().toISOString(),
    editedBy: user.id,
    changes,
  };
  
  // Get existing edit history and append new entry
  const existingHistory = (currentEntry.editHistory as EditHistoryEntry[] | null) || [];
  const newHistory = [...existingHistory, editHistoryEntry];
  
  // Update the entry
  const updateData: JournalEntryUpdateData = {
    updatedAt: new Date(),
    editHistory: newHistory,
  };
  
  if (updates.amount !== undefined) {
    updateData.amount = updates.amount.toString();
  }
  if (updates.price !== undefined) {
    updateData.price = updates.price.toString();
  }
  if (updates.typeId !== undefined) {
    updateData.typeId = updates.typeId;
  }
  if (updates.productId !== undefined) {
    updateData.productId = updates.productId || null;
  }
  if (updates.note !== undefined) {
    updateData.note = updates.note;
  }
  
  const [updatedEntry] = await db.update(journalEntries)
    .set(updateData)
    .where(and(
      eq(journalEntries.id, entryId),
      eq(journalEntries.projectId, projectId)
    ))
    .returning();
  
  return updatedEntry;
}

export async function getEntries(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.projectId, projectId),
    orderBy: [desc(journalEntries.timestamp)],
    with: {
      type: true,
      product: true,
    },
  });
  
  return entries;
}

export async function getProjectBalance(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.projectId, projectId),
  });
  
  // Calculate balance: -(sum of amount * price)
  // Sales have negative prices, payments have positive prices
  // Negating the sum gives us: positive = customer owes, negative = customer has credit
  const balance = entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.amount);
    const price = parseFloat(entry.price);
    return sum + (amount * price);
  }, 0);
  
  return -balance;
}

export async function deleteEntry(entryId: string, projectId: string) {
  // Validate input
  validate(deleteEntryInputSchema, { entryId, projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  await db.delete(journalEntries).where(
    and(
      eq(journalEntries.id, entryId),
      eq(journalEntries.projectId, projectId)
    )
  );
  
  return { success: true };
}
