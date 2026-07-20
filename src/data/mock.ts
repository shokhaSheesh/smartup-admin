/**
 * Deterministic mock dataset for the super-admin panel.
 * Seeded PRNG so the data is stable across reloads — no backend yet.
 */
import { DOC_TYPE_CATALOG, DOC_TYPES, PAYMENT_PROVIDERS } from '@/types/admin'
import type {
  AdminDocument,
  AdminUser,
  Adjustment,
  AuditChange,
  AuditEntry,
  BalanceAccount,
  BillingMode,
  Company,
  DocStatus,
  DocType,
  Payment,
  Plan,
  PriceTier,
  Subscription,
  SubscriptionStatus,
  TenantStatus,
  PlatformUser,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  TenantUserRole,
  AuthMethod,
  Transaction,
  TxType,
} from '@/types/admin'

/* ---------------------------------------------------------------- seeded rng */

function makeRng(seed: number) {
  let s = seed >>> 0
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}
const rng = makeRng(20260718)

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]
const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const chance = (p: number) => rng() < p

const DAY = 86_400_000
const NOW = new Date('2026-07-18T10:00:00Z').getTime()
const daysAgo = (d: number) => new Date(NOW - d * DAY).toISOString()
const daysAhead = (d: number) => new Date(NOW + d * DAY).toISOString()

/* ------------------------------------------------------------- name material */

const COMPANY_STEMS = [
  'Udevs', 'Uzbat', 'Artel', 'Akfa', 'Sement', 'Texnopark', 'Agromir', 'Navoiy Tex',
  'Bek Trade', 'Orient Group', 'Silk Road', 'Zamin', 'Baraka', 'Nurafshon', 'Oq Yo‘l',
  'Global Logistic', 'Vodiy Savdo', 'Registon', 'Chorsu Market', 'Toshkent Mebel',
  'Farg‘ona Tekstil', 'Samarqand Qurilish', 'Buxoro Oziq', 'Andijon Motors',
  'Qashqadaryo Neft', 'Xorazm Agro', 'Jizzax Plast', 'Sirdaryo Don', 'Surxon Meva',
  'Namangan Ip', 'Karakalpak Su', 'Turon Bank Servis', 'Digital Uz', 'Smart Systems',
  'Optima Group', 'Delta Trade', 'Alfa Invest', 'Mega Build', 'Pro Service', 'Unitex',
]
const SUFFIXES = ['MCHJ', 'AJ', 'XK', 'QK', 'MChJ']

const FIRST = [
  'Азиз', 'Бекзод', 'Дилшод', 'Жасур', 'Икром', 'Камол', 'Лазиз', 'Мурод', 'Нодир',
  'Отабек', 'Рустам', 'Санжар', 'Темур', 'Улугбек', 'Фаррух', 'Шухрат', 'Элёр',
  'Гулнора', 'Дилноза', 'Зулфия', 'Малика', 'Нигора', 'Севара', 'Феруза', 'Шахноза',
]
const LAST = [
  'Каримов', 'Рахимов', 'Юсупов', 'Абдуллаев', 'Тошматов', 'Сафаров', 'Назаров',
  'Хасанов', 'Мирзаев', 'Эргашев', 'Султонов', 'Ибрагимов', 'Холматов', 'Жураев',
  'Раджабов', 'Умаров', 'Қодиров', 'Ниязов', 'Бобоев', 'Шарипов',
]
const MIDDLE = ['ович', 'овна']

const REGIONS = [
  'Ташкент', 'Ташкентская область', 'Самарканд', 'Бухара', 'Андижан', 'Фергана',
  'Наманган', 'Кашкадарья', 'Сурхандарья', 'Хорезм', 'Джизак', 'Сырдарья',
  'Навои', 'Каракалпакстан',
]

const BANKS = [
  'АКБ Капиталбанк', 'АКБ Ипотека-банк', 'АТБ Трастбанк', 'АКБ Асака банк',
  'НБУ ВЭД', 'АКБ Хамкорбанк', 'АТБ Давр банк', 'АКБ Агробанк', 'Anor Bank',
  'TBC Bank Uzbekistan', 'АКБ Узпромстройбанк', 'АКБ Алокабанк',
]

const OKEDS = ['62010', '46900', '41200', '10710', '47110', '49410', '13100', '25110', '71120', '86210']
const SOURCES = ['Органический', 'Реклама', 'Партнёр', 'Реферал', 'Прямой']

function fullName(): string {
  const isFemale = chance(0.35)
  const first = FIRST[isFemale ? int(17, FIRST.length - 1) : int(0, 16)]
  const last = LAST[int(0, LAST.length - 1)]
  const patronymBase = FIRST[int(0, 16)]
  const suffix = isFemale ? MIDDLE[1] : MIDDLE[0]
  return `${last}${isFemale ? 'а' : ''} ${first} ${patronymBase}${suffix}`
}

