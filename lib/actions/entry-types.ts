"use server";

import { db } from "@/lib/db";
import { entryTypes } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import {
  createEntryTypeInputSchema,
  updateEntryTypeInputSchema,
} from "@/lib/db/validation";

// Get current user session (only admin can manage types)
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  return session.user;
}

export async function getEntryTypes() {
  // Any authenticated user can view types
  await getCurrentUser();
  
  const types = await db.query.entryTypes.findMany();
  return types;
}

export async function updateEntryTypeName(typeId: number, newName: string) {
  // Validate input
  validate(updateEntryTypeInputSchema, { typeId, newName });
  
  // Only admin can update type names
  await getCurrentUser();
  
  await db.update(entryTypes)
    .set({ 
      name: newName,
      updatedAt: new Date(),
    })
    .where(eq(entryTypes.id, typeId));
  
  return { success: true };
}

export async function createEntryType(key: string, name: string) {
  // Validate input
  validate(createEntryTypeInputSchema, { key, name });
  
  // Only admin can create new types
  await getCurrentUser();
  
  const [type] = await db.insert(entryTypes).values({
    key,
    name,
  }).returning();
  
  return type;
}
