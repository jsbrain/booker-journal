export type MetricsEvent =
  | {
      kind: 'purchase'
      ts: Date
      productId: string
      productName: string
      quantity: number
      totalCost: number
    }
  | {
      kind: 'sale'
      ts: Date
      productId: string
      productName: string
      projectId: string
      quantity: number
      revenue: number
    }

type ProductAccumulator = {
  productId: string
  productName: string
  quantitySold: number
  revenue: number
  cost: number
}

type InventoryState = {
  onHandQty: number
  onHandCost: number
  lastAvgCost: number
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

export function computeMovingAverageMetrics(params: {
  start: Date
  end: Date
  events: MetricsEvent[]
  mode: 'global' | 'project'
  projectId?: string
}) {
  const { start, end, events, mode, projectId } = params

  const sorted = [...events].sort((a, b) => {
    const diff = a.ts.getTime() - b.ts.getTime()
    if (diff !== 0) return diff
    if (a.kind === b.kind) return 0
    // Purchases are applied before sales when timestamps are identical.
    return a.kind === 'purchase' ? -1 : 1
  })

  const inventoryByProduct = new Map<string, InventoryState>()
  const metricsByProduct = new Map<string, ProductAccumulator>()
  let negativeStockOccurred = false

  const getState = (productId: string): InventoryState => {
    const existing = inventoryByProduct.get(productId)
    if (existing) return existing

    const next = { onHandQty: 0, onHandCost: 0, lastAvgCost: 0 }
    inventoryByProduct.set(productId, next)
    return next
  }

  const getAccumulator = (productId: string, productName: string) => {
    const existing = metricsByProduct.get(productId)
    if (existing) return existing

    const next: ProductAccumulator = {
      productId,
      productName,
      quantitySold: 0,
      revenue: 0,
      cost: 0,
    }
    metricsByProduct.set(productId, next)
    return next
  }

  for (const event of sorted) {
    const state = getState(event.productId)

    if (event.kind === 'purchase') {
      const quantity = safeNumber(event.quantity)
      const cost = safeNumber(event.totalCost)
      const unitCost = quantity > 0 ? safeNumber(cost / quantity) : 0

      if (state.onHandQty < 0) {
        // Negative stock represents sales recorded before replenishment. Use
        // the new purchase price as the basis for the remaining position; a
        // weighted average across negative and positive quantities can yield
        // zero or inverted costs that have no useful business meaning.
        state.onHandQty += quantity
        state.lastAvgCost = unitCost
        state.onHandCost =
          state.onHandQty === 0 ? 0 : state.onHandQty * unitCost
      } else {
        state.onHandQty += quantity
        state.onHandCost += cost

        if (state.onHandQty !== 0) {
          state.lastAvgCost = safeNumber(state.onHandCost / state.onHandQty)
        }
      }

      continue
    }

    const quantitySold = safeNumber(event.quantity)
    const averageCost =
      state.onHandQty !== 0
        ? safeNumber(state.onHandCost / state.onHandQty)
        : safeNumber(state.lastAvgCost)

    state.onHandQty -= quantitySold
    state.onHandCost -= quantitySold * averageCost
    state.lastAvgCost = averageCost

    if (state.onHandQty === 0) {
      state.onHandCost = 0
    }

    if (state.onHandQty < 0) {
      negativeStockOccurred = true
      // Negative stock is intentional and retains the most recent cost basis.
      state.onHandCost = state.onHandQty * averageCost
    }

    const inRange = event.ts >= start && event.ts <= end
    const inScope =
      mode === 'global'
        ? true
        : Boolean(projectId && event.projectId === projectId)

    if (inRange && inScope) {
      const accumulator = getAccumulator(event.productId, event.productName)
      accumulator.quantitySold += quantitySold
      accumulator.revenue += safeNumber(event.revenue)
      accumulator.cost += quantitySold * averageCost
    }
  }

  const productBreakdown = Array.from(metricsByProduct.values()).map(
    (product) => ({
      productId: product.productId,
      productName: product.productName,
      quantitySold: product.quantitySold,
      revenue: product.revenue,
      cost: product.cost,
      profit: product.revenue - product.cost,
    }),
  )

  const revenue = productBreakdown.reduce(
    (sum, product) => sum + product.revenue,
    0,
  )
  const cost = productBreakdown.reduce((sum, product) => sum + product.cost, 0)

  return {
    revenue,
    cost,
    profit: revenue - cost,
    productBreakdown,
    negativeStockOccurred,
  }
}
