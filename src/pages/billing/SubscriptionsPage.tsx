import { useMemo, useState } from 'react'
import {
  CalendarPlus,
  Repeat,
  RefreshCw,
  XCircle,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
} from 'lucide-react'
import type { Plan, Subscription, SubscriptionStatus } from '@/types/admin'
import { subscriptions as seedSubscriptions, plans, balanceByCompany } from '@/data/mock'
import { subscriptionStatusLabel } from '@/types/labels'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Toolbar } from '@/components/ui/Toolbar'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { SubscriptionStatusBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import {
  formatDate,
  formatInn,
  formatMoney,
  formatNumber,
  percent,
  daysUntil,
} from '@/lib/format'
import { cn } from '@/lib/cn'

const ANY = 'all'

/** Balance under this is treated as "too low to cover overage" in the warning. */
const LOW_BALANCE_THRESHOLD = 100_000

/** Plans are measured in days, so periods advance by days too. */
function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString()
}

/** Starts a fresh period from now for the given plan. */
function freshPeriod(plan: Plan): { periodStart: string; periodEnd: string } {
  const now = new Date()
  return {
    periodStart: now.toISOString(),
    periodEnd: addDays(now, plan.durationDays),
  }
}

type ActionKind =
  | 'extend'
  | 'change_plan'
  | 'cancel'
  | 'toggle_renew'
  | 'reset_quota'
  | 'rebuy'
  | 'switch_plan'
  | 'enable_payg'

type PendingAction = { kind: ActionKind; sub: Subscription }

const statusTabs: Array<{ key: string; label: string; pill: string }> = [
  { key: ANY, label: 'Все', pill: 'bg-gray-300' },
  { key: 'active', label: 'Активные', pill: 'bg-green-400' },
  { key: 'expiring', label: 'Истекают', pill: 'bg-amber-300' },
  { key: 'quota_exhausted', label: 'Квота исчерпана', pill: 'bg-red-500' },
  { key: 'cancelled', label: 'Отменённые', pill: 'bg-gray-300' },
]

