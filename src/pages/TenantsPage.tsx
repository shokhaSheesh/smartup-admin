import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Ban, CheckCircle2, ExternalLink } from 'lucide-react'
import type { Company, TenantStatus, BillingMode } from '@/types/admin'
import { companies, plans } from '@/data/mock'
import { billingModeLabel, tenantStatusLabel } from '@/types/labels'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Toolbar } from '@/components/ui/Toolbar'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { TenantStatusBadge, BillingModeBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { formatDate, formatInn, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const ANY = 'all'

const statusTabs: Array<{ key: string; label: string; pill: string }> = [
  { key: ANY, label: 'Все', pill: 'bg-gray-300' },
  { key: 'active', label: 'Активные', pill: 'bg-green-400' },
  { key: 'blocked', label: 'Заблокированные', pill: 'bg-red-500' },
  { key: 'suspended', label: 'Приостановленные', pill: 'bg-amber-300' },
]

/** Client-side CSV export — semicolon-separated with a BOM so Excel reads Cyrillic. */
function exportCompaniesCsv(rows: Company[]) {
  const headers = [
    'ИНН',
    'Название',
    'Статус',
    'Режим биллинга',
    'План',
    'Баланс',
    'Док. отпр. (30д)',
    'Сотрудники',
    'Регистрация',
    'Последняя активность',
  ]
  const body = rows.map((c) => [
    c.inn,
    c.name,
    tenantStatusLabel[c.status],
    billingModeLabel[c.billingMode],
    c.planName ?? '—',
    formatMoney(c.balance),
    String(c.docsSent30d),
    String(c.employees),
    formatDate(c.createdAt),
    formatDate(c.lastActiveAt),
  ])
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [headers, ...body].map((r) => r.map(escape).join(';')).join('\r\n')
  const url = URL.createObjectURL(
    new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TenantsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [tab, setTab] = useState<string>(ANY)
  const [billingMode, setBillingMode] = useState(ANY)
  const [plan, setPlan] = useState(ANY)
  const [region, setRegion] = useState(ANY)
  const [customPrice, setCustomPrice] = useState(ANY)
  const [statusFilter, setStatusFilter] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  /** Local status overrides — no backend, mutations live in state. */
  const [overrides, setOverrides] = useState<Record<string, TenantStatus>>({})
  const [blockTarget, setBlockTarget] = useState<Company | null>(null)

  const rows = useMemo<Company[]>(
    () =>
      companies.map((c) =>
        overrides[c.id] ? { ...c, status: overrides[c.id] } : c,
      ),
    [overrides],
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
      if (customPrice === 'yes' && c.customPricePerDoc === null) return false
      if (customPrice === 'no' && c.customPricePerDoc !== null) return false
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
  }, [rows, search, tab, statusFilter, billingMode, plan, region, customPrice])

  const counts = useMemo(() => {
    const by = (s: TenantStatus) => rows.filter((c) => c.status === s).length
    return {
      [ANY]: rows.length,
      active: by('active'),
      blocked: by('blocked'),
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

  const columns: Column<Company>[] = [
    {
      key: 'inn',
      header: 'ИНН',
      cell: (c) => <span className="font-medium whitespace-nowrap">{formatInn(c.inn)}</span>,
    },
    {
      key: 'name',
      header: 'Название',
      cell: (c) => <span className="font-medium text-slate-800">{c.name}</span>,
    },
    { key: 'status', header: 'Статус', cell: (c) => <TenantStatusBadge status={c.status} /> },
    {
      key: 'mode',
      header: 'Режим биллинга',
      cell: (c) => <BillingModeBadge mode={c.billingMode} />,
    },
    {
      key: 'plan',
      header: 'План',
      cell: (c) =>
        c.planName ? (
          <span className="whitespace-nowrap">{c.planName}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
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
      key: 'docs',
      header: 'Док. отпр. (30д)',
      cls: 'text-right',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.docsSent30d)}</span>,
    },
    {
      key: 'employees',
      header: 'Сотрудники',
      cls: 'text-right',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.employees)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Регистрация',
      cell: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'lastActiveAt',
      header: 'Последняя активность',
      cell: (c) => (
        <span className="whitespace-nowrap text-slate-600">{formatDate(c.lastActiveAt)}</span>
      ),
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
              c.status === 'blocked'
                ? {
                    label: 'Разблокировать',
                    icon: <CheckCircle2 className="size-4" />,
                    onClick: () => setBlockTarget(c),
                  }
                : {
                    label: 'Заблокировать',
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

  const unblocking = blockTarget?.status === 'blocked'

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <PageHeader
          title="Компании"
          subtitle={`Всего компаний на платформе: ${formatNumber(rows.length)}`}
        />

        <div className="mt-4">
          <Toolbar
            search={search}
            onSearchChange={resetPage(setSearch)}
            placeholder="Поиск по ИНН, названию, директору, телефону, email"
            filtersActive={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          >
            <button
              type="button"
              onClick={() => exportCompaniesCsv(filtered)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
            >
              <Download className="size-5" />
              Экспорт CSV
            </button>
          </Toolbar>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Статус"
              value={statusFilter}
              onChange={resetPage(setStatusFilter)}
              options={[
                { value: ANY, label: 'Любой статус' },
                { value: 'active', label: tenantStatusLabel.active },
                { value: 'blocked', label: tenantStatusLabel.blocked },
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
            <Select
              label="Кастомная цена"
              value={customPrice}
              onChange={resetPage(setCustomPrice)}
              options={[
                { value: ANY, label: 'Не важно' },
                { value: 'yes', label: 'Есть' },
                { value: 'no', label: 'Нет' },
              ]}
            />
          </div>
        )}

        <Tabs
          tabs={statusTabs.map((t) => ({ ...t, count: counts[t.key] ?? 0 }))}
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
        confirmLabel={unblocking ? 'Разблокировать' : 'Заблокировать'}
        title={unblocking ? 'Разблокировать компанию' : 'Заблокировать компанию'}
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
          setOverrides((prev) => ({
            ...prev,
            [blockTarget.id]: unblocking ? 'active' : 'blocked',
          }))
        }}
      />
    </div>
  )
}
