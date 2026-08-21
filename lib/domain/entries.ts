export function buildImmediatePaymentValues(params: {
  amount: number
  salePrice: number
  note?: string
}) {
  return {
    amount: params.amount.toString(),
    price: Math.abs(params.salePrice).toString(),
    note: params.note
      ? `${params.note} (immediate payment)`
      : 'Immediate payment',
  }
}

export function normalizeEntryPrice(entryTypeKey: string, input: number) {
  if (!Number.isFinite(input)) {
    throw new Error('Price must be a valid number')
  }

  if (entryTypeKey === 'sale') {
    return -Math.abs(input)
  }

  if (entryTypeKey === 'payment') {
    return Math.abs(input)
  }

  return input
}
