type InventoryPurchaseValue = {
  productId: string
  product: { name: string }
  quantity: string
  totalCost: string
}

type InventorySaleValue = {
  productId: string | null
  product: { name: string } | null
  amount: string
  price: string
}

export type InventorySummary = {
  productId: string
  productName: string
  totalPurchased: number
  totalSold: number
  currentStock: number
  averageBuyingPrice: number
  averageSellingPrice: number
  totalCost: number
  totalRevenue: number
}

export function calculateInventorySummary(
  purchases: InventoryPurchaseValue[],
  sales: InventorySaleValue[],
): InventorySummary[] {
  const productMap = new Map<string, InventorySummary>()

  const getProduct = (productId: string, productName: string) => {
    const existing = productMap.get(productId)
    if (existing) return existing

    const product: InventorySummary = {
      productId,
      productName,
      totalPurchased: 0,
      totalSold: 0,
      currentStock: 0,
      averageBuyingPrice: 0,
      averageSellingPrice: 0,
      totalCost: 0,
      totalRevenue: 0,
    }
    productMap.set(productId, product)
    return product
  }

  for (const purchase of purchases) {
    const product = getProduct(purchase.productId, purchase.product.name)
    product.totalPurchased += Number(purchase.quantity)
    product.totalCost += Number(purchase.totalCost)
  }

  for (const sale of sales) {
    if (!sale.productId || !sale.product) continue

    const product = getProduct(sale.productId, sale.product.name)
    const quantity = Math.abs(Number(sale.amount))
    const price = Math.abs(Number(sale.price))

    product.totalSold += quantity
    product.totalRevenue += quantity * price
  }

  return Array.from(productMap.values()).map((product) => ({
    ...product,
    currentStock: product.totalPurchased - product.totalSold,
    averageBuyingPrice:
      product.totalPurchased > 0
        ? product.totalCost / product.totalPurchased
        : 0,
    averageSellingPrice:
      product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0,
  }))
}
