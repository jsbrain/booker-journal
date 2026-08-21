'use server'

import { db } from '@/lib/db'
import {
  entryTypes,
  inventoryPurchases,
  journalEntries,
  projects,
} from '@/lib/db/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { getMetricsInputSchema } from '@/lib/db/validation'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import { ensureChronologicalRange, parseDateInput } from '@/lib/utils/date'
import {
  computeMovingAverageMetrics,
  type MetricsEvent,
} from '@/lib/domain/metrics'

// Verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })

  if (!project) {
    throw new Error('Project not found or unauthorized')
  }

  return project
}

export interface ProjectMetrics {
  revenue: number // Total sales (positive entries)
  cost: number // Cost of goods sold (COGS)
  profit: number // Revenue - Cost
  totalEntries: number
  totalPurchases: number
  negativeStockOccurred: boolean
  productBreakdown: {
    productId: string
    productName: string
    quantitySold: number
    revenue: number
    cost: number
    profit: number
  }[]
}

export async function getProjectMetrics(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<ProjectMetrics> {
  // Validate input
  validate(getMetricsInputSchema, { projectId, startDate, endDate })

  const user = await getCurrentUserOrThrow()
  await verifyProjectOwnership(projectId, user.id)

  const start = parseDateInput(startDate, 'start date')
  const end = parseDateInput(endDate, 'end date')
  ensureChronologicalRange(start, end)

  // Resolve the sale entry type ID once for filtering.
  const saleType = await db.query.entryTypes.findFirst({
    where: eq(entryTypes.key, 'sale'),
  })
  if (!saleType) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
      negativeStockOccurred: false,
      productBreakdown: [],
    }
  }

  // Count all journal entries in the period for this project (all types)
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.projectId, projectId),
      gte(journalEntries.timestamp, start),
      lte(journalEntries.timestamp, end),
    ),
    with: {
      product: true,
      type: true,
    },
  })

  // Get the user's projects (needed to scope global inventory consumption across all customers)
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  })
  const projectIds = userProjects.map((p) => p.id)

  // Inventory purchases up to end (affects costing for the selected range)
  const purchasesUpToEnd = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.userId, user.id),
      lte(inventoryPurchases.purchaseDate, end),
    ),
    with: { product: true },
  })

  const purchasesInPeriod = purchasesUpToEnd.filter((p) => {
    const d = new Date(p.purchaseDate)
    return d >= start && d <= end
  })

  // All sales up to end across all projects (sales affect remaining inventory and thus future avg cost)
  const salesUpToEnd = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntries.projectId, projectIds),
      eq(journalEntries.typeId, saleType.id),
      lte(journalEntries.timestamp, end),
    ),
    with: {
      product: true,
    },
  })

  const events: MetricsEvent[] = []

  for (const p of purchasesUpToEnd) {
    if (!p.product) continue
    const qty = Math.abs(parseFloat(p.quantity))
    const cost = parseFloat(p.totalCost)
    events.push({
      kind: 'purchase',
      ts: new Date(p.purchaseDate),
      productId: p.productId,
      productName: p.product.name,
      quantity: qty,
      totalCost: cost,
    })
  }

  for (const s of salesUpToEnd) {
    if (!s.productId || !s.product) continue
    const qty = Math.abs(parseFloat(s.amount))
    const total = parseFloat(s.amount) * parseFloat(s.price)
    const revenue = Math.abs(total)
    events.push({
      kind: 'sale',
      ts: new Date(s.timestamp),
      productId: s.productId,
      productName: s.product.name,
      projectId: s.projectId,
      quantity: qty,
      revenue,
    })
  }

  const computed = computeMovingAverageMetrics({
    start,
    end,
    events,
    mode: 'project',
    projectId,
  })

  return {
    revenue: computed.revenue,
    cost: computed.cost,
    profit: computed.profit,
    totalEntries: entries.length,
    totalPurchases: purchasesInPeriod.length,
    negativeStockOccurred: computed.negativeStockOccurred,
    productBreakdown: computed.productBreakdown,
  }
}

// Helper to get current month date range
export async function getCurrentMonthRange(): Promise<{
  startDate: string
  endDate: string
}> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

// Get global metrics across all user's projects
export async function getGlobalMetrics(
  startDate: string,
  endDate: string,
): Promise<ProjectMetrics> {
  const user = await getCurrentUserOrThrow()

  const start = parseDateInput(startDate, 'start date')
  const end = parseDateInput(endDate, 'end date')
  ensureChronologicalRange(start, end)

  const saleType = await db.query.entryTypes.findFirst({
    where: eq(entryTypes.key, 'sale'),
  })
  if (!saleType) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
      negativeStockOccurred: false,
      productBreakdown: [],
    }
  }

  // Get all projects for the user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  })

  const projectIds = userProjects.map((p) => p.id)

  if (projectIds.length === 0) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
      negativeStockOccurred: false,
      productBreakdown: [],
    }
  }

  // Count all journal entries for all user's projects in the date range (all types)
  const entries = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntries.projectId, projectIds),
      gte(journalEntries.timestamp, start),
      lte(journalEntries.timestamp, end),
    ),
    with: {
      product: true,
      type: true,
    },
  })

  const purchasesUpToEnd = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.userId, user.id),
      lte(inventoryPurchases.purchaseDate, end),
    ),
    with: { product: true },
  })

  const purchasesInPeriod = purchasesUpToEnd.filter((p) => {
    const d = new Date(p.purchaseDate)
    return d >= start && d <= end
  })

  const salesUpToEnd = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntries.projectId, projectIds),
      eq(journalEntries.typeId, saleType.id),
      lte(journalEntries.timestamp, end),
    ),
    with: {
      product: true,
    },
  })

  const events: MetricsEvent[] = []

  for (const p of purchasesUpToEnd) {
    if (!p.product) continue
    const qty = Math.abs(parseFloat(p.quantity))
    const cost = parseFloat(p.totalCost)
    events.push({
      kind: 'purchase',
      ts: new Date(p.purchaseDate),
      productId: p.productId,
      productName: p.product.name,
      quantity: qty,
      totalCost: cost,
    })
  }

  for (const s of salesUpToEnd) {
    if (!s.productId || !s.product) continue
    const qty = Math.abs(parseFloat(s.amount))
    const total = parseFloat(s.amount) * parseFloat(s.price)
    const revenue = Math.abs(total)
    events.push({
      kind: 'sale',
      ts: new Date(s.timestamp),
      productId: s.productId,
      productName: s.product.name,
      projectId: s.projectId,
      quantity: qty,
      revenue,
    })
  }

  const computed = computeMovingAverageMetrics({
    start,
    end,
    events,
    mode: 'global',
  })

  return {
    revenue: computed.revenue,
    cost: computed.cost,
    profit: computed.profit,
    totalEntries: entries.length,
    totalPurchases: purchasesInPeriod.length,
    negativeStockOccurred: computed.negativeStockOccurred,
    productBreakdown: computed.productBreakdown,
  }
}
