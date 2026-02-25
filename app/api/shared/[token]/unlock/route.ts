import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import { db } from '@/lib/db'
import { sharedLinks, sharedLinkAccessSessions } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'

import { validate } from '@/lib/db/validate'
import { sharedLinkUnlockInputSchema } from '@/lib/db/validation'
import { sha256Hex } from '@/lib/utils/crypto/shared-link'
import { logWarn } from '@/lib/utils/server-log'
import { getEnvInteger } from '@/lib/utils/env'

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

type UnlockAttemptState = {
  count: number
  windowStart: number
  lockedUntil: number
}

const unlockAttemptStore = new Map<string, UnlockAttemptState>()

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function getAttemptKey(token: string, ipAddress: string): string {
  return `${ipAddress}:${token}`
}

function cleanupAttemptStore(now: number) {
  if (unlockAttemptStore.size < UNLOCK_STORE_MAX_KEYS) return

  for (const [key, state] of unlockAttemptStore.entries()) {
    const staleWindow = now - state.windowStart > UNLOCK_LOCKOUT_MS * 2
    const unlocked = state.lockedUntil <= now
    if (staleWindow && unlocked) {
      unlockAttemptStore.delete(key)
    }
  }
}

function getRetryAfterSeconds(state: UnlockAttemptState, now: number): number {
  const remainingMs = state.lockedUntil > now ? state.lockedUntil - now : 0
  return Math.max(1, Math.ceil(remainingMs / 1000))
}

function isUnlockAllowed(attemptKey: string, now: number) {
  cleanupAttemptStore(now)

  const current = unlockAttemptStore.get(attemptKey)
  if (!current) {
    return { allowed: true as const }
  }

  if (current.lockedUntil > now) {
    return {
      allowed: false as const,
      retryAfterSeconds: getRetryAfterSeconds(current, now),
    }
  }

  if (now - current.windowStart > UNLOCK_WINDOW_MS) {
    unlockAttemptStore.set(attemptKey, {
      count: 0,
      windowStart: now,
      lockedUntil: 0,
    })
  }

  return { allowed: true as const }
}

function recordUnlockFailure(attemptKey: string, now: number) {
  const current = unlockAttemptStore.get(attemptKey)

  if (!current || now - current.windowStart > UNLOCK_WINDOW_MS) {
    unlockAttemptStore.set(attemptKey, {
      count: 1,
      windowStart: now,
      lockedUntil: 0,
    })
    return
  }

  const nextCount = current.count + 1
  const shouldLock = nextCount >= UNLOCK_MAX_ATTEMPTS

  unlockAttemptStore.set(attemptKey, {
    count: nextCount,
    windowStart: current.windowStart,
    lockedUntil: shouldLock ? now + UNLOCK_LOCKOUT_MS : 0,
  })
}

function clearUnlockFailures(attemptKey: string) {
  unlockAttemptStore.delete(attemptKey)
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const ipAddress = getClientIp(req)
  const attemptKey = getAttemptKey(token, ipAddress)
  const now = Date.now()

  const rateLimit = isUnlockAllowed(attemptKey, now)
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

  validate(sharedLinkUnlockInputSchema, {
    token,
    password: body?.password,
  })

  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, token),
      gt(sharedLinks.expiresAt, new Date()),
    ),
  })

  if (!link || !link.passwordHash) {
    recordUnlockFailure(attemptKey, now)
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 },
    )
  }

  const ok = await bcrypt.compare(String(body!.password), link.passwordHash)
  if (!ok) {
    recordUnlockFailure(attemptKey, now)
    logWarn('shared-links.unlock invalid password', {
      sharedLinkId: link.id,
      ipAddress,
    })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  clearUnlockFailures(attemptKey)

  const accessToken = crypto.randomBytes(32).toString('hex')
  const accessTokenHash = sha256Hex(accessToken)

  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)

  const ipAddressForSession = ipAddress === 'unknown' ? null : ipAddress
  const userAgent = req.headers.get('user-agent') || null

  await db.insert(sharedLinkAccessSessions).values({
    sharedLinkId: link.id,
    accessTokenHash,
    expiresAt,
    ipAddress: ipAddressForSession,
    userAgent,
  })

  const response = NextResponse.json({ accessToken, expiresAt })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
