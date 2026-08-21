'use server'

import { db } from '@/lib/db'
import { projects, journalEntries } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { seedEntryTypes, seedProducts } from '@/lib/db/seed-data'
import { validate } from '@/lib/db/validate'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import {
  createProjectInputSchema,
  deleteProjectInputSchema,
  getProjectInputSchema,
} from '@/lib/db/validation'
import { buildOpeningBalanceEntry } from '@/lib/domain/projects'

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
  const projectName = name.trim()
  validate(createProjectInputSchema, { name: projectName, initialAmount })

  const user = await getCurrentUserOrThrow()
  await initializeData()

  // Opening balances are balance-only adjustments. Treating them as sales or
  // payments would distort revenue, inventory, and payment reporting.
  const entryTypesList = await db.query.entryTypes.findMany()
  const adjustmentType = entryTypesList.find(
    (type) => type.key === 'adjustment',
  )
  const openingEntry = buildOpeningBalanceEntry(initialAmount)

  if (openingEntry && !adjustmentType) {
    throw new Error('Adjustment entry type not found')
  }

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: projectName,
        userId: user.id,
      })
      .returning()

    if (openingEntry && adjustmentType) {
      await tx.insert(journalEntries).values({
        projectId: project.id,
        ...openingEntry,
        typeId: adjustmentType.id,
        productId: null,
      })
    }

    return project
  })
}

export async function getProjects() {
  const user = await getCurrentUserOrThrow()

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

  const user = await getCurrentUserOrThrow()

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

  const user = await getCurrentUserOrThrow()

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