function QuotaBar({ used, total }: { used: number; total: number }) {
  const pct = percent(used, total)
  const exhausted = total > 0 && used >= total
  return (
    <div className="flex w-36 flex-col gap-1">
      <span className="text-sm whitespace-nowrap tabular-nums text-slate-800">
        {formatNumber(used)} / {formatNumber(total)}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            'h-full rounded-full transition',
            exhausted ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-Smart-green',
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}

export default function SubscriptionsPage() {
  const [list, setList] = useState<Subscription[]>(() =>
    seedSubscriptions.map((s) => ({ ...s })),
  )

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [tab, setTab] = useState<string>(ANY)
  const [planFilter, setPlanFilter] = useState(ANY)
  const [statusFilter, setStatusFilter] = useState(ANY)
  const [exhaustedFilter, setExhaustedFilter] = useState(ANY)
  const [overageFilter, setOverageFilter] = useState(ANY)
  const [expiringFilter, setExpiringFilter] = useState(ANY)
  const [highUsageFilter, setHighUsageFilter] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [pending, setPending] = useState<PendingAction | null>(null)
  /** Target plan for the "switch plan" resolution / change plan action. */
  const [targetPlanId, setTargetPlanId] = useState<string>(plans[0]?.id ?? '')

  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [])

  const kpis = useMemo(() => {
    const active = list.filter((s) => s.status === 'active').length
    const exhausted = list.filter(
      (s) => s.status === 'quota_exhausted' && s.overageMode === null,
    ).length
    const onPayg = list.filter((s) => s.overageMode === 'payg').length
    const expiring7 = list.filter(
      (s) =>
        s.status !== 'cancelled' &&
        s.status !== 'expired' &&
        daysUntil(s.periodEnd) >= 0 &&
        daysUntil(s.periodEnd) <= 7,
    ).length
    return { active, exhausted, onPayg, expiring7 }
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((s) => {
      if (tab !== ANY && s.status !== tab) return false
      if (statusFilter !== ANY && s.status !== statusFilter) return false
      if (planFilter !== ANY && s.planId !== planFilter) return false
      if (exhaustedFilter === 'yes' && s.status !== 'quota_exhausted') return false
      if (exhaustedFilter === 'no' && s.status === 'quota_exhausted') return false
      if (overageFilter === 'payg' && s.overageMode !== 'payg') return false
      if (overageFilter === 'none' && s.overageMode !== null) return false
      if (expiringFilter !== ANY) {
        const days = daysUntil(s.periodEnd)
        const limit = expiringFilter === '7' ? 7 : 30
        if (days < 0 || days > limit) return false
      }
      if (highUsageFilter === 'yes' && percent(s.quotaUsed, s.quotaTotal) <= 80) return false
      if (!q) return true
      return s.companyInn.includes(q) || s.companyName.toLowerCase().includes(q)
    })
  }, [
    list,
    search,
    tab,
    statusFilter,
    planFilter,
    exhaustedFilter,
    overageFilter,
    expiringFilter,
    highUsageFilter,
  ])

  const pageRows = paginate(filtered, page, pageSize)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  function update(id: string, patch: (s: Subscription) => Subscription) {
    setList((prev) => prev.map((s) => (s.id === id ? patch(s) : s)))
  }

  function openAction(kind: ActionKind, sub: Subscription) {
    if (kind === 'change_plan' || kind === 'switch_plan') {
      const fallback = activePlans.find((p) => p.id !== sub.planId) ?? activePlans[0]
      setTargetPlanId(fallback?.id ?? sub.planId)
    }
    setPending({ kind, sub })
  }

  function applyAction() {
    if (!pending) return
    const { kind, sub } = pending
    const currentPlan = plans.find((p) => p.id === sub.planId)
    const targetPlan = plans.find((p) => p.id === targetPlanId)

    switch (kind) {
      case 'extend': {
        if (!currentPlan) return
        update(sub.id, (s) => ({
          ...s,
          status: 'active',
          periodEnd: addDays(new Date(s.periodEnd), currentPlan.durationDays),
        }))
        break
      }
      case 'cancel':
        update(sub.id, (s) => ({ ...s, status: 'cancelled', autoRenew: false }))
        break
      case 'toggle_renew':
        update(sub.id, (s) => ({ ...s, autoRenew: !s.autoRenew }))
        break
      case 'reset_quota':
        update(sub.id, (s) => ({
          ...s,
          quotaUsed: 0,
          status: s.status === 'quota_exhausted' ? 'active' : s.status,
          overageMode: null,
          overageDocs: 0,
          overageAmount: 0,
        }))
        break
      /* Resolution A — re-buy the same plan: quota resets, period restarts. */
      case 'rebuy': {
        if (!currentPlan) return
        const period = freshPeriod(currentPlan)
        update(sub.id, (s) => ({
          ...s,
          status: 'active',
          quotaTotal: currentPlan.docQuota,
          quotaUsed: 0,
          overageMode: null,
          overageDocs: 0,
          overageAmount: 0,
          amountPaid: s.amountPaid + currentPlan.price,
          ...period,
        }))
        break
      }
      /* Resolution B — switch plan: new quota + period replace the current ones. */
      case 'change_plan':
      case 'switch_plan': {
        if (!targetPlan) return
        const period = freshPeriod(targetPlan)
        update(sub.id, (s) => ({
          ...s,
          planId: targetPlan.id,
          planName: targetPlan.name,
          status: 'active',
          quotaTotal: targetPlan.docQuota,
          quotaUsed: 0,
          overageMode: null,
          overageDocs: 0,
          overageAmount: 0,
          amountPaid: s.amountPaid + targetPlan.price,
          ...period,
        }))
        break
      }
      /* Resolution C — pay-per-doc for the rest of the period. */
      case 'enable_payg':
        update(sub.id, (s) => ({ ...s, overageMode: 'payg' }))
        break
    }
  }

  const columns: Column<Subscription>[] = [
    {
      key: 'company',
      header: 'Компания',
      cell: (s) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-800">{s.companyName}</span>
          <span className="text-xs whitespace-nowrap text-gray-500">
            ИНН {formatInn(s.companyInn)}
          </span>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'План',
      cell: (s) => <span className="whitespace-nowrap">{s.planName}</span>,
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (s) => <SubscriptionStatusBadge status={s.status} />,
    },
    {
      key: 'from',
      header: 'Период с',
      cell: (s) => <span className="whitespace-nowrap">{formatDate(s.periodStart)}</span>,
    },
    {
      key: 'to',
      header: 'Период по',
      cell: (s) => {
        const days = daysUntil(s.periodEnd)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap">{formatDate(s.periodEnd)}</span>
            {days >= 0 && days <= 30 && s.status !== 'cancelled' && (
              <span className="text-xs whitespace-nowrap text-amber-500">
                через {formatNumber(days)} дн.
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'quota',
      header: 'Квота исп./всего',
      cell: (s) => <QuotaBar used={s.quotaUsed} total={s.quotaTotal} />,
    },
    {
      key: 'overageMode',
      header: 'Режим доплаты',
      cell: (s) =>
        s.overageMode === 'payg' ? (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-sm font-medium whitespace-nowrap text-amber-600">
            Оплата за документ
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'overage',
      header: 'Доплата за период',
      cls: 'text-right',
      cell: (s) =>
        s.overageDocs > 0 ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium tabular-nums text-slate-800">
              {formatMoney(s.overageAmount)}
            </span>
            <span className="text-xs tabular-nums text-gray-500">
              {formatNumber(s.overageDocs)} док.
            </span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'paid',
      header: 'Оплачено',
      cls: 'text-right',
      cell: (s) => (
        <span className="font-medium whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(s.amountPaid)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              ...(s.status === 'quota_exhausted'
                ? [
                    {
                      label: 'A — Перекупить план',
                      icon: <RefreshCw className="size-4" />,
                      onClick: () => openAction('rebuy', s),
                    },
                    {
                      label: 'B — Сменить план',
                      icon: <Repeat className="size-4" />,
                      onClick: () => openAction('switch_plan', s),
                    },
                    {
                      label: 'C — Оплата за документ',
                      icon: <Wallet className="size-4" />,
                      disabled: s.overageMode === 'payg',
                      onClick: () => openAction('enable_payg', s),
                    },
                  ]
                : []),
              {
                label: 'Продлить период',
                icon: <CalendarPlus className="size-4" />,
                onClick: () => openAction('extend', s),
              },
              {
                label: 'Отменить подписку',
                icon: <XCircle className="size-4" />,
                danger: true,
                disabled: s.status === 'cancelled',
                onClick: () => openAction('cancel', s),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const pendingPlan = pending ? plans.find((p) => p.id === pending.sub.planId) : undefined
  const pendingBalance = pending ? balanceByCompany(pending.sub.companyId)?.balance ?? 0 : 0
  const lowBalance = pendingBalance < LOW_BALANCE_THRESHOLD

  const dialog = pending ? buildDialog(pending) : null

  function buildDialog(action: PendingAction) {
    const { kind, sub } = action
    const who = (
      <>
        <b className="font-semibold text-slate-800">{sub.companyName}</b> (ИНН{' '}
        {formatInn(sub.companyInn)}), план {sub.planName}
      </>
    )

    switch (kind) {
      case 'rebuy':
        return {
          title: 'Резолюция A — перекупить тот же план',
          confirmLabel: 'Перекупить план',
          destructive: false,
          body: (
            <>
              {who}. Квота будет сброшена до {formatNumber(pendingPlan?.docQuota ?? 0)} документов,
              период начнётся заново с сегодняшнего дня. Пропорционального пересчёта нет. Действие
              записывается в журнал аудита.
            </>
          ),
        }
      case 'switch_plan':
      case 'change_plan':
        return {
          title:
            kind === 'switch_plan' ? 'Резолюция B — сменить план' : 'Сменить план подписки',
          confirmLabel: 'Сменить план',
          destructive: false,
          body: (
            <div className="flex flex-col gap-4">
              <span>
                {who}. Квота и период нового плана заменят текущие и начнутся немедленно.
                Действие записывается в журнал аудита.
              </span>
              <Select
                label="Новый план"
                value={targetPlanId}
                onChange={setTargetPlanId}
                options={activePlans.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${formatNumber(p.docQuota)} док. / ${formatMoney(
                    p.price,
                  )} сум`,
                }))}
              />
            </div>
          ),
        }
      case 'enable_payg':
        return {
          title: 'Резолюция C — оплата за документ на остаток периода',
          confirmLabel: 'Включить оплату за документ',
          destructive: false,
          body: (
            <div className="flex flex-col gap-4">
              <span>
                {who}. Подписка останется активной, но исчерпанной: каждый следующий исходящий
                документ до {formatDate(sub.periodEnd)} будет списываться с предоплаченного
                баланса по цене уровня и помечаться как «Доплата сверх квоты». Действие
                записывается в журнал аудита.
              </span>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3',
                  lowBalance
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50',
                )}
              >
                <AlertTriangle
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    lowBalance ? 'text-red-600' : 'text-gray-400',
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      lowBalance ? 'text-red-600' : 'text-slate-800',
                    )}
                  >
                    Баланс компании: {formatMoney(pendingBalance)} сум
                  </span>
                  <span className="text-sm text-slate-600">
                    {lowBalance
                      ? 'Баланса недостаточно — отправка документов всё равно будет блокироваться, пока компания не пополнит счёт.'
                      : 'Баланса хватит на списания сверх квоты до конца периода.'}
                  </span>
                </div>
              </div>
            </div>
          ),
        }
      case 'extend':
        return {
          title: 'Продлить период',
          confirmLabel: 'Продлить',
          destructive: false,
          body: (
            <>
              {who}. Период будет продлён на{' '}
              {formatNumber(pendingPlan?.durationDays ?? 30)} дн. от текущей даты окончания (
              {formatDate(sub.periodEnd)}).
            </>
          ),
        }
      case 'toggle_renew':
        return {
          title: sub.autoRenew ? 'Выключить автопродление' : 'Включить автопродление',
          confirmLabel: sub.autoRenew ? 'Выключить' : 'Включить',
          destructive: sub.autoRenew,
          body: <>{who}. Изменение вступит в силу к дате окончания периода.</>,
        }
      case 'reset_quota':
        return {
          title: 'Сбросить квоту',
          confirmLabel: 'Сбросить квоту',
          destructive: true,
          body: (
            <>
              {who}. Использовано {formatNumber(sub.quotaUsed)} из{' '}
              {formatNumber(sub.quotaTotal)} документов — счётчик обнулится без оплаты. Причина
              обязательна и попадёт в журнал аудита.
            </>
          ),
        }
      case 'cancel':
        return {
          title: 'Отменить подписку',
          confirmLabel: 'Отменить подписку',
          destructive: true,
          body: (
            <>
              {who}. Подписка будет отменена, автопродление выключено. Компания перейдёт на
              оплату за документ с баланса.
            </>
          ),
        }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <StatCard
          value={formatNumber(kpis.active)}
          label="Активных подписок"
          icon={CheckCircle2}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatNumber(kpis.exhausted)}
          label="Ожидают решения"
          icon={AlertTriangle}
          iconBg="bg-orange-100"
          iconColor="text-red-600"
        />
        <StatCard
          value={formatNumber(kpis.onPayg)}
          label="На доплате"
          icon={CreditCard}
          iconBg="bg-amber-50"
          iconColor="text-yellow-500"
        />
        <StatCard
          value={formatNumber(kpis.expiring7)}
          label="Истекают за 7 дней"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
      </div>

      <PageCard>
        <PageHeader
          title="Подписки"
          subtitle={`Всего подписок: ${formatNumber(list.length)} · ожидают решения по исчерпанной квоте: ${formatNumber(kpis.exhausted)}`}
        />

        <div className="mt-4">
          <Toolbar
            search={search}
            onSearchChange={resetPage(setSearch)}
            placeholder="Поиск по ИНН или названию компании"
            filtersActive={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="План"
              value={planFilter}
              onChange={resetPage(setPlanFilter)}
              options={[
                { value: ANY, label: 'Все планы' },
                ...plans.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Select
              label="Статус"
              value={statusFilter}
              onChange={resetPage(setStatusFilter)}
              options={[
                { value: ANY, label: 'Любой статус' },
                ...(
                  [
                    'active',
                    'expiring',
                    'quota_exhausted',
                    'expired',
                    'cancelled',
                  ] as SubscriptionStatus[]
                ).map((s) => ({ value: s, label: subscriptionStatusLabel[s] })),
              ]}
            />
            <Select
              label="Квота исчерпана"
              value={exhaustedFilter}
              onChange={resetPage(setExhaustedFilter)}
              options={[
                { value: ANY, label: 'Не важно' },
                { value: 'yes', label: 'Да' },
                { value: 'no', label: 'Нет' },
              ]}
            />
            <Select
              label="Режим доплаты"
              value={overageFilter}
              onChange={resetPage(setOverageFilter)}
              options={[
                { value: ANY, label: 'Любой' },
                { value: 'payg', label: 'Оплата за документ' },
                { value: 'none', label: 'Без доплаты' },
              ]}
            />
            <Select
              label="Истекает"
              value={expiringFilter}
              onChange={resetPage(setExpiringFilter)}
              options={[
                { value: ANY, label: 'Не важно' },
                { value: '7', label: 'За 7 дней' },
                { value: '30', label: 'За 30 дней' },
              ]}
            />
            <Select
              label="Квота использована > 80%"
              value={highUsageFilter}
              onChange={resetPage(setHighUsageFilter)}
              options={[
                { value: ANY, label: 'Не важно' },
                { value: 'yes', label: 'Да' },
              ]}
            />
          </div>
        )}

        <Tabs
          tabs={statusTabs.map((t) => ({ key: t.key, label: t.label }))}
          active={tab}
          onChange={resetPage(setTab)}
        />

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(s) => s.id}
          emptyMessage="Подписки не найдены"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </PageCard>

      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setPending(null)}
        title={dialog?.title ?? ''}
        confirmLabel={dialog?.confirmLabel}
        destructive={dialog?.destructive}
        description={dialog?.body}
        onConfirm={applyAction}
      />
    </div>
  )
}
