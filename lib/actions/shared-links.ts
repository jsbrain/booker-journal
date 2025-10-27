"use server";

import { db } from "@/lib/db";
import { sharedLinks, projects, journalEntries } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gt, desc } from "drizzle-orm";
import crypto from "crypto";
import { validate } from "@/lib/db/validate";
import {
  createSharedLinkInputSchema,
  deleteSharedLinkInputSchema,
  sharedLinkTokenSchema,
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

export async function createSharedLink(
  projectId: string, 
  expiresInDays?: number, 
  expiresInHours?: number,
  startDate?: string,
  endDate?: string
) {
  // Validate input
  validate(createSharedLinkInputSchema, { 
    projectId, 
    expiresInDays, 
    expiresInHours,
    startDate,
    endDate 
  });
  
  // Validate that at least one expiration parameter is provided
  if (!expiresInDays && !expiresInHours) {
    throw new Error("Either expiresInDays or expiresInHours must be provided");
  }
  
  // Validate date range if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      throw new Error("Start date must be before end date");
    }
  }
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex");
  
  // Calculate expiration date
  const expiresAt = new Date();
  if (expiresInHours) {
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  } else if (expiresInDays) {
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }
  
  const [link] = await db.insert(sharedLinks).values({
    projectId,
    token,
    expiresAt,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  }).returning();
  
  return link;
}

export async function getSharedLinks(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  const links = await db.query.sharedLinks.findMany({
    where: eq(sharedLinks.projectId, projectId),
    orderBy: [desc(sharedLinks.createdAt)],
  });
  
  return links;
}

export async function deleteSharedLink(linkId: string, projectId: string) {
  // Validate input
  validate(deleteSharedLinkInputSchema, { linkId, projectId });
  
  const user = await getCurrentUser();
  await verifyProjectOwnership(projectId, user.id);
  
  await db.delete(sharedLinks).where(
    and(
      eq(sharedLinks.id, linkId),
      eq(sharedLinks.projectId, projectId)
    )
  );
  
  return { success: true };
}

// Validate shared link (no auth required)
export async function validateSharedLink(token: string) {
  // Validate input
  validate(sharedLinkTokenSchema, { token });
  
  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, token),
      gt(sharedLinks.expiresAt, new Date())
    ),
    with: {
      project: true,
    },
  });
  
  if (!link) {
    return null;
  }
  
  return link;
}

// Get project data via shared link (no auth required)
export async function getProjectBySharedLink(token: string) {
  // Validate input
  validate(sharedLinkTokenSchema, { token });
  
  const link = await validateSharedLink(token);
  
  if (!link) {
    throw new Error("Invalid or expired link");
  }
  
  // Build query with optional date filtering
  let entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.projectId, link.projectId),
    orderBy: [desc(journalEntries.timestamp)],
    with: {
      type: true,
      product: true,
    },
  });
  
  // Filter entries by date range if specified
  if (link.startDate || link.endDate) {
    entries = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      
      if (link.startDate && entryDate < new Date(link.startDate)) {
        return false;
      }
      
      if (link.endDate && entryDate > new Date(link.endDate)) {
        return false;
      }
      
      return true;
    });
  }
  
  // Calculate balance
  const balance = entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.amount);
    const price = parseFloat(entry.price);
    return sum + (amount * price);
  }, 0);
  
  return {
    project: link.project,
    entries,
    balance,
    dateRange: link.startDate || link.endDate ? {
      startDate: link.startDate,
      endDate: link.endDate,
    } : null,
  };
}
