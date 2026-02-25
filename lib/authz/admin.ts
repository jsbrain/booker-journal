import { getEnvCsv } from '@/lib/utils/env'
import { getCurrentUserOrThrow } from '@/lib/authz/session'

function isLocalHost(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return true
  }
}

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  `http://localhost:${process.env.PORT || '3005'}`

const adminUserIds = new Set(getEnvCsv('ADMIN_USER_IDS'))
const adminEmails = new Set(
  getEnvCsv('ADMIN_EMAILS').map((email) => email.toLowerCase()),
)

function hasConfiguredAdmins(): boolean {
  return adminUserIds.size > 0 || adminEmails.size > 0
}

function ensureAdminConfigInNonLocalEnv() {
  if (hasConfiguredAdmins()) return

  if (!isLocalHost(appUrl)) {
    throw new Error(
      'Missing ADMIN_USER_IDS/ADMIN_EMAILS for non-local environment',
    )
  }
}

export async function requireAdminUser() {
  ensureAdminConfigInNonLocalEnv()

  const user = await getCurrentUserOrThrow()

  if (!hasConfiguredAdmins()) {
    return user
  }

  const idAllowed = adminUserIds.has(user.id)
  const emailAllowed =
    Boolean(user.email) && adminEmails.has(String(user.email).toLowerCase())

  if (!idAllowed && !emailAllowed) {
    throw new Error('Forbidden')
  }

  return user
}
