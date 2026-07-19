import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Ban,
  CheckCircle2,
  CreditCard,
  FileText,
  Info,
  Pencil,
  RefreshCw,
  Repeat,
  ShieldAlert,
  StickyNote,
  Wallet,
  Wand2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  AdminDocument,
  TenantStatus,
  TenantUser,
} from '@/types/admin'
import {
  auditLog,
  balanceByCompany,
  companyById,
  documentsByCompany,
  effectivePricePerDoc,
  paymentsByCompany,
  subscriptionByCompany,
  transactionsByCompany,
  usersByCompany,
} from '@/data/mock'
import {
  paymentMethodLabel,
  tenantUserRoleLabel,
  txTypeLabel,
} from '@/types/labels'
import { PageCard, FormCard, PageHeader, Field } from '@/components/ui/PageCard'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import {
  TenantStatusBadge,
  SubscriptionStatusBadge,
  BillingModeBadge,
  ChargeTypeBadge,
  DocStatusBadge,
  UserStatusBadge,
} from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TariffEditModal } from '@/components/tenants/TariffEditModal'
import {
  applyBalanceAdjustment,
  applyTenantEdit,
  effectiveTerms,
  useTenantEdits,
} from '@/data/tenantEdits'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  formatDate,
  formatDateTime,
  formatInn,
  formatMoney,
  formatNumber,
  formatSigned,
  formatSum,
  percent,
} from '@/lib/format'
import { cn } from '@/lib/cn'

type FeedItem = {
  id: string
  at: string
  kind: 'transaction' | 'payment' | 'audit'
  title: string
  detail: string
  amount: number | null
}

const feedIcon: Record<FeedItem['kind'], ReactNode> = {
  transaction: <Wallet className="size-4 text-Smart-blue" />,
  payment: <CreditCard className="size-4 text-emerald-600" />,
  audit: <ShieldAlert className="size-4 text-amber-500" />,
}

/** Actions confirmed through the reason dialog on this page. */
type PendingAction =
  | { kind: 'status'; next: TenantStatus }
  | { kind: 'resolution'; label: string; description: string }
  | { kind: 'customPrice'; value: number | null }

