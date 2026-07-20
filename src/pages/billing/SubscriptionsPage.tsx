import { useMemo, useState } from 'react'
import {
  XCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { Subscription, SubscriptionStatus } from '@/types/admin'
import { subscriptions as seedSubscriptions, plans } from '@/data/mock'
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

type ActionKind = 'cancel'

type PendingAction = { kind: ActionKind; sub: Subscription }

const statusTabs: Array<{ key: string; label: string; pill: string }> = [
  { key: ANY, label: 'Все', pill: 'bg-gray-300' },
  { key: 'active', label: 'Активные', pill: 'bg-green-400' },
  { key: 'expired', label: 'Истекшие', pill: 'bg-gray-300' },
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
  const [expiringFilter, setExpiringFilter] = useState(ANY)
  const [highUsageFilter, setHighUsageFilter] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [pending, setPending] = useState<PendingAction | null>(null)
  /** Target plan for the "switch plan" resolution / change plan action. */


  const kpis = useMemo(() => {
    const active = list.filter((s) => s.status === 'active').length
    const expiring7 = list.filter(
      (s) =>
        s.status === 'active' &&
        daysUntil(s.periodEnd) >= 0 &&
        daysUntil(s.periodEnd) <= 7,
    ).length
    return { active, expiring7 }
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((s) => {
      if (tab !== ANY && s.status !== tab) return false
      if (statusFilter !== ANY && s.status !== statusFilter) return false
      if (planFilter !== ANY && s.planId !== planFilter) return false
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
    setPending({ kind, sub })
  }

  function applyAction() {
    if (!pending) return
    update(pending.sub.id, (s) => ({ ...s, status: 'cancelled' }))
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


  const dialog = pending ? buildDialog(pending) : null

  function buildDialog(action: PendingAction) {
    const { sub } = action
    return {
      title: 'Отменить подписку',
      confirmLabel: 'Отменить подписку',
      destructive: true,
      body: (
        <>
          <b className="font-semibold text-slate-800">{sub.companyName}</b> (ИНН{' '}
          {formatInn(sub.companyInn)}), план {sub.planName}. Подписка будет отменена, компания
          перейдёт на оплату за документ. Причина обязательна и попадёт в журнал аудита.
        </>
      ),
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
          subtitle={`Всего подписок: ${formatNumber(list.length)}`}
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
