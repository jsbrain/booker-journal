'use server'

import { and, asc, eq, ne } from 'drizzle-orm'

import { requireAdminUser } from '@/lib/authz/admin'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { validate } from '@/lib/db/validate'
import { approveUserInputSchema } from '@/lib/db/validation'

export async function getUsersAwaitingApproval() {
  await requireAdminUser()

  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(eq(user.approved, false), ne(user.role, 'admin')))
    .orderBy(asc(user.createdAt))
}

export async function approveUser(userId: string) {
  validate(approveUserInputSchema, { userId })
  await requireAdminUser()

  const [approvedUser] = await db
    .update(user)
    .set({
      approved: true,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(user.id, userId),
        eq(user.approved, false),
        ne(user.role, 'admin'),
      ),
    )
    .returning({ id: user.id, email: user.email })

  if (!approvedUser) {
    throw new Error('Pending user not found')
  }

  return {
    success: true,
    user: approvedUser,
  }
}
