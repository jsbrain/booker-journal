"use server";

import { db } from "@/lib/db";
import { inventoryPurchases, projects } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import {
  createInventoryPurchaseInputSchema,
  updateInventoryPurchaseInputSchema,
  deleteInventoryPurchaseInputSchema,
  getProjectInputSchema,
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

// Verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, userId)
    ),
  });
  
  if (!project) {
    throw new Error("Project not found or unauthorized");
  }
  
  return project;
}

export async function createInventoryPurchase(
  projectId: string,
  productId: string,
  quantity: number,
  buyingPrice: number,
  note?: string,
  purchaseDate?: string
) {
  // Validate input
  validate(createInventoryPurchaseInputSchema, { 
    projectId, 
    productId, 
    quantity, 
    buyingPrice, 
    note,
    purchaseDate,
  });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const totalCost = quantity * buyingPrice;
  
  const [purchase] = await db.insert(inventoryPurchases).values({
    projectId,
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
  projectId: string,
  updates: {
    quantity?: number;
    buyingPrice?: number;
    note?: string;
    purchaseDate?: string;
  }
) {
  // Validate input
  validate(updateInventoryPurchaseInputSchema, { purchaseId, projectId, ...updates });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  // Get current purchase
  const currentPurchase = await db.query.inventoryPurchases.findFirst({
    where: and(
      eq(inventoryPurchases.id, purchaseId),
      eq(inventoryPurchases.projectId, projectId)
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
      eq(inventoryPurchases.projectId, projectId)
    ))
    .returning();
  
  return updatedPurchase;
}

export async function getInventoryPurchases(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const purchases = await db.query.inventoryPurchases.findMany({
    where: eq(inventoryPurchases.projectId, projectId),
    orderBy: [desc(inventoryPurchases.purchaseDate)],
    with: {
      product: true,
    },
  });
  
  return purchases;
}

export async function deleteInventoryPurchase(purchaseId: string, projectId: string) {
  // Validate input
  validate(deleteInventoryPurchaseInputSchema, { purchaseId, projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  await db.delete(inventoryPurchases).where(
    and(
      eq(inventoryPurchases.id, purchaseId),
      eq(inventoryPurchases.projectId, projectId)
    )
  );
  
  return { success: true };
}

// Get inventory for a specific product in a project (total quantity and average buying price)
export async function getProductInventory(projectId: string, productId: string) {
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const purchases = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.projectId, projectId),
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

// Get global inventory across all user's projects
export async function getGlobalInventory() {
  const user = await getCurrentUser();
  
  // Get all projects for the user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });
  
  const projectIds = userProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return [];
  }
  
  // Get all inventory purchases and filter to user's projects
  const allPurchases = await db.query.inventoryPurchases.findMany({
    orderBy: [desc(inventoryPurchases.purchaseDate)],
    with: {
      product: true,
      project: true,
    },
  });
  
  // Filter to only user's projects
  const userPurchases = allPurchases.filter(p => projectIds.includes(p.projectId));
  
  return userPurchases;
}

// Get global inventory summary by product
export async function getGlobalInventorySummary() {
  const user = await getCurrentUser();
  
  // Get all projects for the user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });
  
  const projectIds = userProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return [];
  }
  
  // Get all inventory purchases
  const allPurchases = await db.query.inventoryPurchases.findMany({
    with: {
      product: true,
    },
  });
  
  // Filter to only user's projects and group by product
  const userPurchases = allPurchases.filter(p => projectIds.includes(p.projectId));
  
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalCost: number;
    averageBuyingPrice: number;
  }>();
  
  for (const purchase of userPurchases) {
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
export async function getCurrentInventory(projectId: string | null = null) {
  const user = await getCurrentUser();
  
  // Get user's projects
  let projectIds: string[];
  if (projectId) {
    await verifyProjectOwnership(projectId, user.id);
    projectIds = [projectId];
  } else {
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, user.id),
    });
    projectIds = userProjects.map(p => p.id);
  }
  
  if (projectIds.length === 0) {
    return [];
  }
  
  // Import journalEntries to access it
  const { journalEntries: journalEntriesTable } = await import("@/lib/db/schema");
  const { inArray } = await import("drizzle-orm");
  
  // Get all inventory purchases for the user's projects
  const purchases = await db.query.inventoryPurchases.findMany({
    where: projectId 
      ? eq(inventoryPurchases.projectId, projectId)
      : inArray(inventoryPurchases.projectId, projectIds),
    with: {
      product: true,
    },
  });
  
  // Get all sales (journal entries with type='purchase' which represents selling products)
  // First get the purchase entry type
  const purchaseType = await db.query.entryTypes.findFirst({
    where: (types, { eq }) => eq(types.key, "purchase"),
  });
  
  if (!purchaseType) {
    // If no purchase type exists, just return inventory purchases
    return calculateInventorySummary(purchases, []);
  }
  
  // Get all purchase entries (sales) for user's projects
  const sales = await db.query.journalEntries.findMany({
    where: and(
      projectId 
        ? eq(journalEntriesTable.projectId, projectId)
        : inArray(journalEntriesTable.projectId, projectIds),
      eq(journalEntriesTable.typeId, purchaseType.id)
    ),
    with: {
      product: true,
    },
  });
  
  return calculateInventorySummary(purchases, sales);
}

// Helper function to calculate inventory summary
function calculateInventorySummary(
  purchases: any[],
  sales: any[]
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
