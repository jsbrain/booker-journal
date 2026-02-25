import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export type SessionUser = {
  id: string
  email?: string | null
}

export async function getCurrentUserOrThrow(): Promise<SessionUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return {
    id: session.user.id,
    email: session.user.email,
  }
}
