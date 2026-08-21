'use server'

import { db } from '@/lib/db'
import { sharedLinks, projects } from '@/lib/db/schema'
import { eq, and, gt, desc } from 'drizzle-orm'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { validate } from '@/lib/db/validate'
import { logError } from '@/lib/utils/server-log'
import { getCurrentUserOrThrow } from '@/lib/authz/session'
import { parseOptionalDateInput } from '@/lib/utils/date'
import {
  createSharedLinkInputSchema,
  deleteSharedLinkInputSchema,
  getProjectInputSchema,
} from '@/lib/db/validation'

// Verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })

  if (!project) {
    throw new Error('Project not found or unauthorized')
  }

  return project
}

export async function createSharedLink(
  projectId: string,
  password: string,
  expiresInDays?: number,
  expiresInHours?: number,
  startDate?: string,
  endDate?: string,
) {
  // Validate input
  validate(createSharedLinkInputSchema, {
    projectId,
    password,
    expiresInDays,
    expiresInHours,
    startDate,
    endDate,
  })

  // Exactly one unit keeps expiry behavior unambiguous for every caller.
  if (!expiresInDays && !expiresInHours) {
    throw new Error('Either expiresInDays or expiresInHours must be provided')
  }
  if (expiresInDays && expiresInHours) {
    throw new Error('Choose either days or hours for expiration')
  }

  // Validate date range if provided
  const linkStart = parseOptionalDateInput(startDate, 'start date')
  const linkEnd = parseOptionalDateInput(endDate, 'end date')

  if (linkStart && linkEnd) {
    const start = linkStart
    const end = linkEnd
    if (start >= end) {
      throw new Error('Start date must be before end date')
    }
  }

  const user = await getCurrentUserOrThrow()
  await verifyProjectOwnership(projectId, user.id)

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex')

  // Calculate expiration date
  const expiresAt = new Date()
  if (expiresInHours) {
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)
  } else if (expiresInDays) {
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const [link] = await db
      .insert(sharedLinks)
      .values({
        projectId,
        token,
        expiresAt,
        startDate: linkStart,
        endDate: linkEnd,
        passwordHash,
      })
      .returning()

    return {
      id: link.id,
      projectId: link.projectId,
      token: link.token,
      expiresAt: link.expiresAt,
      startDate: link.startDate,
      endDate: link.endDate,
      createdAt: link.createdAt,
    }
  } catch (error) {
    logError('shared-links.createSharedLink failed', error, {
      projectId,
      userId: user.id,
    })
    throw new Error('Failed to create link')
  }
}

export async function getSharedLinks(projectId: string) {
  // Validate input
  validate(getProjectInputSchema, { projectId })

  const user = await getCurrentUserOrThrow()
  await verifyProjectOwnership(projectId, user.id)

  try {
    const links = await db
      .select({
        id: sharedLinks.id,
        projectId: sharedLinks.projectId,
        token: sharedLinks.token,
        expiresAt: sharedLinks.expiresAt,
        startDate: sharedLinks.startDate,
        endDate: sharedLinks.endDate,
        createdAt: sharedLinks.createdAt,
      })
      .from(sharedLinks)
      .where(eq(sharedLinks.projectId, projectId))
      .orderBy(desc(sharedLinks.createdAt))

    return links
  } catch (error) {
    logError('shared-links.getSharedLinks failed', error, {
      projectId,
      userId: user.id,
    })
    throw new Error('Failed to load shared links')
  }
}

export async function getActiveSharedLinksForUser() {
  const user = await getCurrentUserOrThrow()

  try {
    const rows = await db
      .select({
        id: sharedLinks.id,
        projectId: sharedLinks.projectId,
        projectName: projects.name,
        token: sharedLinks.token,
        expiresAt: sharedLinks.expiresAt,
        startDate: sharedLinks.startDate,
        endDate: sharedLinks.endDate,
        createdAt: sharedLinks.createdAt,
      })
      .from(sharedLinks)
      .innerJoin(projects, eq(sharedLinks.projectId, projects.id))
      .where(
        and(
          eq(projects.userId, user.id),
          gt(sharedLinks.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(sharedLinks.expiresAt))

    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.projectName,
      token: r.token,
      expiresAt: r.expiresAt,
      startDate: r.startDate,
      endDate: r.endDate,
      createdAt: r.createdAt,
    }))
  } catch (error) {
    logError('shared-links.getActiveSharedLinksForUser failed', error, {
      userId: user.id,
    })
    throw new Error('Failed to load shared links')
  }
}

export async function deleteSharedLink(linkId: string, projectId: string) {
  // Validate input
  validate(deleteSharedLinkInputSchema, { linkId, projectId })

  const user = await getCurrentUserOrThrow()
  await verifyProjectOwnership(projectId, user.id)

  try {
    await db
      .delete(sharedLinks)
      .where(
        and(eq(sharedLinks.id, linkId), eq(sharedLinks.projectId, projectId)),
      )

    return { success: true }
  } catch (error) {
    logError('shared-links.deleteSharedLink failed', error, {
      linkId,
      projectId,
      userId: user.id,
    })
    throw new Error('Failed to delete link')
  }
}
