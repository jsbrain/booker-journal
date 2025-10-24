"use server";

import { db } from "@/lib/db";
import { projects, journalEntries } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and } from "drizzle-orm";
import { seedEntryTypes } from "@/lib/db/seed";
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

// Initialize entry types if they don't exist
async function initializeEntryTypes() {
  const existingTypes = await db.query.entryTypes.findMany();
  if (existingTypes.length === 0) {
    await seedEntryTypes();
  }
}

// Project actions
export async function createProject(name: string, initialAmount: number) {
  // Validate input
  validate(createProjectInputSchema, { name, initialAmount });
  
  const user = await getCurrentUser();
  await initializeEntryTypes();
  
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
  
  // Create initial journal entry
  await db.insert(journalEntries).values({
    projectId: project.id,
    amount: "1",
    price: initialAmount.toString(),
    typeId: defaultType.id,
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

export async function getProject(projectId: number) {
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

export async function deleteProject(projectId: number) {
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
