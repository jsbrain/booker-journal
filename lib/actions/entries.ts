"use server";

import { db } from "@/lib/db";
import { journalEntries, projects, type EditHistoryEntry } from "@/lib/db/schema";
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
  productId?: string;
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
  productId: string,
  note?: string
) {
  // Validate input
  validate(createEntryInputSchema, { projectId, amount, price, productId, note });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const [entry] = await db.insert(journalEntries).values({
    projectId,
    amount: amount.toString(),
    price: price.toString(),
    productId,
    note,
  }).returning();
  
  return entry;
}

export async function updateEntry(
  entryId: string,
  projectId: string,
  updates: {
    amount?: number;
    price?: number;
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
  });
  
  if (!currentEntry) {
    throw new Error("Entry not found");
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
  
  if (updates.productId !== undefined && updates.productId !== currentEntry.productId) {
    changes.push({
      field: "productId",
      oldValue: currentEntry.productId,
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
  if (updates.productId !== undefined) {
    updateData.productId = updates.productId;
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
  
  // Calculate balance: sum of (amount * price)
  const balance = entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.amount);
    const price = parseFloat(entry.price);
    return sum + (amount * price);
  }, 0);
  
  return balance;
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
