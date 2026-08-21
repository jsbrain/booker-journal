import { NextResponse } from 'next/server'

import { isSignupAvailable } from '@/lib/auth-registration'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = NextResponse.json({
      signupAvailable: await isSignupAvailable(),
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch {
    return NextResponse.json(
      { error: 'Failed to load registration status' },
      { status: 500 },
    )
  }
}
