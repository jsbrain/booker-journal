/**
 * Locale formatting utilities for German locale
 * Currency: 1.000,00€ (not €1,000.00)
 * Dates: DD.MM.YYYY format
 */

const LOCALE = "de-DE"
const CURRENCY = "EUR"

/**
 * Format a number as currency in German format (e.g., 1.234,56 €)
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(value)
}

/**
 * Format a date in German short format (e.g., 31.12.2024)
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
  }).format(new Date(date))
}

/**
 * Format a date in German medium format (e.g., 31. Dez. 2024)
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateMedium(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
  }).format(new Date(date))
}

/**
 * Format a date and time in German format (e.g., 31.12.2024, 15:30)
 * @param date - The date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

/**
 * Format a date and time in German medium format (e.g., 31. Dez. 2024, 15:30)
 * @param date - The date to format
 * @returns Formatted date and time string
 */
export function formatDateTimeMedium(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

/**
 * Format a number with German number formatting (e.g., 1.234,56)
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
