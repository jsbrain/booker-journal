import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import { db } from '@/lib/db'
import { sharedLinks, sharedLinkAccessSessions } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'

import { validate } from '@/lib/db/validate'
import { sharedLinkUnlockInputSchema } from '@/lib/db/validation'
import { sha256Hex } from '@/lib/utils/crypto/shared-link'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
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
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 },
    )
  }

  const ok = await bcrypt.compare(String(body!.password), link.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const accessToken = crypto.randomBytes(32).toString('hex')
  const accessTokenHash = sha256Hex(accessToken)

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes

  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent') || null

  await db.insert(sharedLinkAccessSessions).values({
    sharedLinkId: link.id,
    accessTokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  })

  const response = NextResponse.json({ accessToken, expiresAt })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
