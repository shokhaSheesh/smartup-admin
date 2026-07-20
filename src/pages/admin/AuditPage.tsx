import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { PageCard, PageHeader, Field } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { adminUsers, auditLog } from '@/data/mock'
import type { AuditEntry } from '@/types/admin'
import { roleName } from '@/data/roles'
import { formatDateTime, formatInn, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const ADMIN_OPTIONS = [
  { value: 'all', label: 'Все администраторы' },
  ...adminUsers.map((a) => ({ value: a.fullName, label: a.fullName })),
]

const ACTION_OPTIONS = [
  { value: 'all', label: 'Все действия' },
  ...Array.from(new Set(auditLog.map((e) => e.action)))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((a) => ({ value: a, label: a })),
]

const TARGET_TYPE_LABEL: Record<AuditEntry['targetType'], string> = {
  Company: 'Компания',
  User: 'Пользователь',
  Plan: 'Тарификация',
}

const TARGET_TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы объектов' },
  ...(Object.keys(TARGET_TYPE_LABEL) as AuditEntry['targetType'][]).map((t) => ({
    value: t,
    label: TARGET_TYPE_LABEL[t],
  })),
]

/** Builds and downloads a CSV of the current result set. */
export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [admin, setAdmin] = useState('all')
  const [action, setAction] = useState('all')
  const [targetType, setTargetType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [detail, setDetail] = useState<AuditEntry | null>(null)

  const filtersActive =
    admin !== 'all' ||
    action !== 'all' ||
    targetType !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateFrom ? +new Date(`${dateFrom}T00:00:00`) : null
    const to = dateTo ? +new Date(`${dateTo}T23:59:59`) : null

    return auditLog
      .filter((e) => {
        if (admin !== 'all' && e.adminName !== admin) return false
        if (action !== 'all' && e.action !== action) return false
        if (targetType !== 'all' && e.targetType !== targetType) return false
        const ts = +new Date(e.createdAt)
        if (from !== null && ts < from) return false
        if (to !== null && ts > to) return false
        if (!q) return true
        return (
          e.adminName.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [search, admin, action, targetType, dateFrom, dateTo])

  const rows = paginate(filtered, page, pageSize)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  function resetFilters() {
    setAdmin('all')
    setAction('all')
    setTargetType('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: 'createdAt',
      header: 'Время',
      cell: (e) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {formatDateTime(e.createdAt)}
        </span>
      ),
    },
    {
      key: 'admin',
      header: 'Администратор',
      cell: (e) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{e.adminName}</span>
          <span className="text-xs text-gray-500">{roleName(e.adminRole)}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Действие',
      cell: (e) => (
        <span
          className={cn(
            'text-sm',
            e.action === 'Просмотр содержимого документа'
              ? 'font-medium text-amber-600'
              : 'text-gray-900',
          )}
        >
          {e.action}
        </span>
      ),
    },
    {
      key: 'targetType',
      header: 'Тип объекта',
      cell: (e) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium whitespace-nowrap text-slate-600">
          {TARGET_TYPE_LABEL[e.targetType]}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Объект',
      cell: (e) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {e.targetType === 'Company' ? `ИНН ${formatInn(e.target)}` : e.target}
        </span>
      ),
    },
    {
      key: 'change',
      header: 'Изменение',
      cell: (e) =>
        e.changes.length === 0 ? (
          <span className="text-sm text-gray-400">—</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {e.changes.map((c) => (
              <span key={c.field} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                <span className="text-gray-500 line-through">{c.before}</span>
                <ArrowRight className="size-3.5 shrink-0 text-gray-400" />
                <span className="font-medium text-slate-800">{c.after}</span>
              </span>
            ))}
            <span className="text-xs text-gray-500">{e.changes[0].field}</span>
          </div>
        ),
    },
    {
      key: 'details',
      header: 'Детали',
      cell: (e) => (
        <span className="block max-w-80 truncate text-sm text-gray-600" title={e.details}>
          {e.details}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Журнал аудита"
        subtitle={`${formatNumber(auditLog.length)} записей о действиях администраторов`}
      />

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={resetPage(setSearch)}
          placeholder="Поиск по администратору, действию или объекту"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <Select
              label="Администратор"
              options={ADMIN_OPTIONS}
              value={admin}
              onChange={resetPage(setAdmin)}
            />
            <Select
              label="Тип действия"
              options={ACTION_OPTIONS}
              value={action}
              onChange={resetPage(setAction)}
            />
            <Select
              label="Тип объекта"
              options={TARGET_TYPE_OPTIONS}
              value={targetType}
              onChange={resetPage(setTargetType)}
            />
            <Input
              label="Дата с"
              type="date"
              value={dateFrom}
              onChange={(e) => resetPage(setDateFrom)(e.target.value)}
            />
            <Input
              label="Дата по"
              type="date"
              value={dateTo}
              onChange={(e) => resetPage(setDateTo)(e.target.value)}
            />
            <div className="flex items-end sm:col-span-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!filtersActive}
                className={cn(
                  'py-2.5 text-sm font-semibold transition',
                  filtersActive
                    ? 'text-Smart-blue hover:underline'
                    : 'cursor-not-allowed text-gray-400',
                )}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(e) => e.id}
          onRowClick={setDetail}
          emptyMessage="Записи не найдены"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </PageCard>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Запись журнала аудита"
        maxWidth="max-w-2xl"
      >
        {detail && (
          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label="Идентификатор записи">{detail.id}</Field>
              <Field label="Время">{formatDateTime(detail.createdAt)}</Field>
              <Field label="Администратор">{detail.adminName}</Field>
              <Field label="Роль">{roleName(detail.adminRole)}</Field>
              <Field label="Действие">{detail.action}</Field>
              <Field label="Тип объекта">{TARGET_TYPE_LABEL[detail.targetType]}</Field>
              <Field label="Объект">{detail.target}</Field>
            </div>

            {detail.changes.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Что изменилось</span>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b border-gray-200 px-4 py-2 text-left text-xs font-medium text-gray-900">
                          Поле
                        </th>
                        <th className="border-b border-gray-200 px-4 py-2 text-left text-xs font-medium text-gray-900">
                          Было
                        </th>
                        <th className="border-b border-gray-200 px-4 py-2 text-left text-xs font-medium text-gray-900">
                          Стало
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.changes.map((c) => (
                        <tr key={c.field} className="border-b border-gray-200 last:border-b-0">
                          <td className="px-4 py-2 text-slate-800">{c.field}</td>
                          <td className="px-4 py-2 text-gray-500 line-through">{c.before}</td>
                          <td className="px-4 py-2 font-medium text-slate-800">{c.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Детали</span>
              <p className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-slate-800">
                {detail.details}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
