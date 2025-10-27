"use server";

import { db } from "@/lib/db";
import { inventoryPurchases } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import {
  createInventoryPurchaseInputSchema,
  updateInventoryPurchaseInputSchema,
  deleteInventoryPurchaseInputSchema,
} from "@/lib/db/validation";

// Get current user session
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  return session.user;
}

export async function createInventoryPurchase(
  productId: string,
  quantity: number,
  buyingPrice: number,
  note?: string,
  purchaseDate?: string
) {
  // Validate input
  validate(createInventoryPurchaseInputSchema, { 
    productId, 
    quantity, 
    buyingPrice, 
    note,
    purchaseDate,
  });
  
  const user = await getCurrentUser();
  
  const totalCost = quantity * buyingPrice;
  
  const [purchase] = await db.insert(inventoryPurchases).values({
    userId: user.id,
    productId,
    quantity: quantity.toString(),
    buyingPrice: buyingPrice.toString(),
    totalCost: totalCost.toString(),
    note,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
  }).returning();
  
  return purchase;
}

export async function updateInventoryPurchase(
  purchaseId: string,
  updates: {
    quantity?: number;
    buyingPrice?: number;
    note?: string;
    purchaseDate?: string;
  }
) {
  // Validate input
  validate(updateInventoryPurchaseInputSchema, { purchaseId, ...updates });
  
  const user = await getCurrentUser();
  
  // Get current purchase and verify ownership
  const currentPurchase = await db.query.inventoryPurchases.findFirst({
    where: and(
      eq(inventoryPurchases.id, purchaseId),
      eq(inventoryPurchases.userId, user.id)
    ),
  });
  
  if (!currentPurchase) {
    throw new Error("Purchase not found");
  }
  
  // Prepare update data
  const updateData: {
    quantity?: string;
    buyingPrice?: string;
    totalCost?: string;
    note?: string;
    purchaseDate?: Date;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };
  
  const newQuantity = updates.quantity !== undefined ? updates.quantity : parseFloat(currentPurchase.quantity);
  const newBuyingPrice = updates.buyingPrice !== undefined ? updates.buyingPrice : parseFloat(currentPurchase.buyingPrice);
  
  if (updates.quantity !== undefined) {
    updateData.quantity = updates.quantity.toString();
  }
  if (updates.buyingPrice !== undefined) {
    updateData.buyingPrice = updates.buyingPrice.toString();
  }
  if (updates.quantity !== undefined || updates.buyingPrice !== undefined) {
    updateData.totalCost = (newQuantity * newBuyingPrice).toString();
  }
  if (updates.note !== undefined) {
    updateData.note = updates.note;
  }
  if (updates.purchaseDate !== undefined) {
    updateData.purchaseDate = new Date(updates.purchaseDate);
  }
  
  const [updatedPurchase] = await db.update(inventoryPurchases)
    .set(updateData)
    .where(and(
      eq(inventoryPurchases.id, purchaseId),
      eq(inventoryPurchases.userId, user.id)
    ))
    .returning();
  
  return updatedPurchase;
}

export async function getInventoryPurchases() {
  const user = await getCurrentUser();
  
  const purchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.userId, user.id),
    orderBy: [desc(inventoryPurchases.purchaseDate)],
    with: {
      product: true,
    },
  });
  
  return purchases;
}

export async function deleteInventoryPurchase(purchaseId: string) {
  // Validate input
  validate(deleteInventoryPurchaseInputSchema, { purchaseId });
  
  const user = await getCurrentUser();
  
  await db.delete(inventoryPurchases).where(
    and(
      eq(inventoryPurchases.id, purchaseId),
      eq(inventoryPurchases.userId, user.id)
    )
  );
  
  return { success: true };
}

// Get inventory for a specific product (total quantity and average buying price)
export async function getProductInventory(productId: string) {
  const user = await getCurrentUser();
  
  const purchases = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.userId, user.id),
      eq(inventoryPurchases.productId, productId)
    ),
  });
  
  if (purchases.length === 0) {
    return {
      totalQuantity: 0,
      averageBuyingPrice: 0,
      totalCost: 0,
    };
  }
  
  let totalQuantity = 0;
  let totalCost = 0;
  
  for (const purchase of purchases) {
    totalQuantity += parseFloat(purchase.quantity);
    totalCost += parseFloat(purchase.totalCost);
  }
  
  const averageBuyingPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  
  return {
    totalQuantity,
    averageBuyingPrice,
    totalCost,
  };
}

