export type OpeningBalanceEntry = {
  amount: string
  price: string
  note: string
}

/**
 * Ledger totals are displayed as -(amount x price). An opening balance is a
 * balance adjustment, never a sale or payment, so it must not affect revenue
 * or inventory.
 */
export function buildOpeningBalanceEntry(
  openingBalance: number,
): OpeningBalanceEntry | null {
  if (!Number.isFinite(openingBalance)) {
    throw new Error('Opening balance must be a valid number')
  }

  if (openingBalance === 0) {
    return null
  }

  return {
    amount: '1',
    price: (-openingBalance).toString(),
    note: 'Opening balance',
  }
}
