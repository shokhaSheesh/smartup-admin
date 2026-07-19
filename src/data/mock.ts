/**
 * Deterministic mock dataset for the super-admin panel.
 * Seeded PRNG so the data is stable across reloads — no backend yet.
 */
import { DOC_TYPE_CATALOG, DOC_TYPES } from '@/types/admin'
import type {
  AdminDocument,
  AdminUser,
  Adjustment,
  AdjustmentCategory,
  AuditEntry,
  BalanceAccount,
  BillingMode,
  Company,
  DocStatus,
  DocType,
  Payment,
  Plan,
  PriceTier,
  Role,
  Subscription,
  SubscriptionStatus,
  TenantStatus,
  PlatformUser,
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
    nameRu: 'Старт',
    nameUz: 'Start',
    description: 'Для небольших компаний с редким документооборотом.',
    price: 150_000,
    period: 'month',
    docQuota: 300,
    maxEmployees: 3,
    features: ['Электронная подпись', 'Базовая поддержка'],
    isActive: true,
    visibleToNewSignups: true,
    sortOrder: 1,
    activeSubscribers: 0,
  },
  {
    id: 'plan-business',
    nameRu: 'Бизнес',
    nameUz: 'Biznes',
    description: 'Оптимальный план для среднего бизнеса.',
    price: 450_000,
    period: 'month',
    docQuota: 1_500,
    maxEmployees: 10,
    features: ['Электронная подпись', 'Приоритетная поддержка', 'Импорт Excel'],
    isActive: true,
    visibleToNewSignups: true,
    sortOrder: 2,
    activeSubscribers: 0,
  },
  {
    id: 'plan-corp',
    nameRu: 'Корпоративный',
    nameUz: 'Korporativ',
    description: 'Для крупных компаний с высоким объёмом документов.',
    price: 1_800_000,
    period: 'month',
    docQuota: 10_000,
    maxEmployees: 50,
    features: ['Электронная подпись', 'Выделенный менеджер', 'API-доступ', 'Импорт Excel'],
    isActive: true,
    visibleToNewSignups: true,
    sortOrder: 3,
    activeSubscribers: 0,
  },
  {
    id: 'plan-corp-year',
    nameRu: 'Корпоративный (год)',
    nameUz: 'Korporativ (yillik)',
    description: 'Годовая оплата корпоративного плана со скидкой 15%.',
    price: 18_360_000,
    period: 'year',
    docQuota: 130_000,
    maxEmployees: 50,
    features: ['Электронная подпись', 'Выделенный менеджер', 'API-доступ', 'Импорт Excel'],
    isActive: true,
    visibleToNewSignups: true,
    sortOrder: 4,
    activeSubscribers: 0,
  },
  {
    id: 'plan-legacy',
    nameRu: 'Промо 2025',
    nameUz: 'Promo 2025',
    description: 'Архивный промо-план. Новые подписки недоступны.',
    price: 99_000,
    period: 'month',
    docQuota: 250,
    maxEmployees: 3,
    features: ['Электронная подпись'],
    isActive: false,
    visibleToNewSignups: false,
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
  freeMonthlyAllowance: 10,
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
  const periodDays = plan.period === 'year' ? 365 : plan.period === 'quarter' ? 90 : 30
  const elapsed = int(1, periodDays - 1)
  const periodEnd = daysAhead(periodDays - elapsed)

  let status: SubscriptionStatus
  let quotaUsed: number
  let overageMode: null | 'payg' = null

  if (c.billingMode === 'hybrid') {
    status = 'quota_exhausted'
    quotaUsed = plan.docQuota
    overageMode = 'payg'
  } else if (chance(0.12)) {
    status = 'quota_exhausted'
    quotaUsed = plan.docQuota
  } else if (periodDays - elapsed <= 7) {
    status = 'expiring'
    quotaUsed = int(Math.floor(plan.docQuota * 0.4), plan.docQuota - 1)
  } else if (chance(0.06)) {
    status = 'cancelled'
    quotaUsed = int(0, plan.docQuota)
  } else {
    status = 'active'
    quotaUsed = chance(0.25)
      ? int(Math.floor(plan.docQuota * 0.82), plan.docQuota - 1)
      : int(0, Math.floor(plan.docQuota * 0.8))
  }

  const overageDocs = overageMode === 'payg' ? int(5, 400) : 0

  c.planName = plan.nameRu

  subscriptionList.push({
    id: `sub-${i + 1}`,
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    planId: plan.id,
    planName: plan.nameRu,
    status,
    periodStart: daysAgo(elapsed),
    periodEnd,
    quotaTotal: plan.docQuota,
    quotaUsed,
    autoRenew: chance(0.7),
    amountPaid: plan.price,
    overageMode,
    overageDocs,
    overageAmount: overageDocs * effectivePricePerDoc(c),
  })
})