const digits = (n: number) =>
  Array.from({ length: n }, () => int(0, 9)).join('')

const pinfl = () => `3${digits(13)}`
const inn = () => `${int(200, 999)}${digits(6)}`
const phone = () => `+998 ${int(90, 99)} ${digits(3)}-${digits(2)}-${digits(2)}`

/* ------------------------------------------------------------------- plans */

export const plans: Plan[] = [
  {
    id: 'plan-start',
    name: 'Старт',
    overagePricePerDoc: 450,
    price: 150_000,
    durationDays: 30,
    docQuota: 300,
    maxEmployees: 3,
    features: ['Электронная подпись', 'Базовая поддержка'],
    isActive: true,
    sortOrder: 1,
    activeSubscribers: 0,
  },
  {
    id: 'plan-business',
    name: 'Бизнес',
    overagePricePerDoc: 320,
    price: 450_000,
    durationDays: 30,
    docQuota: 1_500,
    maxEmployees: 10,
    features: ['Электронная подпись', 'Приоритетная поддержка', 'Импорт Excel'],
    isActive: true,
    sortOrder: 2,
    activeSubscribers: 0,
  },
  {
    id: 'plan-corp',
    name: 'Корпоративный',
    overagePricePerDoc: 240,
    price: 1_800_000,
    durationDays: 30,
    docQuota: 10_000,
    maxEmployees: 50,
    features: ['Электронная подпись', 'Выделенный менеджер', 'API-доступ', 'Импорт Excel'],
    isActive: true,
    sortOrder: 3,
    activeSubscribers: 0,
  },
  {
    id: 'plan-corp-year',
    name: 'Корпоративный (год)',
    overagePricePerDoc: 220,
    price: 18_360_000,
    durationDays: 365,
    docQuota: 130_000,
    maxEmployees: 50,
    features: ['Электронная подпись', 'Выделенный менеджер', 'API-доступ', 'Импорт Excel'],
    isActive: true,
    sortOrder: 4,
    activeSubscribers: 0,
  },
  {
    id: 'plan-legacy',
    name: 'Промо 2025',
    overagePricePerDoc: 500,
    price: 99_000,
    durationDays: 30,
    docQuota: 250,
    maxEmployees: 3,
    features: ['Электронная подпись'],
    isActive: false,
    sortOrder: 5,
    activeSubscribers: 0,
  },
]

export const priceTiers: PriceTier[] = [
  { id: 'tier-1', name: 'Уровень 1', volumeFrom: 0, volumeTo: 1_000, pricePerDoc: 500, effectiveFrom: daysAgo(180) },
  { id: 'tier-2', name: 'Уровень 2', volumeFrom: 1_001, volumeTo: 10_000, pricePerDoc: 350, effectiveFrom: daysAgo(180) },
  { id: 'tier-3', name: 'Уровень 3', volumeFrom: 10_001, volumeTo: null, pricePerDoc: 250, effectiveFrom: daysAgo(180) },
]

/** Platform-wide billing settings. */
export const billingSettings = {
  /** Free documents granted per allowance period. */
  freeAllowanceDocs: 10,
  /** Length of that period in days. */
  freeAllowanceDays: 30,
  currency: 'UZS',
  billableRule: 'Исходящие документы при успешной отправке',
  rounding: 'До целого сума',
}

/**
 * Price per document for a tenant — determined solely by the volume tier its
 * monthly sent count falls into.
 */
export function pricePerDocForVolume(volume: number): number {
  const tier =
    priceTiers.find(
      (t) => volume >= t.volumeFrom && (t.volumeTo === null || volume <= t.volumeTo),
    ) ?? priceTiers[0]
  return tier.pricePerDoc
}

export function effectivePricePerDoc(company: Company): number {
  return pricePerDocForVolume(company.docsSentThisMonth)
}

/* --------------------------------------------------------------- companies */

const COMPANY_COUNT = 64

