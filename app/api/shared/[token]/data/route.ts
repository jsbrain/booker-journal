import { NextResponse } from 'next/server'

import { validate } from '@/lib/db/validate'
import { sharedLinkEncryptedDataInputSchema } from '@/lib/db/validation'
import { PublicError } from '@/lib/utils/public-error'
import { getSharedProjectData } from '@/lib/shared-links'
import {
  encryptLivePayload,
  InvalidSharedLinkPublicKeyError,
} from '@/lib/utils/crypto/shared-link'

export const dynamic = 'force-dynamic'

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return undefined

  const accessToken = header.slice('Bearer '.length).trim()
  return accessToken || undefined
}

function errorResponse(error: unknown) {
  const message =
    error instanceof PublicError
      ? error.publicMessage
      : 'Failed to load shared project'

  const status =
    message === 'Invalid or expired link'
      ? 404
      : message === 'Password required' ||
          message === 'Invalid or expired session'
        ? 401
        : 500

  return NextResponse.json({ error: message }, { status })
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const accessToken = getBearerToken(req)
  const body = (await req.json().catch(() => null)) as {
    publicKey?: unknown
  } | null

  try {
    validate(sharedLinkEncryptedDataInputSchema, {
      publicKey: body?.publicKey,
    })

    const data = await getSharedProjectData({ token, accessToken })
    const encrypted = await encryptLivePayload(
      JSON.stringify(data),
      String(body!.publicKey),
      token,
    )
    const response = NextResponse.json(encrypted)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Validation failed')
    ) {
      return NextResponse.json(
        { error: 'Invalid encryption key' },
        { status: 400 },
      )
    }
    if (error instanceof InvalidSharedLinkPublicKeyError) {
      return NextResponse.json(
        { error: 'Invalid encryption key' },
        { status: 400 },
      )
    }

    return errorResponse(error)
  }
}