export const subscriptions = subscriptionList

plans.forEach((p) => {
  p.activeSubscribers = subscriptions.filter(
    (s) => s.planId === p.id && s.status !== 'cancelled' && s.status !== 'expired',
  ).length
})

/* ----------------------------------------------------------------- balances */

export const balances: BalanceAccount[] = companies.map((c) => {
  const totalToppedUp = c.billingMode === 'subscription' ? int(0, 2_000_000) : int(500_000, 12_000_000)
  return {
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    balance: c.balance,
    freeAllowanceTotal: billingSettings.freeMonthlyAllowance,
    freeAllowanceUsed: int(0, billingSettings.freeMonthlyAllowance),
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
      chargeType = 'payg_overage'
      chargeAmount = effectivePricePerDoc(company)
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
    createdAt: daysAgo(createdDays),
    sentAt: sent,
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
    createdAt: daysAgo(createdDays),
    sentAt: sent,
    chargeType,
    chargeAmount,
  }
})

export const documents: AdminDocument[] = [...companyDocuments, ...individualDocuments]

/* ----------------------------------------------------------------- payments */

export const payments: Payment[] = Array.from({ length: 140 }, (_, i) => {
  const c = companies[int(0, companies.length - 1)]
  const status = chance(0.08) ? 'failed' : chance(0.06) ? 'pending' : 'success'
  const method = chance(0.65) ? 'card' : chance(0.5) ? 'bank_transfer' : 'manual'
  return {
    id: `pay-${i + 1}`,
    createdAt: daysAgo(int(0, 120)),
    companyId: c.id,
    actorUserId: pickEmployeeOf(c.id),
    companyInn: c.inn,
    companyName: c.name,
    amount: pick([100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000]),
    method,
    providerRef: `PMT-${digits(10)}`,
    cardMask: method === 'card' ? `8600 **** **** ${digits(4)}` : null,
    status,
  }
})

/* ------------------------------------------------------------- adjustments */

const ADJ_CATEGORIES: AdjustmentCategory[] = [
  'compensation', 'refund', 'goodwill', 'correction', 'promo',
]
const ADJ_REASONS: Record<AdjustmentCategory, string> = {
  compensation: 'Компенсация за сбой при отправке в ГНК',
  refund: 'Возврат за ошибочно списанные документы',
  goodwill: 'Бонус лояльному клиенту по договорённости',
  correction: 'Исправление некорректного списания',
  promo: 'Промо-начисление по маркетинговой кампании',
}

export const adminUsers: AdminUser[] = [
  {
    id: 'adm-1',
    fullName: 'Шохрух Алиев',
    email: 'sh.aliev@smartup24.uz',
    phone: phone(),
    role: 'super_admin',
    status: 'active',
    twofaEnabled: true,
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
    twofaEnabled: true,
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
    twofaEnabled: true,
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
    twofaEnabled: false,
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
    twofaEnabled: false,
    lastLoginAt: daysAgo(64),
    createdAt: daysAgo(180),
  },
]

export const currentAdmin = adminUsers[0]

export const adjustments: Adjustment[] = Array.from({ length: 46 }, (_, i) => {
  const c = companies[int(0, companies.length - 1)]
  const category = pick(ADJ_CATEGORIES)
  const direction = category === 'correction' && chance(0.5) ? 'debit' : 'credit'
  return {
    id: `adj-${i + 1}`,
    createdAt: daysAgo(int(0, 150)),
    companyId: c.id,
    companyInn: c.inn,
    companyName: c.name,
    direction,
    amount: pick([50_000, 100_000, 150_000, 300_000, 500_000]),
    category,
    reason: ADJ_REASONS[category],
    performedBy: pick(adminUsers.filter((a) => a.role !== 'analyst')).fullName,
  }
})

/* ------------------------------------------------------------- transactions */