function makeCompany(i: number): Company {
  const stem = COMPANY_STEMS[i % COMPANY_STEMS.length]
  const dupe = i >= COMPANY_STEMS.length ? ` ${Math.floor(i / COMPANY_STEMS.length) + 1}` : ''
  const name = `${stem}${dupe} ${pick(SUFFIXES)}`

  const status: TenantStatus = chance(0.12) ? 'suspended' : 'active'
  const billingMode: BillingMode = chance(0.45) ? 'subscription' : chance(0.15) ? 'hybrid' : 'payg'
  const createdDays = int(5, 400)
  const director = fullName()
  const region = pick(REGIONS)

  return {
    id: `cmp-${i + 1}`,
    inn: inn(),
    name,
    address: `${region}, ул. ${pick(['Амира Темура', 'Навои', 'Мустакиллик', 'Бабура', 'Шота Руставели'])}, ${int(1, 180)}`,
    region,
    oked: pick(OKEDS),
    directorPinfl: pinfl(),
    directorName: director,
    accountantPinfl: pinfl(),
    accountantName: fullName(),
    phone: phone(),
    mobile: phone(),
    email: `info@${stem.toLowerCase().replace(/[^a-z]/g, '')}${dupe.trim()}.uz`,
    website: `https://${stem.toLowerCase().replace(/[^a-z]/g, '')}.uz`,
    mfo: `00${int(100, 999)}`,
    bankName: pick(BANKS),
    accountNumber: `2020 8000 ${digits(4)} ${digits(4)} ${digits(3)}`,
    status,
    statusReason:
      status === 'suspended'
        ? pick([
            'Задолженность по оплате более 30 дней',
            'Проверка данных по запросу налоговой',
          ])
        : null,
    billingMode,
    planName: null,
    balance: billingMode === 'subscription' ? int(0, 400_000) : int(-0, 3_500_000),
    docsSentThisMonth: chance(0.15) ? int(1_100, 24_000) : int(0, 900),
    employees: int(1, 28),
    createdAt: daysAgo(createdDays),
    lastActiveAt: daysAgo(int(0, Math.min(createdDays, 60))),
    source: pick(SOURCES),
  }
}

export const companies: Company[] = Array.from({ length: COMPANY_COUNT }, (_, i) =>
  makeCompany(i),
)

/* ------------------------------------------------------------ subscriptions */

const subscriptionList: Subscription[] = []

companies.forEach((c, i) => {
  if (c.billingMode === 'payg') return

  const plan = plans[int(0, 2)]
  const periodDays = plan.durationDays
  const elapsed = int(1, periodDays - 1)
  let periodEnd = daysAhead(periodDays - elapsed)

  let status: SubscriptionStatus
  let quotaUsed: number
  // Past the quota a company keeps sending and pays the plan's overage price,
  // so exceeding it is a number on an active subscription, not a status.
  let overageDocs = 0

  if (chance(0.12)) {
    status = 'cancelled'
    quotaUsed = int(0, plan.docQuota)
  } else if (chance(0.14)) {
    // Period already ran out and was not renewed.
    status = 'expired'
    quotaUsed = int(Math.floor(plan.docQuota * 0.5), plan.docQuota)
  } else if (chance(0.18)) {
    status = 'active'
    quotaUsed = plan.docQuota
    overageDocs = int(5, 400)
  } else {
    status = 'active'
    quotaUsed = chance(0.25)
      ? int(Math.floor(plan.docQuota * 0.82), plan.docQuota - 1)
      : int(0, Math.floor(plan.docQuota * 0.8))
  }

  if (status === 'expired') periodEnd = daysAgo(int(1, 40))

  c.planName = plan.name

  subscriptionList.push({
    id: `sub-${i + 1}`,
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    planId: plan.id,
    planName: plan.name,
    status,
    periodStart: daysAgo(elapsed),
    periodEnd,
    quotaTotal: plan.docQuota,
    quotaUsed,
    autoRenew: chance(0.7),
    amountPaid: plan.price,
    overageDocs,
    overageAmount: overageDocs * plan.overagePricePerDoc,
  })
})

export const subscriptions = subscriptionList

plans.forEach((p) => {
  p.activeSubscribers = subscriptions.filter(
    (s) => s.planId === p.id && s.status === 'active',
  ).length
})

/* ----------------------------------------------------------------- balances */

/** The overage price a company pays past its quota, or null when it has no plan. */
export function overagePriceFor(companyId: string): number | null {
  const sub = subscriptions.find((s) => s.companyId === companyId)
  if (!sub) return null
  return plans.find((p) => p.id === sub.planId)?.overagePricePerDoc ?? null
}

export const balances: BalanceAccount[] = companies.map((c) => {
  const totalToppedUp = c.billingMode === 'subscription' ? int(0, 2_000_000) : int(500_000, 12_000_000)
  return {
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    balance: c.balance,
    freeAllowanceTotal: billingSettings.freeAllowanceDocs,
    freeAllowanceUsed: int(0, billingSettings.freeAllowanceDocs),
    lastTopUpAt: chance(0.85) ? daysAgo(int(0, 90)) : null,
    totalToppedUp,
    totalConsumed: Math.max(0, totalToppedUp - c.balance),
  }
})

/* -------------------------------------------------------------------- users */

/** Only the first employee is the director — everyone else is staff. */
const ROLE_WEIGHTS: TenantUserRole[] = [
  'accountant', 'operator', 'operator', 'operator', 'accountant',
]

