'use server'

import { db } from '@/lib/db'
import { entryTypes } from '@/lib/db/schema'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import { asc } from 'drizzle-orm'

export async function getEntryTypes() {
  // Any authenticated user can view types
  await getCurrentUserOrThrow()

  const types = await db.query.entryTypes.findMany({
    orderBy: [asc(entryTypes.createdAt)],
  })
  return types
}
