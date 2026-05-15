import { DisplayCurrency } from '@/types'

export function formatCurrency(
  amount: number,
  currency: DisplayCurrency,
  compact = false
): string {
  if (!isFinite(amount)) return '—'
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }
  if (compact && Math.abs(amount) >= 1_000_000) {
    return (
      new Intl.NumberFormat('en-US', { ...opts, notation: 'compact', maximumFractionDigits: 1 }).format(amount)
    )
  }
  return new Intl.NumberFormat('en-US', opts).format(amount)
}

export function formatPercent(value: number, showSign = true): string {
  if (!isFinite(value)) return '—'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatNumber(value: number, decimals = 4): string {
  if (!isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPrice(price: number, currency: DisplayCurrency): string {
  if (!isFinite(price) || price === 0) return '—'
  const decimals = price < 1 ? 6 : price < 100 ? 4 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(price)
}