/** Employees act for a company: company E-IMZO key, or ИНН + password from the owner. */
const employees: PlatformUser[] = companies.flatMap((c, ci) => {
  const count = Math.min(c.employees, int(1, 5))
  return Array.from({ length: count }, (_, ui) => {
    const role: TenantUserRole = ui === 0 ? 'director' : pick(ROLE_WEIGHTS)
    return {
      id: `usr-${ci + 1}-${ui + 1}`,
      kind: 'employee' as const,
      pinfl: ui === 0 ? c.directorPinfl : pinfl(),
      fullName: ui === 0 ? c.directorName : fullName(),
      companyId: c.id,
      companyInn: c.inn,
      companyName: c.name,
      role,
      // The director normally holds the company key; staff get login credentials.
      authMethod: (role === 'director'
        ? chance(0.85)
          ? 'company_eimzo'
          : 'login_password'
        : chance(0.25)
          ? 'company_eimzo'
          : 'login_password') as AuthMethod,
      phone: phone(),
      // Employees bill to the company, so they hold no address or balance of their own.
      address: null,
      balance: null,
      docsSentThisMonth: 0,
      status: c.status === 'suspended' ? 'blocked' : chance(0.07) ? 'blocked' : 'active',
      lastLoginAt: daysAgo(int(0, 90)),
      registeredAt: c.createdAt,
    }
  })
})

/** Individuals registered with their own personal E-IMZO key — no company. */
const individuals: PlatformUser[] = Array.from({ length: 38 }, (_, i) => ({
  id: `ind-${i + 1}`,
  kind: 'individual' as const,
  pinfl: pinfl(),
  fullName: fullName(),
  companyId: null,
  companyInn: null,
  companyName: null,
  role: null,
  authMethod: 'personal_eimzo' as AuthMethod,
  phone: phone(),
  address: `${pick(REGIONS)}, ул. ${pick(['Амира Темура', 'Навои', 'Мустакиллик', 'Бабура', 'Шота Руставели'])}, ${int(1, 180)}`,
  balance: chance(0.12) ? 0 : int(5_000, 900_000),
  docsSentThisMonth: chance(0.2) ? 0 : int(1, 60),
  status: chance(0.06) ? 'blocked' : 'active',
  lastLoginAt: daysAgo(int(0, 120)),
  registeredAt: daysAgo(int(10, 380)),
}))

export const platformUsers: PlatformUser[] = [...employees, ...individuals]

/** Employees grouped by company, for picking a plausible actor on a document. */
const employeesByCompanyId = new Map<string, PlatformUser[]>()
employees.forEach((e) => {
  const list = employeesByCompanyId.get(e.companyId!) ?? []
  list.push(e)
  employeesByCompanyId.set(e.companyId!, list)
})

/** A random employee of the given company, or null when it has none loaded. */
function pickEmployeeOf(companyId: string): string | null {
  const list = employeesByCompanyId.get(companyId)
  if (!list || list.length === 0) return null
  return list[Math.floor(rng() * list.length)].id
}

/* ---------------------------------------------------------------- documents */

const DOC_STATUSES: DocStatus[] = [
  'pending', 'signed', 'signed', 'signed', 'rejected', 'cancelled',
]

const companyDocuments: AdminDocument[] = Array.from({ length: 420 }, (_, i) => {
  const company = companies[int(0, companies.length - 1)]
  const counterparty = companies[int(0, companies.length - 1)]
  const direction = chance(0.55) ? 'outgoing' : 'incoming'
  const status = pick(DOC_STATUSES)
  const createdDays = int(0, 120)
  const sent = daysAgo(Math.max(0, createdDays - int(0, 2)))

  // Only outgoing documents on successful send are ever charged.
  let chargeType: AdminDocument['chargeType'] = null
  let chargeAmount = 0
  if (direction === 'outgoing' && sent && status !== 'cancelled') {
    const roll = rng()
    if (roll < 0.18) {
      chargeType = 'free_tier'
    } else if (roll < 0.55) {
      chargeType = 'quota'
    } else if (roll < 0.85) {
      chargeType = 'payg'
      chargeAmount = effectivePricePerDoc(company)
    } else {
      // Past the quota the plan's own overage price applies, not the tier table.
      chargeType = 'payg_overage'
      chargeAmount = overagePriceFor(company.id) ?? effectivePricePerDoc(company)
    }
  }

  const group = pick(DOC_TYPE_CATALOG)
  const type: DocType = group.name
  const subtype = group.subtypes.length > 0 ? pick(group.subtypes) : null

  // The sender's side sends it; the receiver's side signs or rejects it.
  const senderCompanyId = direction === 'outgoing' ? company.id : counterparty.id
  const receiverCompanyId = direction === 'outgoing' ? counterparty.id : company.id
  const sentBy = pickEmployeeOf(senderCompanyId)
  const resolvedBy =
    status === 'signed' || status === 'rejected' ? pickEmployeeOf(receiverCompanyId) : null

  return {
    id: `doc-${i + 1}`,
    number: `${type.replace(/[^А-ЯA-Z]/g, '').slice(0, 3)}-${String(100_000 + i).slice(-6)}`,
    companyId: company.id,
    userId: null,
    type,
    subtype,
    direction,
    senderInn: direction === 'outgoing' ? company.inn : counterparty.inn,
    senderName: direction === 'outgoing' ? company.name : counterparty.name,
    receiverInn: direction === 'outgoing' ? counterparty.inn : company.inn,
    receiverName: direction === 'outgoing' ? counterparty.name : company.name,
    status,
    sentBy,
    resolvedBy,
    amount: int(150_000, 480_000_000),
    sentAt: sent,
    resolvedAt: status === 'pending' ? null : daysAgo(Math.max(0, createdDays - int(2, 6))),
    chargeType,
    chargeAmount,
  }
})

