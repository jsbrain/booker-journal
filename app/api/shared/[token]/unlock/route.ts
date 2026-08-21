import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import { db } from '@/lib/db'
import { sharedLinks, sharedLinkAccessSessions } from '@/lib/db/schema'
import { and, eq, gt, lte } from 'drizzle-orm'

import { validate } from '@/lib/db/validate'
import { sharedLinkUnlockInputSchema } from '@/lib/db/validation'
import { sha256Hex } from '@/lib/utils/crypto/shared-link'
import { logWarn } from '@/lib/utils/server-log'
import { getEnvInteger } from '@/lib/utils/env'
import { UnlockAttemptLimiter } from '@/lib/utils/unlock-attempt-limiter'

export const dynamic = 'force-dynamic'

const UNLOCK_WINDOW_MS = getEnvInteger(
  'SHARED_LINK_UNLOCK_WINDOW_MS',
  10 * 60 * 1000,
  { min: 1_000 },
)
const UNLOCK_LOCKOUT_MS = getEnvInteger(
  'SHARED_LINK_UNLOCK_LOCKOUT_MS',
  15 * 60 * 1000,
  { min: 1_000 },
)
const UNLOCK_MAX_ATTEMPTS = getEnvInteger(
  'SHARED_LINK_UNLOCK_MAX_ATTEMPTS',
  5,
  {
    min: 1,
  },
)
const UNLOCK_STORE_MAX_KEYS = getEnvInteger(
  'SHARED_LINK_UNLOCK_MAX_TRACKED_KEYS',
  5_000,
  { min: 100 },
)
const ACCESS_TOKEN_TTL_MS = getEnvInteger(
  'SHARED_LINK_ACCESS_TOKEN_TTL_MS',
  2 * 60 * 1000,
  { min: 30_000 },
)

const unlockAttemptLimiter = new UnlockAttemptLimiter({
  windowMs: UNLOCK_WINDOW_MS,
  lockoutMs: UNLOCK_LOCKOUT_MS,
  maxAttempts: UNLOCK_MAX_ATTEMPTS,
  maxTrackedKeys: UNLOCK_STORE_MAX_KEYS,
})

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function getAttemptKey(token: string, ipAddress: string): string {
  return `${ipAddress}:${token}`
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const ipAddress = getClientIp(req)
  const attemptKey = getAttemptKey(token, ipAddress)
  const now = Date.now()

  const rateLimit = unlockAttemptLimiter.check(attemptKey, now)
  if (!rateLimit.allowed) {
    logWarn('shared-links.unlock rate limited', {
      ipAddress,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    })

    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    password?: unknown
  } | null

  try {
    validate(sharedLinkUnlockInputSchema, {
      token,
      password: body?.password,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, token),
      gt(sharedLinks.expiresAt, new Date()),
    ),
  })

  if (!link) {
    unlockAttemptLimiter.recordFailure(attemptKey, now)
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 },
    )
  }

  const ok = await bcrypt.compare(String(body!.password), link.passwordHash)
  if (!ok) {
    unlockAttemptLimiter.recordFailure(attemptKey, now)
    logWarn('shared-links.unlock invalid password', {
      sharedLinkId: link.id,
      ipAddress,
    })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  unlockAttemptLimiter.clear(attemptKey)

  const accessToken = crypto.randomBytes(32).toString('hex')
  const accessTokenHash = sha256Hex(accessToken)

  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

  const ipAddressForSession = ipAddress === 'unknown' ? null : ipAddress
  const userAgent = req.headers.get('user-agent') || null

  await db.transaction(async (tx) => {
    await tx
      .delete(sharedLinkAccessSessions)
      .where(lte(sharedLinkAccessSessions.expiresAt, new Date()))

    await tx.insert(sharedLinkAccessSessions).values({
      sharedLinkId: link.id,
      accessTokenHash,
      expiresAt,
      ipAddress: ipAddressForSession,
      userAgent,
    })
  })

  const response = NextResponse.json({ accessToken, expiresAt })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
