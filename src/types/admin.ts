/** Domain types for the Smartup24 Doc super-admin panel. */

export type TenantStatus = 'active' | 'blocked' | 'suspended'
export type BillingMode = 'subscription' | 'payg' | 'hybrid'
export type SubscriptionStatus =
  | 'active'
  | 'expiring'
  | 'quota_exhausted'
  | 'expired'
  | 'cancelled'
export type OverageMode = null | 'payg'
export type ChargeType = 'free_tier' | 'quota' | 'payg' | 'payg_overage'
export type DocDirection = 'incoming' | 'outgoing'
export type DocStatus = 'draft' | 'sent' | 'signed' | 'rejected' | 'cancelled'
export type UserStatus = 'active' | 'blocked'
export type TenantUserRole = 'director' | 'accountant' | 'operator'
export type AdminRole = 'super_admin' | 'support' | 'finance' | 'analyst'
export type TxType =
  | 'topup'
  | 'document_charge'
  | 'manual_adjustment'
  | 'refund'
  | 'subscription_payment'
export type PaymentMethod = 'card' | 'bank_transfer' | 'manual'
export type PaymentStatus = 'pending' | 'success' | 'failed'
export type AdjustmentCategory =
  | 'compensation'
  | 'refund'
  | 'goodwill'
  | 'correction'
  | 'promo'
export type AuditResult = 'success' | 'denied'

/** The 16 document types on the platform. */
export const DOC_TYPES = [
  'Счёт-фактура',
  'Акт выполненных работ',
  'ТТН',
  'Договор',
  'Доверенность',
  'Счёт на оплату',
  'Накладная',
  'Акт сверки',
  'Дополнительное соглашение',
  'Возвратная накладная',
  'Исправленная счёт-фактура',
  'Дополнительная счёт-фактура',
  'Единый счёт-фактура',
  'Акт приёма-передачи',
  'Гарантийное письмо',
  'Прочий документ',
] as const
export type DocType = (typeof DOC_TYPES)[number]

export type Company = {
  id: string
  inn: string
  name: string
  address: string
  region: string
  oked: string
  directorPinfl: string
  directorName: string
  accountantPinfl: string
  accountantName: string
  phone: string
  mobile: string
  email: string
  website: string
  mfo: string
  bankName: string
  accountNumber: string
  status: TenantStatus
  statusReason: string | null
  billingMode: BillingMode
  customPricePerDoc: number | null
  planName: string | null
  balance: number
  docsSent30d: number
  employees: number
  createdAt: string
  lastActiveAt: string
  source: string
}

export type TenantUser = {
  id: string
  companyId: string
  companyInn: string
  companyName: string
  pinfl: string
  fullName: string
  role: TenantUserRole
  email: string
  phone: string
  status: UserStatus
  eimzoBound: boolean
  lastLoginAt: string
}

export type Plan = {
  id: string
  nameRu: string
  nameUz: string
  description: string
  price: number
  period: 'month' | 'quarter' | 'year'
  docQuota: number
  maxEmployees: number
  features: string[]
  isActive: boolean
  visibleToNewSignups: boolean
  sortOrder: number
  activeSubscribers: number
}

export type PriceTier = {
  id: string
  name: string
  volumeFrom: number
  volumeTo: number | null
  pricePerDoc: number
  effectiveFrom: string
}

export type Subscription = {
  id: string
  companyId: string
  companyInn: string
  companyName: string
  planId: string
  planName: string
  status: SubscriptionStatus
  periodStart: string
  periodEnd: string
  quotaTotal: number
  quotaUsed: number
  autoRenew: boolean
  amountPaid: number
  overageMode: OverageMode
  overageDocs: number
  overageAmount: number
}

export type BalanceAccount = {
  companyId: string
  companyInn: string
  companyName: string
  balance: number
  freeAllowanceTotal: number
  freeAllowanceUsed: number
  lastTopUpAt: string | null
  totalToppedUp: number
  totalConsumed: number
}

export type Transaction = {
  id: string
  createdAt: string
  companyId: string
  companyInn: string
  companyName: string
  type: TxType
  amount: number
  balanceAfter: number
  documentId: string | null
  documentNumber: string | null
  adminName: string | null
  reason: string | null
}

export type Payment = {
  id: string
  createdAt: string
  companyId: string
  companyInn: string
  companyName: string
  amount: number
  method: PaymentMethod
  providerRef: string
  cardMask: string | null
  status: PaymentStatus
}

export type Adjustment = {
  id: string
  createdAt: string
  companyId: string
  companyInn: string
  companyName: string
  direction: 'credit' | 'debit'
  amount: number
  category: AdjustmentCategory
  reason: string
  performedBy: string
}

export type AdminDocument = {
  id: string
  number: string
  companyId: string
  type: DocType
  direction: DocDirection
  senderInn: string
  senderName: string
  receiverInn: string
  receiverName: string
  status: DocStatus
  amount: number
  createdAt: string
  sentAt: string | null
  chargeType: ChargeType | null
  chargeAmount: number
}

export type AdminUser = {
  id: string
  fullName: string
  email: string
  phone: string
  role: AdminRole
  status: 'active' | 'disabled'
  twofaEnabled: boolean
  lastLoginAt: string
  createdAt: string
}

export type PermissionLevel = 'full' | 'view' | 'edit' | 'metadata' | 'own' | 'none'

export type Role = {
  id: AdminRole
  name: string
  description: string
  permissions: Record<string, PermissionLevel>
}

export type AuditEntry = {
  id: string
  createdAt: string
  adminName: string
  adminRole: AdminRole
  action: string
  targetType: 'Company' | 'User' | 'Document' | 'Plan' | 'Balance' | 'Role' | 'Session'
  target: string
  ip: string
  result: AuditResult
  details: string
}