/**
 * Documents belonging to физические лица. They transact with companies, so the
 * counterparty is always a company; the individual is identified by ПИНФЛ.
 */
const individualDocuments: AdminDocument[] = Array.from({ length: 300 }, (_, i) => {
  const owner = individuals[int(0, individuals.length - 1)]
  const counterparty = companies[int(0, companies.length - 1)]
  const direction = chance(0.5) ? 'outgoing' : 'incoming'
  const status = pick(DOC_STATUSES)
  const createdDays = int(0, 120)
  const sent = daysAgo(Math.max(0, createdDays - int(0, 2)))

  // Individuals have no subscription quota — outgoing sends are free tier or PAYG.
  let chargeType: AdminDocument['chargeType'] = null
  let chargeAmount = 0
  if (direction === 'outgoing' && status !== 'cancelled') {
    if (chance(0.3)) {
      chargeType = 'free_tier'
    } else {
      chargeType = 'payg'
      chargeAmount = pricePerDocForVolume(owner.docsSentThisMonth)
    }
  }

  const group = pick(DOC_TYPE_CATALOG)
  const type: DocType = group.name
  const subtype = group.subtypes.length > 0 ? pick(group.subtypes) : null

  return {
    id: `idoc-${i + 1}`,
    number: `${type.replace(/[^А-ЯA-Z]/g, '').slice(0, 3)}-${String(500_000 + i).slice(-6)}`,
    companyId: null,
    userId: owner.id,
    type,
    subtype,
    direction,
    senderInn: direction === 'outgoing' ? owner.pinfl : counterparty.inn,
    senderName: direction === 'outgoing' ? owner.fullName : counterparty.name,
    receiverInn: direction === 'outgoing' ? counterparty.inn : owner.pinfl,
    receiverName: direction === 'outgoing' ? counterparty.name : owner.fullName,
    status,
    sentBy: direction === 'outgoing' ? owner.id : pickEmployeeOf(counterparty.id),
    resolvedBy:
      status === 'signed' || status === 'rejected'
        ? direction === 'outgoing'
          ? pickEmployeeOf(counterparty.id)
          : owner.id
        : null,
    amount: int(80_000, 40_000_000),
    sentAt: sent,
    resolvedAt: status === 'pending' ? null : daysAgo(Math.max(0, createdDays - int(2, 6))),
    chargeType,
    chargeAmount,
  }
})

export const documents: AdminDocument[] = [...companyDocuments, ...individualDocuments]

/* ----------------------------------------------------------------- payments */

/** Provider error codes, so a failed payment can be evidenced against them. */
const PROVIDER_ERRORS = [
  { code: -31008, message: 'Insufficient funds on card' },
  { code: -31099, message: 'Card is blocked by issuer' },
  { code: -31003, message: 'Transaction not found on provider side' },
  { code: -32504, message: 'Merchant authorization failed' },
  { code: -31610, message: 'Provider gateway timeout' },
]

/** The body a provider returned, formatted as it arrived. */
function providerPayload(args: {
  provider: PaymentProvider
  ref: string
  amountTiyin: number
  status: PaymentStatus
  createdAt: string
  cardMask: string | null
}): string {
  const base = {
    provider: args.provider,
    transaction_id: args.ref,
    amount: args.amountTiyin,
    currency: 860,
    created_time: new Date(args.createdAt).getTime(),
    card: args.cardMask,
  }

  if (args.status === 'success') {
    return JSON.stringify(
      { ...base, state: 2, perform_time: new Date(args.createdAt).getTime() + 4200, error: null },
      null,
      2,
    )
  }
  const err = pick(PROVIDER_ERRORS)
  return JSON.stringify(
    { ...base, state: -1, perform_time: null, error: { code: err.code, message: err.message, data: null } },
    null,
    2,
  )
}

