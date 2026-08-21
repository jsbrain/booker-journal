import { describe, expect, test } from 'bun:test'

import {
  buildImmediatePaymentValues,
  normalizeEntryPrice,
} from '@/lib/domain/entries'
import { calculateInventorySummary } from '@/lib/domain/inventory'
import { buildOpeningBalanceEntry } from '@/lib/domain/projects'
import {
  computeMovingAverageMetrics,
  type MetricsEvent,
} from '@/lib/domain/metrics'
import { calculateLedgerBalance } from '@/lib/utils/balance'

describe('ledger balance', () => {
  test('uses positive balances for debt and negative balances for credit', () => {
    expect(calculateLedgerBalance([{ amount: 2, price: -10 }])).toBe(20)
    expect(calculateLedgerBalance([{ amount: 1, price: 5 }])).toBe(-5)
  })

  test('an immediate payment exactly offsets its sale', () => {
    const payment = buildImmediatePaymentValues({
      amount: 3,
      salePrice: -12.5,
      note: 'Counter sale',
    })

    expect(payment.note).toBe('Counter sale (immediate payment)')
    expect(
      calculateLedgerBalance([
        { amount: 3, price: -12.5 },
        { amount: payment.amount, price: payment.price },
      ]),
    ).toBe(0)
  })

  test('normalizes the ledger sign for sales and payments', () => {
    expect(normalizeEntryPrice('sale', 12.5)).toBe(-12.5)
    expect(normalizeEntryPrice('sale', -12.5)).toBe(-12.5)
    expect(normalizeEntryPrice('payment', -12.5)).toBe(12.5)
    expect(normalizeEntryPrice('adjustment', -12.5)).toBe(-12.5)
  })
})

describe('opening balances', () => {
  test('creates a balance-only adjustment with the correct ledger sign', () => {
    const receivable = buildOpeningBalanceEntry(125)
    const credit = buildOpeningBalanceEntry(-40)

    expect(receivable).toEqual({
      amount: '1',
      price: '-125',
      note: 'Opening balance',
    })
    expect(credit).toEqual({
      amount: '1',
      price: '40',
      note: 'Opening balance',
    })
    expect(calculateLedgerBalance([receivable!])).toBe(125)
    expect(calculateLedgerBalance([credit!])).toBe(-40)
  })

  test('does not create a zero-value journal entry', () => {
    expect(buildOpeningBalanceEntry(0)).toBeNull()
  })
})

describe('moving-average metrics', () => {
  const events: MetricsEvent[] = [
    {
      kind: 'purchase',
      ts: new Date('2025-11-01T00:00:00.000Z'),
      productId: 'product-1',
      productName: 'Product',
      quantity: 100,
      totalCost: 100,
    },
    {
      kind: 'sale',
      ts: new Date('2025-12-01T00:00:00.000Z'),
      productId: 'product-1',
      productName: 'Product',
      projectId: 'project-1',
      quantity: 50,
      revenue: 150,
    },
    {
      kind: 'purchase',
      ts: new Date('2026-01-01T00:00:00.000Z'),
      productId: 'product-1',
      productName: 'Product',
      quantity: 100,
      totalCost: 200,
    },
    {
      kind: 'sale',
      ts: new Date('2026-01-31T23:59:59.999Z'),
      productId: 'product-1',
      productName: 'Product',
      projectId: 'project-1',
      quantity: 50,
      revenue: 150,
    },
  ]

  test('applies inclusive date bounds and historical inventory costing', () => {
    const result = computeMovingAverageMetrics({
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2026-01-31T23:59:59.999Z'),
      events,
      mode: 'global',
    })

    expect(result.revenue).toBe(150)
    expect(result.cost).toBeCloseTo(83.333333, 5)
    expect(result.profit).toBeCloseTo(66.666667, 5)
  })

  test('limits project metrics to the selected project', () => {
    const result = computeMovingAverageMetrics({
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2026-12-31T23:59:59.999Z'),
      events: [
        ...events,
        {
          kind: 'sale',
          ts: new Date('2026-02-01T00:00:00.000Z'),
          productId: 'product-1',
          productName: 'Product',
          projectId: 'project-2',
          quantity: 5,
          revenue: 25,
        },
      ],
      mode: 'project',
      projectId: 'project-1',
    })

    expect(result.revenue).toBe(300)
    expect(result.productBreakdown[0]?.quantitySold).toBe(100)
  })

  test('uses replenishment cost after inventory has gone negative', () => {
    const result = computeMovingAverageMetrics({
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2026-12-31T23:59:59.999Z'),
      events: [
        {
          kind: 'sale',
          ts: new Date('2026-01-01T09:00:00.000Z'),
          productId: 'product-1',
          productName: 'Product',
          projectId: 'project-1',
          quantity: 5,
          revenue: 15,
        },
        {
          kind: 'purchase',
          ts: new Date('2026-01-02T09:00:00.000Z'),
          productId: 'product-1',
          productName: 'Product',
          quantity: 10,
          totalCost: 20,
        },
        {
          kind: 'sale',
          ts: new Date('2026-01-03T09:00:00.000Z'),
          productId: 'product-1',
          productName: 'Product',
          projectId: 'project-1',
          quantity: 5,
          revenue: 15,
        },
      ],
      mode: 'global',
    })

    expect(result.negativeStockOccurred).toBe(true)
    expect(result.cost).toBe(10)
    expect(result.profit).toBe(20)
  })
})

describe('inventory summary', () => {
  test('keeps negative stock visible as an intentional restock signal', () => {
    const [summary] = calculateInventorySummary(
      [
        {
          productId: 'product-1',
          product: { name: 'Product' },
          quantity: '2',
          totalCost: '10',
        },
      ],
      [
        {
          productId: 'product-1',
          product: { name: 'Product' },
          amount: '5',
          price: '-8',
        },
      ],
    )

    expect(summary?.currentStock).toBe(-3)
    expect(summary?.totalRevenue).toBe(40)
  })
})
