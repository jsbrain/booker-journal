import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { resolveRegistrationAccess } from '@/lib/domain/registration'
import { getEnvBoolean } from '@/lib/utils/env'

export const ADDITIONAL_SIGNUPS_ENV = 'ALLOW_USER_SIGNUP'

export function additionalSignupsEnabled(): boolean {
  return getEnvBoolean(ADDITIONAL_SIGNUPS_ENV, false)
}

export async function hasRegisteredUser(): Promise<boolean> {
  const existing = await db.select({ id: user.id }).from(user).limit(1)
  return existing.length > 0
}

export async function getRegistrationAccess() {
  return resolveRegistrationAccess({
    hasExistingUser: await hasRegisteredUser(),
    allowAdditionalSignups: additionalSignupsEnabled(),
  })
}

export async function isSignupAvailable(): Promise<boolean> {
  return (await getRegistrationAccess()) !== null
}
