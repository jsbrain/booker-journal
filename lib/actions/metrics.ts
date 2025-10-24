"use server";

import { db } from "@/lib/db";
import { journalEntries, inventoryPurchases, projects } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gte, lte } from "drizzle-orm";
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
  
  // Get all journal entries in the period
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
  
  // Get all inventory purchases in the period
  const purchases = await db.query.inventoryPurchases.findMany({
    where: and(
      eq(inventoryPurchases.projectId, projectId),
      gte(inventoryPurchases.purchaseDate, start),
      lte(inventoryPurchases.purchaseDate, end)
    ),
    with: {
      product: true,
    },
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
  
  // Process journal entries (sales)
  for (const entry of entries) {
    const productId = entry.productId;
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
    // Only count positive totals as revenue (sales)
    if (total > 0) {
      productData.quantitySold += amount;
      productData.revenue += total;
    }
  }
  
  // Process inventory purchases (costs)
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
  
  // Calculate profit per product
  const productBreakdown = Array.from(productMap.values()).map(product => {
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
  
  // Calculate total metrics
  const totalRevenue = productBreakdown.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = productBreakdown.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  return {
    revenue: totalRevenue,
    cost: totalCost,
    profit: totalProfit,
    totalEntries: entries.length,
    totalPurchases: purchases.length,
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
