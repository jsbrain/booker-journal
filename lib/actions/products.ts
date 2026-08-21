'use server'

import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { requireAdminUser } from '@/lib/authz/admin'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import {
  createProductInputSchema,
  updateProductInputSchema,
  updateProductBuyingPriceInputSchema,
  deleteProductInputSchema,
} from '@/lib/db/validation'

export async function getProducts() {
  // Any authenticated user can view products
  await getCurrentUserOrThrow()

  const allProducts = await db.query.products.findMany({
    orderBy: [asc(products.name)],
  })
  return allProducts
}

export async function updateProductName(productId: string, newName: string) {
  const normalizedName = newName.trim()
  validate(updateProductInputSchema, { productId, newName: normalizedName })

  // Only admin can update product names
  await requireAdminUser()

  await db
    .update(products)
    .set({
      name: normalizedName,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))

  return { success: true }
}

export async function createProduct(key: string, name: string) {
  const normalizedKey = key.trim()
  const normalizedName = name.trim()
  validate(createProductInputSchema, {
    key: normalizedKey,
    name: normalizedName,
  })

  // Only admin can create new products
  await requireAdminUser()

  const [product] = await db
    .insert(products)
    .values({
      key: normalizedKey,
      name: normalizedName,
    })
    .returning()

  return product
}

export async function updateProductBuyingPrice(
  productId: string,
  defaultBuyingPrice: number,
) {
  // Validate input
  validate(updateProductBuyingPriceInputSchema, {
    productId,
    defaultBuyingPrice,
  })

  // Only admin can update product buying prices
  await requireAdminUser()

  await db
    .update(products)
    .set({
      defaultBuyingPrice: defaultBuyingPrice.toString(),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))

  return { success: true }
}

export async function deleteProduct(productId: string) {
  // Validate input
  validate(deleteProductInputSchema, { productId })

  // Only admin can delete products
  await requireAdminUser()

  await db.delete(products).where(eq(products.id, productId))

  return { success: true }
}