export const payments: Payment[] = Array.from({ length: 140 }, (_, i) => {
  const c = companies[int(0, companies.length - 1)]
  const status: PaymentStatus = chance(0.16) ? 'failed' : 'success'
  const method: PaymentMethod = chance(0.45)
    ? 'provider_page'
    : chance(0.5)
      ? 'saved_card'
      : chance(0.6)
        ? 'bank_transfer'
        : 'manual'
  // A manual top-up is keyed in by an admin, so no provider is involved.
  const provider = method === 'manual' ? null : pick(PAYMENT_PROVIDERS)
  const amount = pick([100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000])
  const createdAt = daysAgo(int(0, 120))
  // Only a saved-card charge exposes the card to us; a provider-page payment
  // happens entirely on the provider's side.
  const cardMask = method === 'saved_card' ? `8600 **** **** ${digits(4)}` : null
  const providerRef = `${(provider ?? 'MANUAL').slice(0, 2).toUpperCase()}-${digits(10)}`

  return {
    id: `pay-${i + 1}`,
    createdAt,
    companyId: c.id,
    actorUserId: pickEmployeeOf(c.id),
    companyInn: c.inn,
    companyName: c.name,
    amount,
    method,
    provider,
    providerRef,
    cardMask,
    status,
    rawResponse: provider
      ? providerPayload({
          provider,
          ref: providerRef,
          amountTiyin: amount * 100,
          status,
          createdAt,
          cardMask,
        })
      : JSON.stringify({ source: 'manual', entered_by: 'admin', note: 'Проведено вручную' }, null, 2),
  }
})

/* ------------------------------------------------------------- adjustments */


export const adminUsers: AdminUser[] = [
  {
    id: 'adm-1',
    fullName: 'Шохрух Алиев',
    email: 'sh.aliev@smartup24.uz',
    phone: phone(),
    role: 'super_admin',
    status: 'active',
    lastLoginAt: daysAgo(0),
    createdAt: daysAgo(400),
  },
  {
    id: 'adm-2',
    fullName: 'Нигора Юсупова',
    email: 'n.yusupova@smartup24.uz',
    phone: phone(),
    role: 'finance',
    status: 'active',
    lastLoginAt: daysAgo(1),
    createdAt: daysAgo(320),
  },
  {
    id: 'adm-3',
    fullName: 'Темур Рахимов',
    email: 't.rahimov@smartup24.uz',
    phone: phone(),
    role: 'support',
    status: 'active',
    lastLoginAt: daysAgo(0),
    createdAt: daysAgo(210),
  },
  {
    id: 'adm-4',
    fullName: 'Дилноза Каримова',
    email: 'd.karimova@smartup24.uz',
    phone: phone(),
    role: 'support',
    status: 'active',
    lastLoginAt: daysAgo(3),
    createdAt: daysAgo(120),
  },
  {
    id: 'adm-5',
    fullName: 'Бекзод Назаров',
    email: 'b.nazarov@smartup24.uz',
    phone: phone(),
    role: 'analyst',
    status: 'disabled',
    lastLoginAt: daysAgo(64),
    createdAt: daysAgo(180),
  },
]

export const currentAdmin = adminUsers[0]

/** Free-text reasons — the reason alone explains an adjustment. */
const ADJ_REASONS = [
  'Компенсация за сбой при отправке в ГНК',
  'Возврат за ошибочно списанные документы',
  'Бонус лояльному клиенту по договорённости',
  'Исправление некорректного списания',
  'Промо-начисление по маркетинговой кампании',
]

export const adjustments: Adjustment[] = Array.from({ length: 46 }, (_, i) => {
  const reason = pick(ADJ_REASONS)
  const direction = reason.startsWith('Исправление') && chance(0.5) ? 'debit' : 'credit'

  // Individuals hold their own balance, so they get adjusted too.
  const toIndividual = chance(0.35)
  const individual = individuals[int(0, individuals.length - 1)]
  const c = companies[int(0, companies.length - 1)]

  return {
    id: `adj-${i + 1}`,
    createdAt: daysAgo(int(0, 150)),
    subjectType: toIndividual ? ('individual' as const) : ('company' as const),
    subjectId: toIndividual ? individual.id : c.id,
    subjectName: toIndividual ? individual.fullName : c.name,
    subjectTaxId: toIndividual ? individual.pinfl : c.inn,
    direction,
    amount: pick([50_000, 100_000, 150_000, 300_000, 500_000]),
    reason,
    performedBy: pick(adminUsers.filter((a) => a.role !== 'analyst')).fullName,
  }
})

/* ------------------------------------------------------------- transactions */

const TX_TYPES: TxType[] = [
  'topup', 'document_charge', 'document_charge', 'document_charge',
  'manual_adjustment', 'subscription_payment',
]

