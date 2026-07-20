import type {
  AuthMethod,
  TenantStatus,
  BillingMode,
  SubscriptionStatus,
  ChargeType,
  DocStatus,
  DocDirection,
  UserStatus,
  TenantUserRole,
  UserKind,
  AdminRole,
  TxType,
  PaymentMethod,
  PaymentStatus,
  AdjustmentCategory,
  AuditResult,
} from './admin'

export const tenantStatusLabel: Record<TenantStatus, string> = {
  active: 'Активна',
  suspended: 'Приостановлена',
}

export const billingModeLabel: Record<BillingMode, string> = {
  subscription: 'Подписка',
  payg: 'Оплата за документ',
  hybrid: 'Подписка + доплата',
}

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  expiring: 'Истекает',
  quota_exhausted: 'Квота исчерпана',
  expired: 'Истекла',
  cancelled: 'Отменена',
}

export const chargeTypeLabel: Record<ChargeType, string> = {
  free_tier: 'Бесплатный лимит',
  quota: 'Из квоты',
  payg: 'За документ',
  payg_overage: 'Доплата сверх квоты',
}

export const docStatusLabel: Record<DocStatus, string> = {
  pending: 'Ожидает',
  signed: 'Подписан',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
}

export const docDirectionLabel: Record<DocDirection, string> = {
  incoming: 'Входящий',
  outgoing: 'Исходящий',
}

export const userStatusLabel: Record<UserStatus, string> = {
  active: 'Активен',
  blocked: 'Заблокирован',
}

export const userKindLabel: Record<UserKind, string> = {
  individual: 'Физическое лицо',
  employee: 'Сотрудник компании',
}

export const authMethodLabel: Record<AuthMethod, string> = {
  personal_eimzo: 'Личный ключ E-IMZO',
  company_eimzo: 'Ключ E-IMZO компании',
  login_password: 'ИНН и пароль',
}

export const tenantUserRoleLabel: Record<TenantUserRole, string> = {
  director: 'Директор',
  accountant: 'Бухгалтер',
  operator: 'Оператор',
}

export const adminRoleLabel: Record<AdminRole, string> = {
  super_admin: 'Супер-админ',
  support: 'Поддержка',
  finance: 'Финансы',
  analyst: 'Аналитик',
}

export const txTypeLabel: Record<TxType, string> = {
  topup: 'Пополнение',
  document_charge: 'Списание за документ',
  manual_adjustment: 'Ручная корректировка',
  refund: 'Возврат',
  subscription_payment: 'Оплата подписки',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  card: 'Карта',
  bank_transfer: 'Банковский перевод',
  manual: 'Вручную',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: 'В обработке',
  success: 'Успешно',
  failed: 'Ошибка',
}

export const adjustmentCategoryLabel: Record<AdjustmentCategory, string> = {
  compensation: 'Компенсация',
  refund: 'Возврат',
  goodwill: 'Лояльность',
  correction: 'Исправление',
  promo: 'Промо',
}

export const auditResultLabel: Record<AuditResult, string> = {
  success: 'Успешно',
  denied: 'Отказано',
}

