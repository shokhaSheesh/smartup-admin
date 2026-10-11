/**
 * Service usage per payer, and the счета-фактуры we issue for it.
 *
 * A payer is whoever holds the balance: a company (by ИНН) or a физическое лицо
 * (by ПИНФЛ). Only services actually consumed count — subscription payments and
 * per-document charges. Top-ups are prepayment and are not invoiced.
 *
 * There is no billing period. An operation is either covered by a live faktura
 * (draft, sent or signed) or it is open; a payer's open operations are summed
 * whenever they happened. A rejected faktura covers nothing, so its operations
 * fall back into the open pool and add up with whatever came after.
 *
 * No backend yet: usage is generated with its own seeded PRNG so it stays
 * stable across reloads without shifting the main mock dataset, and created
 * invoices live in an in-memory store like `tenantEdits` / `userEdits`.
 */
import { useSyncExternalStore } from 'react'
import { companies, effectivePricePerDoc, platformUsers, plans, pricePerDocForVolume } from './mock'
import { DASHBOARD_NOW } from './dashboard'
import type { ServiceInvoiceStatus, TxType } from '@/types/admin'

export type PayerKind = 'company' | 'individual'

export type Payer = {
  payerKind: PayerKind
  payerId: string
  payerName: string
  /** ИНН for a company, ПИНФЛ for an individual. */
  payerTaxId: string
}

export type UsageOperation = {
  id: string
  payerId: string
  createdAt: string
  type: Extract<TxType, 'subscription_payment' | 'document_charge'>
  amount: number
  documentNumber: string | null
  planName: string | null
}

/** What a set of operations adds up to — the same shape for open usage and for a faktura. */
export type UsageSummary = {
  operations: UsageOperation[]
  /** Dates of the earliest and latest operation. */
  from: string
  to: string
  subscriptionCount: number
  subscriptionAmount: number
  documentCount: number
  documentAmount: number
  total: number
}

/** A payer's operations no live faktura covers yet. */
export type OpenUsage = Payer &
  UsageSummary & {
    /** The latest rejected faktura whose operations are back in this sum. */
    rejected: ServiceInvoice | null
  }

export type ServiceInvoice = Payer &
  UsageSummary & {
    id: string
    number: string
    status: ServiceInvoiceStatus
    createdAt: string
    createdBy: string
    /** When our accountant signed it in Smartup24 Doc and it left for the client. */
    sentAt: string | null
    /** When the client signed or rejected it. */
    resolvedAt: string | null
  }

/* ---------------------------------------------------------------- seeded rng */

function makeRng(seed: number) {
  let s = seed >>> 0
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}
const rng = makeRng(20260601)

const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const chance = (p: number) => rng() < p
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

const DAY = 86_400_000
const HOUR = 3_600_000

/* ------------------------------------------------------------------ summing */

function summarize(operations: UsageOperation[]): UsageSummary {
  const sorted = [...operations].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const summary: UsageSummary = {
    operations: sorted,
    from: sorted[sorted.length - 1].createdAt,
    to: sorted[0].createdAt,
    subscriptionCount: 0,
    subscriptionAmount: 0,
    documentCount: 0,
    documentAmount: 0,
    total: 0,
  }
  for (const op of sorted) {
    if (op.type === 'subscription_payment') {
      summary.subscriptionCount += 1
      summary.subscriptionAmount += op.amount
    } else {
      summary.documentCount += 1
      summary.documentAmount += op.amount
    }
    summary.total += op.amount
  }
  return summary
}

/* --------------------------------------------------------------------- seed */

/** How many months back usage exists, the current one included. */
const HISTORY_MONTHS = 6

const DOC_PREFIXES = ['СФ', 'ТТН', 'АКТ', 'ДОГ', 'ДОВ']

type PayerProfile = Payer & {
  activity: number
  planName: string | null
  planPrice: number
  pricePerDoc: number
  docs: () => number
}

const payers: PayerProfile[] = [
  ...companies.map((c): PayerProfile => {
    const plan = c.billingMode === 'payg' ? undefined : plans.find((p) => p.name === c.planName)
    return {
      payerKind: 'company',
      payerId: c.id,
      payerName: c.name,
      payerTaxId: c.inn,
      activity: c.status === 'suspended' ? 0.25 : 0.8,
      planName: plan?.name ?? null,
      planPrice: plan?.price ?? 0,
      // Past the quota the plan's own overage price applies, not the tier table.
      pricePerDoc: plan?.overagePricePerDoc ?? effectivePricePerDoc(c),
      docs: () =>
        c.billingMode === 'subscription' ? (chance(0.3) ? int(1, 25) : 0) : int(3, 60),
    }
  }),
  // Individuals have no subscription — only per-document charges.
  ...platformUsers
    .filter((u) => u.kind === 'individual')
    .map(
      (u): PayerProfile => ({
        payerKind: 'individual',
        payerId: u.id,
        payerName: u.fullName,
        payerTaxId: u.pinfl,
        activity: 0.55,
        planName: null,
        planPrice: 0,
        pricePerDoc: pricePerDocForVolume(u.docsSentThisMonth),
        docs: () => int(1, 14),
      }),
    ),
]

const allOperations: UsageOperation[] = []
const seedInvoices: ServiceInvoice[] = []

