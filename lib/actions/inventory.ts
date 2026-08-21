'use server'

import { db } from '@/lib/db'
import { inventoryPurchases, journalEntries, projects } from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import { parseDateInput } from '@/lib/utils/date'
import { calculateInventorySummary } from '@/lib/domain/inventory'
import {
  createInventoryPurchaseInputSchema,
  deleteInventoryPurchaseInputSchema,
} from '@/lib/db/validation'

export async function createInventoryPurchase(
  productId: string,
  quantity: number,
  buyingPrice: number,
  note?: string,
  purchaseDate?: string,
) {
  // Validate input
  validate(createInventoryPurchaseInputSchema, {
    productId,
    quantity,
    buyingPrice,
    note,
    purchaseDate,
  })

  const user = await getCurrentUserOrThrow()
  const parsedPurchaseDate = purchaseDate
    ? parseDateInput(purchaseDate, 'purchase date')
    : new Date()

  const totalCost = quantity * buyingPrice

  const [purchase] = await db
    .insert(inventoryPurchases)
    .values({
      userId: user.id,
      productId,
      quantity: quantity.toString(),
      buyingPrice: buyingPrice.toString(),
      totalCost: totalCost.toString(),
      note,
      purchaseDate: parsedPurchaseDate,
    })
    .returning()

  return purchase
}

export async function getInventoryPurchases() {
  const user = await getCurrentUserOrThrow()

  const purchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.userId, user.id),
    orderBy: [desc(inventoryPurchases.purchaseDate)],
    with: {
      product: true,
    },
  })

  return purchases
}

export async function deleteInventoryPurchase(purchaseId: string) {
  // Validate input
  validate(deleteInventoryPurchaseInputSchema, { purchaseId })

  const user = await getCurrentUserOrThrow()

  await db
    .delete(inventoryPurchases)
    .where(
      and(
        eq(inventoryPurchases.id, purchaseId),
        eq(inventoryPurchases.userId, user.id),
      ),
    )

  return { success: true }
}

// Get current inventory (purchases - sales) with detailed breakdown
export async function getCurrentInventory() {
  const user = await getCurrentUserOrThrow()

  // Get all inventory purchases for the user
  const purchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.userId, user.id),
    with: {
      product: true,
    },
  })

  // Get all sales (journal entries with type='sale' which represents selling products)
  // First get the sale entry type
  const saleType = await db.query.entryTypes.findFirst({
    where: (types, { eq }) => eq(types.key, 'sale'),
  })

  if (!saleType) {
    // If no sale type exists, just return inventory purchases
    return calculateInventorySummary(purchases, [])
  }

  // Get all user's projects
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  })
  const projectIds = userProjects.map((p) => p.id)

  if (projectIds.length === 0) {
    return calculateInventorySummary(purchases, [])
  }

  // Get all sale entries (sales) for user's projects
  const sales = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntries.projectId, projectIds),
      eq(journalEntries.typeId, saleType.id),
    ),
    with: {
      product: true,
    },
  })

  return calculateInventorySummary(purchases, sales)
}
