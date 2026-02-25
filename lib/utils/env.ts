type NumberBounds = {
  min?: number
  max?: number
}

function clampOrThrow(
  key: string,
  value: number,
  bounds?: NumberBounds,
): number {
  if (!bounds) return value

  if (bounds.min !== undefined && value < bounds.min) {
    throw new Error(`Invalid ${key}: must be >= ${bounds.min}`)
  }

  if (bounds.max !== undefined && value > bounds.max) {
    throw new Error(`Invalid ${key}: must be <= ${bounds.max}`)
  }

  return value
}

export function getEnvNumber(
  key: string,
  fallback: number,
  bounds?: NumberBounds,
): number {
  const raw = process.env[key]
  if (!raw || !raw.trim()) {
    return clampOrThrow(key, fallback, bounds)
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${key}: expected a number`)
  }

  return clampOrThrow(key, parsed, bounds)
}

export function getEnvInteger(
  key: string,
  fallback: number,
  bounds?: NumberBounds,
): number {
  const value = getEnvNumber(key, fallback, bounds)
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${key}: expected an integer`)
  }
  return value
}

export function getEnvCsv(key: string): string[] {
  const raw = process.env[key]
  if (!raw || !raw.trim()) return []

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