export const transactions: Transaction[] = Array.from({ length: 260 }, (_, i) => {
  const c = companies[int(0, companies.length - 1)]
  const type = pick(TX_TYPES)
  const doc = type === 'document_charge' ? documents[int(0, documents.length - 1)] : null

  let amount: number
  switch (type) {
    case 'topup':
      amount = pick([100_000, 500_000, 1_000_000, 2_000_000])
      break
    case 'document_charge':
      amount = -effectivePricePerDoc(c)
      break
    case 'manual_adjustment':
      amount = chance(0.7) ? pick([50_000, 100_000, 300_000]) : -pick([50_000, 100_000])
      break
    default:
      amount = -pick([150_000, 450_000, 1_800_000])
  }

  return {
    id: `tx-${i + 1}`,
    createdAt: daysAgo(int(0, 120)),
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    type,
    amount,
    documentId: doc?.id ?? null,
    documentNumber: doc?.number ?? null,
    adminName:
      type === 'manual_adjustment'
        ? pick(adminUsers.filter((a) => a.role !== 'analyst')).fullName
        : null,
    reason:
      type === 'manual_adjustment' ? 'Компенсация за сбой при отправке' : null,
  }
}).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

/* -------------------------------------------------------------------- roles */

/* ---------------------------------------------------------------- audit log */

const AUDIT_ACTIONS: Array<{
  action: string
  targetType: AuditEntry['targetType']
}> = [
  // Company tariff and status
  { action: 'Изменение тарифного плана компании', targetType: 'Company' },
  { action: 'Продление срока подписки', targetType: 'Company' },
  { action: 'Приостановка компании', targetType: 'Company' },
  { action: 'Активация компании', targetType: 'Company' },

  // User status
  { action: 'Блокировка пользователя', targetType: 'User' },
  { action: 'Разблокировка пользователя', targetType: 'User' },

  // Tariff plans
  { action: 'Создание тарифного плана', targetType: 'Plan' },
  { action: 'Изменение тарифного плана', targetType: 'Plan' },
  { action: 'Удаление тарифного плана', targetType: 'Plan' },

  // Pricing tiers and the free allowance
  { action: 'Добавление ценового уровня', targetType: 'Plan' },
  { action: 'Изменение ценового уровня', targetType: 'Plan' },
  { action: 'Удаление ценового уровня', targetType: 'Plan' },
  { action: 'Изменение бесплатного лимита', targetType: 'Plan' },

  // Subscriptions
  { action: 'Отмена подписки', targetType: 'Company' },
]

/** Money formatted the way the UI shows it, for audit before/after values. */
const asSum = (n: number) => `${n.toLocaleString('ru-RU')} сум`

/**
 * What the action changed, as before → after. Actions that alter no value
 * (blocking, deleting) return an empty list and rely on the details line.
 */
function auditChanges(action: string): AuditChange[] {
  switch (action) {
    case 'Изменение тарифного плана компании': {
      const [before, after] = pick([
        ['Старт', 'Бизнес'],
        ['Бизнес', 'Корпоративный'],
        ['Корпоративный', 'Корпоративный (год)'],
        ['Бизнес', 'Старт'],
      ])
      return [{ field: 'Тарифный план', before, after }]
    }
    case 'Продление срока подписки': {
      const days = pick([30, 90, 365])
      const from = daysAhead(int(1, 20))
      return [
        {
          field: 'Действует до',
          before: new Date(from).toLocaleDateString('ru-RU'),
          after: new Date(
            new Date(from).getTime() + days * DAY,
          ).toLocaleDateString('ru-RU'),
        },
      ]
    }
    case 'Приостановка компании':
      return [{ field: 'Статус', before: 'Активна', after: 'Приостановлена' }]
    case 'Активация компании':
      return [{ field: 'Статус', before: 'Приостановлена', after: 'Активна' }]
    case 'Отмена подписки':
      return [{ field: 'Статус подписки', before: 'Активна', after: 'Отменена' }]

    case 'Блокировка пользователя':
      return [{ field: 'Статус', before: 'Активен', after: 'Заблокирован' }]
    case 'Разблокировка пользователя':
      return [{ field: 'Статус', before: 'Заблокирован', after: 'Активен' }]

    case 'Изменение тарифного плана': {
      const variant = pick(['price', 'quota', 'duration', 'overage'])
      if (variant === 'price') {
        const before = pick([150_000, 450_000, 567_000, 1_800_000])
        return [{ field: 'Цена за период', before: asSum(before), after: asSum(before + 1_000) }]
      }
      if (variant === 'quota') {
        const before = pick([300, 1_500, 10_000])
        return [
          {
            field: 'Квота документов',
            before: before.toLocaleString('ru-RU'),
            after: (before + 500).toLocaleString('ru-RU'),
          },
        ]
      }
      if (variant === 'duration') {
        return [{ field: 'Длительность', before: '30 дн.', after: pick(['60 дн.', '90 дн.']) }]
      }
      const before = pick([240, 320, 450])
      return [
        { field: 'Цена сверх квоты', before: asSum(before), after: asSum(before - 20) },
      ]
    }

    case 'Изменение ценового уровня': {
      const before = pick([250, 300, 350, 500])
      return [{ field: 'Цена за документ', before: asSum(before), after: asSum(before - 25) }]
    }
    case 'Изменение бесплатного лимита': {
      const before = pick([10, 15, 20])
      return [
        {
          field: 'Документов бесплатно',
          before: `${before} док.`,
          after: `${before + 5} док.`,
        },
      ]
    }

    default:
      return []
  }
}

