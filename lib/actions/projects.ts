'use server'

import { db } from '@/lib/db'
import { projects, journalEntries } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { eq, desc, and } from 'drizzle-orm'
import { seedEntryTypes, seedProducts } from '@/lib/db/seed-data'
import { validate } from '@/lib/db/validate'
import {
  createProjectInputSchema,
  deleteProjectInputSchema,
  getProjectInputSchema,
} from '@/lib/db/validation'

// Get current user session
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return session.user
}

// Initialize entry types and products if they don't exist
async function initializeData() {
  const existingTypes = await db.query.entryTypes.findMany()
  if (existingTypes.length === 0) {
    await seedEntryTypes()
  }

  const existingProducts = await db.query.products.findMany()
  if (existingProducts.length === 0) {
    await seedProducts()
  }
}

// Project actions
export async function createProject(name: string, initialAmount: number) {
  // Validate input
  validate(createProjectInputSchema, { name, initialAmount })

  const user = await getCurrentUser()
  await initializeData()

  // Create project
  const [project] = await db
    .insert(projects)
    .values({
      name,
      userId: user.id,
    })
    .returning()

  // Get the entry types we care about
  const entryTypesList = await db.query.entryTypes.findMany()
  const paymentType = entryTypesList.find(t => t.key === 'payment')
  const saleType = entryTypesList.find(t => t.key === 'sale')

  // User-facing convention for initial balance:
  // - positive initialAmount => customer owes us (receivable)
  // - negative initialAmount => customer has credit (we owe them)
  // Ledger convention:
  // - sale uses negative price (creates receivable)
  // - payment uses positive price (reduces receivable)
  const defaultType =
    initialAmount > 0
      ? saleType || entryTypesList[0]
      : paymentType || entryTypesList[0]

  if (!defaultType) {
    throw new Error('No entry types found')
  }

  // Only get product if it's a sale type
  let productId = null
  if (defaultType.key === 'sale') {
    const productsList = await db.query.products.findMany()
    const defaultProduct = productsList[0]

    if (!defaultProduct) {
      throw new Error('No products found')
    }
    productId = defaultProduct.id
  }

  // Translate user-facing initialAmount into ledger sign convention
  // (so that displayed balance = -Σ(amount×price) matches user intent)
  const initialEntryPrice =
    initialAmount > 0 ? -initialAmount : Math.abs(initialAmount)

  // Create initial journal entry
  await db.insert(journalEntries).values({
    projectId: project.id,
    amount: '1',
    price: initialEntryPrice.toString(),
    typeId: defaultType.id,
    productId,
    note: 'Initial entry',
  })

  return project
}

export async function getProjects() {
  const user = await getCurrentUser()

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
    orderBy: [desc(projects.createdAt)],
    with: {
      entries: {
        orderBy: [desc(journalEntries.timestamp)],
        limit: 1, // Get latest entry for preview
      },
    },
  })

  return userProjects
}

export async function getProject(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId })

  const user = await getCurrentUser()

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!project) {
    throw new Error('Project not found')
  }

  return project
}

export async function deleteProject(projectId: string) {
  // Validate input
  validate(deleteProjectInputSchema, { projectId })

  const user = await getCurrentUser()

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!project) {
    throw new Error('Project not found')
  }

  await db.delete(projects).where(eq(projects.id, projectId))

  return { success: true }
}
