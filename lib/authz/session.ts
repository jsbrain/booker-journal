import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export type SessionUser = {
  id: string
  email?: string | null
  role: 'user' | 'admin'
  approved: boolean
}

export async function getCurrentUserOrThrow(): Promise<SessionUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id || !session.user.approved) {
    throw new Error('Unauthorized')
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    approved: session.user.approved,
  }
}
