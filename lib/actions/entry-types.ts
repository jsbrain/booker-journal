'use server'

import { db } from '@/lib/db'
import { entryTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { requireAdminUser } from '@/lib/authz/admin'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import {
  createEntryTypeInputSchema,
  updateEntryTypeInputSchema,
  deleteEntryTypeInputSchema,
} from '@/lib/db/validation'

export async function getEntryTypes() {
  // Any authenticated user can view types
  await getCurrentUserOrThrow()

  const types = await db.query.entryTypes.findMany()
  return types
}

export async function updateEntryTypeName(typeId: string, newName: string) {
  // Validate input
  validate(updateEntryTypeInputSchema, { typeId, newName })

  // Only admin can update type names
  await requireAdminUser()

  await db
    .update(entryTypes)
    .set({
      name: newName,
      updatedAt: new Date(),
    })
    .where(eq(entryTypes.id, typeId))

  return { success: true }
}

export async function createEntryType(key: string, name: string) {
  // Validate input
  validate(createEntryTypeInputSchema, { key, name })

  // Only admin can create new types
  await requireAdminUser()

  const [type] = await db
    .insert(entryTypes)
    .values({
      key,
      name,
    })
    .returning()

  return type
}

export async function deleteEntryType(typeId: string) {
  // Validate input
  validate(deleteEntryTypeInputSchema, { typeId })

  // Only admin can delete types
  await requireAdminUser()

  await db.delete(entryTypes).where(eq(entryTypes.id, typeId))

  return { success: true }
}
