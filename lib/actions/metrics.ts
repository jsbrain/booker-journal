"use server";

import { db } from "@/lib/db";
import { journalEntries, inventoryPurchases, projects } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { validate } from "@/lib/db/validate";
import { getMetricsInputSchema } from "@/lib/db/validation";

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

export interface ProjectMetrics {
  revenue: number; // Total sales (positive entries)
  cost: number; // Cost of goods sold (based on inventory buying prices)
  profit: number; // Revenue - Cost
  totalEntries: number;
  totalPurchases: number;
  productBreakdown: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

// Helper function to process journal entries and calculate revenue
function processJournalEntriesForMetrics(
  entries: Array<{
    productId: string | null;
    product: { id: string; name: string } | null;
    type: { key: string };
    amount: string;
    price: string;
  }>,
  productMap: Map<string, {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    totalQuantityPurchased: number;
    totalCost: number;
  }>
) {
  // Process journal entries (sales)
  for (const entry of entries) {
    const productId = entry.productId;
    // Skip entries without products (non-purchase types)
    if (!productId || !entry.product) continue;

    const amount = parseFloat(entry.amount);
    const price = parseFloat(entry.price);
    const total = amount * price;
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: entry.product.name,
        quantitySold: 0,
        revenue: 0,
        totalQuantityPurchased: 0,
        totalCost: 0,
      });
    }
    
    const productData = productMap.get(productId)!;
    // Purchase entries represent customer sales (customer buying products from us)
    // In this system, purchase entries use negative prices to represent customer debt
    // Revenue = absolute value of (amount × negative_price)
    // Example: Customer buys 10 items at -€5 each → Revenue = |10 × -5| = €50
    if (entry.type.key === "purchase") {
      productData.quantitySold += Math.abs(amount);
      productData.revenue += Math.abs(total);
    }
  }
}

// Helper function to process inventory purchases for COGS calculation
function processInventoryPurchasesForMetrics(
  purchases: Array<{
    productId: string;
    product: { name: string };
    quantity: string;
    totalCost: string;
  }>,
  productMap: Map<string, {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    totalQuantityPurchased: number;
    totalCost: number;
  }>
) {
  for (const purchase of purchases) {
    const productId = purchase.productId;
    const quantity = parseFloat(purchase.quantity);
    const totalCost = parseFloat(purchase.totalCost);
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName: purchase.product.name,
        quantitySold: 0,
        revenue: 0,
        totalQuantityPurchased: 0,
        totalCost: 0,
      });
    }
    
    const productData = productMap.get(productId)!;
    productData.totalQuantityPurchased += quantity;
    productData.totalCost += totalCost;
  }
}

// Helper function to calculate final metrics from product map
function calculateProductBreakdown(
  productMap: Map<string, {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    totalQuantityPurchased: number;
    totalCost: number;
  }>
) {
  return Array.from(productMap.values()).map(product => {
    // Calculate average buying price
    const avgBuyingPrice = product.totalQuantityPurchased > 0 
      ? product.totalCost / product.totalQuantityPurchased 
      : 0;
    
    // Calculate cost of goods sold based on quantity sold and average buying price
    const cost = product.quantitySold * avgBuyingPrice;
    const profit = product.revenue - cost;
    
    return {
      productId: product.productId,
      productName: product.productName,
      quantitySold: product.quantitySold,
      revenue: product.revenue,
      cost,
      profit,
    };
  });
}

export async function getProjectMetrics(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectMetrics> {
  // Validate input
  validate(getMetricsInputSchema, { projectId, startDate, endDate });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get all journal entries in the period for this project
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.projectId, projectId),
      gte(journalEntries.timestamp, start),
      lte(journalEntries.timestamp, end)
    ),
    with: {
      product: true,
      type: true,
    },
  });
  
  // Get ALL inventory purchases across ALL user's projects (GLOBAL inventory)
  // First, get all user's projects
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });
  const userProjectIds = userProjects.map(p => p.id);
  
  if (userProjectIds.length === 0) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
      productBreakdown: [],
    };
  }
  
  // Get all inventory purchases for all user's projects using database-level filtering
  const purchases = await db.query.inventoryPurchases.findMany({
    where: inArray(inventoryPurchases.projectId, userProjectIds),
    with: {
      product: true,
    },
  });
  
  // Count purchases in the date range for the totalPurchases metric (project-specific)
  const purchasesInPeriod = purchases.filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    return purchaseDate >= start && purchaseDate <= end && p.projectId === projectId;
  });
  
  // Calculate metrics per product
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    totalQuantityPurchased: number;
    totalCost: number;
  }>();
  
  // Use helper functions to process data
  processJournalEntriesForMetrics(entries, productMap);
  processInventoryPurchasesForMetrics(purchases, productMap);
  
  // Calculate profit per product
  const productBreakdown = calculateProductBreakdown(productMap);
  
  // Calculate total metrics
  const totalRevenue = productBreakdown.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = productBreakdown.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  return {
    revenue: totalRevenue,
    cost: totalCost,
    profit: totalProfit,
    totalEntries: entries.length,
    totalPurchases: purchasesInPeriod.length,
    productBreakdown,
  };
}

// Helper to get current month date range
export async function getCurrentMonthRange(): Promise<{ startDate: string; endDate: string }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

// Get global metrics across all user's projects
export async function getGlobalMetrics(
  startDate: string,
  endDate: string
): Promise<ProjectMetrics> {
  const user = await getCurrentUser();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get all projects for the user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });
  
  const projectIds = userProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalEntries: 0,
      totalPurchases: 0,
      productBreakdown: [],
    };
  }
  
  // Get all journal entries for all user's projects in the date range
  const entries = await db.query.journalEntries.findMany({
    where: and(
      inArray(journalEntries.projectId, projectIds),
      gte(journalEntries.timestamp, start),
      lte(journalEntries.timestamp, end)
    ),
    with: {
      product: true,
      type: true,
    },
  });
  
  // Get ALL inventory purchases for all user's projects (not just in date range)
  // This is needed to calculate accurate average buying prices for COGS
  const purchases = await db.query.inventoryPurchases.findMany({
    where: inArray(inventoryPurchases.projectId, projectIds),
    with: {
      product: true,
    },
  });
  
  // Count purchases in the date range for the totalPurchases metric
  const purchasesInPeriod = purchases.filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    return purchaseDate >= start && purchaseDate <= end;
  });
  
  // Calculate metrics per product
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    totalQuantityPurchased: number;
    totalCost: number;
  }>();
  
  // Use helper functions to process data
  processJournalEntriesForMetrics(entries, productMap);
  processInventoryPurchasesForMetrics(purchases, productMap);
  
  // Calculate profit per product
  const productBreakdown = calculateProductBreakdown(productMap);
  
  // Calculate total metrics
  const totalRevenue = productBreakdown.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = productBreakdown.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  return {
    revenue: totalRevenue,
    cost: totalCost,
    profit: totalProfit,
    totalEntries: entries.length,
    totalPurchases: purchasesInPeriod.length,
    productBreakdown,
  };
}
