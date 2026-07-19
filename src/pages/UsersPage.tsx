import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Lock, LockOpen, User, Users, Wallet } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { UserStatusBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BalanceAdjustModal } from '@/components/users/BalanceAdjustModal'
import { companies, currentAdmin, platformUsers } from '@/data/mock'
import {
  applyUserBalanceAdjustment,
  applyUserEdit,
  useUserEdits,
  withEdits,
} from '@/data/userEdits'
import type {
  AuthMethod,
  PlatformUser,
  TenantUserRole,
  UserStatus,
} from '@/types/admin'
import {
  authMethodLabel,
  tenantUserRoleLabel,
  userKindLabel,
  userStatusLabel,
} from '@/types/labels'
import { formatDateTime, formatInn, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const ALL = 'all'

const kindTabs = [
  { key: 'individual', label: 'Физические лица' },
  { key: 'employee', label: 'Сотрудники компаний' },
]

const ROLE_OPTIONS = [
  { value: ALL, label: 'Все роли' },
  ...(Object.keys(tenantUserRoleLabel) as TenantUserRole[]).map((r) => ({
    value: r,
    label: tenantUserRoleLabel[r],
  })),
]

const STATUS_OPTIONS = [
  { value: ALL, label: 'Все статусы' },
  ...(Object.keys(userStatusLabel) as UserStatus[]).map((s) => ({
    value: s,
    label: userStatusLabel[s],
  })),
]

const AUTH_OPTIONS = [
  { value: ALL, label: 'Любой способ' },
  ...(Object.keys(authMethodLabel) as AuthMethod[]).map((a) => ({
    value: a,
    label: authMethodLabel[a],
  })),
]

const COMPANY_OPTIONS = [
  { value: ALL, label: 'Все компании' },
  ...companies.map((c) => ({ value: c.id, label: `${formatInn(c.inn)} · ${c.name}` })),
]

export default function UsersPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [kind, setKind] = useState<string>('individual')
  const [role, setRole] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [companyId, setCompanyId] = useState(ALL)
  const [authMethod, setAuthMethod] = useState(ALL)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [target, setTarget] = useState<PlatformUser | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<PlatformUser | null>(null)

  /** Admin edits live in a shared store so the detail page stays in sync. */
  const edits = useUserEdits()
  const allUsers = useMemo(
    () => platformUsers.map((u) => withEdits(u, edits)),
    [edits],
  )

  const statusOf = (u: PlatformUser): UserStatus => u.status

  const showingIndividuals = kind === 'individual'

  const filtersActive =
    role !== ALL || status !== ALL || companyId !== ALL || authMethod !== ALL

  const counts = useMemo(
    () => ({
      total: platformUsers.length,
      individual: platformUsers.filter((u) => u.kind === 'individual').length,
      employee: platformUsers.filter((u) => u.kind === 'employee').length,
    }),
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allUsers.filter((u) => {
      if (u.kind !== kind) return false
      if (role !== ALL && u.role !== role) return false
      if (status !== ALL && u.status !== status) return false
      if (companyId !== ALL && u.companyId !== companyId) return false
      if (authMethod !== ALL && u.authMethod !== authMethod) return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.pinfl.includes(q) ||
        (u.companyName?.toLowerCase().includes(q) ?? false) ||
        (u.companyInn?.includes(q) ?? false)
      )
    })
  }, [allUsers, search, kind, role, status, companyId, authMethod])

  const rows = paginate(filtered, page, pageSize)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  function toggleBlock(reason: string) {
    if (!target) return
    // In a real build the reason travels with the request to the audit log.
    void reason
    applyUserEdit(target.id, { status: statusOf(target) === 'blocked' ? 'active' : 'blocked' })
    setTarget(null)
  }

  const columns: Column<PlatformUser>[] = [
    {
      key: 'fullName',
      header: 'ФИО',
      cell: (u) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
          <span className="text-xs text-gray-500">ПИНФЛ {u.pinfl}</span>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Компания',
      cell: (u) =>
        u.companyId ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-800">{u.companyName}</span>
            <span className="text-xs text-gray-500">ИНН {formatInn(u.companyInn!)}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Без компании</span>
        ),
    },
    {
      key: 'role',
      header: 'Роль',
      cell: (u) =>
        u.role ? (
          <span className="text-sm whitespace-nowrap text-gray-900">
            {tenantUserRoleLabel[u.role]}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'phone',
      header: 'Телефон',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{u.phone}</span>
      ),
    },
    {
      key: 'address',
      header: 'Адрес',
      cell: (u) => <span className="text-sm text-gray-900">{u.address ?? '—'}</span>,
    },
    {
      key: 'docs',
      header: 'Отправлено док. (за месяц)',
      cls: 'text-right',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900 tabular-nums">
          {formatNumber(u.docsSentThisMonth)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Баланс',
      cls: 'text-right',
      cell: (u) => (
        <span
          className={cn(
            'text-sm font-medium whitespace-nowrap tabular-nums',
            (u.balance ?? 0) <= 0 ? 'text-red-600' : 'text-slate-800',
          )}
        >
          {u.balance === null ? '—' : formatMoney(u.balance)}
        </span>
      ),
    },
    {
      key: 'auth',
      header: 'Способ входа',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-slate-600">
          {authMethodLabel[u.authMethod]}
        </span>
      ),
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
                label: 'Открыть профиль',
                icon: <User className="size-4" />,
                onClick: () => navigate(`/users/${u.id}`),
              },
              // Balance is the only editable field, and only individuals have one.
              u.kind === 'individual'
                ? {
                    label: 'Изменить баланс',
                    icon: <Wallet className="size-4" />,
                    onClick: () => setAdjustTarget(u),
                  }
                : {
                    label: 'Открыть компанию',
                    icon: <Building2 className="size-4" />,
                    onClick: () => u.companyId && navigate(`/tenants/${u.companyId}`),
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
      <div className="flex flex-col gap-4 sm:flex-row">
        <StatCard
          value={formatNumber(counts.total)}
          label="Всего пользователей"
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatNumber(counts.individual)}
          label="Физические лица"
          icon={User}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          value={formatNumber(counts.employee)}
          label="Сотрудники компаний"
          icon={Building2}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
      </div>

      <PageCard>
        <PageHeader title="Пользователи" />

        <div className="mt-4">
          <Toolbar
            search={search}
            onSearchChange={resetPage(setSearch)}
            placeholder="Поиск по ФИО, ПИНФЛ, компании или ИНН"
            filtersActive={showFilters || filtersActive}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Статус"
              options={STATUS_OPTIONS}
              value={status}
              onChange={resetPage(setStatus)}
            />
            {!showingIndividuals && (
              <>
                <Select
                  label="Способ входа"
                  options={AUTH_OPTIONS}
                  value={authMethod}
                  onChange={resetPage(setAuthMethod)}
                />
                <Select
                  label="Роль в компании"
                  options={ROLE_OPTIONS}
                  value={role}
                  onChange={resetPage(setRole)}
                />
                <Select
                  label="Компания"
                  options={COMPANY_OPTIONS}
                  value={companyId}
                  onChange={resetPage(setCompanyId)}
                />
              </>
            )}
            <div className="lg:col-span-4">
              <button
                type="button"
                onClick={() => {
                  setRole(ALL)
                  setStatus(ALL)
                  setCompanyId(ALL)
                  setAuthMethod(ALL)
                  setPage(1)
                }}
                className={cn(
                  'text-sm font-semibold transition',
                  filtersActive
                    ? 'text-Smart-blue hover:underline'
                    : 'cursor-not-allowed text-gray-400',
                )}
                disabled={!filtersActive}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <Tabs
          tabs={kindTabs}
          active={kind}
          onChange={(k) => {
            setKind(k)
            // Company-scoped filters make no sense for individuals.
            if (k === 'individual') {
              setRole(ALL)
              setCompanyId(ALL)
              setAuthMethod(ALL)
            }
            setPage(1)
          }}
        />

        <DataTable
          columns={columns.filter((c) =>
            showingIndividuals
              // Individuals have no company or role, and their sign-in method is
              // always a personal E-IMZO key — so neither column carries meaning.
              ? !['company', 'role', 'auth'].includes(c.key)
              : !['phone', 'address', 'balance', 'docs'].includes(c.key),
          )}
          rows={rows}
          rowKey={(u) => u.id}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
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

      <BalanceAdjustModal
        open={adjustTarget !== null}
        onClose={() => setAdjustTarget(null)}
        currentBalance={adjustTarget?.balance ?? 0}
        subjectName={adjustTarget?.fullName ?? ''}
        onApply={(adj) => {
          if (adjustTarget) {
            applyUserBalanceAdjustment(adjustTarget.id, adj, currentAdmin.fullName)
          }
        }}
      />

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={toggleBlock}
        destructive={blocking}
        confirmLabel={blocking ? 'Заблокировать' : 'Разблокировать'}
        title={blocking ? 'Заблокировать пользователя' : 'Разблокировать пользователя'}
        description={
          target && (
            <>
              {blocking
                ? 'Пользователь потеряет доступ к платформе: '
                : 'Пользователь снова получит доступ к платформе: '}
              <b className="font-semibold text-slate-800">{target.fullName}</b>
              {target.companyName ? (
                <> ({target.companyName}).</>
              ) : (
                <> ({userKindLabel[target.kind].toLowerCase()}).</>
              )}
            </>
          )
        }
      />
    </div>
  )
}
