import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Building2, CheckCircle2, ExternalLink, Pencil } from 'lucide-react'
import type { Company, TenantStatus, BillingMode } from '@/types/admin'
import { companies, plans } from '@/data/mock'
import {
  applyBalanceAdjustment,
  applyTenantEdit,
  effectiveTerms,
  useTenantEdits,
  type EffectiveTerms,
} from '@/data/tenantEdits'
import { TariffEditModal } from '@/components/tenants/TariffEditModal'
import { billingModeLabel, tenantStatusLabel } from '@/types/labels'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Toolbar } from '@/components/ui/Toolbar'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { TenantStatusBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { daysUntil, formatDate, formatInn, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const ANY = 'all'

/** A company row with its effective tariff terms resolved. */
type Row = Company & { terms: EffectiveTerms }

const statusTabs: Array<{ key: string; label: string; pill: string }> = [
  { key: ANY, label: 'Все', pill: 'bg-gray-300' },
  { key: 'active', label: 'Активные', pill: 'bg-green-400' },
  { key: 'suspended', label: 'Приостановленные', pill: 'bg-red-500' },
]

export default function TenantsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [tab, setTab] = useState<string>(ANY)
  const [billingMode, setBillingMode] = useState(ANY)
  const [plan, setPlan] = useState(ANY)
  const [region, setRegion] = useState(ANY)
  const [statusFilter, setStatusFilter] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [blockTarget, setBlockTarget] = useState<Company | null>(null)
  const [editTarget, setEditTarget] = useState<Company | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  /** Admin edits live in a shared store so the detail page stays in sync. */
  const edits = useTenantEdits()

  const rows = useMemo<Row[]>(
    () =>
      companies.map((c) => {
        const terms = effectiveTerms(c, edits)
        return {
          ...c,
          status: terms.status,
          balance: terms.balance,
          planName: terms.planName,
          terms,
        }
      }),
    [edits],
  )

  const regionOptions = useMemo(() => {
    const set = Array.from(new Set(companies.map((c) => c.region))).sort()
    return [{ value: ANY, label: 'Все регионы' }, ...set.map((r) => ({ value: r, label: r }))]
  }, [])

  const planOptions = useMemo(
    () => [
      { value: ANY, label: 'Все планы' },
      ...plans.map((p) => ({ value: p.nameRu, label: p.nameRu })),
      { value: 'none', label: 'Без плана' },
    ],
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((c) => {
      if (tab !== ANY && c.status !== tab) return false
      if (statusFilter !== ANY && c.status !== statusFilter) return false
      if (billingMode !== ANY && c.billingMode !== billingMode) return false
      if (plan !== ANY) {
        if (plan === 'none' ? c.planName !== null : c.planName !== plan) return false
      }
      if (region !== ANY && c.region !== region) return false
      if (!q) return true
      return (
        c.inn.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.directorName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    })
  }, [rows, search, tab, statusFilter, billingMode, plan, region])

  const counts = useMemo(() => {
    const by = (s: TenantStatus) => rows.filter((c) => c.status === s).length
    return {
      [ANY]: rows.length,
      active: by('active'),
      suspended: by('suspended'),
    } as Record<string, number>
  }, [rows])

  const pageRows = paginate(filtered, page, pageSize)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (c) => <span className="font-medium text-slate-800">{c.name}</span>,
    },
    {
      key: 'inn',
      header: 'ИНН',
      cell: (c) => <span className="whitespace-nowrap">{formatInn(c.inn)}</span>,
    },
    {
      key: 'balance',
      header: 'Баланс',
      cls: 'text-right',
      cell: (c) => (
        <span
          className={cn(
            'font-medium whitespace-nowrap tabular-nums',
            c.balance < 0 ? 'text-red-600' : 'text-slate-800',
          )}
        >
          {formatMoney(c.balance)}
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Тарифный план',
      cell: (c) =>
        c.planName ? (
          <span className="whitespace-nowrap">{c.planName}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'planExpiry',
      header: 'Действует до',
      cell: (c) => {
        const end = c.terms.periodEnd
        if (!end) return <span className="text-gray-400">—</span>
        const left = daysUntil(end)
        return (
          <div className="flex flex-col whitespace-nowrap">
            <span>{formatDate(end)}</span>
            <span
              className={cn(
                'text-xs',
                left < 0 ? 'text-red-600' : left <= 7 ? 'text-amber-500' : 'text-gray-500',
              )}
            >
              {left < 0 ? 'истёк' : `через ${formatNumber(left)} дн.`}
            </span>
          </div>
        )
      },
    },
    {
      key: 'employees',
      header: 'Сотрудники',
      cls: 'text-right',
      cell: (c) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatNumber(c.employees)}
          {c.terms.maxEmployees !== null && (
            <span
              className={cn(
                c.employees > c.terms.maxEmployees ? 'text-red-600' : 'text-gray-400',
              )}
            >
              {' / '}
              {formatNumber(c.terms.maxEmployees)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'docs',
      header: 'Отправлено док. (за месяц)',
      cls: 'text-right',
      cell: (c) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatNumber(c.docsSentThisMonth)}
          {c.terms.docQuota !== null && (
            <span
              className={cn(
                c.docsSentThisMonth > c.terms.docQuota ? 'text-red-600' : 'text-gray-400',
              )}
            >
              {' / '}
              {formatNumber(c.terms.docQuota)}
            </span>
          )}
        </span>
      ),
    },
    { key: 'status', header: 'Статус', cell: (c) => <TenantStatusBadge status={c.status} /> },
    {
      key: 'createdAt',
      header: 'Регистрация',
      cell: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Открыть',
                icon: <ExternalLink className="size-4" />,
                onClick: () => navigate(`/tenants/${c.id}`),
              },
              {
                label: 'Изменить тариф',
                icon: <Pencil className="size-4" />,
                onClick: () => setEditTarget(c),
              },
              c.status === 'suspended'
                ? {
                    label: 'Активировать',
                    icon: <CheckCircle2 className="size-4" />,
                    onClick: () => setBlockTarget(c),
                  }
                : {
                    label: 'Приостановить',
                    icon: <Ban className="size-4" />,
                    danger: true,
                    onClick: () => setBlockTarget(c),
                  },
            ]}
          />
        </div>
      ),
    },
  ]

  const unblocking = blockTarget?.status === 'suspended'

  return (
    <div className="flex flex-col gap-4">
      {banner && (
        <div className="flex items-start gap-2 rounded-lg bg-green-100 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span className="flex-1 text-sm text-emerald-700">{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-sm font-semibold text-emerald-700 transition hover:underline"
          >
            Скрыть
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <StatCard
          value={formatNumber(counts[ANY] ?? 0)}
          label="Всего компаний"
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatNumber(counts.active ?? 0)}
          label="Активные"
          icon={CheckCircle2}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatNumber(counts.suspended ?? 0)}
          label="Приостановленные"
          icon={Ban}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      <PageCard>
        <PageHeader title="Компании" />

        <div className="mt-4">
          <Toolbar
            search={search}
            onSearchChange={resetPage(setSearch)}
            placeholder="Поиск по ИНН, названию, директору, телефону, email"
            filtersActive={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Статус"
              value={statusFilter}
              onChange={resetPage(setStatusFilter)}
              options={[
                { value: ANY, label: 'Любой статус' },
                { value: 'active', label: tenantStatusLabel.active },
                { value: 'suspended', label: tenantStatusLabel.suspended },
              ]}
            />
            <Select
              label="Режим биллинга"
              value={billingMode}
              onChange={resetPage(setBillingMode)}
              options={[
                { value: ANY, label: 'Любой режим' },
                ...(['subscription', 'payg', 'hybrid'] as BillingMode[]).map((m) => ({
                  value: m,
                  label: billingModeLabel[m],
                })),
              ]}
            />
            <Select label="План" value={plan} onChange={resetPage(setPlan)} options={planOptions} />
            <Select
              label="Регион"
              value={region}
              onChange={resetPage(setRegion)}
              options={regionOptions}
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
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/tenants/${c.id}`)}
          emptyMessage="Компании не найдены"
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
        open={blockTarget !== null}
        onClose={() => setBlockTarget(null)}
        destructive={!unblocking}
        confirmLabel={unblocking ? 'Активировать' : 'Приостановить'}
        title={unblocking ? 'Активировать компанию' : 'Приостановить компанию'}
        description={
          blockTarget && (
            <>
              {unblocking
                ? 'Компания снова сможет отправлять документы: '
                : 'Компания потеряет доступ к отправке документов: '}
              <b className="font-semibold text-slate-800">{blockTarget.name}</b> (ИНН{' '}
              {formatInn(blockTarget.inn)}).
            </>
          )
        }
        onConfirm={() => {
          if (!blockTarget) return
          applyTenantEdit(blockTarget.id, {
            status: unblocking ? 'active' : 'suspended',
          })
        }}
      />

      <TariffEditModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        company={editTarget}
        onSave={(companyId, patch, reason, adjustment) => {
          applyTenantEdit(companyId, patch)
          if (adjustment) applyBalanceAdjustment(companyId, adjustment)
          const name = companies.find((c) => c.id === companyId)?.name ?? ''
          setBanner(
            adjustment
              ? `«${name}»: тариф и баланс обновлены. Причина: ${reason || adjustment.reason}`
              : `«${name}»: тариф обновлён. Причина: ${reason}`,
          )
        }}
      />
    </div>
  )
}
