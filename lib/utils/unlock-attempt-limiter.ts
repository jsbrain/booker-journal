type UnlockAttemptState = {
  count: number
  windowStart: number
  lockedUntil: number
}

type UnlockAttemptLimiterOptions = {
  windowMs: number
  lockoutMs: number
  maxAttempts: number
  maxTrackedKeys: number
}

export class UnlockAttemptLimiter {
  private readonly attempts = new Map<string, UnlockAttemptState>()

  constructor(private readonly options: UnlockAttemptLimiterOptions) {
    if (options.maxTrackedKeys < 1) {
      throw new Error('maxTrackedKeys must be at least 1')
    }
  }

  check(attemptKey: string, now: number) {
    const current = this.attempts.get(attemptKey)
    if (!current) {
      return { allowed: true as const }
    }

    if (current.lockedUntil > now) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.lockedUntil - now) / 1000),
        ),
      }
    }

    if (now - current.windowStart > this.options.windowMs) {
      this.attempts.set(attemptKey, {
        count: 0,
        windowStart: now,
        lockedUntil: 0,
      })
    }

    return { allowed: true as const }
  }

  recordFailure(attemptKey: string, now: number) {
    this.ensureCapacity(attemptKey, now)

    const current = this.attempts.get(attemptKey)
    if (!current || now - current.windowStart > this.options.windowMs) {
      this.attempts.set(attemptKey, {
        count: 1,
        windowStart: now,
        lockedUntil:
          this.options.maxAttempts === 1 ? now + this.options.lockoutMs : 0,
      })
      return
    }

    const nextCount = current.count + 1
    this.attempts.set(attemptKey, {
      count: nextCount,
      windowStart: current.windowStart,
      lockedUntil:
        nextCount >= this.options.maxAttempts
          ? now + this.options.lockoutMs
          : 0,
    })
  }

  clear(attemptKey: string) {
    this.attempts.delete(attemptKey)
  }

  getTrackedKeyCount() {
    return this.attempts.size
  }

  private ensureCapacity(attemptKey: string, now: number) {
    if (this.attempts.has(attemptKey)) return

    const staleAfterMs =
      Math.max(this.options.windowMs, this.options.lockoutMs) * 2

    for (const [key, state] of this.attempts) {
      const isUnlocked = state.lockedUntil <= now
      const isStale = now - state.windowStart > staleAfterMs
      if (isUnlocked && isStale) this.attempts.delete(key)
    }

    while (this.attempts.size >= this.options.maxTrackedKeys) {
      let evictionKey: string | undefined
      let oldestWindowStart = Number.POSITIVE_INFINITY

      for (const [key, state] of this.attempts) {
        if (state.lockedUntil > now) continue
        if (state.windowStart < oldestWindowStart) {
          evictionKey = key
          oldestWindowStart = state.windowStart
        }
      }

      // Preserve active lockouts when possible. If every tracked key is locked,
      // evict the oldest inserted entry to keep the memory limit hard.
      const keyToEvict = evictionKey ?? this.attempts.keys().next().value
      if (!keyToEvict) break
      this.attempts.delete(keyToEvict)
    }
  }
}
