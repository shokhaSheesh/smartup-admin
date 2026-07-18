import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Lock, LockOpen } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { UserStatusBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { companies, tenantUsers } from '@/data/mock'
import type { TenantUser, TenantUserRole, UserStatus } from '@/types/admin'
import { tenantUserRoleLabel, userStatusLabel } from '@/types/labels'
import { formatDateTime, formatInn, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const ROLE_OPTIONS = [
  { value: 'all', label: 'Все роли' },
  ...(Object.keys(tenantUserRoleLabel) as TenantUserRole[]).map((r) => ({
    value: r,
    label: tenantUserRoleLabel[r],
  })),
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...(Object.keys(userStatusLabel) as UserStatus[]).map((s) => ({
    value: s,
    label: userStatusLabel[s],
  })),
]

const COMPANY_OPTIONS = [
  { value: 'all', label: 'Все компании' },
  ...companies.map((c) => ({ value: c.id, label: `${formatInn(c.inn)} · ${c.name}` })),
]

export default function UsersPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [companyId, setCompanyId] = useState('all')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  /** Local override map — blocking is not persisted anywhere in the mock data. */
  const [overrides, setOverrides] = useState<Record<string, UserStatus>>({})
  const [target, setTarget] = useState<TenantUser | null>(null)

  const statusOf = (u: TenantUser): UserStatus => overrides[u.id] ?? u.status

  const filtersActive = role !== 'all' || status !== 'all' || companyId !== 'all'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tenantUsers.filter((u) => {
      if (role !== 'all' && u.role !== role) return false
      if (status !== 'all' && (overrides[u.id] ?? u.status) !== status) return false
      if (companyId !== 'all' && u.companyId !== companyId) return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.pinfl.includes(q) ||
        u.companyName.toLowerCase().includes(q) ||
        u.companyInn.includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [search, role, status, companyId, overrides])

  const rows = paginate(filtered, page, pageSize)

  function toggleBlock(reason: string) {
    if (!target) return
    const next: UserStatus = statusOf(target) === 'blocked' ? 'active' : 'blocked'
    // In a real build the reason travels with the request to the audit log.
    void reason
    setOverrides((prev) => ({ ...prev, [target.id]: next }))
    setTarget(null)
  }

  const columns: Column<TenantUser>[] = [
    {
      key: 'fullName',
      header: 'ФИО',
      cell: (u) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
          <span className="text-xs text-gray-500">
            {u.eimzoBound ? 'E-IMZO привязан' : 'Без E-IMZO'}
          </span>
        </div>
      ),
    },
    {
      key: 'pinfl',
      header: 'ПИНФЛ',
      cell: (u) => <span className="text-sm whitespace-nowrap text-gray-900">{u.pinfl}</span>,
    },
    {
      key: 'company',
      header: 'Компания',
      cell: (u) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{u.companyName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(u.companyInn)}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Роль',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {tenantUserRoleLabel[u.role]}
        </span>
      ),
    },
    { key: 'email', header: 'Email', cell: (u) => <span className="text-sm text-gray-900">{u.email}</span> },
    {
      key: 'phone',
      header: 'Телефон',
      cell: (u) => <span className="text-sm whitespace-nowrap text-gray-900">{u.phone}</span>,
    },
    { key: 'status', header: 'Статус', cell: (u) => <UserStatusBadge status={statusOf(u)} /> },
    {
      key: 'lastLogin',
      header: 'Последний вход',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {formatDateTime(u.lastLoginAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Открыть компанию',
                icon: <Building2 className="size-4" />,
                onClick: () => navigate(`/tenants/${u.companyId}`),
              },
              statusOf(u) === 'blocked'
                ? {
                    label: 'Разблокировать',
                    icon: <LockOpen className="size-4" />,
                    onClick: () => setTarget(u),
                  }
                : {
                    label: 'Заблокировать',
                    icon: <Lock className="size-4" />,
                    danger: true,
                    onClick: () => setTarget(u),
                  },
            ]}
          />
        </div>
      ),
    },
  ]

  const blocking = target ? statusOf(target) !== 'blocked' : false

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Пользователи"
        subtitle={`Сквозной поиск сотрудников по всем компаниям — ${formatNumber(tenantUsers.length)} учётных записей`}
      />

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по ФИО, ПИНФЛ, компании или email"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <Select
              label="Роль"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(v) => {
                setRole(v)
                setPage(1)
              }}
            />
            <Select
              label="Статус"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            />
            <Select
              label="Компания"
              options={COMPANY_OPTIONS}
              value={companyId}
              onChange={(v) => {
                setCompanyId(v)
                setPage(1)
              }}
            />
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => {
                  setRole('all')
                  setStatus('all')
                  setCompanyId('all')
                  setPage(1)
                }}
                className={cn(
                  'text-sm font-semibold transition',
                  filtersActive ? 'text-Smart-blue hover:underline' : 'cursor-not-allowed text-gray-400',
                )}
                disabled={!filtersActive}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          emptyMessage="Пользователи не найдены"
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
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={toggleBlock}
        title={blocking ? 'Заблокировать пользователя' : 'Разблокировать пользователя'}
        confirmLabel={blocking ? 'Заблокировать' : 'Разблокировать'}
        destructive={blocking}
        description={
          target && (
            <span>
              {blocking
                ? 'Пользователь потеряет доступ к кабинету компании'
                : 'Пользователю будет возвращён доступ к кабинету компании'}{' '}
              <b className="font-semibold text-slate-800">{target.fullName}</b> ({target.companyName},
              ИНН {formatInn(target.companyInn)}).
            </span>
          )
        }
      />
    </div>
  )
}
