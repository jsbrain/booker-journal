import { describe, expect, test } from 'bun:test'

import { UnlockAttemptLimiter } from '@/lib/utils/unlock-attempt-limiter'

describe('shared-link unlock attempt limiter', () => {
  test('locks a key after the configured number of failures', () => {
    const limiter = new UnlockAttemptLimiter({
      windowMs: 10_000,
      lockoutMs: 30_000,
      maxAttempts: 2,
      maxTrackedKeys: 10,
    })

    limiter.recordFailure('ip:token', 1_000)
    expect(limiter.check('ip:token', 1_001).allowed).toBe(true)

    limiter.recordFailure('ip:token', 1_002)
    expect(limiter.check('ip:token', 1_003)).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    })
  })

  test('never exceeds the configured tracked-key limit', () => {
    const limiter = new UnlockAttemptLimiter({
      windowMs: 10_000,
      lockoutMs: 30_000,
      maxAttempts: 5,
      maxTrackedKeys: 2,
    })

    limiter.recordFailure('one', 1_000)
    limiter.recordFailure('two', 1_001)
    limiter.recordFailure('three', 1_002)

    expect(limiter.getTrackedKeyCount()).toBe(2)
  })

  test('locks immediately when one failure is allowed', () => {
    const limiter = new UnlockAttemptLimiter({
      windowMs: 10_000,
      lockoutMs: 30_000,
      maxAttempts: 1,
      maxTrackedKeys: 10,
    })

    limiter.recordFailure('ip:token', 1_000)

    expect(limiter.check('ip:token', 1_001).allowed).toBe(false)
  })

  test('clears successful keys and expires old attempt windows', () => {
    const limiter = new UnlockAttemptLimiter({
      windowMs: 1_000,
      lockoutMs: 5_000,
      maxAttempts: 2,
      maxTrackedKeys: 10,
    })

    limiter.recordFailure('clear-me', 0)
    limiter.clear('clear-me')
    expect(limiter.getTrackedKeyCount()).toBe(0)

    limiter.recordFailure('window', 0)
    limiter.recordFailure('window', 2_000)
    expect(limiter.check('window', 2_001).allowed).toBe(true)
  })
})
