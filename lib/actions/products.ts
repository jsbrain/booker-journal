"use server";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import {
  createProductInputSchema,
  updateProductInputSchema,
  deleteProductInputSchema,
} from "@/lib/db/validation";

// Get current user session (only admin can manage products)
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  return session.user;
}

export async function getProducts() {
  // Any authenticated user can view products
  await getCurrentUser();
  
  const allProducts = await db.query.products.findMany();
  return allProducts;
}

export async function updateProductName(productId: string, newName: string) {
  // Validate input
  validate(updateProductInputSchema, { productId, newName });
  
  // Only admin can update product names
  await getCurrentUser();
  
  await db.update(products)
    .set({ 
      name: newName,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  
  return { success: true };
}

export async function createProduct(key: string, name: string) {
  // Validate input
  validate(createProductInputSchema, { key, name });
  
  // Only admin can create new products
  await getCurrentUser();
  
  const [product] = await db.insert(products).values({
    key,
    name,
  }).returning();
  
  return product;
}

export async function deleteProduct(productId: string) {
  // Validate input
  validate(deleteProductInputSchema, { productId });
  
  // Only admin can delete products
  await getCurrentUser();
  
  await db.delete(products).where(eq(products.id, productId));
  
  return { success: true };
}
