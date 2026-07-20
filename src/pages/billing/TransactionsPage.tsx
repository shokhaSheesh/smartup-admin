import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar, ToolbarIconButton } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { adminUsers, companies, transactions } from '@/data/mock'
import type { Transaction, TxType } from '@/types/admin'
import { txTypeLabel } from '@/types/labels'
import { formatDateTime, formatInn, formatNumber, formatSigned } from '@/lib/format'
import { cn } from '@/lib/cn'

const DAY = 86_400_000

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  ...(Object.keys(txTypeLabel) as TxType[]).map((t) => ({ value: t, label: txTypeLabel[t] })),
]

const COMPANY_OPTIONS = [
  { value: 'all', label: 'Все компании' },
  ...companies.map((c) => ({ value: c.id, label: `${formatInn(c.inn)} · ${c.name}` })),
]

const ADMIN_OPTIONS = [
  { value: 'all', label: 'Все администраторы' },
  { value: 'system', label: 'Системные (без администратора)' },
  ...adminUsers.map((a) => ({ value: a.fullName, label: a.fullName })),
]

/** Client-side CSV export of the ledger — UTF-8 BOM so Excel reads Cyrillic. */
function exportTransactionsCsv(rows: Transaction[]) {
  const headers = [
    'Дата/время',
    'ИНН',
    'Компания',
    'Тип',
    'Сумма',
    'Документ №',
    'Администратор',
    'Причина',
  ]
  const body = rows.map((t) => [
    formatDateTime(t.createdAt),
    t.companyInn,
    t.companyName,
    txTypeLabel[t.type],
    formatSigned(t.amount),
    t.documentNumber ?? '',
    t.adminName ?? '',
    t.reason ?? '',
  ])

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [headers, ...body].map((r) => r.map(escape).join(';')).join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TransactionsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [type, setType] = useState('all')
  const [companyId, setCompanyId] = useState('all')
  const [admin, setAdmin] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filtersActive =
    type !== 'all' ||
    companyId !== 'all' ||
    admin !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    amountFrom !== '' ||
    amountTo !== ''

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = amountFrom === '' ? null : Number(amountFrom)
    const max = amountTo === '' ? null : Number(amountTo)
    const from = dateFrom === '' ? null : +new Date(dateFrom)
    const to = dateTo === '' ? null : +new Date(dateTo) + DAY

    return transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (companyId !== 'all' && t.companyId !== companyId) return false
      if (admin === 'system' && t.adminName !== null) return false
      if (admin !== 'all' && admin !== 'system' && t.adminName !== admin) return false
      const ts = +new Date(t.createdAt)
      if (from !== null && ts < from) return false
      if (to !== null && ts >= to) return false
      // The amount range is matched on magnitude — sign is expressed by the type.
      const abs = Math.abs(t.amount)
      if (min !== null && !Number.isNaN(min) && abs < min) return false
      if (max !== null && !Number.isNaN(max) && abs > max) return false
      if (!q) return true
      return (
        t.companyName.toLowerCase().includes(q) ||
        t.companyInn.includes(q) ||
        (t.documentNumber ?? '').toLowerCase().includes(q) ||
        (t.adminName ?? '').toLowerCase().includes(q) ||
        (t.reason ?? '').toLowerCase().includes(q)
      )
    })
  }, [search, type, companyId, admin, dateFrom, dateTo, amountFrom, amountTo])

  const rows = paginate(filtered, page, pageSize)

  const totals = useMemo(() => {
    let credit = 0
    let debit = 0
    for (const t of filtered) {
      if (t.amount >= 0) credit += t.amount
      else debit += t.amount
    }
    return { credit, debit }
  }, [filtered])

  function resetFilters() {
    setType('all')
    setCompanyId('all')
    setAdmin('all')
    setDateFrom('')
    setDateTo('')
    setAmountFrom('')
    setAmountTo('')
    setPage(1)
  }

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Дата/время',
      cell: (t) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDateTime(t.createdAt)}</span>
      ),
    },
    {
      key: 'company',
      header: 'Компания',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{t.companyName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(t.companyInn)}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      cell: (t) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{txTypeLabel[t.type]}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (t) => (
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap tabular-nums',
            t.amount >= 0 ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {formatSigned(t.amount)}
        </span>
      ),
    },
    {
      key: 'document',
      header: 'Документ №',
      cell: (t) =>
        t.documentId && t.documentNumber ? (
          <button
            type="button"
            onClick={() => navigate(`/documents/${t.documentId}`)}
            className="text-sm font-semibold whitespace-nowrap text-Smart-blue transition hover:underline"
          >
            {t.documentNumber}
          </button>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'admin',
      header: 'Администратор',
      cell: (t) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{t.adminName ?? '—'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Причина',
      cell: (t) =>
        t.reason ? (
          <span className="text-sm text-gray-600">{t.reason}</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Транзакции"
        subtitle={`Неизменяемый журнал движений по балансам — ${formatNumber(transactions.length)} записей`}
      />

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по компании, ИНН, документу, администратору или причине"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        >
          <ToolbarIconButton
            icon={Download}
            label="Экспорт CSV"
            onClick={() => exportTransactionsCsv(filtered)}
          />
        </Toolbar>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <Select
              label="Тип"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => {
                setType(v)
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
            <Select
              label="Администратор"
              options={ADMIN_OPTIONS}
              value={admin}
              onChange={(v) => {
                setAdmin(v)
                setPage(1)
              }}
            />
            <Input
              label="Дата с"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
            <Input
              label="Дата по"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
            <div />
            <Input
              label="Сумма от"
              type="number"
              inputMode="numeric"
              placeholder="0"
              hint="Диапазон по модулю суммы"
              value={amountFrom}
              onChange={(e) => {
                setAmountFrom(e.target.value)
                setPage(1)
              }}
            />
            <Input
              label="Сумма до"
              type="number"
              inputMode="numeric"
              placeholder="Без ограничения"
              value={amountTo}
              onChange={(e) => {
                setAmountTo(e.target.value)
                setPage(1)
              }}
            />
            <div className="flex items-start">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!filtersActive}
                className={cn(
                  'mt-8 text-sm font-semibold transition',
                  filtersActive ? 'text-Smart-blue hover:underline' : 'cursor-not-allowed text-gray-400',
                )}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
          <span>
            Начислено:{' '}
            <b className="font-bold tabular-nums text-emerald-600">{formatSigned(totals.credit)}</b>
          </span>
          <span>
            Списано:{' '}
            <b className="font-bold tabular-nums text-red-600">{formatSigned(totals.debit)}</b>
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <FileText className="size-4" />
            Доступны только экспорт и переход к документу — редактирование записей не
            предусмотрено.
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          emptyMessage="Транзакции не найдены"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </PageCard>
    </div>
  )
}
