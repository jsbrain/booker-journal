/**
 * Utility functions for balance display
 */

/**
 * Gets the appropriate color class for a balance value
 * @param balance - The balance amount (positive = customer owes, negative = customer has credit)
 * @returns Tailwind CSS color class
 */
export function getBalanceColor(balance: number): string {
  if (balance > 0) return "text-green-600"
  if (balance < 0) return "text-red-600"
  return ""
}

/**
 * Gets a human-readable description of the balance status
 * @param balance - The balance amount (positive = customer owes, negative = customer has credit)
 * @returns Human-readable status text
 */
export function getBalanceStatus(balance: number): string {
  if (balance > 0) return "Customer owes money"
  if (balance < 0) return "Customer has credit"
  return "Account settled"
}
