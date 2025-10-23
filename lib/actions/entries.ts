"use server";

import { db } from "@/lib/db";
import { journalEntries, projects } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";

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
async function verifyProjectOwnership(projectId: number, userId: string) {
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
  projectId: number,
  amount: number,
  price: number,
  typeId: number,
  note?: string
) {
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const [entry] = await db.insert(journalEntries).values({
    projectId,
    amount: amount.toString(),
    price: price.toString(),
    typeId,
    note,
  }).returning();
  
  return entry;
}

export async function getEntries(projectId: number) {
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.projectId, projectId),
    orderBy: [desc(journalEntries.timestamp)],
    with: {
      type: true,
    },
  });
  
  return entries;
}

export async function getProjectBalance(projectId: number) {
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

export async function deleteEntry(entryId: number, projectId: number) {
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