const TX_TYPES: TxType[] = [
  'topup', 'document_charge', 'document_charge', 'document_charge',
  'manual_adjustment', 'refund', 'subscription_payment',
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
    case 'refund':
      amount = pick([50_000, 150_000, 250_000])
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
    balanceAfter: Math.max(0, int(0, 4_000_000)),
    documentId: doc?.id ?? null,
    documentNumber: doc?.number ?? null,
    adminName:
      type === 'manual_adjustment' || type === 'refund'
        ? pick(adminUsers.filter((a) => a.role !== 'analyst')).fullName
        : null,
    reason:
      type === 'manual_adjustment'
        ? 'Компенсация за сбой при отправке'
        : type === 'refund'
          ? 'Возврат за неуспешную отправку в ГНК'
          : null,
  }
}).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

/* -------------------------------------------------------------------- roles */

export const PERMISSION_MODULES = [
  { key: 'tenants', label: 'Компании' },
  { key: 'documents', label: 'Документы (содержимое)' },
  { key: 'billing', label: 'Настройки биллинга' },
  { key: 'adjustments', label: 'Ручные корректировки' },
  { key: 'team', label: 'Команда админов' },
  { key: 'audit', label: 'Журнал аудита' },
] as const

export const roles: Role[] = [
  {
    id: 'super_admin',
    name: 'Супер-админ',
    description: 'Полный доступ ко всем модулям платформы.',
    permissions: {
      tenants: 'full', documents: 'full', billing: 'full',
      adjustments: 'full', team: 'full', audit: 'full',
    },
  },
  {
    id: 'support',
    name: 'Поддержка',
    description: 'Работа с клиентами: редактирование, блокировка, доступ к документам.',
    permissions: {
      tenants: 'edit', documents: 'full', billing: 'view',
      adjustments: 'none', team: 'none', audit: 'own',
    },
  },
  {
    id: 'finance',
    name: 'Финансы',
    description: 'Биллинг, тарифы и корректировки балансов.',
    permissions: {
      tenants: 'view', documents: 'metadata', billing: 'full',
      adjustments: 'full', team: 'none', audit: 'own',
    },
  },
  {
    id: 'analyst',
    name: 'Аналитик',
    description: 'Только чтение. Без доступа к содержимому документов.',
    permissions: {
      tenants: 'view', documents: 'metadata', billing: 'view',
      adjustments: 'none', team: 'none', audit: 'none',
    },
  },
]

/* ---------------------------------------------------------------- audit log */

const AUDIT_ACTIONS: Array<{
  action: string
  targetType: AuditEntry['targetType']
}> = [
  { action: 'Вход в систему', targetType: 'Session' },
  { action: 'Неудачная попытка входа', targetType: 'Session' },
  { action: 'Просмотр содержимого документа', targetType: 'Document' },
  { action: 'Редактирование компании', targetType: 'Company' },
  { action: 'Блокировка компании', targetType: 'Company' },
  { action: 'Разблокировка компании', targetType: 'Company' },
  { action: 'Ручная корректировка баланса', targetType: 'Balance' },
  { action: 'Изменение тарифного плана', targetType: 'Plan' },
  { action: 'Изменение подписки', targetType: 'Company' },
  { action: 'Изменение роли администратора', targetType: 'Role' },
  { action: 'Экспорт данных', targetType: 'Company' },
  { action: 'Блокировка пользователя', targetType: 'User' },
]

export const auditLog: AuditEntry[] = Array.from({ length: 180 }, (_, i): AuditEntry => {
  const admin = pick(adminUsers)
  const entry = pick(AUDIT_ACTIONS)
  const failed = entry.action === 'Неудачная попытка входа'
  const denied = failed || chance(0.04)
  const c = companies[int(0, companies.length - 1)]
  const d = documents[int(0, documents.length - 1)]

  const target =
    entry.targetType === 'Document'
      ? d.number
      : entry.targetType === 'Session'
        ? admin.email
        : entry.targetType === 'Plan'
          ? pick(plans).nameRu
          : entry.targetType === 'Role'
            ? pick(roles).name
            : c.inn

  return {
    id: `aud-${i + 1}`,
    createdAt: daysAgo(int(0, 90)),
    adminName: admin.fullName,
    adminRole: admin.role,
    action: entry.action,
    targetType: entry.targetType,
    target,
    ip: `${int(84, 213)}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`,
    result: denied ? 'denied' : 'success',
    details:
      entry.targetType === 'Document'
        ? `Документ ${d.number}, ${d.type}`
        : entry.targetType === 'Balance'
          ? 'Изменение баланса с указанием причины'
          : `Объект: ${target}`,
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
