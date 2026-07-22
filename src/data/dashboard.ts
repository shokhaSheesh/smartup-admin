/**
 * Dashboard analytics, computed from the real timestamps in the mock data so
 * the period selector genuinely re-slices — cumulative counts by registration
 * date, revenue by payment date, providers and document types within the range.
 */
import {
  companies,
  documents,
  payments,
  platformUsers,
} from './mock'
import { PAYMENT_CHANNELS, DOC_TYPES, paymentChannel } from '@/types/admin'

export type Granularity = 'day' | 'month' | 'year'

const MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]

/** The panel's "now" — the mock data is generated relative to this instant. */
export const DASHBOARD_NOW = new Date('2026-07-18T10:00:00Z')

type Bucket = { label: string; start: number; end: number }

/** The buckets a granularity + period resolves to. */
export function buckets(g: Granularity, year: number, month: number): Bucket[] {
  if (g === 'day') {
    const days = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => {
      const start = new Date(year, month, i + 1).getTime()
      return {
        label: String(i + 1).padStart(2, '0'),
        start,
        end: start + 86_400_000,
      }
    })
  }
  if (g === 'month') {
    return MONTHS_SHORT.map((label, i) => ({
      label,
      start: new Date(year, i, 1).getTime(),
      end: new Date(year, i + 1, 1).getTime(),
    }))
  }
  // year — the current year and the five before it
  const thisYear = DASHBOARD_NOW.getFullYear()
  return Array.from({ length: 6 }, (_, i) => {
    const y = thisYear - 5 + i
    return {
      label: String(y),
      start: new Date(y, 0, 1).getTime(),
      end: new Date(y + 1, 0, 1).getTime(),
    }
  })
}

/** Years present in the data, newest first, for the year picker. */
export function availableYears(): number[] {
  const thisYear = DASHBOARD_NOW.getFullYear()
  return [thisYear, thisYear - 1, thisYear - 2]
}

export const MONTH_OPTIONS = MONTHS_SHORT.map((label, i) => ({
  value: String(i),
  label,
}))

/** Running total up to the end of each bucket — for growth curves. */
function cumulativePerBucket<T>(items: T[], at: (item: T) => number, bs: Bucket[]) {
  return bs.map((b) => ({
    label: b.label,
    value: items.filter((item) => at(item) < b.end).length,
  }))
}

const ts = (iso: string) => new Date(iso).getTime()

/** Cumulative company count at each bucket. */
export function companyGrowth(g: Granularity, year: number, month: number) {
  return cumulativePerBucket(companies, (c) => ts(c.createdAt), buckets(g, year, month))
}

/** Cumulative user count — companies' employees and individuals alike. */
export function userGrowth(g: Granularity, year: number, month: number) {
  return cumulativePerBucket(
    platformUsers,
    (u) => ts(u.registeredAt),
    buckets(g, year, month),
  )
}

/** Revenue (successful payments) per bucket. */
export function revenueSeries(g: Granularity, year: number, month: number) {
  const bs = buckets(g, year, month)
  const paid = payments.filter((p) => p.status === 'success')
  return bs.map((b) => ({
    label: b.label,
    value: paid
      .filter((p) => {
        const t = ts(p.createdAt)
        return t >= b.start && t < b.end
      })
      .reduce((sum, p) => sum + p.amount, 0),
  }))
}

/**
 * Share of successful payments by settlement channel over the period — the
 * gateways plus «Карта» for saved-card charges. Manual top-ups have no channel.
 */
export function providerSplit(g: Granularity, year: number, month: number) {
  const bs = buckets(g, year, month)
  const from = bs[0].start
  const to = bs[bs.length - 1].end
  const inRange = payments.filter((p) => {
    const t = ts(p.createdAt)
    return p.status === 'success' && t >= from && t < to
  })
  return PAYMENT_CHANNELS.map((channel) => ({
    name: channel,
    value: inRange.filter((p) => paymentChannel(p) === channel).length,
  })).filter((slice) => slice.value > 0)
}

/** Document volume by type within the selected period, busiest first. */
export function docTypeSplit(g: Granularity, year: number, month: number) {
  const bs = buckets(g, year, month)
  const from = bs[0].start
  const to = bs[bs.length - 1].end
  const inRange = documents.filter((d) => {
    if (!d.sentAt) return false
    const t = ts(d.sentAt)
    return t >= from && t < to
  })
  return DOC_TYPES.map((type) => ({
    type,
    count: inRange.filter((d) => d.type === type).length,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
}

/* ---------------------------------------------------------------- KPI totals */

export function totalCompanies(): number {
  return companies.length
}

export function totalUsers(): { total: number; individuals: number; employees: number } {
  const individuals = platformUsers.filter((u) => u.kind === 'individual').length
  return {
    total: platformUsers.length,
    individuals,
    employees: platformUsers.length - individuals,
  }
}

export function totalRevenue(): number {
  return payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0)
}
