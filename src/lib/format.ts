/** Formatting helpers — Russian locale throughout, per the design system. */

export function formatMoney(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Money with the сум suffix, for prose and cards (not table cells). */
export function formatSum(value: number): string {
  return `${formatMoney(value)} сум`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU')
}

/** Signed amount — used in the transaction ledger. */
export function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(value))}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${formatDate(iso)} ${d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Formats an ИНН as `397 308 543`. */
export function formatInn(inn: string): string {
  return inn.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export function percent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

/** Days from now until the given date — negative when already past. */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}