// Get global inventory summary by product
export async function getGlobalInventorySummary() {
  const user = await getCurrentUser();
  
  // Get all inventory purchases for the user
  const allPurchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.userId, user.id),
    with: {
      product: true,
    },
  });
  
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalCost: number;
    averageBuyingPrice: number;
  }>();
  
  for (const purchase of allPurchases) {
    const productId = purchase.productId;
    const quantity = parseFloat(purchase.quantity);
    const totalCost = parseFloat(purchase.totalCost);
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: purchase.product.name,
        totalQuantity: 0,
        totalCost: 0,
        averageBuyingPrice: 0,
      });
    }
    
    const productData = productMap.get(productId)!;
    productData.totalQuantity += quantity;
    productData.totalCost += totalCost;
  }
  
  // Calculate average buying prices
  const summary = Array.from(productMap.values()).map(product => ({
    ...product,
    averageBuyingPrice: product.totalQuantity > 0 ? product.totalCost / product.totalQuantity : 0,
  }));
  
  return summary;
}

// Get current inventory (purchases - sales) with detailed breakdown
export async function getCurrentInventory() {
  const user = await getCurrentUser();
  
  // Import journalEntries to access it
  const { journalEntries: journalEntriesTable, projects } = await import("@/lib/db/schema");
  
  // Get all inventory purchases for the user
  const purchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.userId, user.id),
    with: {
      product: true,
    },
  });
  
  // Get all sales (journal entries with type='sale' which represents selling products)
  // First get the sale entry type
  const saleType = await db.query.entryTypes.findFirst({
    where: (types, { eq }) => eq(types.key, "sale"),
  });
  
  if (!saleType) {
    // If no sale type exists, just return inventory purchases
    return calculateInventorySummary(purchases, []);
  }
  
  // Get all user's projects
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });
  const projectIds = userProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return calculateInventorySummary(purchases, []);
  }
  
  const { inArray } = await import("drizzle-orm");
  
  // Get all sale entries (sales) for user's projects
  const sales = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntriesTable.projectId, projectIds),
      eq(journalEntriesTable.typeId, saleType.id)
    ),
    with: {
      product: true,
    },
  });
  
  return calculateInventorySummary(purchases, sales);
}

// Helper function to calculate inventory summary
function calculateInventorySummary(
  purchases: Array<{
    productId: string
    product: { name: string }
    quantity: string
    totalCost: string
  }>,
  sales: Array<{
    productId: string | null
    product: { name: string } | null
    amount: string
  }>
) {
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    totalPurchased: number;
    totalSold: number;
    currentStock: number;
    averageBuyingPrice: number;
    totalCost: number;
  }>();
  
  // Process inventory purchases (adds to stock)
  for (const purchase of purchases) {
    const productId = purchase.productId;
    const quantity = parseFloat(purchase.quantity);
    const totalCost = parseFloat(purchase.totalCost);
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: purchase.product.name,
        totalPurchased: 0,
        totalSold: 0,
        currentStock: 0,
        averageBuyingPrice: 0,
        totalCost: 0,
      });
    }
    
    const productData = productMap.get(productId)!;
    productData.totalPurchased += quantity;
    productData.totalCost += totalCost;
  }
  
  // Process sales (deducts from stock)
  for (const sale of sales) {
    if (!sale.productId || !sale.product) continue;
    
    const productId = sale.productId;
    const quantity = Math.abs(parseFloat(sale.amount)); // Use absolute value
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: sale.product.name,
        totalPurchased: 0,
        totalSold: 0,
        currentStock: 0,
        averageBuyingPrice: 0,
        totalCost: 0,
      });
    }
    
    const productData = productMap.get(productId)!;
    productData.totalSold += quantity;
  }
  
  // Calculate current stock and average prices
  const summary = Array.from(productMap.values()).map(product => {
    product.currentStock = product.totalPurchased - product.totalSold;
    product.averageBuyingPrice = product.totalPurchased > 0 
      ? product.totalCost / product.totalPurchased 
      : 0;
    return product;
  });
  
  return summary;
}
