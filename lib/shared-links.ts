import { and, desc, eq, gt, gte, lte } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  journalEntries,
  sharedLinkAccessSessions,
  sharedLinks,
} from '@/lib/db/schema'
import {
  sharedLinkDataAccessSchema,
  sharedLinkTokenSchema,
} from '@/lib/db/validation'
import { validate } from '@/lib/db/validate'
import { calculateLedgerBalance } from '@/lib/utils/balance'
import { sha256Hex } from '@/lib/utils/crypto/shared-link'
import { PublicError } from '@/lib/utils/public-error'
import { logError } from '@/lib/utils/server-log'

export async function validateSharedLinkRecord(token: string) {
  try {
    validate(sharedLinkTokenSchema, { token })
  } catch {
    return undefined
  }

  try {
    return await db.query.sharedLinks.findFirst({
      where: and(
        eq(sharedLinks.token, token),
        gt(sharedLinks.expiresAt, new Date()),
      ),
      with: {
        project: true,
      },
    })
  } catch (error) {
    logError('shared-links.validateSharedLinkRecord failed', error)
    throw new PublicError('Failed to load shared link')
  }
}

async function requireSharedLinkAccess(params: {
  token: string
  accessToken?: string
}) {
  validate(sharedLinkDataAccessSchema, params)

  const link = await validateSharedLinkRecord(params.token)

  if (!link) {
    throw new PublicError('Invalid or expired link')
  }

  if (!params.accessToken) {
    throw new PublicError('Password required')
  }

  const accessTokenHash = sha256Hex(params.accessToken)

  const session = await db.query.sharedLinkAccessSessions.findFirst({
    where: and(
      eq(sharedLinkAccessSessions.sharedLinkId, link.id),
      eq(sharedLinkAccessSessions.accessTokenHash, accessTokenHash),
      gt(sharedLinkAccessSessions.expiresAt, new Date()),
    ),
  })

  if (!session) {
    throw new PublicError('Invalid or expired session')
  }

  return link
}

export async function getSharedProjectData(params: {
  token: string
  accessToken?: string
}) {
  const link = await requireSharedLinkAccess(params)

  const entryWhere = [eq(journalEntries.projectId, link.projectId)]
  if (link.startDate)
    entryWhere.push(gte(journalEntries.timestamp, link.startDate))
  if (link.endDate) entryWhere.push(lte(journalEntries.timestamp, link.endDate))

  let entries
  try {
    entries = await db.query.journalEntries.findMany({
      where: and(...entryWhere),
      orderBy: [desc(journalEntries.timestamp)],
      with: {
        type: true,
        product: true,
      },
    })
  } catch (error) {
    logError('shared-links.getSharedProjectData failed', error, {
      projectId: link.projectId,
      hasStartDate: Boolean(link.startDate),
      hasEndDate: Boolean(link.endDate),
    })
    throw new PublicError('Failed to load shared project')
  }

  const balance = calculateLedgerBalance(entries)

  return {
    generatedAt: new Date(),
    project: {
      name: link.project.name,
      createdAt: link.project.createdAt,
    },
    entries: entries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      price: entry.price,
      note: entry.note,
      timestamp: entry.timestamp,
      type: {
        name: entry.type.name,
      },
      product: entry.product
        ? {
            name: entry.product.name,
          }
        : null,
    })),
    balance,
    dateRange:
      link.startDate || link.endDate
        ? {
            startDate: link.startDate,
            endDate: link.endDate,
          }
        : null,
  }
}
