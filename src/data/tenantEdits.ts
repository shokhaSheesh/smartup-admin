/**
 * In-memory store for admin edits to a tenant's tariff terms.
 *
 * There is no backend yet, but edits must survive navigation between the
 * companies list and the tenant detail page — so they live here rather than in
 * either page's local state.
 */
import { useSyncExternalStore } from 'react'
import type { Company, TenantStatus } from '@/types/admin'
import { plans, subscriptionByCompany } from './mock'

export type TenantEdit = {
  planId: string | null
  planName: string | null
  /** ISO date the subscription period ends. */
  periodEnd: string | null
  docQuota: number | null
  maxEmployees: number | null
  /** Net of every manual adjustment applied in this session. */
  balanceDelta: number
  status: TenantStatus | null
}

export type BalanceAdjustment = {
  direction: 'credit' | 'debit'
  amount: number
  reason: string
}

const EMPTY: TenantEdit = {
  planId: null,
  planName: null,
  periodEnd: null,
  docQuota: null,
  maxEmployees: null,
  balanceDelta: 0,
  status: null,
}

let edits: Record<string, TenantEdit> = {}
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Merges a patch into a company's edit record. */
export function applyTenantEdit(companyId: string, patch: Partial<TenantEdit>) {
  const prev = edits[companyId] ?? EMPTY
  edits = { ...edits, [companyId]: { ...prev, ...patch } }
  emit()
}

/** Adds a signed delta on top of any adjustments already applied. */
export function applyBalanceAdjustment(companyId: string, adj: BalanceAdjustment) {
  const prev = edits[companyId] ?? EMPTY
  const signed = adj.direction === 'credit' ? adj.amount : -adj.amount
  edits = {
    ...edits,
    [companyId]: { ...prev, balanceDelta: prev.balanceDelta + signed },
  }
  emit()
}

export function useTenantEdits(): Record<string, TenantEdit> {
  return useSyncExternalStore(subscribe, () => edits)
}

/** The tariff terms currently in force for a company, edits applied. */
export type EffectiveTerms = {
  planId: string | null
  planName: string | null
  periodEnd: string | null
  docQuota: number | null
  maxEmployees: number | null
  balance: number
  status: TenantStatus
  /** True when an admin has overridden the plan's own defaults. */
  quotaOverridden: boolean
  employeesOverridden: boolean
}

export function effectiveTerms(
  company: Company,
  editMap: Record<string, TenantEdit>,
): EffectiveTerms {
  const edit = editMap[company.id]
  const sub = subscriptionByCompany(company.id)

  const planId = edit?.planId ?? sub?.planId ?? null
  const plan = plans.find((p) => p.id === planId) ?? null

  const docQuota = edit?.docQuota ?? sub?.quotaTotal ?? plan?.docQuota ?? null
  const maxEmployees = edit?.maxEmployees ?? plan?.maxEmployees ?? null

  return {
    planId,
    planName: edit?.planName ?? sub?.planName ?? company.planName,
    periodEnd: edit?.periodEnd ?? sub?.periodEnd ?? null,
    docQuota,
    maxEmployees,
    balance: company.balance + (edit?.balanceDelta ?? 0),
    status: edit?.status ?? company.status,
    quotaOverridden: plan !== null && docQuota !== null && docQuota !== plan.docQuota,
    employeesOverridden:
      plan !== null && maxEmployees !== null && maxEmployees !== plan.maxEmployees,
  }
}

/** Period end implied by a plan starting today — the auto-fill value. */
export function periodEndForPlan(planId: string, from: Date = new Date()): string {
  const plan = plans.find((p) => p.id === planId)
  const days = plan?.period === 'year' ? 365 : plan?.period === 'quarter' ? 90 : 30
  const end = new Date(from.getTime() + days * 86_400_000)
  return end.toISOString()
}
