export class PublicError extends Error {
  publicMessage: string

  constructor(publicMessage: string, cause?: unknown) {
    super(publicMessage)
    this.name = 'PublicError'
    this.publicMessage = publicMessage

    if (cause !== undefined) {
      ;(this as { cause?: unknown }).cause = cause
    }
  }
}

export function getPublicErrorMessage(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  if (error instanceof PublicError) return error.publicMessage

  if (typeof error === 'object' && error !== null) {
    const maybe = error as { publicMessage?: unknown }
    if (typeof maybe.publicMessage === 'string' && maybe.publicMessage.trim()) {
      return maybe.publicMessage
    }
  }

  return fallback
}

export function devLogError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    // Intentionally logs the raw error only in dev.
    console.error(context, error)
  }
}
