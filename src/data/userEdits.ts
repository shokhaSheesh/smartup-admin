/**
 * In-memory store for admin edits to a platform user.
 *
 * Mirrors `tenantEdits`: no backend yet, but an edit made on the users list
 * must still be visible on the user's detail page and vice versa.
 */
import { useSyncExternalStore } from 'react'
import type { AdjustmentCategory, PlatformUser, UserStatus } from '@/types/admin'

export type UserEdit = {
  /** Net of every manual balance adjustment applied in this session. */
  balanceDelta: number
  status: UserStatus | null
}

export type UserBalanceAdjustment = {
  direction: 'credit' | 'debit'
  amount: number
  category: AdjustmentCategory
  reason: string
}

/** One applied adjustment, kept so the detail page can show a history. */
export type AppliedAdjustment = UserBalanceAdjustment & {
  id: string
  at: string
  userId: string
  admin: string
}

const EMPTY: UserEdit = { balanceDelta: 0, status: null }

let edits: Record<string, UserEdit> = {}
let history: AppliedAdjustment[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function applyUserEdit(userId: string, patch: Partial<UserEdit>) {
  const prev = edits[userId] ?? EMPTY
  edits = { ...edits, [userId]: { ...prev, ...patch } }
  emit()
}

export function applyUserBalanceAdjustment(
  userId: string,
  adj: UserBalanceAdjustment,
  admin: string,
) {
  const prev = edits[userId] ?? EMPTY
  const signed = adj.direction === 'credit' ? adj.amount : -adj.amount
  edits = {
    ...edits,
    [userId]: { ...prev, balanceDelta: prev.balanceDelta + signed },
  }
  history = [
    {
      ...adj,
      id: `uadj-${history.length + 1}`,
      at: new Date().toISOString(),
      userId,
      admin,
    },
    ...history,
  ]
  emit()
}

export function useUserEdits(): Record<string, UserEdit> {
  return useSyncExternalStore(subscribe, () => edits)
}

export function useAdjustmentHistory(): AppliedAdjustment[] {
  return useSyncExternalStore(subscribe, () => history)
}

/** A user with any admin edits applied. */
export function withEdits(
  user: PlatformUser,
  editMap: Record<string, UserEdit>,
): PlatformUser {
  const edit = editMap[user.id]
  if (!edit) return user
  return {
    ...user,
    balance: user.balance === null ? null : user.balance + edit.balanceDelta,
    status: edit.status ?? user.status,
  }
}
