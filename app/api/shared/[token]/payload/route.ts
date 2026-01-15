import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sharedLinks } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { validate } from '@/lib/db/validate'
import { sharedLinkTokenSchema } from '@/lib/db/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  validate(sharedLinkTokenSchema, { token })

  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, token),
      gt(sharedLinks.expiresAt, new Date()),
    ),
  })

  if (!link) {
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 },
    )
  }

  const encrypted = Boolean(
    link.payloadEnc && link.keyUserEnc && link.keyServer,
  )

  const response = NextResponse.json(
    encrypted
      ? {
          encrypted: true,
          expiresAt: link.expiresAt,
          startDate: link.startDate,
          endDate: link.endDate,
          payload: {
            enc: link.payloadEnc,
            iv: link.payloadIv,
            aad: link.payloadAad,
          },
          keyUser: {
            enc: link.keyUserEnc,
            iv: link.keyUserIv,
            salt: link.keyUserSalt,
            iterations: link.keyUserIterations,
          },
        }
      : {
          encrypted: false,
          expiresAt: link.expiresAt,
          startDate: link.startDate,
          endDate: link.endDate,
        },
  )

  response.headers.set('Cache-Control', 'no-store')
  return response
}
