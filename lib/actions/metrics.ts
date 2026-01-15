'use server'

import { db } from '@/lib/db'
import {
  entryTypes,
  inventoryPurchases,
  journalEntries,
  projects,
} from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { getMetricsInputSchema } from '@/lib/db/validation'

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
  productBreakdown: {
    productId: string
    productName: string
    quantitySold: number
    revenue: number
    cost: number
    profit: number
  }[]
}

type MetricsEvent =
  | {
      kind: 'purchase'
      ts: Date
      productId: string
      productName: string
      quantity: number
      totalCost: number
    }
  | {
      kind: 'sale'
      ts: Date
      productId: string
      productName: string
      projectId: string
      quantity: number
      revenue: number
    }

type ProductAccumulator = {
  productId: string
  productName: string
  quantitySold: number
  revenue: number
  cost: number
}

type InventoryState = {
  onHandQty: number
  onHandCost: number
  lastAvgCost: number
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function computeMovingAverageMetrics(params: {
  start: Date
  end: Date
  events: MetricsEvent[]
  mode: 'global' | 'project'
  projectId?: string
}) {
  const { start, end, events, mode, projectId } = params

  const sorted = [...events].sort((a, b) => {
    const diff = a.ts.getTime() - b.ts.getTime()
    if (diff !== 0) return diff
    if (a.kind === b.kind) return 0
    // Deterministic tie-breaker: purchases first, then sales.
    return a.kind === 'purchase' ? -1 : 1
  })

  const inventoryByProduct = new Map<string, InventoryState>()
  const metricsByProduct = new Map<string, ProductAccumulator>()

  let negativeStockOccurred = false

  const getState = (productId: string): InventoryState => {
    const existing = inventoryByProduct.get(productId)
    if (existing) return existing
    const next = { onHandQty: 0, onHandCost: 0, lastAvgCost: 0 }
    inventoryByProduct.set(productId, next)
    return next
  }

  const getAccumulator = (productId: string, productName: string) => {
    const existing = metricsByProduct.get(productId)
    if (existing) return existing
    const next: ProductAccumulator = {
      productId,
      productName,
      quantitySold: 0,
      revenue: 0,
      cost: 0,
    }
    metricsByProduct.set(productId, next)
    return next
  }

  for (const event of sorted) {
    const state = getState(event.productId)

    if (event.kind === 'purchase') {
      const qty = safeNumber(event.quantity)
      const cost = safeNumber(event.totalCost)

      state.onHandQty += qty
      state.onHandCost += cost

      if (state.onHandQty !== 0) {
        state.lastAvgCost = safeNumber(state.onHandCost / state.onHandQty)
      }

      continue
    }

    // Sale
    const qtySold = safeNumber(event.quantity)
    const avgCost =
      state.onHandQty !== 0
        ? safeNumber(state.onHandCost / state.onHandQty)
        : safeNumber(state.lastAvgCost)

    // Update inventory state first (regardless of whether this sale is in the requested range)
    state.onHandQty -= qtySold
    state.onHandCost -= qtySold * avgCost
    state.lastAvgCost = avgCost

    if (state.onHandQty === 0) {
      state.onHandCost = 0
    }

    if (state.onHandQty < 0) {
      negativeStockOccurred = true
      // Keep cost basis aligned with last known avg cost when negative.
      state.onHandCost = state.onHandQty * avgCost
    }

    const inRange = event.ts >= start && event.ts <= end
    const inScope =
      mode === 'global'
        ? true
        : Boolean(projectId && event.projectId === projectId)

    if (inRange && inScope) {
      const acc = getAccumulator(event.productId, event.productName)
      acc.quantitySold += qtySold
      acc.revenue += safeNumber(event.revenue)
      acc.cost += qtySold * avgCost
    }
  }

  const productBreakdown = Array.from(metricsByProduct.values()).map(p => {
    return {
      productId: p.productId,
      productName: p.productName,
      quantitySold: p.quantitySold,
      revenue: p.revenue,
      cost: p.cost,
      profit: p.revenue - p.cost,
    }
  })

  const revenue = productBreakdown.reduce((sum, p) => sum + p.revenue, 0)
  const cost = productBreakdown.reduce((sum, p) => sum + p.cost, 0)
  const profit = revenue - cost

  return {
    revenue,
    cost,
    profit,
    productBreakdown,
    negativeStockOccurred,
  }
}

export async function getProjectMetrics(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<ProjectMetrics> {
  // Validate input
  validate(getMetricsInputSchema, { projectId, startDate, endDate })

  const user = await getCurrentUser()
  await verifyProjectOwnership(projectId, user.id)

  const start = new Date(startDate)
  const end = new Date(endDate)

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
  const projectIds = userProjects.map(p => p.id)

  // Inventory purchases up to end (affects costing for the selected range)
  const purchasesUpToEnd = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.userId, user.id),
      lte(inventoryPurchases.purchaseDate, end),
    ),
    with: { product: true },
  })

  const purchasesInPeriod = purchasesUpToEnd.filter(p => {
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
  const user = await getCurrentUser()

  const start = new Date(startDate)
  const end = new Date(endDate)

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
      productBreakdown: [],
    }
  }

  // Get all projects for the user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  })

  const projectIds = userProjects.map(p => p.id)

  if (projectIds.length === 0) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
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

  const purchasesInPeriod = purchasesUpToEnd.filter(p => {
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
    productBreakdown: computed.productBreakdown,
  }
}
