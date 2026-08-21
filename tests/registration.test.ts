import { describe, expect, test } from 'bun:test'

import { resolveRegistrationAccess } from '@/lib/domain/registration'

describe('registration access policy', () => {
  test('promotes and approves the first registered user', () => {
    expect(
      resolveRegistrationAccess({
        hasExistingUser: false,
        allowAdditionalSignups: false,
      }),
    ).toEqual({ role: 'admin', approved: true })
  })

  test('creates later users as pending when signup is enabled', () => {
    expect(
      resolveRegistrationAccess({
        hasExistingUser: true,
        allowAdditionalSignups: true,
      }),
    ).toEqual({ role: 'user', approved: false })
  })

  test('rejects later registrations when signup is disabled', () => {
    expect(
      resolveRegistrationAccess({
        hasExistingUser: true,
        allowAdditionalSignups: false,
      }),
    ).toBeNull()
  })
})
