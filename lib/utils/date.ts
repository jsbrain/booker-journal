import { PublicError } from '@/lib/utils/public-error'

export function parseDateInput(value: string, label = 'date'): Date {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new PublicError(`Invalid ${label}`)
  }

  return parsed
}

export function parseOptionalDateInput(
  value: string | undefined,
  label = 'date',
): Date | undefined {
  if (!value) return undefined

  return parseDateInput(value, label)
}

export function ensureChronologicalRange(start: Date, end: Date): void {
  if (start > end) {
    throw new PublicError('Start date must be before end date')
  }
}
