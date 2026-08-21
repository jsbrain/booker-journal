import { NextResponse } from 'next/server'
import { validateSharedLinkRecord } from '@/lib/shared-links'
import { PublicError } from '@/lib/utils/public-error'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params

  try {
    const link = await validateSharedLinkRecord(token)

    if (!link) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 },
      )
    }

    const response = NextResponse.json({
      encrypted: true,
      live: true,
      passwordRequired: true,
      expiresAt: link.expiresAt,
      startDate: link.startDate,
      endDate: link.endDate,
    })

    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const message =
      error instanceof PublicError
        ? error.publicMessage
        : 'Failed to load shared link'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
