"use server";

import { db } from "@/lib/db";
import { projects, journalEntries } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";
import { seedEntryTypes, seedProducts } from "@/lib/db/seed";
import { validate } from "@/lib/db/validate";
import {
  createProjectInputSchema,
  deleteProjectInputSchema,
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

// Initialize entry types and products if they don't exist
async function initializeData() {
  const existingTypes = await db.query.entryTypes.findMany();
  if (existingTypes.length === 0) {
    await seedEntryTypes();
  }
  
  const existingProducts = await db.query.products.findMany();
  if (existingProducts.length === 0) {
    await seedProducts();
  }
}

// Project actions
export async function createProject(name: string, initialAmount: number) {
  // Validate input
  validate(createProjectInputSchema, { name, initialAmount });
  
  const user = await getCurrentUser();
  await initializeData();
  
  // Create project
  const [project] = await db.insert(projects).values({
    name,
    userId: user.id,
  }).returning();
  
  // Get the first entry type (e.g., "Purchase" or whatever is first)
  const entryTypesList = await db.query.entryTypes.findMany();
  const defaultType = entryTypesList[0];
  
  if (!defaultType) {
    throw new Error("No entry types found");
  }
  
  // Get the first product (e.g., "Cash" or whatever is first)
  const productsList = await db.query.products.findMany();
  const defaultProduct = productsList[0];
  
  if (!defaultProduct) {
    throw new Error("No products found");
  }
  
  // Create initial journal entry
  await db.insert(journalEntries).values({
    projectId: project.id,
    amount: "1",
    price: initialAmount.toString(),
    typeId: defaultType.id,
    productId: defaultProduct.id,
    note: "Initial entry",
  });
  
  return project;
}

export async function getProjects() {
  const user = await getCurrentUser();
  
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
    orderBy: [desc(projects.createdAt)],
    with: {
      entries: {
        orderBy: [desc(journalEntries.timestamp)],
        limit: 1, // Get latest entry for preview
      },
    },
  });
  
  return userProjects;
}

export async function getProject(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, user.id)
    ),
  });
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  return project;
}

export async function deleteProject(projectId: string) {
  // Validate input
  validate(deleteProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  
  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, user.id)
    ),
  });
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  await db.delete(projects).where(eq(projects.id, projectId));
  
  return { success: true };
}
