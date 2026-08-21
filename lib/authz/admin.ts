import { getCurrentUserOrThrow } from '@/lib/authz/session'

export async function requireAdminUser() {
  const user = await getCurrentUserOrThrow()

  if (user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return user
}
