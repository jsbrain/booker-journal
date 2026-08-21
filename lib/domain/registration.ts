export type RegistrationAccess = {
  role: 'admin' | 'user'
  approved: boolean
}

export function resolveRegistrationAccess(params: {
  hasExistingUser: boolean
  allowAdditionalSignups: boolean
}): RegistrationAccess | null {
  if (!params.hasExistingUser) {
    return { role: 'admin', approved: true }
  }

  if (!params.allowAdditionalSignups) {
    return null
  }

  return { role: 'user', approved: false }
}