for (const profile of payers) {
  const { activity, planName, planPrice, pricePerDoc, docs, ...payer } = profile
  /** Operations no live faktura covers yet, carried from month to month. */
  let open: UsageOperation[] = []

  for (let back = HISTORY_MONTHS - 1; back >= 0; back--) {
    const first = new Date(DASHBOARD_NOW.getFullYear(), DASHBOARD_NOW.getMonth() - back, 1)
    const year = first.getFullYear()
    const month = first.getMonth()
    // The running month only has operations up to today.
    const lastDay = back === 0 ? DASHBOARD_NOW.getDate() : new Date(year, month + 1, 0).getDate()
    const at = () =>
      new Date(year, month, int(1, lastDay), int(8, 19), int(0, 59)).toISOString()

    if (chance(activity)) {
      const prefix = `${payer.payerId}:${year}-${month + 1}`
      if (planPrice > 0 && chance(0.85)) {
        open.push({
          id: `${prefix}:sub`,
          payerId: payer.payerId,
          createdAt: at(),
          type: 'subscription_payment',
          amount: planPrice,
          documentNumber: null,
          planName,
        })
      }
      const count = docs()
      for (let i = 0; i < count; i++) {
        open.push({
          id: `${prefix}:doc-${i + 1}`,
          payerId: payer.payerId,
          createdAt: at(),
          type: 'document_charge',
          amount: pricePerDoc,
          documentNumber: `${pick(DOC_PREFIXES)}-${int(100_000, 999_999)}`,
          planName: null,
        })
      }
    }

    // Past months were mostly invoiced at month end; the latest ones are still open.
    if (back === 0 || open.length === 0) continue
    if (!chance(back === 1 ? 0.3 : 0.92)) continue
    const roll = rng()
    const status: ServiceInvoiceStatus =
      back === 1
        ? roll < 0.6 ? 'draft' : 'sent'
        : roll < (back === 2 ? 0.8 : 0.9) ? 'signed' : back === 2 && roll < 0.9 ? 'sent' : 'rejected'

    const createdAt = new Date(year, month + 1, 1).getTime() + int(0, 2) * DAY + int(9, 17) * HOUR
    const sentAt = status === 'draft' ? null : createdAt + int(1, 30) * HOUR
    const resolvedAt =
      sentAt !== null && (status === 'signed' || status === 'rejected')
        ? sentAt + int(1, 6) * DAY
        : null
    seedInvoices.push({
      ...payer,
      ...summarize(open),
      id: `inv-${payer.payerId}-${year}-${month + 1}`,
      number: '',
      status,
      createdAt: new Date(createdAt).toISOString(),
      createdBy: 'Система',
      sentAt: sentAt === null ? null : new Date(sentAt).toISOString(),
      resolvedAt: resolvedAt === null ? null : new Date(resolvedAt).toISOString(),
    })
    // A rejected faktura covers nothing — its operations stay open.
    if (status !== 'rejected') {
      allOperations.push(...open)
      open = []
    }
  }
  allOperations.push(...open)
}

let lastNumber = 0
const nextNumber = (createdAt: string) =>
  `SM-${new Date(createdAt).getFullYear()}-${String(++lastNumber).padStart(4, '0')}`

seedInvoices.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
for (const invoice of seedInvoices) invoice.number = nextNumber(invoice.createdAt)
seedInvoices.reverse()

/* ------------------------------------------------------------- open usage */

/**
 * Every payer's open operations up to and including `through`, largest first.
 * Operations after that moment stay open for a later faktura.
 */
export function openUsage(invoices: ServiceInvoice[], through: number): OpenUsage[] {
  const covered = new Set<string>()
  for (const invoice of invoices) {
    if (invoice.status === 'rejected') continue
    for (const op of invoice.operations) covered.add(op.id)
  }

  const byPayer = new Map<string, UsageOperation[]>()
  for (const op of allOperations) {
    if (covered.has(op.id) || +new Date(op.createdAt) > through) continue
    const list = byPayer.get(op.payerId)
    if (list) list.push(op)
    else byPayer.set(op.payerId, [op])
  }

  const rows: OpenUsage[] = []
  for (const { payerKind, payerId, payerName, payerTaxId } of payers) {
    const operations = byPayer.get(payerId)
    if (!operations) continue
    const ids = new Set(operations.map((op) => op.id))
    // Invoices are kept newest first, so the first match is the latest rejection.
    const rejected =
      invoices.find(
        (invoice) =>
          invoice.payerId === payerId &&
          invoice.status === 'rejected' &&
          invoice.operations.some((op) => ids.has(op.id)),
      ) ?? null
    rows.push({ payerKind, payerId, payerName, payerTaxId, ...summarize(operations), rejected })
  }
  return rows.sort((a, b) => b.total - a.total)
}

/* -------------------------------------------------------------------- store */

let invoices: ServiceInvoice[] = seedInvoices
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Creates one draft faktura per payer, covering exactly the operations summed
 * in the row. In production this is the call that puts the document into
 * Черновики of our own Smartup24 Doc account; from there the accountant signs
 * it and the statuses come back to us. Returns the drafts in the order of `rows`.
 */
export function createInvoiceDrafts(rows: OpenUsage[], admin: string): ServiceInvoice[] {
  const createdAt = new Date().toISOString()
  const drafts = rows.map(({ rejected: _rejected, ...usage }): ServiceInvoice => {
    const number = nextNumber(createdAt)
    return {
      ...usage,
      id: `inv-${number}`,
      number,
      status: 'draft',
      createdAt,
      createdBy: admin,
      sentAt: null,
      resolvedAt: null,
    }
  })
  invoices = [...drafts.toReversed(), ...invoices]
  listeners.forEach((l) => l())
  return drafts
}

/** All fakturas, newest first. */
export function useServiceInvoices(): ServiceInvoice[] {
  return useSyncExternalStore(subscribe, () => invoices)
}
