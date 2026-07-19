import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  FileX,
  Info,
  RefreshCw,
  Repeat,
  Send,
  ShieldAlert,
  UserPlus,
  Wallet,
  Wand2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  AdminDocument,
  DocStatus,
  TenantStatus,
  PlatformUser,
} from '@/types/admin'
import { DOC_TYPES, docTypeLabel } from '@/types/admin'
import {
  balanceByCompany,
  companyById,
  documentsByCompany,
  paymentsByCompany,
  subscriptionByCompany,
  transactionsByCompany,
  usersByCompany,
} from '@/data/mock'
import {
  authMethodLabel,
  docStatusLabel,
  paymentMethodLabel,
  tenantUserRoleLabel,
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
import { Select } from '@/components/ui/Select'
import { DateRangeFilter, EMPTY_RANGE, inRange } from '@/components/ui/DateRangeFilter'
import type { DateRange } from '@/components/ui/DateRangeFilter'
import {
  applyTenantEdit,
  effectiveTerms,
  useTenantEdits,
} from '@/data/tenantEdits'
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

/** Sentinel for "no filter selected". */
const ALL = 'all'

type FeedItem = {
  id: string
  at: string
  kind:
    | 'doc_sent'
    | 'doc_signed'
    | 'doc_rejected'
    | 'topup'
    | 'plan_bought'
    | 'employee_added'
  title: string
  detail: string
  amount: number | null
}

const feedIcon: Record<FeedItem['kind'], ReactNode> = {
  doc_sent: <Send className="size-4 text-Smart-blue" />,
  doc_signed: <FileCheck className="size-4 text-emerald-600" />,
  doc_rejected: <FileX className="size-4 text-red-500" />,
  topup: <CreditCard className="size-4 text-emerald-600" />,
  plan_bought: <Wallet className="size-4 text-Smart-blue" />,
  employee_added: <UserPlus className="size-4 text-slate-500" />,
}

/** Actions confirmed through the reason dialog on this page. */
type PendingAction =
  | { kind: 'status'; next: TenantStatus }
  | { kind: 'resolution'; label: string; description: string }

export default function TenantDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const company = companyById(id)

  const [tab, setTab] = useState('overview')
  const edits = useTenantEdits()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [docType, setDocType] = useState<string>(ALL)
  const [docStatus, setDocStatus] = useState<string>(ALL)
  const [docRange, setDocRange] = useState<DateRange>(EMPTY_RANGE)
  const [overageMode, setOverageMode] = useState<'payg' | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const users = useMemo(() => (company ? usersByCompany(company.id) : []), [company])
  const docs = useMemo(() => (company ? documentsByCompany(company.id) : []), [company])

  const filteredDocs = useMemo(
    () =>
      docs.filter((d) => {
        if (docType !== ALL && d.type !== docType) return false
        if (docStatus !== ALL && d.status !== docStatus) return false
        if (docRange.from || docRange.to) {
          if (!inRange(d.sentAt, docRange)) return false
        }
        return true
      }),
    [docs, docType, docStatus, docRange],
  )

  /**
   * Company activity is limited to the six events that describe what the
   * company itself did — not admin actions (those live in the audit log).
   */
  const feed = useMemo<FeedItem[]>(() => {
    if (!company) return []

    const docEvents: FeedItem[] = documentsByCompany(company.id).flatMap((d) => {
      const items: FeedItem[] = []
      if (d.direction === 'outgoing' && d.sentAt) {
        items.push({
          id: `doc-sent-${d.id}`,
          at: d.sentAt,
          kind: 'doc_sent',
          title: 'Документ отправлен',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.status === 'signed') {
        items.push({
          id: `doc-signed-${d.id}`,
          at: d.sentAt ?? d.createdAt,
          kind: 'doc_signed',
          title: 'Документ подписан',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.status === 'rejected') {
        items.push({
          id: `doc-rejected-${d.id}`,
          at: d.sentAt ?? d.createdAt,
          kind: 'doc_rejected',
          title: 'Документ отклонён',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      return items
    })

    const topUps: FeedItem[] = paymentsByCompany(company.id)
      .filter((p) => p.status === 'success')
      .map((p) => ({
        id: `topup-${p.id}`,
        at: p.createdAt,
        kind: 'topup',
        title: 'Пополнение баланса',
        detail: paymentMethodLabel[p.method],
        amount: p.amount,
      }))

    const planPurchases: FeedItem[] = transactionsByCompany(company.id)
      .filter((t) => t.type === 'subscription_payment')
      .map((t) => ({
        id: `plan-${t.id}`,
        at: t.createdAt,
        kind: 'plan_bought',
        title: 'Оплачен тарифный план',
        detail: subscriptionByCompany(company.id)?.planName ?? 'Тарифный план',
        amount: t.amount,
      }))

    const hires: FeedItem[] = usersByCompany(company.id).map((u) => ({
      id: `hire-${u.id}`,
      // No hire timestamp in the model yet — last login is the closest proxy.
      at: u.lastLoginAt,
      kind: 'employee_added',
      title: 'Добавлен сотрудник',
      detail: `${u.fullName}${u.role ? ` · ${tenantUserRoleLabel[u.role]}` : ''}`,
      amount: null,
    }))

    return [...docEvents, ...topUps, ...planPurchases, ...hires].sort(
      (a, b) => +new Date(b.at) - +new Date(a.at),
    )
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
    }
    setPending(null)
  }

  const userColumns: Column<PlatformUser>[] = [
    { key: 'name', header: 'ФИО', cell: (u) => <span className="font-medium text-slate-800">{u.fullName}</span> },
    { key: 'role', header: 'Роль', cell: (u) => (u.role ? tenantUserRoleLabel[u.role] : '—') },
    {
      key: 'auth',
      header: 'Способ входа',
      cell: (u) => (
        <span className="whitespace-nowrap text-slate-600">{authMethodLabel[u.authMethod]}</span>
      ),
    },
    { key: 'status', header: 'Статус', cell: (u) => <UserStatusBadge status={u.status} /> },
    {
      key: 'login',
      header: 'Последний вход',
      cell: (u) => <span className="whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</span>,
    },
  ]

  const docColumns: Column<AdminDocument>[] = [
    { key: 'number', header: '№', cell: (d) => <span className="font-medium text-slate-800">{d.number}</span> },
    {
      key: 'type',
      header: 'Тип документа',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-slate-800">{d.type}</span>
          {d.subtype && <span className="text-xs text-gray-500">{d.subtype}</span>}
        </div>
      ),
    },
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

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/tenants')}
        className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        К списку компаний
      </button>

      <PageCard>
        <PageHeader
          title={company.name}
          subtitle={`ИНН ${formatInn(company.inn)} · ${company.region}`}
          actions={
            <>
              <TenantStatusBadge status={status} />
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
              <Field label="Директор (ФИО)">{company.directorName}</Field>
              <Field label="Директор (ПИНФЛ)">{company.directorPinfl}</Field>
              <Field label="Телефон директора">{company.phone}</Field>
              <Field label="Глав. бухгалтер (ФИО)">{company.accountantName}</Field>
              <Field label="Глав. бухгалтер (ПИНФЛ)">{company.accountantPinfl}</Field>
              <Field label="Телефон бухгалтера">{company.mobile}</Field>
            </div>
          </FormCard>

          <FormCard title="Учётная запись">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Регистрация">{formatDateTime(company.createdAt)}</Field>
              <Field label="Статус">
                <TenantStatusBadge status={status} />
              </Field>
              <Field label="Последний вход">{formatDateTime(company.lastActiveAt)}</Field>
            </div>
          </FormCard>

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
              <Field label="Отправлено документов за месяц">
                {formatNumber(company.docsSentThisMonth)}
              </Field>
            </div>
          </FormCard>

          {subscription ? (
            <FormCard
              title="Подписка"
              action={<SubscriptionStatusBadge status={subscription.status} />}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="План">{terms.planName ?? subscription.planName}</Field>
                <Field label="Период">
                  {formatDate(subscription.periodStart)} —{' '}
                  {formatDate(terms.periodEnd ?? subscription.periodEnd)}
                </Field>
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
            >
              <p className="text-sm text-gray-500">
                У компании нет подписки — оплата производится за каждый отправленный документ с
                предоплаченного баланса.
              </p>
            </FormCard>
          )}

          <FormCard
            title="Баланс и лимиты"
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

          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <DateRangeFilter
                label="Период отправки"
                value={docRange}
                onChange={setDocRange}
              />
            </div>
            <Select
              label="Тип документа"
              value={docType}
              onChange={setDocType}
              options={[
                { value: ALL, label: 'Все типы' },
                ...DOC_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
            <Select
              label="Статус"
              value={docStatus}
              onChange={setDocStatus}
              options={[
                { value: ALL, label: 'Любой статус' },
                ...(Object.keys(docStatusLabel) as DocStatus[]).map((s) => ({
                  value: s,
                  label: docStatusLabel[s],
                })),
              ]}
            />
          </div>

          <DataTable
            columns={docColumns}
            rows={filteredDocs}
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
              : 'Подтверждение действия'
        }
        description={
          pending?.kind === 'resolution'
            ? pending.description
            : `Компания: ${company.name} (ИНН ${formatInn(company.inn)}).`
        }
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
