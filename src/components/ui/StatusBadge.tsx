import { cn } from '@/lib/cn'
import type {
  TenantStatus,
  BillingMode,
  SubscriptionStatus,
  ChargeType,
  DocStatus,
  UserStatus,
  UserKind,
  PaymentStatus,
  AuditResult,
} from '@/types/admin'
import {
  tenantStatusLabel,
  billingModeLabel,
  subscriptionStatusLabel,
  chargeTypeLabel,
  docStatusLabel,
  userStatusLabel,
  userKindLabel,
  paymentStatusLabel,
  auditResultLabel,
} from '@/types/labels'

const base = 'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium'

const tenantStyles: Record<TenantStatus, string> = {
  active: 'bg-green-100 text-emerald-600',
  suspended: 'bg-red-100 text-red-600',
}

const subscriptionStyles: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-emerald-600',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
}

const chargeStyles: Record<ChargeType, string> = {
  free_tier: 'bg-blue-50 text-Smart-blue',
  quota: 'bg-green-100 text-emerald-600',
  payg: 'bg-gray-100 text-slate-600',
  payg_overage: 'bg-amber-50 text-amber-600',
}

const billingModeStyles: Record<BillingMode, string> = {
  subscription: 'bg-blue-50 text-Smart-blue',
  payg: 'bg-gray-100 text-slate-600',
  hybrid: 'bg-purple-50 text-purple-600',
}

const docStyles: Record<DocStatus, string> = {
  pending: 'bg-amber-50 text-amber-500',
  signed: 'bg-green-100 text-emerald-600',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

const userStyles: Record<UserStatus, string> = {
  active: 'bg-green-100 text-emerald-600',
  blocked: 'bg-red-100 text-red-600',
}

const userKindStyles: Record<UserKind, string> = {
  individual: 'bg-purple-50 text-purple-600',
  employee: 'bg-blue-50 text-Smart-blue',
}

const paymentStyles: Record<PaymentStatus, string> = {
  success: 'bg-green-100 text-emerald-600',
  failed: 'bg-red-100 text-red-600',
}

const auditStyles: Record<AuditResult, string> = {
  success: 'bg-green-100 text-emerald-600',
  denied: 'bg-red-100 text-red-600',
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <span className={cn(base, tenantStyles[status])}>{tenantStatusLabel[status]}</span>
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={cn(base, subscriptionStyles[status])}>
      {subscriptionStatusLabel[status]}
    </span>
  )
}

export function ChargeTypeBadge({ type }: { type: ChargeType | null }) {
  if (!type) return <span className="text-sm text-gray-400">—</span>
  return <span className={cn(base, chargeStyles[type])}>{chargeTypeLabel[type]}</span>
}

export function BillingModeBadge({ mode }: { mode: BillingMode }) {
  return <span className={cn(base, billingModeStyles[mode])}>{billingModeLabel[mode]}</span>
}

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return <span className={cn(base, docStyles[status])}>{docStatusLabel[status]}</span>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <span className={cn(base, userStyles[status])}>{userStatusLabel[status]}</span>
}

export function UserKindBadge({ kind }: { kind: UserKind }) {
  return (
    <span className={cn(base, 'whitespace-nowrap', userKindStyles[kind])}>
      {userKindLabel[kind]}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn(base, paymentStyles[status])}>{paymentStatusLabel[status]}</span>
}

export function AuditResultBadge({ result }: { result: AuditResult }) {
  return <span className={cn(base, auditStyles[result])}>{auditResultLabel[result]}</span>
}
