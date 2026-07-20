import { useMemo, useState } from 'react'
import { Download, Eye, Lock, ShieldX, UserCheck, Activity } from 'lucide-react'
import { PageCard, PageHeader, Field } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { AuditResultBadge } from '@/components/ui/StatusBadge'
import { adminUsers, auditLog } from '@/data/mock'
import type { AuditEntry } from '@/types/admin'
import { auditResultLabel } from '@/types/labels'
import { roleName } from '@/data/roles'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const DAY = 86_400_000

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
  Document: 'Документ',
  Plan: 'Тарифный план',
  Balance: 'Баланс',
  Role: 'Роль',
  Session: 'Сессия',
}

const TARGET_TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы объектов' },
  ...(Object.keys(TARGET_TYPE_LABEL) as AuditEntry['targetType'][]).map((t) => ({
    value: t,
    label: TARGET_TYPE_LABEL[t],
  })),
]

const RESULT_OPTIONS = [
  { value: 'all', label: 'Любой результат' },
  { value: 'success', label: auditResultLabel.success },
  { value: 'denied', label: auditResultLabel.denied },
]

/** Builds and downloads a CSV of the current result set. */
function exportCsv(entries: AuditEntry[]) {
  const header = [
    'Время',
    'Администратор',
    'Роль',
    'Действие',
    'Тип объекта',
    'Объект',
    'IP',
    'Результат',
    'Детали',
  ]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = entries.map((e) =>
    [
      formatDateTime(e.createdAt),
      e.adminName,
      roleName(e.adminRole),
      e.action,
      TARGET_TYPE_LABEL[e.targetType],
      e.target,
      e.ip,
      auditResultLabel[e.result],
      e.details,
    ]
      .map(escape)
      .join(';'),
  )
  const csv = `﻿${[header.map(escape).join(';'), ...lines].join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'audit-log.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [admin, setAdmin] = useState('all')
  const [action, setAction] = useState('all')
  const [targetType, setTargetType] = useState('all')
  const [result, setResult] = useState('all')
  const [ip, setIp] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [detail, setDetail] = useState<AuditEntry | null>(null)

  const filtersActive =
    admin !== 'all' ||
    action !== 'all' ||
    targetType !== 'all' ||
    result !== 'all' ||
    ip.trim() !== '' ||
    dateFrom !== '' ||
    dateTo !== ''

  const kpi = useMemo(() => {
    const since = Date.now() - DAY
    return {
      last24h: auditLog.filter((e) => +new Date(e.createdAt) >= since).length,
      contentViews: auditLog.filter((e) => e.action === 'Просмотр содержимого документа')
        .length,
      denied: auditLog.filter((e) => e.result === 'denied').length,
      activeAdmins: adminUsers.filter((a) => a.status === 'active').length,
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const ipQuery = ip.trim()
    const from = dateFrom ? +new Date(`${dateFrom}T00:00:00`) : null
    const to = dateTo ? +new Date(`${dateTo}T23:59:59`) : null

    return auditLog
      .filter((e) => {
        if (admin !== 'all' && e.adminName !== admin) return false
        if (action !== 'all' && e.action !== action) return false
        if (targetType !== 'all' && e.targetType !== targetType) return false
        if (result !== 'all' && e.result !== result) return false
        if (ipQuery && !e.ip.includes(ipQuery)) return false
        const ts = +new Date(e.createdAt)
        if (from !== null && ts < from) return false
        if (to !== null && ts > to) return false
        if (!q) return true
        return (
          e.adminName.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.ip.includes(q)
        )
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [search, admin, action, targetType, result, ip, dateFrom, dateTo])

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
    setResult('all')
    setIp('')
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
      cell: (e) => <span className="text-sm whitespace-nowrap text-gray-900">{e.target}</span>,
    },
    {
      key: 'ip',
      header: 'IP',
      cell: (e) => <span className="text-sm whitespace-nowrap text-gray-600">{e.ip}</span>,
    },
    {
      key: 'result',
      header: 'Результат',
      cell: (e) => <AuditResultBadge result={e.result} />,
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

      <div className="flex flex-col gap-4 lg:flex-row">
        <StatCard
          value={formatNumber(kpi.last24h)}
          label="Событий за 24 часа"
          icon={Activity}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatNumber(kpi.contentViews)}
          label="Просмотров содержимого документов"
          icon={Eye}
          iconBg="bg-amber-50"
          iconColor="text-yellow-500"
        />
        <StatCard
          value={formatNumber(kpi.denied)}
          label="Отказов в доступе"
          icon={ShieldX}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          value={formatNumber(kpi.activeAdmins)}
          label="Активных администраторов"
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* -------------------------------------------------- immutability notice */}
      <div className="flex items-start gap-3 rounded-xl border border-Smart-blue/30 bg-Smart-blue/5 px-4 py-3.5">
        <Lock className="mt-0.5 size-5 shrink-0 text-Smart-blue" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-800">
            Журнал только на добавление и неизменяем
          </span>
          <span className="text-sm text-slate-600">
            Записи нельзя отредактировать или удалить — ни через интерфейс, ни через API.
            Журнал хранится не менее 1 года и доступен только для чтения и экспорта.
          </span>
        </div>
      </div>

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={resetPage(setSearch)}
          placeholder="Поиск по администратору, действию, объекту или IP"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        >
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:bg-gray-50"
          >
            <Download className="size-5 text-gray-500" />
            Экспорт CSV
          </button>
        </Toolbar>

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
            <Input
              label="IP-адрес"
              value={ip}
              placeholder="84.54."
              onChange={(e) => resetPage(setIp)(e.target.value)}
            />
            <Select
              label="Результат"
              options={RESULT_OPTIONS}
              value={result}
              onChange={resetPage(setResult)}
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
              <Field label="Результат">
                <AuditResultBadge result={detail.result} />
              </Field>
              <Field label="Тип объекта">{TARGET_TYPE_LABEL[detail.targetType]}</Field>
              <Field label="Объект">{detail.target}</Field>
              <Field label="IP-адрес">{detail.ip}</Field>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Детали</span>
              <p className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-slate-800">
                {detail.details}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <span className="text-sm text-gray-500">
                Запись неизменяема. Редактирование и удаление недоступны.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