export default function TenantDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const company = companyById(id)

  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const edits = useTenantEdits()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; at: string; text: string }>>([])
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<'credit' | 'debit'>('credit')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustTouched, setAdjustTouched] = useState(false)
  const [priceDraft, setPriceDraft] = useState('')
  const [customPrice, setCustomPrice] = useState<number | null>(
    company?.customPricePerDoc ?? null,
  )
  const [overageMode, setOverageMode] = useState<'payg' | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const users = useMemo(() => (company ? usersByCompany(company.id) : []), [company])
  const docs = useMemo(() => (company ? documentsByCompany(company.id) : []), [company])

  const feed = useMemo<FeedItem[]>(() => {
    if (!company) return []
    const txs: FeedItem[] = transactionsByCompany(company.id).map((t) => ({
      id: `tx-${t.id}`,
      at: t.createdAt,
      kind: 'transaction',
      title: txTypeLabel[t.type],
      detail:
        t.documentNumber ??
        t.reason ??
        (t.adminName ? `Администратор: ${t.adminName}` : 'Операция по балансу'),
      amount: t.amount,
    }))
    const pays: FeedItem[] = paymentsByCompany(company.id).map((p) => ({
      id: `pay-${p.id}`,
      at: p.createdAt,
      kind: 'payment',
      title: `Платёж — ${paymentMethodLabel[p.method]}`,
      detail: p.cardMask ? `${p.providerRef} · ${p.cardMask}` : p.providerRef,
      amount: p.amount,
    }))
    const audits: FeedItem[] = auditLog
      .filter((a) => a.target === company.inn)
      .map((a) => ({
        id: `aud-${a.id}`,
        at: a.createdAt,
        kind: 'audit',
        title: a.action,
        detail: `${a.adminName} · ${a.details}`,
        amount: null,
      }))
    return [...txs, ...pays, ...audits].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  }, [company])

  if (!company) {
    return (
      <PageCard>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-lg font-semibold text-slate-800">Компания не найдена</span>
          <span className="text-sm text-gray-500">
            Компания с идентификатором «{id}» отсутствует в системе.
          </span>
          <div className="mt-4">
            <Button hierarchy="secondary-gray" onClick={() => navigate('/tenants')}>
              К списку компаний
            </Button>
          </div>
        </div>
      </PageCard>
    )
  }

  const terms = effectiveTerms(company, edits)
  const status = terms.status
  const quotaTotal = terms.docQuota ?? subscriptionByCompany(company.id)?.quotaTotal ?? 0
  const blocked = status === 'suspended'
  const subscription = subscriptionByCompany(company.id)
  const balance = balanceByCompany(company.id)
  const price = customPrice ?? effectivePricePerDoc(company)
  const exhaustedSub =
    subscription && subscription.status === 'quota_exhausted' && overageMode === null
      ? subscription
      : null

  const mode =
    exhaustedSub || overageMode === 'payg'
      ? 'hybrid'
      : terms.planId
        ? 'subscription'
        : company.billingMode

  function applyPending(reason: string) {
    if (!pending) return
    if (pending.kind === 'status') {
      applyTenantEdit(company!.id, { status: pending.next })
      setBanner(
        `Статус изменён на «${pending.next === 'suspended' ? 'Приостановлена' : 'Активна'}». Причина: ${reason}`,
      )
    } else if (pending.kind === 'resolution') {
      if (pending.label === 'Включить оплату за документ') setOverageMode('payg')
      setBanner(`${pending.label} — применено. Причина: ${reason}`)
    } else {
      setCustomPrice(pending.value)
      setBanner(
        pending.value === null
          ? `Кастомная цена снята. Причина: ${reason}`
          : `Кастомная цена: ${formatSum(pending.value)} за документ. Причина: ${reason}`,
      )
    }
    setPending(null)
  }

  const userColumns: Column<TenantUser>[] = [
    { key: 'name', header: 'ФИО', cell: (u) => <span className="font-medium text-slate-800">{u.fullName}</span> },
    { key: 'pinfl', header: 'ПИНФЛ', cell: (u) => <span className="whitespace-nowrap">{u.pinfl}</span> },
    { key: 'role', header: 'Роль', cell: (u) => tenantUserRoleLabel[u.role] },
    { key: 'email', header: 'Email', cell: (u) => u.email },
    { key: 'phone', header: 'Телефон', cell: (u) => <span className="whitespace-nowrap">{u.phone}</span> },
    { key: 'status', header: 'Статус', cell: (u) => <UserStatusBadge status={u.status} /> },
    {
      key: 'login',
      header: 'Последний вход',
      cell: (u) => <span className="whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</span>,
    },
    {
      key: 'eimzo',
      header: 'E-Imzo привязан',
      cell: (u) => (
        <span className={cn('text-sm font-medium', u.eimzoBound ? 'text-emerald-600' : 'text-gray-400')}>
          {u.eimzoBound ? 'Да' : 'Нет'}
        </span>
      ),
    },
  ]

  const docColumns: Column<AdminDocument>[] = [
    { key: 'number', header: '№', cell: (d) => <span className="font-medium text-slate-800">{d.number}</span> },
    { key: 'type', header: 'Тип', cell: (d) => <span className="whitespace-nowrap">{d.type}</span> },
    {
      key: 'direction',
      header: 'Направление',
      cell: (d) => (d.direction === 'outgoing' ? 'Исходящий' : 'Входящий'),
    },
    {
      key: 'counterparty',
      header: 'Контрагент',
      cell: (d) => {
        const out = d.direction === 'outgoing'
        return (
          <div className="flex flex-col">
            <span className="text-slate-800">{out ? d.receiverName : d.senderName}</span>
            <span className="text-xs text-gray-500">
              {formatInn(out ? d.receiverInn : d.senderInn)}
            </span>
          </div>
        )
      },
    },
    { key: 'status', header: 'Статус', cell: (d) => <DocStatusBadge status={d.status} /> },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (d) => <span className="tabular-nums">{formatMoney(d.amount)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Создан',
      cell: (d) => <span className="whitespace-nowrap">{formatDate(d.createdAt)}</span>,
    },
    {
      key: 'sentAt',
      header: 'Отправлен',
      cell: (d) => <span className="whitespace-nowrap">{formatDate(d.sentAt)}</span>,
    },
    { key: 'charge', header: 'Списание', cell: (d) => <ChargeTypeBadge type={d.chargeType} /> },
  ]

  const resolutions: Array<{ label: string; description: string; icon: ReactNode }> = [
    {
      label: 'Перекупить тот же план',
      description:
        'Квота сбрасывается до полного объёма, период начинается заново на всю длительность плана.',
      icon: <RefreshCw className="size-4" />,
    },
    {
      label: 'Сменить план',
      description:
        'Новый план начинает действовать немедленно и заменяет текущую подписку вместе с её квотой.',
      icon: <Repeat className="size-4" />,
    },
    {
      label: 'Включить оплату за документ',
      description:
        'Подписка остаётся исчерпанной, каждый следующий исходящий документ списывается с баланса по тарифу компании до конца периода.',
      icon: <CreditCard className="size-4" />,
    },
  ]

  const tabs = [
    { key: 'overview', label: 'Обзор' },
    { key: 'users', label: 'Пользователи', count: users.length },
    { key: 'billing', label: 'Биллинг' },
    { key: 'documents', label: 'Документы', count: docs.length },
    { key: 'activity', label: 'Активность', count: feed.length },
  ]

  const adjustInvalid =
    adjustReason.trim().length === 0 || !Number.isFinite(Number(adjustAmount)) || Number(adjustAmount) <= 0

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <PageHeader
          title={company.name}
          subtitle={`ИНН ${formatInn(company.inn)} · ${company.region}`}
          actions={
            <>
              <TenantStatusBadge status={status} />
              <Button
                hierarchy="secondary-gray"
                size="md"
                leadingIcon={<Pencil className="size-4" />}
                onClick={() => setEditOpen(true)}
              >
                Изменить тариф
              </Button>
              <Button
                hierarchy="secondary-gray"
                size="md"
                leadingIcon={<StickyNote className="size-4" />}
                onClick={() => setNoteOpen(true)}
              >
                Добавить заметку
              </Button>
              <button
                type="button"
                onClick={() =>
                  setPending({ kind: 'status', next: blocked ? 'active' : 'suspended' })
                }
                className="flex items-center gap-2 rounded-lg border border-red-300 px-6 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                {blocked ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
                {blocked ? 'Активировать' : 'Приостановить'}
              </button>
            </>
          }
        />

        {banner && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-Smart-blue" />
            <span className="text-sm text-slate-700">{banner}</span>
          </div>
        )}

        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </PageCard>

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <FormCard title="Реквизиты компании">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ИНН">{formatInn(company.inn)}</Field>
              <Field label="Наименование">{company.name}</Field>
              <Field label="Адрес">{company.address}</Field>
              <Field label="Регион">{company.region}</Field>
              <Field label="ОКЭД">{company.oked}</Field>
              <Field label="Директор (ПИНФЛ)">{company.directorPinfl}</Field>
              <Field label="Директор (ФИО)">{company.directorName}</Field>
              <Field label="Глав. бухгалтер (ПИНФЛ)">{company.accountantPinfl}</Field>
              <Field label="Глав. бухгалтер (ФИО)">{company.accountantName}</Field>
              <Field label="Телефон">{company.phone}</Field>
              <Field label="Моб. телефон">{company.mobile}</Field>
              <Field label="Email">{company.email}</Field>
              <Field label="Веб-сайт">{company.website}</Field>
            </div>
          </FormCard>

          <FormCard title="Банковские реквизиты">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="МФО / SWIFT">{company.mfo}</Field>
              <Field label="Название банка">{company.bankName}</Field>
              <Field label="Расчётный счёт">{company.accountNumber}</Field>
            </div>
          </FormCard>

          <FormCard title="Учётная запись">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Регистрация">{formatDateTime(company.createdAt)}</Field>
              <Field label="Статус">
                <TenantStatusBadge status={status} />
              </Field>
              <Field label="Причина статуса">
                {company.statusReason ?? <span className="text-gray-400">—</span>}
              </Field>
              <Field label="Последний вход">{formatDateTime(company.lastActiveAt)}</Field>
              <Field label="Источник">{company.source}</Field>
            </div>
          </FormCard>

          {notes.length > 0 && (
            <FormCard title="Внутренние заметки">
              <div className="flex flex-col gap-3">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-gray-200 px-3.5 py-2.5">
                    <div className="text-xs text-gray-500">{formatDateTime(n.at)}</div>
                    <div className="text-sm text-slate-800">{n.text}</div>
                  </div>
                ))}
              </div>
            </FormCard>
          )}
        </div>
      )}

      {tab === 'users' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Сотрудники компании</h2>
          <DataTable
            columns={userColumns}
            rows={users}
            rowKey={(u) => u.id}
            emptyMessage="Сотрудники не найдены"
          />
        </PageCard>
      )}

      {tab === 'billing' && (
        <div className="flex flex-col gap-4">
          {exhaustedSub && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-orange-600" />
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-orange-700">
                    Квота исчерпана — отправка документов приостановлена
                  </span>
                  <span className="text-sm text-orange-700">
                    Компания израсходовала все {formatNumber(exhaustedSub.quotaTotal)} документов
                    текущего периода. Исходящие документы не отправляются, пока не выбрано одно из
                    трёх решений. Входящие документы и подписание остаются бесплатными.
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {resolutions.map((r) => (
                  <div
                    key={r.label}
                    className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-white p-4"
                  >
                    <span className="text-sm text-slate-600">{r.description}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPending({
                          kind: 'resolution',
                          label: r.label,
                          description: r.description,
                        })
                      }
                      className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-Smart-blue px-4 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
                    >
                      {r.icon}
                      {r.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <FormCard title="Текущий режим">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Режим биллинга">
                <BillingModeBadge mode={mode} />
              </Field>
              <Field label="Эффективная цена за документ">
                <span className="font-semibold text-slate-800">{formatSum(price)}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {customPrice !== null ? 'кастомная цена' : 'по объёмному уровню'}
                </span>
              </Field>
              <Field label="Отправлено документов за месяц">
                {formatNumber(company.docsSentThisMonth)}
              </Field>
              <Field label="Доплата сверх квоты включена">
                {overageMode === 'payg' || subscription?.overageMode === 'payg' ? 'Да' : 'Нет'}
              </Field>
            </div>
          </FormCard>

          {subscription ? (
            <FormCard
              title="Подписка"
              action={
                <div className="flex items-center gap-3">
                  <SubscriptionStatusBadge status={subscription.status} />
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="text-sm font-semibold text-Smart-blue transition hover:underline"
                  >
                    Изменить тариф
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="План">{terms.planName ?? subscription.planName}</Field>
                <Field label="Период">
                  {formatDate(subscription.periodStart)} —{' '}
                  {formatDate(terms.periodEnd ?? subscription.periodEnd)}
                </Field>
                <Field label="Автопродление">{subscription.autoRenew ? 'Включено' : 'Выключено'}</Field>
                <Field label="Оплачено">{formatSum(subscription.amountPaid)}</Field>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Использование квоты</span>
                  <span className="tabular-nums text-slate-600">
                    {formatNumber(subscription.quotaUsed)} / {formatNumber(quotaTotal)}{' '}
                    ({percent(subscription.quotaUsed, quotaTotal)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition',
                      subscription.status === 'quota_exhausted'
                        ? 'bg-orange-500'
                        : percent(subscription.quotaUsed, quotaTotal) >= 80
                          ? 'bg-amber-400'
                          : 'bg-Smart-blue',
                    )}
                    style={{
                      width: `${percent(subscription.quotaUsed, quotaTotal)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Документов сверх квоты за период">
                  {formatNumber(subscription.overageDocs)}
                </Field>
                <Field label="Сумма доплат за период">
                  <span className={cn(subscription.overageAmount > 0 && 'text-amber-600')}>
                    {formatSum(subscription.overageAmount)}
                  </span>
                </Field>
              </div>
            </FormCard>
          ) : terms.planId ? (
            /* No subscription record, but an admin has assigned a plan by hand. */
            <FormCard
              title="Подписка"
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-sm font-semibold text-Smart-blue transition hover:underline"
                >
                  Изменить тариф
                </button>
              }
            >
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-Smart-blue/5 px-3.5 py-2.5">
                <Wand2 className="mt-0.5 size-4 shrink-0 text-Smart-blue" />
                <span className="text-sm text-slate-600">
                  План назначен администратором вручную.
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="План">{terms.planName ?? '—'}</Field>
                <Field label="Действует до">{formatDate(terms.periodEnd)}</Field>
                <Field label="Квота документов">
                  {terms.docQuota === null ? '—' : formatNumber(terms.docQuota)}
                  {terms.quotaOverridden && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      изменено
                    </span>
                  )}
                </Field>
                <Field label="Лимит сотрудников">
                  {terms.maxEmployees === null ? '—' : formatNumber(terms.maxEmployees)}
                  {terms.employeesOverridden && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      изменено
                    </span>
                  )}
                </Field>
              </div>
            </FormCard>
          ) : (
            <FormCard
              title="Подписка"
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-sm font-semibold text-Smart-blue transition hover:underline"
                >
                  Назначить план
                </button>
              }
            >
              <p className="text-sm text-gray-500">
                У компании нет подписки — оплата производится за каждый отправленный документ с
                предоплаченного баланса.
              </p>
            </FormCard>
          )}

          <FormCard
            title="Баланс и лимиты"
            action={
              <Button
                hierarchy="secondary-gray"
                size="md"
                leadingIcon={<Wallet className="size-4" />}
                onClick={() => {
                  setAdjustAmount('')
                  setAdjustReason('')
                  setAdjustTouched(false)
                  setAdjustDirection('credit')
                  setAdjustOpen(true)
                }}
              >
                Ручная корректировка
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Текущий баланс">
                <span
                  className={cn(
                    'text-2xl leading-8 font-bold',
                    terms.balance < 0 ? 'text-red-600' : 'text-slate-800',
                  )}
                >
                  {formatSum(terms.balance)}
                </span>
              </Field>
              <Field label="Бесплатный лимит (месяц)">
                {balance
                  ? `${formatNumber(balance.freeAllowanceUsed)} / ${formatNumber(balance.freeAllowanceTotal)} документов`
                  : '—'}
              </Field>
              <Field label="Последнее пополнение">
                {balance?.lastTopUpAt ? formatDateTime(balance.lastTopUpAt) : '—'}
              </Field>
              <Field label="Всего пополнено / израсходовано">
                {balance
                  ? `${formatSum(balance.totalToppedUp)} / ${formatSum(balance.totalConsumed)}`
                  : '—'}
              </Field>
            </div>
          </FormCard>

          <FormCard title="Кастомная цена за документ">
            <p className="text-sm text-gray-500">
              Переопределяет объёмные уровни для этой компании. Текущее значение:{' '}
              <b className="font-semibold text-slate-800">
                {customPrice === null ? 'не задано' : formatSum(customPrice)}
              </b>
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-56">
                <Input
                  label="Цена за документ, сум"
                  inputMode="numeric"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  placeholder="например, 280"
                />
              </div>
              <Button
                size="md"
                disabled={!Number.isFinite(Number(priceDraft)) || Number(priceDraft) <= 0}
                onClick={() => setPending({ kind: 'customPrice', value: Number(priceDraft) })}
              >
                Установить
              </Button>
              <Button
                hierarchy="secondary-gray"
                size="md"
                disabled={customPrice === null}
                onClick={() => setPending({ kind: 'customPrice', value: null })}
              >
                Снять переопределение
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {tab === 'documents' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Документы компании</h2>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span className="text-sm text-amber-600">
              Открытие содержимого документа фиксируется в журнале аудита: сохраняются ваше имя,
              IP-адрес и номер документа.
            </span>
          </div>
          <DataTable
            columns={docColumns}
            rows={docs}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/documents/${d.id}`)}
            emptyMessage="Документы не найдены"
          />
        </PageCard>
      )}

      {tab === 'activity' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Хронология событий</h2>
          {feed.length === 0 ? (
            <p className="py-12 text-center text-gray-400">Событий пока нет</p>
          ) : (
            <ol className="mt-4 flex flex-col">
              {feed.map((item) => (
                <li key={item.id} className="flex gap-3 border-b border-gray-100 py-3 last:border-b-0">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    {feedIcon[item.kind]}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <span className="text-sm text-gray-500">{item.detail}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {item.amount !== null && (
                      <span
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          item.amount < 0 ? 'text-red-600' : 'text-emerald-600',
                        )}
                      >
                        {formatSigned(item.amount)}
                      </span>
                    )}
                    <span className="text-xs whitespace-nowrap text-gray-400">
                      {formatDateTime(item.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PageCard>
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={applyPending}
        destructive={pending?.kind === 'status' && pending.next === 'suspended'}
        confirmLabel={pending?.kind === 'resolution' ? pending.label : 'Подтвердить'}
        title={
          pending?.kind === 'status'
            ? pending.next === 'suspended'
              ? 'Приостановить компанию'
              : 'Активировать компанию'
            : pending?.kind === 'resolution'
              ? pending.label
              : 'Изменение кастомной цены'
        }
        description={
          pending?.kind === 'resolution'
            ? pending.description
            : pending?.kind === 'customPrice'
              ? pending.value === null
                ? 'Компания вернётся к стандартным объёмным уровням цен.'
                : `Новая цена за документ: ${formatSum(pending.value)}.`
              : `Компания: ${company.name} (ИНН ${formatInn(company.inn)}).`
        }
      />

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Внутренняя заметка"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex w-full flex-col items-start gap-1.5">
            <span className="text-sm leading-5 font-medium text-slate-700">Текст заметки</span>
            <div className="flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Видна только сотрудникам Smartup24"
                className="flex-1 resize-none bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button hierarchy="secondary-gray" size="md" onClick={() => setNoteOpen(false)}>
              Отменить
            </Button>
            <Button
              size="md"
              disabled={noteText.trim().length === 0}
              onClick={() => {
                setNotes((prev) => [
                  { id: `note-${prev.length + 1}`, at: new Date().toISOString(), text: noteText.trim() },
                  ...prev,
                ])
                setNoteText('')
                setNoteOpen(false)
              }}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Ручная корректировка баланса"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 p-1 outline outline-1 outline-offset-[-1px] outline-gray-200">
            {(['credit', 'debit'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAdjustDirection(d)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm leading-5 font-semibold transition',
                  adjustDirection === d
                    ? 'bg-white text-slate-700 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]'
                    : 'text-gray-500 hover:text-slate-700',
                )}
              >
                {d === 'credit' ? 'Пополнение' : 'Списание'}
              </button>
            ))}
          </div>

          <Input
            label="Сумма, сум"
            inputMode="numeric"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="например, 250000"
          />

          <div className="flex w-full flex-col items-start gap-1.5">
            <span className="text-sm leading-5 font-medium text-slate-700">
              Причина<span className="text-red-500"> *</span>
            </span>
            <div
              className={cn(
                'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
                adjustTouched && adjustReason.trim().length === 0
                  ? 'outline-red-300 focus-within:outline-red-400'
                  : 'outline-gray-200 focus-within:outline-Smart-blue',
              )}
            >
              <textarea
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Причина обязательна — попадёт в журнал аудита"
                className="flex-1 resize-none bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <span className="text-sm text-gray-500">
              Корректировка баланса записывается в журнал аудита с вашим именем и IP-адресом.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button hierarchy="secondary-gray" size="md" onClick={() => setAdjustOpen(false)}>
              Отменить
            </Button>
            <Button
              size="md"
              onClick={() => {
                setAdjustTouched(true)
                if (adjustInvalid) return
                const signed =
                  adjustDirection === 'credit' ? Number(adjustAmount) : -Number(adjustAmount)
                setBanner(
                  `Корректировка баланса ${formatSigned(signed)} сум применена. Причина: ${adjustReason.trim()}`,
                )
                setAdjustOpen(false)
              }}
            >
              Применить
            </Button>
          </div>
        </div>
      </Modal>

      <TariffEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        company={company}
        onSave={(companyId, patch, reason, adjustment) => {
          applyTenantEdit(companyId, patch)
          if (adjustment) applyBalanceAdjustment(companyId, adjustment)
          setBanner(
            adjustment
              ? `Тариф и баланс обновлены. Причина: ${reason || adjustment.reason}`
              : `Тариф обновлён. Причина: ${reason}`,
          )
        }}
      />

      <FileTextSpacer />
    </div>
  )
}

/** Keeps the page footer visually balanced under short tabs. */
function FileTextSpacer() {
  return (
    <div className="flex items-center gap-2 pb-2 text-xs text-gray-400">
      <FileText className="size-4" />
      Все действия администратора над компанией фиксируются в журнале аудита.
    </div>
  )
}