/** One-line summary for actions that do not move a value. */
function auditDetails(action: string, companyName: string): string {
  switch (action) {
    case 'Создание тарифного плана':
      return 'Новый план добавлен в тарифную сетку'
    case 'Удаление тарифного плана':
      return 'План удалён, действующие подписки сохранены'
    case 'Добавление ценового уровня':
      return 'Добавлен новый объёмный уровень'
    case 'Удаление ценового уровня':
      return 'Уровень удалён, объём перешёл к соседнему'
    case 'Приостановка компании':
      return `${companyName}: ${pick(['задолженность по оплате', 'проверка по запросу налоговой'])}`
    case 'Отмена подписки':
      return `${companyName}: до конца оплаченного периода`
    default:
      return '—'
  }
}

export const auditLog: AuditEntry[] = Array.from({ length: 180 }, (_, i): AuditEntry => {
  const admin = pick(adminUsers)
  const entry = pick(AUDIT_ACTIONS)
  const c = companies[int(0, companies.length - 1)]

  const target =
    entry.targetType === 'Plan'
      ? entry.action.includes('уровня')
        ? pick(priceTiers).name
        : entry.action.includes('лимита')
          ? 'Бесплатный лимит'
          : pick(plans).name
      : entry.targetType === 'User'
        ? pick(platformUsers).fullName
        : c.inn

  return {
    id: `aud-${i + 1}`,
    createdAt: daysAgo(int(0, 90)),
    adminName: admin.fullName,
    adminRole: admin.role,
    action: entry.action,
    targetType: entry.targetType,
    target,
    changes: auditChanges(entry.action),
    details: auditDetails(entry.action, c.name),
  }
}).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

/* ------------------------------------------------------------- lookups/aggs */

export const companyById = (id: string) => companies.find((c) => c.id === id)
export const subscriptionByCompany = (companyId: string) =>
  subscriptions.find((s) => s.companyId === companyId)
export const balanceByCompany = (companyId: string) =>
  balances.find((b) => b.companyId === companyId)
export const usersByCompany = (companyId: string) =>
  platformUsers.filter((u) => u.companyId === companyId)
export const documentsByCompany = (companyId: string) =>
  documents.filter((d) => d.companyId === companyId)
export const documentsByUser = (userId: string) =>
  documents.filter((d) => d.userId === userId)
/** Documents an employee acted on — sent, or signed/rejected. */
export const documentsByActor = (userId: string) =>
  documents.filter((d) => d.sentBy === userId || d.resolvedBy === userId)
export const paymentsByActor = (userId: string) =>
  payments.filter((p) => p.actorUserId === userId)
export const userById = (userId: string) => platformUsers.find((u) => u.id === userId)
export const userNameById = (userId: string | null) =>
  userId ? (platformUsers.find((u) => u.id === userId)?.fullName ?? null) : null
export const transactionsByCompany = (companyId: string) =>
  transactions.filter((t) => t.companyId === companyId)
export const paymentsByCompany = (companyId: string) =>
  payments.filter((p) => p.companyId === companyId)

/** Documents-sent-per-day series for the dashboard. */
export function docsPerDaySeries(days: number) {
  const series: Array<{ date: string; sent: number }> = []
  const seriesRng = makeRng(4242)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(NOW - i * DAY)
    const weekday = d.getUTCDay()
    const weekendDrop = weekday === 0 || weekday === 6 ? 0.35 : 1
    const base = 900 + Math.sin((days - i) / 6) * 180
    series.push({
      date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      sent: Math.round((base + seriesRng() * 260) * weekendDrop),
    })
  }
  return series
}

/** Revenue split between subscriptions and pay-as-you-go, by month. */
export function revenueSplitSeries() {
  const months = ['Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл']
  const r = makeRng(777)
  return months.map((m, i) => ({
    month: m,
    subscriptions: Math.round(38_000_000 + i * 3_400_000 + r() * 6_000_000),
    payg: Math.round(19_000_000 + i * 1_900_000 + r() * 4_000_000),
  }))
}

/** New companies per week. */
export function newCompaniesSeries() {
  const r = makeRng(1313)
  return Array.from({ length: 12 }, (_, i) => ({
    week: `Н${i + 1}`,
    count: Math.round(4 + r() * 11),
  }))
}

/** Document volume by type. */
export function docsByTypeSeries() {
  const counts = new Map<string, number>()
  DOC_TYPES.forEach((t) => counts.set(t, 0))
  documents.forEach((d) => counts.set(d.type, (counts.get(d.type) ?? 0) + 1))
  return Array.from(counts, ([type, count]) => ({ type, count })).sort(
    (a, b) => b.count - a.count,
  )
}
