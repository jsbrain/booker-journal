import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sharedLinks, sharedLinkAccessSessions } from '@/lib/db/schema'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { validate } from '@/lib/db/validate'
import { sharedLinkKeyReleaseInputSchema } from '@/lib/db/validation'
import { sha256Hex } from '@/lib/utils/crypto/shared-link'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const body = (await req.json().catch(() => null)) as {
    accessToken?: unknown
  } | null

  validate(sharedLinkKeyReleaseInputSchema, {
    token,
    accessToken: body?.accessToken,
  })

  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, token),
      gt(sharedLinks.expiresAt, new Date()),
    ),
  })

  if (!link || !link.keyServer) {
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 },
    )
  }

  const accessToken = String(body!.accessToken)
  const accessTokenHash = sha256Hex(accessToken)

  const session = await db.query.sharedLinkAccessSessions.findFirst({
    where: and(
      eq(sharedLinkAccessSessions.sharedLinkId, link.id),
      eq(sharedLinkAccessSessions.accessTokenHash, accessTokenHash),
      gt(sharedLinkAccessSessions.expiresAt, new Date()),
      isNull(sharedLinkAccessSessions.usedAt),
    ),
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 },
    )
  }

  await db
    .update(sharedLinkAccessSessions)
    .set({ usedAt: new Date() })
    .where(eq(sharedLinkAccessSessions.id, session.id))

  const response = NextResponse.json({ keyServer: link.keyServer })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
