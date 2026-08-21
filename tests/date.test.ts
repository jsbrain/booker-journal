import { describe, expect, test } from 'bun:test'

import {
  ensureChronologicalRange,
  parseDateInput,
  parseOptionalDateInput,
} from '@/lib/utils/date'

describe('date input parsing', () => {
  test('accepts valid ISO dates', () => {
    expect(parseDateInput('2026-08-05T12:30:00.000Z').toISOString()).toBe(
      '2026-08-05T12:30:00.000Z',
    )
  })

  test('rejects invalid dates with a stable public message', () => {
    expect(() => parseDateInput('not-a-date', 'start date')).toThrow(
      'Invalid start date',
    )
  })

  test('keeps optional dates optional', () => {
    expect(parseOptionalDateInput(undefined)).toBeUndefined()
  })
})

describe('date ranges', () => {
  test('rejects an inverted date range', () => {
    expect(() =>
      ensureChronologicalRange(
        new Date('2026-02-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ).toThrow('Start date must be before end date')
  })
})
