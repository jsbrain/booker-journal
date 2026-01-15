type LogLevel = 'info' | 'warn' | 'error'

type ServerLogPayload = Record<string, unknown>

function safeErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    }
  }

  return { message: String(error) }
}

function redact(payload: ServerLogPayload): ServerLogPayload {
  const redactedKeys = new Set([
    'token',
    'password',
    'secret',
    'authorization',
    'cookie',
  ])

  const out: ServerLogPayload = {}
  for (const [key, value] of Object.entries(payload)) {
    if (redactedKeys.has(key.toLowerCase())) {
      out[key] = '[redacted]'
      continue
    }
    out[key] = value
  }
  return out
}

function write(level: LogLevel, message: string, payload?: ServerLogPayload) {
  const base = {
    at: new Date().toISOString(),
    level,
    message,
    ...(payload ? { payload: redact(payload) } : {}),
  }

  if (level === 'error') console.error(base)
  else if (level === 'warn') console.warn(base)
  else console.log(base)
}

export function logInfo(message: string, payload?: ServerLogPayload) {
  write('info', message, payload)
}

export function logWarn(message: string, payload?: ServerLogPayload) {
  write('warn', message, payload)
}

export function logError(
  message: string,
  error: unknown,
  payload?: ServerLogPayload,
) {
  write('error', message, {
    ...payload,
    error: safeErrorSummary(error),
  })
}
